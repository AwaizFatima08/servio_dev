// ─────────────────────────────────────────
// teabarOrderService.js — V1.3 (Tea Bar — Orders, third slice)
// HomiLabs | Servio
//
// THIS SLICE ONLY covers:
//   - createSelfOrderBatch   (employee places their own order)
//   - createProxyOrderBatch  (attendant places an order on someone's behalf)
//
// Deliberately NOT in this file yet (later slices, per locked build order):
//   - Official orders (with billing approval)      → next slice
//   - Cancellation                                  → later slice
//   - Attendant dashboard / "Issued" handover        → later slice
//   - Order history                                  → later slice
//
// Mirrors cafeOrderService.js patterns (Firestore access, doc-builder
// style, validate-then-write, one shared bookingGroupId per session,
// atomic batch write). Simplified versus café because Tea Bar's locked
// design explicitly excludes: diningMode, orderType, requestedPickupTime,
// advance/future ordering, family-member consumers, and any kitchen
// prep stage. See TeaBar_Design_Lock_03Jul2026.md §11 (explicitly out
// of scope) and the 03-Jul-2026 backend addendum.
//
// Hours are HARDCODED here, not read from mealTypes — same pattern as
// café. Tea Bar's hours have a midday gap (closed for lunch), which the
// mealTypes schema has no field to represent — see
// Schema_Correction_Note_TeaBar.md for why.
//
// Location handling (locked 03-Jul-2026):
//   - Self-order: the EMPLOYEE explicitly picks locationId from the
//     active teabarLocations list, every time. No fixed "home zone".
//   - Proxy-order: locationId is NEVER accepted from the client. It is
//     always resolved from the placing attendant's OWN currently
//     assigned location (teabarLocationService.getLocationForAttendant).
//     This structurally prevents an attendant from ever logging an
//     order under a location that isn't theirs.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const {
  COLLECTIONS,
  TEABAR_ORDER_STATUS,
  ISSUE_STATUS,
  BOOKING_SOURCES,
  BILLING_DESTINATIONS,
  ROLES,
} = require('../constants');

const { pktDateStr, addDaysToDateStr } = require('../utils');
const teabarLocationService = require('./teabarLocationService');

// ─────────────────────────────────────────
// Time helpers (PKT) — duplicated from cafeOrderService.js rather than
// shared/imported, matching this project's existing convention of each
// service module being self-contained. Identical arithmetic-only approach
// (Technical Rule #2 — never toLocaleString for time-of-day math, it
// behaves inconsistently across runtimes).
// ─────────────────────────────────────────
function pktMinutesOfDay(date = new Date()) {
  const pkt = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return pkt.getUTCHours() * 60 + pkt.getUTCMinutes();
}

// ─────────────────────────────────────────
// Tea Bar operating hours (PKT, minutes of day) — HARDCODED, not read
// from mealTypes. 07:30–17:15, closed for lunch 13:00–14:00.
// ─────────────────────────────────────────
const TEABAR_MORNING_START = 7 * 60 + 30;   // 07:30 — opens
const TEABAR_LUNCH_START   = 13 * 60;       // 13:00 — closes for lunch
const TEABAR_LUNCH_END     = 14 * 60;       // 14:00 — reopens
const TEABAR_EVENING_END   = 17 * 60 + 15;  // 17:15 — closes for the day

function _isWithinTeabarHours(nowMin) {
  if (nowMin < TEABAR_MORNING_START || nowMin > TEABAR_EVENING_END) return false;
  if (nowMin >= TEABAR_LUNCH_START && nowMin < TEABAR_LUNCH_END) return false;
  return true;
}

