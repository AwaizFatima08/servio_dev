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
  uid, tenantId, userRole,
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
    createdByUid: uid, createdByRole: userRole, createdByEmployeeNumber: targetEmployeeNumber,
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
  uid, tenantId, userRole,
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
    createdByUid: uid, createdByRole: userRole, createdByEmployeeNumber: sponsoringEmployeeNumber,
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

module.exports = {
  createBbqOrder,
  createProxyBbqOrder,
  createOfficialBbqOrder,
};