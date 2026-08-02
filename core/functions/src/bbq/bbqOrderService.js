// ─────────────────────────────────────────
// bbqOrderService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Create-path only (this slice). Mirrors cafeOrderService.js's
// validate → resolve → build-doc → write pipeline. Reuses CAFE_ORDER_STATUS
// and CAFE_CONSUMER_TYPES verbatim per design doc §6 ("reused outright").
//
// Multi-item per order (unlike café's one-item-per-doc model) — one
// bbqOrders document holds an items[] array, per design doc §2.3.
// bookingGroupId = the doc's own ID here (items are already grouped on
// one doc), kept only for cross-module dashboard-card consistency.
//
// Late-preorder handling: a preorder submitted after preorderCutoffAt is
// NOT rejected — isLateRequest is stamped true, lateRequestApprovalStatus
// starts 'pending', and orderStatus proceeds normally regardless (design
// doc §2.3 note 2). Manager approval of a late request does not touch
// isLateRequest (stays true as history) — only lateRequestApprovalStatus
// changes. Confirmed 11-Jul-2026: an approved late preorder is treated
// as a completely regular preorder from that point on.
//
// NOT in this slice: accept/prepare transitions (needs cafeKitchenService.js
// pattern), late-request approve/reject, cancellation-request approve/reject.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const { applyBbqItemDeltas } = require('./bbqLiveItemStatusService');
const db = getFirestore('servio-dev');

const {
  COLLECTIONS,
  BBQ_ORDER_TYPES,
  BBQ_MENU_GROUPS,
  CAFE_ORDER_STATUS,
  CAFE_CONSUMER_TYPES,
  DINING_MODES,
  BOOKING_SOURCES,
  BILLING_DESTINATIONS,
} = require('../constants');

// ── Fetch a published bbqEvent, throw otherwise ──
async function _resolveBbqEvent({ tenantId, eventDate }) {
  const doc = await db.collection(COLLECTIONS.BBQ_EVENTS).doc(`${tenantId}_${eventDate}`).get();
  if (!doc.exists) {
    throw new Error(`No BBQ event found for ${eventDate}.`);
  }
  const event = doc.data();
  if (event.status !== 'published') {
    throw new Error(`BBQ event for ${eventDate} is not published (status: ${event.status}). Cannot order.`);
  }
  return event;
}

// ── Employee lookup — same shape as café's _getEmployee ──
async function _getEmployee({ tenantId, officialEmployeeNumber }) {
  const doc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();
  if (!doc.exists) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  if (data.isActive !== true) throw new Error(`Employee is inactive: ${officialEmployeeNumber}`);
  return data;
}

// ── Family member lookup — same shape as café's _resolveFamilyMember ──
async function _resolveFamilyMember({ tenantId, officialEmployeeNumber, familyMemberId }) {
  const doc = await db.collection(COLLECTIONS.FAMILY_MEMBERS).doc(familyMemberId).get();
  if (!doc.exists) throw new Error('Family member not found.');
  const m = doc.data();
  if (m.tenantId !== tenantId) throw new Error('Family member not found.');
  if (m.officialEmployeeNumber !== officialEmployeeNumber) throw new Error('Family member does not belong to this employee.');
  if (m.isActive !== true) throw new Error('Family member is not active.');
  return m;
}