// ─────────────────────────────────────────
// Resolved Tea Bar menu lookup — mirrors café's _resolveCafeMenuItem,
// pointed at serviceMenuConfigs/teabar instead.
// ─────────────────────────────────────────
async function _resolveTeabarMenuItem({ tenantId, itemId }) {
  const doc = await db.collection(COLLECTIONS.SERVICE_MENU_CONFIGS).doc('teabar').get();

  if (!doc.exists) {
    throw new Error('Tea Bar menu is not configured. Contact admin.');
  }
  const data = doc.data();
  if (!data.isActive) {
    throw new Error('Tea Bar is not currently active.');
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const match = items.find((it) => it.itemId === itemId);

  if (!match) {
    throw new Error(`Menu item not found in Tea Bar menu: ${itemId}`);
  }
  return match;
}

// ─────────────────────────────────────────
// Employee lookup helper — identical pattern to cafeOrderService._getEmployee.
// ─────────────────────────────────────────
async function _getEmployee({ tenantId, officialEmployeeNumber }) {
  const doc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();

  if (!doc.exists) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  if (data.isActive !== true) throw new Error(`Employee is inactive: ${officialEmployeeNumber}`);
  return data;
}

// ─────────────────────────────────────────
// Document builder — shared shape for all three create paths (self, proxy,
// official). billingDestination, costCentreCode, sponsoringEmployeeNumber/
// Name, and officialGuestName default to self/proxy's original values —
// only createOfficialTeabarOrderBatch overrides them. approvalStatus is
// derived automatically from bookingSource: 'pending_approval' for official
// orders, 'not_applicable' for everything else (fixed 04-Jul-2026 — see
// TeaBar_Official_Orders_Design_Lock_04Jul2026.md §4).
// ─────────────────────────────────────────
function _buildOrderDoc({
  tenantId,
  bookingGroupId,
  createdByUid,
  createdByRole,
  createdByEmployeeNumber,
  employeeNumber,
  employeeName,
  bookingSource,
  locationId,
  locationName,
  menuItem,
  quantity,
  billingDestination = BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT,
  costCentreCode = null,
  sponsoringEmployeeNumber = null,
  sponsoringEmployeeName = null,
  officialGuestName = null,
}) {
  const now = new Date();
  // No advance ordering — order date IS the consumption date, always.
  const orderDate = pktDateStr(now);

  return {
    tenantId,
    bookingGroupId,

    createdByUid,
    createdByRole,
    createdByEmployeeNumber,
    createdAt: now,
    updatedAt: now,
    bookingSource,
    orderDate, // e.g. "2026-07-04" — added 04-Jul-2026 for Dashboard's
               // "today only" query and the future Order History slice.
               // No advance ordering means orderDate always equals the
               // consumption date — there is no separate "requested" date.

    employeeNumber,
    employeeName,

    locationId,
    locationName,

    itemId: menuItem.itemId,
    itemName: menuItem.itemName,
    quantity,
    baseUnit: menuItem.baseUnit,

    billingDestination,
    costCentreCode,
    sponsoringEmployeeNumber,
    sponsoringEmployeeName,
    officialGuestName,
    approvalStatus: bookingSource === BOOKING_SOURCES.OFFICIAL ? 'pending_approval' : 'not_applicable',

    rateTargetKey: `${orderDate}_teabar_${menuItem.itemId}`,
    unitRate: null,
    amount: null,
    rateStatus: 'pending',
    rateAppliedAt: null,

    orderStatus: TEABAR_ORDER_STATUS.PLACED,
    issueStatus: ISSUE_STATUS.PENDING, // NEVER ISSUE_STATUS.NO_SHOW for Tea Bar
    issuedAt: null,
    issuedByUid: null,

    cancelledAt: null,
    cancelledByUid: null,

    isVisible: true,
    remarks: null,
  };
}

// ─────────────────────────────────────────
// Shared item-array validation — identical shape check to café's batch
// functions (max 50 items, each needs a positive integer quantity).
// ─────────────────────────────────────────
function _validateItemsArray(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item must be selected.');
  }
  if (items.length > 50) {
    throw new Error('Too many items in one order (max 50 per order).');
  }
  for (const line of items) {
    if (!line || typeof line.itemId !== 'string' || !line.itemId) {
      throw new Error('Each item must have an itemId.');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error('Quantity for an item must be a positive integer.');
    }
  }
}

// ─────────────────────────────────────────
// createSelfOrderBatch
// Employee places their own order. Employee explicitly picks locationId —
// every time, no fixed home zone (locked 03-Jul-2026).
//
// items: [{ itemId, quantity }]
// ─────────────────────────────────────────
async function createSelfOrderBatch({
  uid,
  officialEmployeeNumber,
  tenantId,
  userRole,
  locationId,
  items,
}) {
  _validateItemsArray(items);

  if (!locationId) {
    throw new Error('locationId is required.');
  }

  const nowMin = pktMinutesOfDay(new Date());
  if (!_isWithinTeabarHours(nowMin)) {
    throw new Error(
      'Tea Bar orders are accepted 07:30–13:00 and 14:00–17:15 PKT only (closed for lunch 13:00–14:00).'
    );
  }

  // Confirms the location exists and belongs to this tenant; throws if not.
  const location = await teabarLocationService.getLocationById({ locationId, tenantId });
  if (location.isActive !== true) {
    throw new Error('This Tea Bar location is not currently active.');
  }

  const employee = await _getEmployee({ tenantId, officialEmployeeNumber });

  // Resolve every line's menu item (per-line existence check).
  const resolvedItems = [];
  for (const line of items) {
    const menuItem = await _resolveTeabarMenuItem({ tenantId, itemId: line.itemId });
    resolvedItems.push({ menuItem, quantity: line.quantity });
  }

  // One shared bookingGroupId for the whole session (café's group model,
  // locked for Tea Bar 03-Jul-2026 — one "Issued" tap will later handle
  // every document in this group at once).
  const bookingGroupId = db.collection(COLLECTIONS.TEABAR_ORDERS).doc().id;

  const batch = db.batch();
  const created = [];

  for (const { menuItem, quantity } of resolvedItems) {
    const ref = db.collection(COLLECTIONS.TEABAR_ORDERS).doc();
    const doc = _buildOrderDoc({
      tenantId,
      bookingGroupId,
      createdByUid: uid,
      createdByRole: userRole,
      createdByEmployeeNumber: officialEmployeeNumber,
      employeeNumber: officialEmployeeNumber,
      employeeName: employee.fullName,
      bookingSource: BOOKING_SOURCES.SELF,
      locationId: location.locationId,
      locationName: location.locationName,
      menuItem,
      quantity,
    });

    batch.set(ref, doc);
    created.push({
      orderId: ref.id,
      itemId: menuItem.itemId,
      itemName: menuItem.itemName,
      quantity,
      rateTargetKey: doc.rateTargetKey,
    });
  }

  await batch.commit();

  return {
    bookingGroupId,
    locationId: location.locationId,
    locationName: location.locationName,
    orderCount: created.length,
    orders: created,
  };
}

