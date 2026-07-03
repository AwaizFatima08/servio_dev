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
} = require('../constants');

const { pktDateStr } = require('../utils');
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
// Document builder — shared shape for both create paths.
// approvalStatus stays null here — only official orders (next slice) use
// it, mirroring café's exact convention (null unless subjectType is the
// official one).
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

    employeeNumber,
    employeeName,

    locationId,
    locationName,

    itemId: menuItem.itemId,
    itemName: menuItem.itemName,
    quantity,
    baseUnit: menuItem.baseUnit,

    billingDestination: BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT,
    costCentreCode: null,
    sponsoringEmployeeNumber: null,
    sponsoringEmployeeName: null,
    officialGuestName: null,
    approvalStatus: null, // only official orders (next slice) use this

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

module.exports = {
  createSelfOrderBatch,
  createProxyOrderBatch,
};