// ── Resolve every requested item against the event's 6-array menu.
//    All-or-nothing — same pattern as saveBbqEventDraft's item validation.
//    Server stamps menuGroup itself; never trusts a client-sent value. ──
function _resolveBbqOrderItems({ menu, requestedItems }) {
  const searchOrder = [
    ['preorderItems', BBQ_MENU_GROUPS.PREORDER],
    ['liveCookItems', BBQ_MENU_GROUPS.LIVE_COOK],
    ['kidsItems',     BBQ_MENU_GROUPS.KIDS],
    ['beverages',     BBQ_MENU_GROUPS.BEVERAGE],
    ['breadItems',    BBQ_MENU_GROUPS.BREAD],
    ['dessertItems',  BBQ_MENU_GROUPS.DESSERT],
  ];

  const errors = [];
  const resolved = [];

  for (const req of requestedItems) {
    if (!req.itemId || !Number.isInteger(req.quantity) || req.quantity < 1) {
      errors.push(`${req.itemId || '(missing itemId)'}: invalid itemId/quantity`);
      continue;
    }

    let found = null;
    let foundGroup = null;
    for (const [arrayKey, groupValue] of searchOrder) {
      const match = (menu[arrayKey] || []).find((it) => it.itemId === req.itemId);
      if (match) { found = match; foundGroup = groupValue; break; }
    }

    if (!found) {
      errors.push(`${req.itemId}: not found in this event's published menu`);
      continue;
    }

    resolved.push({
      itemId:       found.itemId,
      itemName:     found.itemName,
      foodTypeCode: found.foodTypeCode,
      baseUnit:     found.baseUnit,
      quantity:     req.quantity,
      menuGroup:    foundGroup,
    });
  }

  if (errors.length > 0) {
    const err = new Error(`Cannot place order — ${errors.length} item(s) failed validation.`);
    err.itemErrors = errors;
    throw err;
  }

  return resolved;
}

// ── Order-window validation. Preorder: late is FLAGGED not blocked
//    (unless the whole event is already over). Live: hard window, no
//    late concept — reject outright outside the window. ──
function _validateOrderWindow({ orderType, event }) {
  const now = new Date();
  const preorderCutoff = event.preorderCutoffAt.toDate ? event.preorderCutoffAt.toDate() : new Date(event.preorderCutoffAt);
  const closeout       = event.closeoutAt.toDate ? event.closeoutAt.toDate() : new Date(event.closeoutAt);
  const windowStart    = event.orderWindowStartAt.toDate ? event.orderWindowStartAt.toDate() : new Date(event.orderWindowStartAt);
  const windowEnd      = event.orderWindowEndAt.toDate ? event.orderWindowEndAt.toDate() : new Date(event.orderWindowEndAt);

  if (orderType === BBQ_ORDER_TYPES.PREORDER) {
    if (now > closeout) {
      throw new Error('BBQ event has closed for the night. Cannot place a preorder.');
    }
    return { isLateRequest: now > preorderCutoff };
  }

  if (orderType === BBQ_ORDER_TYPES.LIVE) {
    if (now < windowStart || now > windowEnd) {
      throw new Error('Live ordering is only open during the event\'s order window.');
    }
    return { isLateRequest: false };
  }

  throw new Error(`Invalid orderType: ${orderType}`);
}

// ── Shared document builder ──
function _buildBbqOrderDoc({
  tenantId, eventDate, orderType, isLateRequest,
  createdByUid, createdByRole, createdByEmployeeNumber,
  bookingSource, employeeNumber, employeeName, guestName,
  consumerType, consumerFamilyMemberId, consumerMemberName,
  items, diningMode,
  billingDestination = BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT,
  costCentreCode = null,
}) {
  const now = new Date();
  return {
    tenantId,
    bookingGroupId: null, // set to ref.id after write — see create functions below
    eventDate,
    orderType,
    bookingSource,
    createdByUid, createdByRole, createdByEmployeeNumber,
    consumerType,
    consumerFamilyMemberId: consumerFamilyMemberId || null,
    consumerMemberName: consumerMemberName || null,
    employeeNumber, employeeName,
    guestName: guestName || null,
    items,
    diningMode,
    billingDestination,
    costCentreCode,
    orderStatus: CAFE_ORDER_STATUS.PLACED,
    acceptedAt: null, acceptedByUid: null,
    preparedAt: null, preparedByUid: null,
    isLateRequest,
    lateRequestApprovalStatus: isLateRequest ? 'pending' : null,
    lateRequestDecisionByUid: null, lateRequestDecisionAt: null, lateRequestDecisionReason: null,
    cancellationRequestStatus: null,
    cancellationRequestedAt: null, cancellationRequestedByUid: null,
    cancellationDecisionAt: null, cancellationDecisionByUid: null, cancellationDecisionReason: null,
    cancelledAt: null, cancelledByUid: null, cancellationReason: null,
    approvalStatus: billingDestination === BILLING_DESTINATIONS.OFFICIAL_ACCOUNT ? 'pending_approval' : null,
    approvedByUid: null, approvedAt: null, rejectedByUid: null, rejectedAt: null,
    unitRate: null, amount: null, rateStatus: 'pending',
    isVisible: true,
    createdAt: now, updatedAt: now,
  };
}