// ─────────────────────────────────────────
// createProxyOrderBatch
// teabar_attendant places an order on behalf of an employee.
// locationId is NEVER accepted from the client — always resolved from the
// placing attendant's own current assignment (locked 03-Jul-2026). This
// makes a cross-zone mixup structurally impossible, not just disallowed.
//
// items: [{ itemId, quantity }]
// ─────────────────────────────────────────
async function createProxyOrderBatch({
  uid,
  officialEmployeeNumber,   // attendant's own number (creator)
  tenantId,
  userRole,
  targetEmployeeNumber,     // consumer-side employee (account holder)
  items,
}) {
  if (!targetEmployeeNumber) {
    throw new Error('targetEmployeeNumber is required for proxy orders.');
  }
  _validateItemsArray(items);

  const nowMin = pktMinutesOfDay(new Date());
  if (!_isWithinTeabarHours(nowMin)) {
    throw new Error(
      'Tea Bar orders are accepted 07:30–13:00 and 14:00–17:15 PKT only (closed for lunch 13:00–14:00).'
    );
  }

  // Resolve the ATTENDANT's own location — never from the request body.
  const location = await teabarLocationService.getLocationForAttendant({
    tenantId,
    attendantUid: uid,
  });
  if (!location) {
    throw new Error('You are not currently assigned to a Tea Bar location.');
  }
  if (location.isActive !== true) {
    throw new Error('Your assigned Tea Bar location is not currently active.');
  }

  const targetEmployee = await _getEmployee({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber,
  });

  const resolvedItems = [];
  for (const line of items) {
    const menuItem = await _resolveTeabarMenuItem({ tenantId, itemId: line.itemId });
    resolvedItems.push({ menuItem, quantity: line.quantity });
  }

  const bookingGroupId = db.collection(COLLECTIONS.TEABAR_ORDERS).doc().id;

  const batch = db.batch();
  const created = [];

  for (const { menuItem, quantity } of resolvedItems) {
    const ref = db.collection(COLLECTIONS.TEABAR_ORDERS).doc();
    const doc = _buildOrderDoc({
      tenantId,
      bookingGroupId,
      createdByUid: uid,
      createdByRole: userRole,
      createdByEmployeeNumber: officialEmployeeNumber, // attendant (creator)
      employeeNumber: targetEmployeeNumber,             // target (account holder)
      employeeName: targetEmployee.fullName,
      bookingSource: BOOKING_SOURCES.PROXY,
      locationId: location.locationId,
      locationName: location.locationName,
      menuItem,
      quantity,
    });

    batch.set(ref, doc);
    created.push({
      orderId: ref.id,
      itemId: menuItem.itemId,
      itemName: menuItem.itemName,
      quantity,
      rateTargetKey: doc.rateTargetKey,
    });
  }

  await batch.commit();

  return {
    bookingGroupId,
    locationId: location.locationId,
    locationName: location.locationName,
    orderCount: created.length,
    orders: created,
  };
}

// ─────────────────────────────────────────
// createOfficialTeabarOrderBatch
// teabar_attendant / admin / super_admin places an order billed to a
// department (official account) instead of a person. Mirrors
// createProxyOrderBatch for location handling (never accepted from the
// client — always the placing user's own current assignment, locked
// 04-Jul-2026) and menu validation. Differs in billing: the account holder
// is a "sponsoring employee" who vouches for the order, and the order
// enters a SEPARATE, parallel approval track (approvalStatus) that does
// NOT block service — the attendant can hand the order over immediately;
// admin approval only affects the billing/audit trail (Option A, matching
// café's official-meal model — see TeaBar_Official_Orders_Design_Lock_04Jul2026.md §2).
//
// items: [{ itemId, quantity }]
// ─────────────────────────────────────────
async function createOfficialTeabarOrderBatch({
  uid,
  officialEmployeeNumber,     // placing attendant/admin's own number (creator)
  tenantId,
  userRole,
  sponsoringEmployeeNumber,   // required — the employee who vouches / account holder
  costCentreCode,             // optional free-text note
  officialGuestName,          // optional descriptive text
  items,
}) {
  if (!sponsoringEmployeeNumber) {
    throw new Error('sponsoringEmployeeNumber is required for official Tea Bar orders.');
  }
  _validateItemsArray(items);

  const nowMin = pktMinutesOfDay(new Date());
  if (!_isWithinTeabarHours(nowMin)) {
    throw new Error(
      'Tea Bar orders are accepted 07:30–13:00 and 14:00–17:15 PKT only (closed for lunch 13:00–14:00).'
    );
  }

  // Resolve the PLACING USER's own location — never from the request body.
  // Same rule as proxy orders (locked 04-Jul-2026).
  const location = await teabarLocationService.getLocationForAttendant({
    tenantId,
    attendantUid: uid,
  });
  if (!location) {
    throw new Error('You are not currently assigned to a Tea Bar location.');
  }
  if (location.isActive !== true) {
    throw new Error('Your assigned Tea Bar location is not currently active.');
  }

  // Confirm the sponsoring employee exists, is active, correct tenant.
  const sponsor = await _getEmployee({
    tenantId,
    officialEmployeeNumber: sponsoringEmployeeNumber,
  });

  const resolvedItems = [];
  for (const line of items) {
    const menuItem = await _resolveTeabarMenuItem({ tenantId, itemId: line.itemId });
    resolvedItems.push({ menuItem, quantity: line.quantity });
  }

  const bookingGroupId = db.collection(COLLECTIONS.TEABAR_ORDERS).doc().id;

  const batch = db.batch();
  const created = [];

  for (const { menuItem, quantity } of resolvedItems) {
    const ref = db.collection(COLLECTIONS.TEABAR_ORDERS).doc();
    const doc = _buildOrderDoc({
      tenantId,
      bookingGroupId,
      createdByUid: uid,
      createdByRole: userRole,
      createdByEmployeeNumber: officialEmployeeNumber, // attendant/admin (creator)
      employeeNumber: sponsoringEmployeeNumber,          // sponsor (account holder)
      employeeName: sponsor.fullName,
      bookingSource: BOOKING_SOURCES.OFFICIAL,
      locationId: location.locationId,
      locationName: location.locationName,
      menuItem,
      quantity,
      billingDestination: BILLING_DESTINATIONS.OFFICIAL_ACCOUNT,
      costCentreCode: costCentreCode || null,
      sponsoringEmployeeNumber,
      sponsoringEmployeeName: sponsor.fullName,
      officialGuestName: officialGuestName || null,
    });

    batch.set(ref, doc);
    created.push({
      orderId: ref.id,
      itemId: menuItem.itemId,
      itemName: menuItem.itemName,
      quantity,
      rateTargetKey: doc.rateTargetKey,
    });
  }

  await batch.commit();

  return {
    bookingGroupId,
    locationId: location.locationId,
    locationName: location.locationName,
    orderCount: created.length,
    orders: created,
  };
}

// ─────────────────────────────────────────
// approveOfficialTeabarOrderGroup
// admin / super_admin only (enforced at route). Approves an ENTIRE
// bookingGroupId at once — every document sharing that group moves from
// pending_approval to approved together, in one atomic batch write.
// Billing/audit only — never touches orderStatus or issueStatus, and does
// NOT block service (locked 04-Jul-2026, see
// TeaBar_Official_Orders_Design_Lock_04Jul2026.md §1-2).
// ─────────────────────────────────────────
async function approveOfficialTeabarOrderGroup({ bookingGroupId, tenantId, approvedByUid }) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('bookingGroupId', '==', bookingGroupId)
    .where('tenantId', '==', tenantId)
    .get();

  if (snap.empty) {
    throw new Error('No Tea Bar orders found for this bookingGroupId.');
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.bookingSource !== BOOKING_SOURCES.OFFICIAL) {
      throw new Error(`Order ${doc.id} is not an official order.`);
    }
    if (data.approvalStatus !== 'pending_approval') {
      throw new Error(`Cannot approve — order ${doc.id} is currently "${data.approvalStatus}", not "pending_approval".`);
    }
  }

  const now = new Date();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      approvalStatus: 'approved',
      approvedByUid,
      approvedAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { bookingGroupId, approvalStatus: 'approved', orderCount: snap.docs.length };
}