// ── createBbqOrder — employee, self ──
async function createBbqOrder({
  uid, officialEmployeeNumber, tenantId, userRole,
  eventDate, orderType, items, diningMode,
  consumerType = CAFE_CONSUMER_TYPES.SELF, consumerFamilyMemberId = null,
}) {
  if (!Object.values(BBQ_ORDER_TYPES).includes(orderType)) {
    throw new Error(`Invalid orderType: ${orderType}`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array.');
  }
  if (!Object.values(DINING_MODES).includes(diningMode)) {
    throw new Error(`Invalid diningMode: ${diningMode}`);
  }

  const event = await _resolveBbqEvent({ tenantId, eventDate });
  const { isLateRequest } = _validateOrderWindow({ orderType, event });
  const resolvedItems = _resolveBbqOrderItems({ menu: event.menu, requestedItems: items });

  const employee = await _getEmployee({ tenantId, officialEmployeeNumber });

  let consumerMemberName = null;
  if (consumerType === CAFE_CONSUMER_TYPES.FAMILY_MEMBER) {
    if (!consumerFamilyMemberId) throw new Error('consumerFamilyMemberId is required when consumerType is family_member.');
    const member = await _resolveFamilyMember({ tenantId, officialEmployeeNumber, familyMemberId: consumerFamilyMemberId });
    consumerMemberName = member.memberName;
  } else if (consumerFamilyMemberId) {
    throw new Error('consumerFamilyMemberId must not be set when consumerType is self.');
  }

  const doc = _buildBbqOrderDoc({
    tenantId, eventDate, orderType, isLateRequest,
    createdByUid: uid, createdByRole: userRole, createdByEmployeeNumber: officialEmployeeNumber,
    bookingSource: BOOKING_SOURCES.SELF,
    employeeNumber: officialEmployeeNumber, employeeName: employee.fullName,
    consumerType, consumerFamilyMemberId, consumerMemberName,
    items: resolvedItems, diningMode,
  });

  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc();
  doc.bookingGroupId = ref.id;
  await ref.set(doc);
  await applyBbqItemDeltas({ tenantId, eventDate, items: resolvedItems, orderedDelta: 1 });

  return { orderId: ref.id, isLateRequest, itemCount: resolvedItems.length, orderStatus: doc.orderStatus };
}

// ── createProxyBbqOrder — bbq_supervisor / manager, on behalf of a named employee ──
async function createProxyBbqOrder({
  uid, tenantId, userRole, placedByEmployeeNumber,
  targetEmployeeNumber, eventDate, orderType, items, diningMode,
  consumerType = CAFE_CONSUMER_TYPES.SELF, consumerFamilyMemberId = null,
}) {
  if (!targetEmployeeNumber) throw new Error('targetEmployeeNumber is required for a proxy order.');
  if (!Object.values(BBQ_ORDER_TYPES).includes(orderType)) throw new Error(`Invalid orderType: ${orderType}`);
  if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array.');
  if (!Object.values(DINING_MODES).includes(diningMode)) throw new Error(`Invalid diningMode: ${diningMode}`);

  const event = await _resolveBbqEvent({ tenantId, eventDate });
  const { isLateRequest } = _validateOrderWindow({ orderType, event });
  const resolvedItems = _resolveBbqOrderItems({ menu: event.menu, requestedItems: items });

  const employee = await _getEmployee({ tenantId, officialEmployeeNumber: targetEmployeeNumber });

  let consumerMemberName = null;
  if (consumerType === CAFE_CONSUMER_TYPES.FAMILY_MEMBER) {
    if (!consumerFamilyMemberId) throw new Error('consumerFamilyMemberId is required when consumerType is family_member.');
    const member = await _resolveFamilyMember({ tenantId, officialEmployeeNumber: targetEmployeeNumber, familyMemberId: consumerFamilyMemberId });
    consumerMemberName = member.memberName;
  }

  const doc = _buildBbqOrderDoc({
    tenantId, eventDate, orderType, isLateRequest,
    createdByUid: uid, createdByRole: userRole, createdByEmployeeNumber: placedByEmployeeNumber,
    bookingSource: BOOKING_SOURCES.PROXY,
    employeeNumber: targetEmployeeNumber, employeeName: employee.fullName,
    consumerType, consumerFamilyMemberId, consumerMemberName,
    items: resolvedItems, diningMode,
  });

  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc();
  doc.bookingGroupId = ref.id;
  await ref.set(doc);
  await applyBbqItemDeltas({ tenantId, eventDate, items: resolvedItems, orderedDelta: 1 });

  return { orderId: ref.id, isLateRequest, itemCount: resolvedItems.length, orderStatus: doc.orderStatus };
}

// ── createOfficialBbqOrder — bbq_supervisor or manager initiates, admin approves billing ──
async function createOfficialBbqOrder({
  uid, tenantId, userRole, placedByEmployeeNumber,
  sponsoringEmployeeNumber, guestName, eventDate, orderType, items, diningMode, costCentreCode,
}) {
  if (!sponsoringEmployeeNumber) throw new Error('sponsoringEmployeeNumber is required for an official BBQ order.');
  if (!Object.values(BBQ_ORDER_TYPES).includes(orderType)) throw new Error(`Invalid orderType: ${orderType}`);
  if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array.');
  if (!Object.values(DINING_MODES).includes(diningMode)) throw new Error(`Invalid diningMode: ${diningMode}`);

  const event = await _resolveBbqEvent({ tenantId, eventDate });
  const { isLateRequest } = _validateOrderWindow({ orderType, event });
  const resolvedItems = _resolveBbqOrderItems({ menu: event.menu, requestedItems: items });

  const sponsor = await _getEmployee({ tenantId, officialEmployeeNumber: sponsoringEmployeeNumber });

  const doc = _buildBbqOrderDoc({
    tenantId, eventDate, orderType, isLateRequest,
    createdByUid: uid, createdByRole: userRole, createdByEmployeeNumber: placedByEmployeeNumber,
    bookingSource: BOOKING_SOURCES.OFFICIAL,
    employeeNumber: sponsoringEmployeeNumber, employeeName: sponsor.fullName,
    guestName: guestName || null,
    consumerType: CAFE_CONSUMER_TYPES.SELF, consumerFamilyMemberId: null,
    items: resolvedItems, diningMode,
    billingDestination: BILLING_DESTINATIONS.OFFICIAL_ACCOUNT,
    costCentreCode: costCentreCode || null,
  });

  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc();
  doc.bookingGroupId = ref.id;
  await ref.set(doc);
  await applyBbqItemDeltas({ tenantId, eventDate, items: resolvedItems, orderedDelta: 1 });

  return { orderId: ref.id, isLateRequest, itemCount: resolvedItems.length, orderStatus: doc.orderStatus, approvalStatus: doc.approvalStatus };
}

// ── Firestore Timestamp -> ISO string, tolerant of already-ISO or null.
//    Mirrors the identical helper in bbqEventService.js / bbqTableRequestService.js
//    — bbqOrderService.js didn't need this until now, since its create
//    functions only ever returned plain values, never a raw document. ──
function _toISO(t) {
  if (!t) return null;
  if (t._seconds) return new Date(t._seconds * 1000).toISOString();
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return t;
}

function _cleanOrder(data) {
  return {
    ...data,
    acceptedAt: _toISO(data.acceptedAt),
    preparedAt: _toISO(data.preparedAt),
    lateRequestDecisionAt: _toISO(data.lateRequestDecisionAt),
    cancellationRequestedAt: _toISO(data.cancellationRequestedAt),
    cancellationDecisionAt: _toISO(data.cancellationDecisionAt),
    cancelledAt: _toISO(data.cancelledAt),
    approvedAt: _toISO(data.approvedAt),
    rejectedAt: _toISO(data.rejectedAt),
    createdAt: _toISO(data.createdAt),
    updatedAt: _toISO(data.updatedAt),
  };
}

// ─────────────────────────────────────────
// getMyBbqOrders — employee's own order history, all events, newest
// first. Design doc screen #3 ("My BBQ Orders"). Queried by
// employeeNumber (the billing account holder) exactly like
// getMyTableRequests in bbqTableRequestService.js — this deliberately
// includes proxy orders placed on the employee's behalf, not just
// self-placed ones, since both are "my" consumption from a billing
// point of view.
// ─────────────────────────────────────────
async function getMyBbqOrders({ tenantId, officialEmployeeNumber }) {
  const snap = await db.collection(COLLECTIONS.BBQ_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => _cleanOrder({ orderId: d.id, ...d.data() }));
}

// ─────────────────────────────────────────
// editBbqOrder — items/quantity only, 'placed' orders only. Owner or
// bbq_supervisor/manager/admin. Confirmed 13-Jul-2026:
//   - diningMode and consumerType/consumerFamilyMemberId are NOT
//     editable here — a change to either is a cancel+reorder, not an
//     edit. This function only ever touches `items`.
//   - If the order wasn't already late and the edit happens after
//     preorderCutoffAt, the edit itself flags isLateRequest:true
//     (same rule as a fresh late order).
//   - If the order WAS already an approved late request
//     (lateRequestApprovalStatus:'approved'), editing resets it back
//     to 'pending' — the Manager approved the lateness, not the
//     specific contents; a changed order should be re-reviewed.
//   - Live-item counters: the OLD items' quantities were already
//     added to bbqLiveItemStatus at creation. This function must
//     subtract the old resolved items and add the new ones as two
//     separate applyBbqItemDeltas calls — they don't necessarily
//     share itemIds, so they can't be merged into one delta object.
// ─────────────────────────────────────────
async function editBbqOrder({ orderId, tenantId, uid, userRole, items: newRequestedItems }) {
  if (!Array.isArray(newRequestedItems) || newRequestedItems.length === 0) {
    throw new Error('items must be a non-empty array.');
  }

  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  const isOwner = order.createdByUid === uid;
  const isSupervisorPlus = ['bbq_supervisor', 'manager', 'admin', 'super_admin'].includes(userRole);
  if (!isOwner && !isSupervisorPlus) {
    throw new Error('Only the order creator or a supervisor/manager/admin can edit this order.');
  }

  if (order.orderStatus !== CAFE_ORDER_STATUS.PLACED) {
    throw new Error(`Cannot edit an order with status: ${order.orderStatus}. Only 'placed' orders can be edited — once accepted, this is Manager discretion via cancellation, not a direct edit.`);
  }

  // Re-resolve the new items against the event's published menu — same
  // all-or-nothing validation as order creation. Server stamps
  // menuGroup itself; never trusts a client-sent value.
  const event = await _resolveBbqEvent({ tenantId, eventDate: order.eventDate });
  const newResolvedItems = _resolveBbqOrderItems({ menu: event.menu, requestedItems: newRequestedItems });

  // Re-check lateness against the current server clock, same rule as
  // creation. Only relevant for preorder-type orders (mirrors
  // _validateOrderWindow's own preorder-only lateness concept).
  let isLateRequest = order.isLateRequest;
  let lateRequestApprovalStatus = order.lateRequestApprovalStatus;
  if (order.orderType === BBQ_ORDER_TYPES.PREORDER) {
    const now = new Date();
    const preorderCutoff = event.preorderCutoffAt.toDate ? event.preorderCutoffAt.toDate() : new Date(event.preorderCutoffAt);
    const nowIsLate = now > preorderCutoff;

    if (nowIsLate && !order.isLateRequest) {
      // Wasn't late before, is now — flag it fresh, same as a new order.
      isLateRequest = true;
      lateRequestApprovalStatus = 'pending';
    } else if (order.isLateRequest && order.lateRequestApprovalStatus === 'approved') {
      // Was already late AND already approved — contents changed,
      // reset to pending for re-review (confirmed decision 13-Jul-2026).
      lateRequestApprovalStatus = 'pending';
    }
    // Else: either not late at all, or late-and-still-pending — no change needed.
  }

  const now = new Date();
  await ref.update({
    items: newResolvedItems,
    isLateRequest,
    lateRequestApprovalStatus,
    updatedAt: now,
  });

  // Live-counter adjustment — subtract old, add new, as two separate calls.
  await applyBbqItemDeltas({ tenantId, eventDate: order.eventDate, items: order.items, orderedDelta: -1 });
  await applyBbqItemDeltas({ tenantId, eventDate: order.eventDate, items: newResolvedItems, orderedDelta: 1 });

  return {
    message: 'Order updated.', orderId,
    isLateRequest, lateRequestApprovalStatus,
    itemCount: newResolvedItems.length,
  };
}

// ─────────────────────────────────────────
// getBbqOfficialPendingOrders — admin's billing-approval queue. Mirrors
// cafeOrderService.js's listOfficialPending, but simpler: bbqOrders is one
// document per order (items[] array inside), so there's no group of line
// items to reassemble — one query row IS one order. BBQ has no
// subjectType field, so billingDestination is the correct official-order
// filter here (confirmed against the schema, not guessed).
// ─────────────────────────────────────────
async function getBbqOfficialPendingOrders({ tenantId, eventDate = null }) {
  let q = db.collection(COLLECTIONS.BBQ_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('billingDestination', '==', BILLING_DESTINATIONS.OFFICIAL_ACCOUNT)
    .where('approvalStatus', '==', 'pending_approval');

  if (eventDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      throw new Error('Invalid eventDate format. Use YYYY-MM-DD.');
    }
    q = q.where('eventDate', '==', eventDate);
  }

  const snap = await q.orderBy('createdAt', 'desc').get();
  const orders = snap.docs.map((d) => _cleanOrder({ orderId: d.id, ...d.data() }));
  return { orders, count: orders.length };
}

// ─────────────────────────────────────────
// getBbqOrderHistory — read-only history for bbq_supervisor/manager/admin.
// Mirrors the shape of Tea Bar's shared history, adapted to bbqOrders'
// one-doc-per-order model: no server-side grouping needed, a query row IS
// a card. eventDate/employeeNumber kept mutually exclusive at the call
// site (not enforced here) to avoid a 3-field composite index for a
// low-volume weekly dataset. No status/cancelled toggle — history shows
// everything, including cancelled, same simpler choice Tea Bar made.
// limit(200) is a safety cap, not real pagination — BBQ's volume doesn't
// need cursor paging the way café's daily order stream does.
// ─────────────────────────────────────────
async function getBbqOrderHistory({ tenantId, eventDate = null, employeeNumber = null }) {
  let q = db.collection(COLLECTIONS.BBQ_ORDERS).where('tenantId', '==', tenantId);

  if (eventDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      throw new Error('Invalid eventDate format. Use YYYY-MM-DD.');
    }
    q = q.where('eventDate', '==', eventDate);
  } else if (employeeNumber) {
    q = q.where('employeeNumber', '==', employeeNumber.toUpperCase());
  }

  const snap = await q.orderBy('createdAt', 'desc').limit(200).get();
  const orders = snap.docs.map((d) => _cleanOrder({ orderId: d.id, ...d.data() }));
  return { orders, count: orders.length };
}

module.exports = {
  createBbqOrder,
  createProxyBbqOrder,
  createOfficialBbqOrder,
  getMyBbqOrders,
  editBbqOrder,
  getBbqOfficialPendingOrders,
  getBbqOrderHistory,
};