// ─────────────────────────────────────────
// rejectOfficialTeabarOrderGroup
// Mirrors approveOfficialTeabarOrderGroup exactly, with an optional
// approvalNote explaining why (e.g. "no valid cost centre provided").
// ─────────────────────────────────────────
async function rejectOfficialTeabarOrderGroup({ bookingGroupId, tenantId, rejectedByUid, approvalNote }) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('bookingGroupId', '==', bookingGroupId)
    .where('tenantId', '==', tenantId)
    .get();

  if (snap.empty) {
    throw new Error('No Tea Bar orders found for this bookingGroupId.');
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.bookingSource !== BOOKING_SOURCES.OFFICIAL) {
      throw new Error(`Order ${doc.id} is not an official order.`);
    }
    if (data.approvalStatus !== 'pending_approval') {
      throw new Error(`Cannot reject — order ${doc.id} is currently "${data.approvalStatus}", not "pending_approval".`);
    }
  }

  const now = new Date();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      approvalStatus: 'rejected',
      rejectedByUid,
      rejectedAt: now,
      approvalNote: approvalNote || null,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { bookingGroupId, approvalStatus: 'rejected', orderCount: snap.docs.length };
}

// ─────────────────────────────────────────
// listOfficialPendingGroups
// admin / super_admin only (enforced at route). Returns every official Tea
// Bar order still awaiting approval, grouped by bookingGroupId — one entry
// per order visit, not one entry per item (same "group is the unit of
// meaning" principle used everywhere else — see
// TeaBar_Official_Orders_Design_Lock_04Jul2026.md §1). Sorted oldest-first
// so the admin naturally works through the longest-waiting requests first.
//
// Requires a composite index on teabarOrders:
//   tenantId (asc), bookingSource (asc), approvalStatus (asc), createdAt (asc)
// ─────────────────────────────────────────
async function listOfficialPendingGroups({ tenantId }) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('bookingSource', '==', BOOKING_SOURCES.OFFICIAL)
    .where('approvalStatus', '==', 'pending_approval')
    .orderBy('createdAt', 'asc')
    .get();

  // Firestore hands back individual item-documents — bundle them into one
  // entry per bookingGroupId ourselves, in plain JavaScript (see Step 2
  // above for why this can't be done by Firestore directly).
  const groups = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const groupId = data.bookingGroupId;

    if (!groups[groupId]) {
      groups[groupId] = {
        bookingGroupId: groupId,
        locationId: data.locationId,
        locationName: data.locationName,
        sponsoringEmployeeNumber: data.sponsoringEmployeeNumber,
        sponsoringEmployeeName: data.sponsoringEmployeeName,
        officialGuestName: data.officialGuestName,
        costCentreCode: data.costCentreCode,
        createdByEmployeeNumber: data.createdByEmployeeNumber,
        createdAt: data.createdAt,
        items: [],
      };
    }

    groups[groupId].items.push({
      orderId: doc.id,
      itemId: data.itemId,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  const groupList = Object.values(groups);

  return { groups: groupList, count: groupList.length };
}

// ─────────────────────────────────────────
// cancelTeabarOrderGroup
// Cancels an ENTIRE bookingGroupId at once — every document sharing that
// group moves to orderStatus: 'cancelled' together, in one atomic batch
// write (locked 04-Jul-2026 — same "group is the unit of action" principle
// already used by approve/reject). No cancellation-reason field is written
// — Tea Bar deliberately does not use café's reason-dropdown pattern
// (locked 03-Jul-2026 backend addendum §2).
//
// HARD WALL: once ANY document in the group has issueStatus: 'issued', the
// WHOLE group is locked from cancellation — no exceptions, not even for
// admin. This mirrors café's PREPARED hard-wall principle exactly.
//
// Who may cancel what (locked 04-Jul-2026, confirmed with Homi):
//   - employee         → ONLY their own order (employeeNumber must match),
//                         and ONLY if bookingSource is self or proxy —
//                         NEVER official, even if their employeeNumber
//                         happens to equal the sponsor field on an official
//                         order. Matching the sponsor field is a billing
//                         coincidence, not actual control over that order.
//   - teabar_attendant  → any order (self / proxy / official) but ONLY at
//                         their OWN currently assigned location.
//   - admin/super_admin → any order, any location, any booking source.
//   - Manager and every other role → NOT PERMITTED. Confirmed 04-Jul-2026:
//                         Manager and all contractual club staff (waiters,
//                         support staff) are stationed at the main club
//                         building, are not part of Tea Bar's plant-site
//                         ordering system, and have no cancel authority here.
// ─────────────────────────────────────────
async function cancelTeabarOrderGroup({
  bookingGroupId,
  tenantId,
  cancelledByUid,
  callerRole,
  callerEmployeeNumber,
}) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('bookingGroupId', '==', bookingGroupId)
    .where('tenantId', '==', tenantId)
    .get();

  if (snap.empty) {
    throw new Error('No Tea Bar orders found for this bookingGroupId.');
  }

  const docs = snap.docs.map((d) => ({ ref: d.ref, data: d.data() }));

  // Safety check 1 — nothing in the group may already be cancelled.
  // Checked BEFORE permission, so a repeat/duplicate cancel attempt always
  // gets the same clear answer regardless of who is asking.
  for (const { data } of docs) {
    if (data.orderStatus !== TEABAR_ORDER_STATUS.PLACED) {
      throw new Error(`Cannot cancel — this order is already "${data.orderStatus}".`);
    }
  }

  // Safety check 2 — HARD WALL. Nothing in the group may already be issued.
  for (const { data } of docs) {
    if (data.issueStatus === ISSUE_STATUS.ISSUED) {
      throw new Error('Cannot cancel — this order has already been handed over.');
    }
  }

  // Permission check — see the comment block above for the full rule table.
  if (callerRole === ROLES.EMPLOYEE) {
    for (const { data } of docs) {
      if (data.employeeNumber !== callerEmployeeNumber) {
        throw new Error('You may only cancel your own order.');
      }
      if (data.bookingSource === BOOKING_SOURCES.OFFICIAL) {
        throw new Error('Official orders cannot be cancelled by an employee.');
      }
    }
  } else if (callerRole === ROLES.TEABAR_ATTENDANT) {
    const location = await teabarLocationService.getLocationForAttendant({
      tenantId,
      attendantUid: cancelledByUid,
    });
    if (!location) {
      throw new Error('You are not currently assigned to a Tea Bar location.');
    }
    for (const { data } of docs) {
      if (data.locationId !== location.locationId) {
        throw new Error('You may only cancel orders at your own assigned location.');
      }
    }
  } else if (callerRole === ROLES.ADMIN || callerRole === ROLES.SUPER_ADMIN) {
    // No restriction — admin/super_admin may cancel any order.
  } else {
    throw new Error('You are not authorized to cancel Tea Bar orders.');
  }

  const now = new Date();
  const batch = db.batch();
  for (const { ref } of docs) {
    batch.update(ref, {
      orderStatus: TEABAR_ORDER_STATUS.CANCELLED,
      cancelledAt: now,
      cancelledByUid,
      updatedAt: now,
    });
  }
  await batch.commit();

  return {
    bookingGroupId,
    orderStatus: TEABAR_ORDER_STATUS.CANCELLED,
    orderCount: docs.length,
  };
}

// ─────────────────────────────────────────
// getTeabarDashboard
// The attendant's live "what's waiting at my counter right now" screen.
// Locked 04-Jul-2026: no location parameter accepted from the client —
// always resolved from the caller's OWN current assignment, same rule
// used everywhere else in this file. Shows TODAY's orders only, still
// pending (not yet handed over) — orders older than today are left to the
// end-of-day auto-cancel job, never shown here regardless of age.
// Grouped by bookingGroupId — same pattern as listOfficialPendingGroups.
// ─────────────────────────────────────────
async function getTeabarDashboard({ tenantId, attendantUid }) {
  const location = await teabarLocationService.getLocationForAttendant({
    tenantId,
    attendantUid,
  });
  if (!location) {
    throw new Error('You are not currently assigned to a Tea Bar location.');
  }

  const today = pktDateStr(new Date());

  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('locationId', '==', location.locationId)
    .where('orderDate', '==', today)
    .where('orderStatus', '==', TEABAR_ORDER_STATUS.PLACED)
    .where('issueStatus', '==', ISSUE_STATUS.PENDING)
    .orderBy('createdAt', 'asc')
    .get();

  // Bundle flat item-documents into one entry per bookingGroupId — same
  // approach as listOfficialPendingGroups, plain JavaScript, not a
  // Firestore feature.
  const groups = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const groupId = data.bookingGroupId;

    if (!groups[groupId]) {
      groups[groupId] = {
        bookingGroupId: groupId,
        bookingSource: data.bookingSource,
        employeeNumber: data.employeeNumber,
        employeeName: data.employeeName,
        createdAt: data.createdAt,
        items: [],
      };
    }

    groups[groupId].items.push({
      orderId: doc.id,
      itemId: data.itemId,
      itemName: data.itemName,
      quantity: data.quantity,
      baseUnit: data.baseUnit,
    });
  }

  const groupList = Object.values(groups);

  return {
    locationId: location.locationId,
    locationName: location.locationName,
    orderDate: today,
    groups: groupList,
    count: groupList.length,
  };
}

// ─────────────────────────────────────────
// issueTeabarOrderGroup
// The attendant's "Handed over" tap. Marks EVERY document sharing the given
// bookingGroupId as issueStatus: 'issued', in one atomic batch — same
// "group is the unit of action" principle as cancelTeabarOrderGroup.
//
// ATTENDANT ONLY — confirmed 04-Jul-2026. No admin/super_admin override,
// deliberately: "handed over" is a claim of physically witnessing delivery,
// which admin cannot honestly make from outside the location. If an order
// gets truly stuck (attendant forgot, left, etc.), admin's existing CANCEL
// power remains the escape hatch — not issuance.
// ─────────────────────────────────────────
async function issueTeabarOrderGroup({ bookingGroupId, tenantId, issuedByUid }) {
  const location = await teabarLocationService.getLocationForAttendant({
    tenantId,
    attendantUid: issuedByUid,
  });
  if (!location) {
    throw new Error('You are not currently assigned to a Tea Bar location.');
  }

  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('bookingGroupId', '==', bookingGroupId)
    .where('tenantId', '==', tenantId)
    .get();

  if (snap.empty) {
    throw new Error('No Tea Bar orders found for this bookingGroupId.');
  }

  const docs = snap.docs.map((d) => ({ ref: d.ref, data: d.data() }));

  // Safety check 1 — every document must belong to THIS attendant's
  // own assigned location. Blocks an attendant from issuing orders at a
  // counter that isn't theirs.
  for (const { data } of docs) {
    if (data.locationId !== location.locationId) {
      throw new Error('You may only issue orders at your own assigned location.');
    }
  }

  // Safety check 2 — nothing in the group may already be cancelled.
  for (const { data } of docs) {
    if (data.orderStatus !== TEABAR_ORDER_STATUS.PLACED) {
      throw new Error(`Cannot issue — this order is already "${data.orderStatus}".`);
    }
  }

  // Safety check 3 — nothing in the group may already be issued
  // (blocks a duplicate/repeat tap from doing anything unexpected).
  for (const { data } of docs) {
    if (data.issueStatus === ISSUE_STATUS.ISSUED) {
      throw new Error('This order has already been marked as handed over.');
    }
  }

  const now = new Date();
  const batch = db.batch();
  for (const { ref } of docs) {
    batch.update(ref, {
      issueStatus: ISSUE_STATUS.ISSUED,
      issuedAt: now,
      issuedByUid,
      updatedAt: now,
    });
  }
  await batch.commit();

  return {
    bookingGroupId,
    issueStatus: ISSUE_STATUS.ISSUED,
    orderCount: docs.length,
  };
}

// ─────────────────────────────────────────
// getTeabarHistory
// Serves TWO different jobs with one function, since they're nearly
// identical: (1) an attendant looking at their OWN location's past
// orders, and (2) admin/super_admin looking at either one specific
// location OR every location at once.
//
// locationId is OPTIONAL here — pass a real one to filter to that
// location, or omit it (null) to see everything. The ROUTE layer decides
// which caller is allowed to do which: an attendant's route always
// resolves and passes their own locationId (never trusts the client for
// this, same rule as everywhere else); admin's route accepts an optional
// locationId from a query parameter.
//
// Defaults to the last 30 days (locked 04-Jul-2026) — see addDaysToDateStr
// in utils.js for the date math, verified 04-Jul-2026.
//
// IMPORTANT Firestore rule (discovered while designing this, 04-Jul-2026):
// because this query filters on orderDate with a range ("last 30 days"),
// Firestore REQUIRES the first sort field to also be orderDate — you
// cannot filter by a range on one field and sort primarily by a different
// one. createdAt is added as a SECOND sort level, to break ties within
// the same day, newest first.
// ─────────────────────────────────────────
async function getTeabarHistory({ tenantId, locationId = null, day = null, employeeNumber = null }) {
  let query = db.collection(COLLECTIONS.TEABAR_ORDERS).where('tenantId', '==', tenantId);
  let sinceDate = null;

  // Day wins outright — locationId/employeeNumber are ignored entirely
  // when a specific day is picked (same precedence rule café's own
  // history endpoint already uses: "day WINS over days"). This keeps the
  // set of composite indexes this function needs small — a day-filtered
  // query never also needs a locationId or employeeNumber index, because
  // those two filters simply don't apply in this branch.
  if (day) {
    query = query.where('orderDate', '==', day);
    query = query.orderBy('createdAt', 'desc');
  } else {
    const today = pktDateStr(new Date());
    sinceDate = addDaysToDateStr(today, -30);
    query = query.where('orderDate', '>=', sinceDate);

    // One filter at a time within the 30-day window too — matches the
    // locked screen-map decision (Location OR Employee Number, never
    // combined). employeeNumber takes precedence if somehow both are
    // sent, so behaviour is always well-defined.
    if (employeeNumber) {
      query = query.where('employeeNumber', '==', employeeNumber);
    } else if (locationId) {
      query = query.where('locationId', '==', locationId);
    }

    query = query.orderBy('orderDate', 'desc').orderBy('createdAt', 'desc');
  }

  const snap = await query.get();

  const groups = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    const groupId = data.bookingGroupId;

    if (!groups[groupId]) {
      groups[groupId] = {
        bookingGroupId: groupId,
        bookingSource: data.bookingSource,
        employeeNumber: data.employeeNumber,
        employeeName: data.employeeName,
        locationId: data.locationId,
        locationName: data.locationName,
        orderDate: data.orderDate,
        orderStatus: data.orderStatus,
        issueStatus: data.issueStatus,
        issuedAt: data.issuedAt,
        issuedByUid: data.issuedByUid,
        cancelledAt: data.cancelledAt,
        cancelledByUid: data.cancelledByUid,
        approvalStatus: data.approvalStatus,
        sponsoringEmployeeNumber: data.sponsoringEmployeeNumber,
        sponsoringEmployeeName: data.sponsoringEmployeeName,
        costCentreCode: data.costCentreCode,
        officialGuestName: data.officialGuestName,
        createdAt: data.createdAt,
        items: [],
      };
    }

    groups[groupId].items.push({
      orderId: doc.id,
      itemId: data.itemId,
      itemName: data.itemName,
      quantity: data.quantity,
      baseUnit: data.baseUnit,
    });
  }

  const groupList = Object.values(groups);

  return {
    locationId: day ? null : (locationId || null),
    employeeNumber: day ? null : (employeeNumber || null),
    day: day || null,
    sinceDate,
    groups: groupList,
    count: groupList.length,
  };
}

// ─────────────────────────────────────────
// getEmployeeTeabarHistory
// An employee's OWN past orders — self and proxy only. Deliberately
// EXCLUDES official orders even where this employee is the sponsor,
// matching the exact same rule already locked for cancelTeabarOrderGroup
// (04-Jul-2026): being named as a billing sponsor on a departmental order
// is not the same as it being "your" personal order.
//
// The official-order exclusion is done in plain JavaScript AFTER the
// database query, not as a database filter — deliberately, to keep the
// Firestore index simple (one less field to index on). Order volume per
// employee is tiny, so filtering in memory costs nothing meaningful.
// ─────────────────────────────────────────
async function getEmployeeTeabarHistory({ tenantId, employeeNumber }) {
  const today = pktDateStr(new Date());
  const sinceDate = addDaysToDateStr(today, -30);

  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', employeeNumber)
    .where('orderDate', '>=', sinceDate)
    .orderBy('orderDate', 'desc')
    .orderBy('createdAt', 'desc')
    .get();

  const groups = {};
  for (const doc of snap.docs) {
    const data = doc.data();

    // Exclude official orders — see comment block above for why.
    if (data.bookingSource === BOOKING_SOURCES.OFFICIAL) continue;

    const groupId = data.bookingGroupId;

    if (!groups[groupId]) {
      groups[groupId] = {
        bookingGroupId: groupId,
        bookingSource: data.bookingSource,
        locationId: data.locationId,
        locationName: data.locationName,
        orderDate: data.orderDate,
        orderStatus: data.orderStatus,
        issueStatus: data.issueStatus,
        issuedAt: data.issuedAt,
        cancelledAt: data.cancelledAt,
        createdAt: data.createdAt,
        items: [],
      };
    }

    groups[groupId].items.push({
      orderId: doc.id,
      itemId: data.itemId,
      itemName: data.itemName,
      quantity: data.quantity,
      baseUnit: data.baseUnit,
    });
  }

  const groupList = Object.values(groups);

  return {
    employeeNumber,
    sinceDate,
    groups: groupList,
    count: groupList.length,
  };
}

// ─────────────────────────────────────────
// lookupEmployeeForOrder
// Resolves an employee number to a name for the proxy/official order search
// step — checks the EMPLOYEES collection (HR master, everyone on staff),
// NOT the users collection (only people who've signed up for a login).
// This distinction matters: getUserByEmployeeNumber (used by Screen 8's
// attendant-assignment search) checks users and requires an account + role;
// a proxy-order TARGET needs neither — they just need to exist and be
// active. Reuses the same private _getEmployee() the order-placement
// functions already validate against, so a name resolved here is
// guaranteed to also be accepted at submit time. Returns only the fields
// safe to show a supervisor doing a lookup — not the full employee record
// (no cnicLast4, dateOfBirth, phoneNumber, etc.).
// ─────────────────────────────────────────
async function lookupEmployeeForOrder({ tenantId, officialEmployeeNumber }) {
  const employee = await _getEmployee({ tenantId, officialEmployeeNumber });
  return {
    officialEmployeeNumber,
    fullName: employee.fullName,
  };
}

module.exports = {
  createSelfOrderBatch,
  createProxyOrderBatch,
  createOfficialTeabarOrderBatch,
  approveOfficialTeabarOrderGroup,
  rejectOfficialTeabarOrderGroup,
  listOfficialPendingGroups,
  cancelTeabarOrderGroup,
  getTeabarDashboard,
  issueTeabarOrderGroup,
  getTeabarHistory,
  getEmployeeTeabarHistory,
  lookupEmployeeForOrder,
};