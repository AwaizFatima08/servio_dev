// ─────────────────────────────────────────
// cafeOrderService.js — V1.2 Slice 1 (Cafe Indoor + Outdoor Mini Cafe)
// HomiLabs | Servio
//
// Mirrors messReservationService.js patterns. Covers:
//   - createSelfOrder           (employee places own order)
//   - createProxyOrder          (cafe_supervisor / cafe_waiter places on behalf)
//   - createWalkInOrder         (cafe_supervisor / cafe_waiter places for walk-in)
//   - cancelOrder               (employee or admin cancels within window)
//   - listMyOrders              (own order history)
//
// Out of scope for Slice 1 (covered in later slices):
//   - Kitchen dashboard list, supervisor acknowledgement       → Slice 2
//   - Official cafe meals (OG numbers, Type 1 manual slip)     → Slice 7
//
// Schema reference: Servio_V1_Schema_Reference.docx + V1 Extension Scope §V1.2
// Collection: cafeOrders. Mirrors messReservations with additions/removals
// per scope doc §"Schema Changes".
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const {
  COLLECTIONS,
  CAFE_ORDER_TYPES,
  CAFE_ORDER_STATUS,
  CAFE_CONSUMER_TYPES,
  CAFE_CANCELLATION_REASONS,
  DINING_MODES,
  BOOKING_SOURCES,
  BILLING_DESTINATIONS,
  FEEDBACK_STATUS,
} = require('../constants');

const { pktDateStr } = require('../utils');

// ─────────────────────────────────────────
// Time helpers (PKT)
// ─────────────────────────────────────────

// Returns minutes past midnight (PKT) for a Date.
// PKT = UTC+5. Shift the epoch by +5h and read UTC fields — pure arithmetic,
// NO toLocaleString. Technical Rule #2: toLocaleString formatting varies across
// runtimes (the GCP Cloud Functions Node/ICU runtime formatted the old version
// differently than dev, letting an out-of-window order through — caught by the
// Slice 2.3 window test, 21-Jun-2026). This method is runtime-independent.
function pktMinutesOfDay(date = new Date()) {
  const pkt = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return pkt.getUTCHours() * 60 + pkt.getUTCMinutes();
}

// Parses "HH:MM" → minutes since midnight. Returns null if invalid.
function parseHHMM(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const match = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// Builds a PKT Date for today at HH:MM. Returns timestamp (Date object).
function todayAtPKT(hhmm) {
  const todayStr = pktDateStr(new Date()); // YYYY-MM-DD in PKT
  // Construct as PKT (UTC+5): the iso string YYYY-MM-DDTHH:MM:00+05:00 is unambiguous.
  return new Date(`${todayStr}T${hhmm}:00+05:00`);
}

// Adds N days to a YYYY-MM-DD string, returning YYYY-MM-DD (PKT).
// Pure offset arithmetic via the +05:00 anchor — no toLocaleString, no tz parsing.
function addDaysToDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00+05:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return pktDateStr(d);
}

// Builds a PKT Date for an arbitrary YYYY-MM-DD + HH:MM. Generalises todayAtPKT
// to any date. Unambiguous via the +05:00 offset.
function pickupDateTimePKT(dateStr, hhmm) {
  return new Date(`${dateStr}T${hhmm}:00+05:00`);
}

// ─────────────────────────────────────────
// Time window constants (PKT, expressed as minutes of day)
//
// Cafe physically operates 18:00 to 23:00 PKT (service window).
// Order acceptance closes at 22:30 PKT — gives kitchen 30 min to clear
// the last orders before service ends. Applies to BOTH order types.
// ─────────────────────────────────────────
const CAFE_HOURS_START       = 18 * 60;        // 18:00 — cafe_hours order window opens
const CAFE_ORDER_END         = 22 * 60 + 30;   // 22:30 — cafe_hours order window closes
const CAFE_SERVICE_END       = 23 * 60;        // 23:00 — cafe physically closes (pickup ceiling)
const ANYTIME_TA_START       = 8 * 60;         // 08:00 — anytime_takeaway window opens
const ANYTIME_TA_LEAD_MIN    = 2 * 60;         // 2 hours minimum lead time
const ANYTIME_TA_SAMEDAY_LOCKOUT  = 20 * 60;   // 20:00 PKT — after this, same-day pickup is locked; pickup must be tomorrow+
const ANYTIME_TA_CANCEL_MIN  = 60;             // 1 hour cancellation window
// Advance-date ordering (added in the anytime advance-date slice, 22-Jun-2026)
const ANYTIME_TA_MAX_ADVANCE_DAYS = 7;         // pickup-date ceiling: today .. today+7 (PKT)

// ─────────────────────────────────────────
// Resolved cafe menu lookup
// Reads serviceMenuConfigs/cafe and validates menuItemId exists in items[].
// Returns the matched item object, or throws.
// ─────────────────────────────────────────
async function _resolveCafeMenuItem(menuItemId) {
  const doc = await db
    .collection(COLLECTIONS.SERVICE_MENU_CONFIGS)
    .doc('cafe')
    .get();

  if (!doc.exists) {
    throw new Error('Cafe menu is not configured. Contact admin.');
  }

  const data = doc.data();
  if (!data.isActive) {
    throw new Error('Cafe is not currently active.');
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const match = items.find((it) => it.itemId === menuItemId);

  if (!match) {
    throw new Error(`Menu item not found in cafe menu: ${menuItemId}`);
  }

  return match;
}

// ─────────────────────────────────────────
// Family member validation
// Confirms the family member exists, belongs to the employee, is active,
// and is not pending deletion. Returns the member object or throws.
// ─────────────────────────────────────────
async function _resolveFamilyMember({ tenantId, officialEmployeeNumber, familyMemberId }) {
  const doc = await db
    .collection(COLLECTIONS.FAMILY_MEMBERS)
    .doc(familyMemberId)
    .get();

  if (!doc.exists) {
    throw new Error('Family member not found.');
  }

  const m = doc.data();

  if (m.tenantId !== tenantId) {
    throw new Error('Family member not found.');
  }
  if (m.officialEmployeeNumber !== officialEmployeeNumber) {
    throw new Error('Family member does not belong to this employee.');
  }
  if (m.isActive !== true) {
    throw new Error('Family member is not active.');
  }
  if (m.deletionRequested === true) {
    throw new Error('Family member is pending deletion.');
  }

  return m;
}

// ─────────────────────────────────────────
// Common validation — shape, time windows, consumer
// Called by all three create functions before write.
// Throws on any violation. Returns { menuItem, familyMember|null, computed }.
// ─────────────────────────────────────────
async function _validateOrderInput({
  tenantId,
  officialEmployeeNumber,
  orderType,
  menuItemId,
  quantity,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
}) {
  // --- Required fields ---
  if (!Object.values(CAFE_ORDER_TYPES).includes(orderType)) {
    throw new Error(`Invalid orderType: ${orderType}`);
  }
  if (!menuItemId || typeof menuItemId !== 'string') {
    throw new Error('menuItemId is required.');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be a positive integer.');
  }
  if (!Object.values(DINING_MODES).includes(diningMode)) {
    throw new Error(`Invalid diningMode: ${diningMode}`);
  }
  if (!Object.values(CAFE_CONSUMER_TYPES).includes(consumerType)) {
    throw new Error(`Invalid consumerType: ${consumerType}`);
  }

  // --- diningMode consistency with orderType ---
  if (orderType === CAFE_ORDER_TYPES.ANYTIME_TAKEAWAY) {
    if (diningMode !== DINING_MODES.TAKEAWAY) {
      throw new Error('anytime_takeaway orders must use diningMode: takeaway.');
    }
  }
  // cafe_hours accepts dine_in, takeaway, outdoor_seating — no further constraint here.

  // --- requestedPickupTime: required for any non-dine_in order ---
  if (diningMode !== DINING_MODES.DINE_IN) {
    if (!requestedPickupTime) {
      throw new Error('requestedPickupTime is required for takeaway and outdoor_seating orders.');
    }
    if (parseHHMM(requestedPickupTime) === null) {
      throw new Error('requestedPickupTime must be in HH:MM format.');
    }
  }

  // --- Time window checks (against current PKT) ---
  const nowMin = pktMinutesOfDay(new Date());
  const todayStr = pktDateStr(new Date());

  // resolvedPickupDate is returned to the create paths so the document carries
  // an explicit pickup date. For anytime_takeaway it is validated below; for
  // cafe_hours it stays whatever was passed (today by default) and is unused.
  let resolvedPickupDate = requestedPickupDate || todayStr;
  let pickupDateTime = null;

  if (orderType === CAFE_ORDER_TYPES.CAFE_HOURS) {
    if (nowMin < CAFE_HOURS_START || nowMin > CAFE_ORDER_END) {
      throw new Error('Cafe orders accepted 18:00 to 22:30 PKT only. Cafe service runs until 23:00.');
    }
  } else if (orderType === CAFE_ORDER_TYPES.ANYTIME_TAKEAWAY) {
    // Placement allowed 24/7 — no nowMin window cap. The constraint is on the
    // FULFILMENT datetime (date + time), not on when the order is placed.

    // requestedPickupDate format + ceiling (today .. today+MAX_ADVANCE_DAYS).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedPickupDate)) {
      throw new Error('requestedPickupDate must be in YYYY-MM-DD format.');
    }
    const maxDateStr = addDaysToDateStr(todayStr, ANYTIME_TA_MAX_ADVANCE_DAYS);
    if (resolvedPickupDate < todayStr) {
      throw new Error('requestedPickupDate cannot be in the past.');
    }
    if (resolvedPickupDate > maxDateStr) {
      throw new Error(`requestedPickupDate cannot be more than ${ANYTIME_TA_MAX_ADVANCE_DAYS} days ahead.`);
    }

    const pickupMin = parseHHMM(requestedPickupTime);
    if (pickupMin === null) {
      throw new Error('requestedPickupTime must be in HH:MM format.');
    }
    // Pickup time must fall within cafe service window (close: 23:00) on any date.
    if (pickupMin > CAFE_SERVICE_END) {
      throw new Error('Pickup time must be at or before 23:00 PKT (cafe close).');
    }

    const isSameDay = resolvedPickupDate === todayStr;

    if (isSameDay) {
      // After 20:00 PKT, same-day pickup is locked — must order for tomorrow+.
      if (nowMin >= ANYTIME_TA_SAMEDAY_LOCKOUT) {
        throw new Error('Same-day pickup is closed after 20:00 PKT. Choose tomorrow or later.');
      }
      // Same-day requires >= 2h lead time from now.
      if (pickupMin < nowMin + ANYTIME_TA_LEAD_MIN) {
        throw new Error('anytime_takeaway requires at least 2 hours lead time for same-day pickup.');
      }
    }
    // Future-date: 2h lead waived (a next-day order has a whole night of lead).

    pickupDateTime = pickupDateTimePKT(resolvedPickupDate, requestedPickupTime);
  }

  // --- Menu item resolution ---
  const menuItem = await _resolveCafeMenuItem(menuItemId);

  // --- Family member resolution (if applicable) ---
  let familyMember = null;
  if (consumerType === CAFE_CONSUMER_TYPES.FAMILY_MEMBER) {
    if (!consumerFamilyMemberId) {
      throw new Error('consumerFamilyMemberId is required when consumerType is family_member.');
    }
    familyMember = await _resolveFamilyMember({
      tenantId,
      officialEmployeeNumber,
      familyMemberId: consumerFamilyMemberId,
    });
  } else {
    // self → consumerFamilyMemberId must be absent or null
    if (consumerFamilyMemberId) {
      throw new Error('consumerFamilyMemberId must not be set when consumerType is self.');
    }
  }

  return { menuItem, familyMember, resolvedPickupDate, pickupDateTime };
}

// ─────────────────────────────────────────
// Document builder — common shape for all three create paths
// ─────────────────────────────────────────
function _buildOrderDoc({
  tenantId,
  bookingGroupId = null, // null for standalone single-item orders; set for batch sessions
  // creator (who hit the API)
  createdByUid,
  createdByRole,
  createdByEmployeeNumber,
  // subject (who the order is for)
  employeeNumber,
  employeeName,
  // order params
  bookingSource,
  orderType,
  menuItem,
  quantity,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  pickupDateTime,
  consumerType,
  consumerFamilyMemberId,
  consumerName,
}) {
  const now = new Date();
  const orderDate = pktDateStr(now);

  // Cancellation window (anytime_takeaway only):
  //   same-day pickup  → 1 hour from placement (unchanged original rule)
  //   future-date pickup → cancellable until pickup (Option B, locked 22-Jun)
  // For future-date orders this field holds the PICKUP datetime, not a
  // placement-based window. The cancelOrder check ("now > expiresAt → reject")
  // works unchanged for both cases.
  let cancellationWindowExpiresAt = null;
  if (orderType === CAFE_ORDER_TYPES.ANYTIME_TAKEAWAY) {
    const isSameDay = !requestedPickupDate || requestedPickupDate === orderDate;
    if (isSameDay) {
      cancellationWindowExpiresAt = new Date(now.getTime() + ANYTIME_TA_CANCEL_MIN * 60 * 1000);
    } else {
      // future-date: cancellable right up to pickup time
      cancellationWindowExpiresAt = pickupDateTime || new Date(now.getTime() + ANYTIME_TA_CANCEL_MIN * 60 * 1000);
    }
  }

  return {
    tenantId,
    bookingGroupId, // groups all items submitted in one session; null for standalone orders

    // Audit (who created this transaction)
    createdByUid,
    createdByRole,
    createdByEmployeeNumber,
    createdAt: now,
    updatedAt: now,
    bookingSource, // self | proxy | walk_in

    // Subject (whose account this hits)
    subjectType: 'self', // V1.2 Slice 1 — personal only. Official subject types arrive in Slice 7.
    employeeNumber,
    employeeName,

    // Order specifics
    orderType,             // cafe_hours | anytime_takeaway
    menuItemId: menuItem.itemId,
    itemName:   menuItem.itemName,
    quantity,
    diningMode,            // dine_in | takeaway | outdoor_seating
    requestedPickupTime: diningMode === DINING_MODES.DINE_IN ? null : requestedPickupTime,
    // Explicit pickup date for anytime_takeaway advance orders (YYYY-MM-DD, PKT).
    // For cafe_hours / same-day this is the order date. Older orders predate this
    // field — readers fall back to the order date when it is absent.
    requestedPickupDate: orderType === CAFE_ORDER_TYPES.ANYTIME_TAKEAWAY
      ? (requestedPickupDate || orderDate)
      : orderDate,

    // Consumer (self vs family member)
    consumerType,                                          // self | family_member
    consumerFamilyMemberId: consumerFamilyMemberId || null,
    consumerName,

    // Lifecycle
    orderStatus: CAFE_ORDER_STATUS.PLACED,
    acceptedAt: null,
    acceptedByUid: null,
    preparedAt: null,      // V1.2 Slice 4 — set when kitchen marks order handed over
    preparedByUid: null,
    cancellationWindowExpiresAt,
    cancelledAt: null,
    cancelledByUid: null,
    cancelledByRole: null,
    cancellationReason: null,
    cancellationNote: null,

    // Rate / billing (retrospective; filled by Slice 4 / rate entry slice)
    rateTargetKey: `${orderDate}_cafe_${menuItem.itemId}`,
    unitRate: null,
    amount: null,
    rateStatus: 'pending', // RATE_STATUS enum has no PENDING — literal matches mess pattern
    rateAppliedAt: null,
    billingDestination: BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT,
    costCentreCode: null,

    // Feedback
    feedbackStatus: FEEDBACK_STATUS.PENDING,
    feedbackSubmittedAt: null,

    // Misc
    isVisible: true,
    remarks: null,
  };
}

// ─────────────────────────────────────────
// Employee lookup helper
// ─────────────────────────────────────────
async function _getEmployee({ tenantId, officialEmployeeNumber }) {
  const doc = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(officialEmployeeNumber)
    .get();

  if (!doc.exists) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error(`Employee not found: ${officialEmployeeNumber}`);
  if (data.isActive !== true) throw new Error(`Employee is inactive: ${officialEmployeeNumber}`);
  return data;
}

// ─────────────────────────────────────────
// createSelfOrder
// Employee places own order. createdBy == subject.
// ─────────────────────────────────────────
async function createSelfOrder({
  uid,
  officialEmployeeNumber,
  tenantId,
  userRole,
  orderType,
  menuItemId,
  quantity,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
}) {
  const { menuItem, familyMember, resolvedPickupDate, pickupDateTime } = await _validateOrderInput({
    tenantId,
    officialEmployeeNumber,
    orderType,
    menuItemId,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate,
    consumerType,
    consumerFamilyMemberId,
  });

  const employee = await _getEmployee({ tenantId, officialEmployeeNumber });

  const consumerName = consumerType === CAFE_CONSUMER_TYPES.SELF
    ? employee.fullName
    : familyMember.fullName;

  const doc = _buildOrderDoc({
    tenantId,
    createdByUid: uid,
    createdByRole: userRole,
    createdByEmployeeNumber: officialEmployeeNumber,
    employeeNumber: officialEmployeeNumber,
    employeeName: employee.fullName,
    bookingSource: BOOKING_SOURCES.SELF,
    orderType,
    menuItem,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate: resolvedPickupDate,
    pickupDateTime,
    consumerType,
    consumerFamilyMemberId,
    consumerName,
  });

  const ref = await db.collection(COLLECTIONS.CAFE_ORDERS).add(doc);
  return { orderId: ref.id, ...doc };
}

// ─────────────────────────────────────────
// createSelfOrderBatch
// Employee places a multi-item order in one session (restaurant-style).
//
// Design (locked 21-Jun-2026):
//   - One consumer for the WHOLE order (session-level), NOT per line. If a
//     child dines alone the whole order is tagged to that family member; if the
//     family dines together the whole order is the employee's. Mirrors how a
//     restaurant bills one table to one payer — see command board decision.
//   - One shared bookingGroupId across all lines of the session.
//   - One cafeOrders document per line. Each line keeps its own billing hooks
//     (rateTargetKey {date}_cafe_{itemId}, rateStatus 'pending', null unitRate/
//     amount) so the universal rate-entry/applicator can attach later with no
//     back-fill — same model as mess.
//   - Per-line cancellation works because each line is its own document with its
//     own cancellationWindowExpiresAt (handled in cancelOrder, web Slice 2.4).
//
// Validation split (café rules are clock-based and session-wide):
//   SESSION-LEVEL, validated once via _validateOrderInput with the FIRST item as
//   a representative: orderType, diningMode + interlock, time window, pickup
//   time + lead time, consumerType + family-member ownership.
//   PER-LINE, in the loop: each menuItemId resolves in the café menu; quantity
//   is a positive integer. No quantity ceiling (café decision 21-Jun).
//
// Mirrors mess createAlaCarteBooking structure. Uses new Date() for timestamps
// (café convention — NOT serverTimestamp; Technical Rule #11).
//
// items: [{ menuItemId, quantity }]
// ─────────────────────────────────────────
async function createSelfOrderBatch({
  uid,
  officialEmployeeNumber,
  tenantId,
  userRole,
  orderType,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
  items,
}) {
  // --- Array shape ---
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item must be selected.');
  }
  // Firestore batches cap at 500 writes; a café order is nowhere near that, so a
  // very large count signals a bad request rather than a real order. Guard with a
  // generous ceiling so an absurd payload fails clearly instead of at commit.
  if (items.length > 50) {
    throw new Error('Too many items in one order (max 50 per order).');
  }
  for (const line of items) {
    if (!line || typeof line.menuItemId !== 'string' || !line.menuItemId) {
      throw new Error('Each item must have a menuItemId.');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`Quantity for an item must be a positive integer.`);
    }
  }

  // --- Session-level validation ---
  // _validateOrderInput enforces orderType, diningMode + interlock, the live PKT
  // time window, pickup-time + lead-time rules, consumerType, and family-member
  // ownership. These are all session-wide for a café order, so we validate them
  // ONCE using the first line as the representative menu item. The family member
  // (if any) is resolved here a single time and reused for every line.
  const first = items[0];
  const { familyMember, resolvedPickupDate, pickupDateTime } = await _validateOrderInput({
    tenantId,
    officialEmployeeNumber,
    orderType,
    menuItemId: first.menuItemId,
    quantity: first.quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate,
    consumerType,
    consumerFamilyMemberId,
  });

  // --- Resolve every remaining line's menu item (per-line existence check) ---
  // first.menuItemId was already resolved inside _validateOrderInput; resolve the
  // rest. Collect the resolved menuItem objects in submission order.
  const resolvedItems = [];
  for (const line of items) {
    const menuItem = await _resolveCafeMenuItem(line.menuItemId);
    resolvedItems.push({ menuItem, quantity: line.quantity });
  }

  // --- Account holder (subject == creator for self-order) ---
  const employee = await _getEmployee({ tenantId, officialEmployeeNumber });

  const consumerName = consumerType === CAFE_CONSUMER_TYPES.SELF
    ? employee.fullName
    : familyMember.fullName;

  // --- One shared bookingGroupId for the whole session ---
  // Mint a document id up front (no write yet) to use as the group id. Same
  // doc()-then-id pattern mess uses.
  const bookingGroupId = db.collection(COLLECTIONS.CAFE_ORDERS).doc().id;

  // --- Build every line and write them ATOMICALLY in one batch ---
  // All lines of a session commit together or none do. A mid-write failure can
  // no longer leave a partial order under an incomplete bookingGroupId.
  // Refs are pre-minted with doc() so we know every orderId before commit and
  // can return them. (db.batch() uses set(ref, doc), not add().)
  const batch = db.batch();
  const created = [];

  for (const { menuItem, quantity } of resolvedItems) {
    const ref = db.collection(COLLECTIONS.CAFE_ORDERS).doc(); // pre-minted id, no write
    const doc = _buildOrderDoc({
      tenantId,
      bookingGroupId,
      createdByUid: uid,
      createdByRole: userRole,
      createdByEmployeeNumber: officialEmployeeNumber,
      employeeNumber: officialEmployeeNumber,
      employeeName: employee.fullName,
      bookingSource: BOOKING_SOURCES.SELF,
      orderType,
      menuItem,
      quantity,
      diningMode,
      requestedPickupTime,
      requestedPickupDate: resolvedPickupDate,
      pickupDateTime,
      consumerType,
      consumerFamilyMemberId,
      consumerName,
    });

    batch.set(ref, doc);
    created.push({
      orderId: ref.id,
      menuItemId: menuItem.itemId,
      itemName: menuItem.itemName,
      quantity,
      rateTargetKey: doc.rateTargetKey,
    });
  }

  // Single atomic commit. Throws if any write fails — nothing is persisted.
  await batch.commit();

  return {
    bookingGroupId,
    orderCount: created.length,
    orders: created,
  };
}

// ─────────────────────────────────────────
// createProxyOrderBatch  (V1.2 Slice 5 — supervisor proxy ordering, multi-item)
// cafe_supervisor / cafe_waiter places a multi-item order ON BEHALF of an
// employee. Mirrors createSelfOrderBatch exactly, with the target-employee
// handling of createProxyOrder:
//   - targetEmployeeNumber is the consumer-side employee (required).
//   - family member (if any) belongs to the TARGET, so _validateOrderInput is
//     called with officialEmployeeNumber: targetEmployeeNumber.
//   - createdByEmployeeNumber = supervisor (creator); employeeNumber = target
//     (account holder / billing subject).
//   - bookingSource: PROXY (walk_in is merged under proxy for café — CB 24-Jun).
//   - No window override: supervisor is time-boxed exactly like an employee;
//     the café window is physical, not policy (CB 24-Jun).
// Same session-level validation model, same shared bookingGroupId, same atomic
// batch, same per-line billing hooks as createSelfOrderBatch.
//
// items: [{ menuItemId, quantity }]
// ─────────────────────────────────────────
async function createProxyOrderBatch({
  uid,
  officialEmployeeNumber,   // supervisor's own number (creator)
  tenantId,
  userRole,
  targetEmployeeNumber,     // consumer-side employee (account holder)
  orderType,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
  items,
}) {
  if (!targetEmployeeNumber) {
    throw new Error('targetEmployeeNumber is required for proxy orders.');
  }

  // --- Array shape (identical to createSelfOrderBatch) ---
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item must be selected.');
  }
  if (items.length > 50) {
    throw new Error('Too many items in one order (max 50 per order).');
  }
  for (const line of items) {
    if (!line || typeof line.menuItemId !== 'string' || !line.menuItemId) {
      throw new Error('Each item must have a menuItemId.');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`Quantity for an item must be a positive integer.`);
    }
  }

  // --- Session-level validation (against the TARGET employee) ---
  const first = items[0];
  const { familyMember, resolvedPickupDate, pickupDateTime } = await _validateOrderInput({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber, // family member belongs to target
    orderType,
    menuItemId: first.menuItemId,
    quantity: first.quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate,
    consumerType,
    consumerFamilyMemberId,
  });

  // --- Resolve every remaining line's menu item ---
  const resolvedItems = [];
  for (const line of items) {
    const menuItem = await _resolveCafeMenuItem(line.menuItemId);
    resolvedItems.push({ menuItem, quantity: line.quantity });
  }

  // --- Account holder == TARGET employee (not the creator) ---
  const targetEmployee = await _getEmployee({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber,
  });

  const consumerName = consumerType === CAFE_CONSUMER_TYPES.SELF
    ? targetEmployee.fullName
    : familyMember.fullName;

  // --- One shared bookingGroupId for the whole session ---
  const bookingGroupId = db.collection(COLLECTIONS.CAFE_ORDERS).doc().id;

  // --- Build every line and write atomically ---
  const batch = db.batch();
  const created = [];

  for (const { menuItem, quantity } of resolvedItems) {
    const ref = db.collection(COLLECTIONS.CAFE_ORDERS).doc();
    const doc = _buildOrderDoc({
      tenantId,
      bookingGroupId,
      createdByUid: uid,
      createdByRole: userRole,
      createdByEmployeeNumber: officialEmployeeNumber,  // supervisor (creator)
      employeeNumber: targetEmployeeNumber,             // target (account holder)
      employeeName: targetEmployee.fullName,
      bookingSource: BOOKING_SOURCES.PROXY,
      orderType,
      menuItem,
      quantity,
      diningMode,
      requestedPickupTime,
      requestedPickupDate: resolvedPickupDate,
      pickupDateTime,
      consumerType,
      consumerFamilyMemberId,
      consumerName,
    });

    batch.set(ref, doc);
    created.push({
      orderId: ref.id,
      menuItemId: menuItem.itemId,
      itemName: menuItem.itemName,
      quantity,
      rateTargetKey: doc.rateTargetKey,
    });
  }

  await batch.commit();

  return {
    bookingGroupId,
    orderCount: created.length,
    orders: created,
  };
}

// ─────────────────────────────────────────
// createProxyOrder
// cafe_supervisor / cafe_waiter places on behalf of an employee.
// targetEmployeeNumber is the consumer-side employee.
// ─────────────────────────────────────────
async function createProxyOrder({
  uid,
  officialEmployeeNumber,   // supervisor's own number (creator)
  tenantId,
  userRole,
  targetEmployeeNumber,
  orderType,
  menuItemId,
  quantity,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
}) {
  if (!targetEmployeeNumber) {
    throw new Error('targetEmployeeNumber is required for proxy orders.');
  }

  const { menuItem, familyMember, resolvedPickupDate, pickupDateTime } = await _validateOrderInput({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber, // family member belongs to target
    orderType,
    menuItemId,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate,
    consumerType,
    consumerFamilyMemberId,
  });

  const targetEmployee = await _getEmployee({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber,
  });

  const consumerName = consumerType === CAFE_CONSUMER_TYPES.SELF
    ? targetEmployee.fullName
    : familyMember.fullName;

  const doc = _buildOrderDoc({
    tenantId,
    createdByUid: uid,
    createdByRole: userRole,
    createdByEmployeeNumber: officialEmployeeNumber,
    employeeNumber: targetEmployeeNumber,
    employeeName: targetEmployee.fullName,
    bookingSource: BOOKING_SOURCES.PROXY,
    orderType,
    menuItem,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate: resolvedPickupDate,
    pickupDateTime,
    consumerType,
    consumerFamilyMemberId,
    consumerName,
  });

  const ref = await db.collection(COLLECTIONS.CAFE_ORDERS).add(doc);
  return { orderId: ref.id, ...doc };
}

// ─────────────────────────────────────────
// createWalkInOrder
// Same as proxy mechanically, but bookingSource differs and is recorded
// for analytics. Per scope doc the supervisor still picks the consumer
// employee (no walk-in for an unknown employee in V1.2 — that's the OG
// flow in Slice 7)
// ─────────────────────────────────────────
async function createWalkInOrder({
  uid,
  officialEmployeeNumber,
  tenantId,
  userRole,
  targetEmployeeNumber,
  orderType,
  menuItemId,
  quantity,
  diningMode,
  requestedPickupTime,
  requestedPickupDate,
  consumerType,
  consumerFamilyMemberId,
}) {
  if (!targetEmployeeNumber) {
    throw new Error('targetEmployeeNumber is required for walk-in orders.');
  }

  const { menuItem, familyMember, resolvedPickupDate, pickupDateTime } = await _validateOrderInput({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber,
    orderType,
    menuItemId,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate,
    consumerType,
    consumerFamilyMemberId,
  });

  const targetEmployee = await _getEmployee({
    tenantId,
    officialEmployeeNumber: targetEmployeeNumber,
  });

  const consumerName = consumerType === CAFE_CONSUMER_TYPES.SELF
    ? targetEmployee.fullName
    : familyMember.fullName;

  const doc = _buildOrderDoc({
    tenantId,
    createdByUid: uid,
    createdByRole: userRole,
    createdByEmployeeNumber: officialEmployeeNumber,
    employeeNumber: targetEmployeeNumber,
    employeeName: targetEmployee.fullName,
    bookingSource: BOOKING_SOURCES.WALK_IN,
    orderType,
    menuItem,
    quantity,
    diningMode,
    requestedPickupTime,
    requestedPickupDate: resolvedPickupDate,
    pickupDateTime,
    consumerType,
    consumerFamilyMemberId,
    consumerName,
  });

  const ref = await db.collection(COLLECTIONS.CAFE_ORDERS).add(doc);
  return { orderId: ref.id, ...doc };
}

// ─────────────────────────────────────────
// cancelOrder
// Rules:
//   - cafe_hours orders: cannot be cancelled by employee. Admin can.
//   - anytime_takeaway: employee can cancel if now < cancellationWindowExpiresAt.
//                       Admin can cancel anytime.
// ─────────────────────────────────────────
async function cancelOrder({
  orderId,
  tenantId,
  cancelledByUid,
  cancelledByRole,
  cancelledByEmployeeNumber,
  isAdmin,
  cancellationReason,
  cancellationNote,
}) {
  if (!Object.values(CAFE_CANCELLATION_REASONS).includes(cancellationReason)) {
    throw new Error(`Invalid cancellationReason: ${cancellationReason}`);
  }

  const ref = db.collection(COLLECTIONS.CAFE_ORDERS).doc(orderId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();

  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (order.orderStatus === CAFE_ORDER_STATUS.CANCELLED) {
    throw new Error('Order is already cancelled.');
  }

  // ── Terminal-state walls (V1.2 Slice 1a, 26-Jun) ──
  // Checked up-front, before any order-type / role branching, mirroring how
  // markPrepared/acceptOrder gate on status first. Closes the hole where a
  // PREPARED (made + handed over) order could be flipped to cancelled — a lie
  // about what physically happened, and a billing-integrity gap (café bills on
  // placement; a served order showing cancelled = a free, unbilled coffee).
  //
  //   prepared  → HARD WALL for everyone, INCLUDING admin. Once served, there
  //               is no real-world cancellation; a genuine data error here is
  //               corrected by other means, never by flipping to cancelled.
  //   accepted  → kitchen has started cooking (ingredients committed). Blocked
  //               for non-admin. Admin god-mode still passes (Q2 lock, 26-Jun)
  //               for genuine corrections down to — but not past — accepted.
  if (order.orderStatus === CAFE_ORDER_STATUS.PREPARED) {
    throw new Error('Cannot cancel an order that has already been prepared and handed over.');
  }
  if (order.orderStatus === CAFE_ORDER_STATUS.ACCEPTED && !isAdmin) {
    throw new Error('Cannot cancel an order the kitchen has started preparing.');
  }

  // Ownership: non-admin can only cancel own orders
  if (!isAdmin && order.employeeNumber !== cancelledByEmployeeNumber) {
    throw new Error('You can only cancel your own orders.');
  }

  // cafe_hours: only admin can cancel
  if (order.orderType === CAFE_ORDER_TYPES.CAFE_HOURS && !isAdmin) {
    throw new Error('Cafe hours orders cannot be cancelled. They are charged regardless.');
  }

  // anytime_takeaway: window check for employee
  if (
    order.orderType === CAFE_ORDER_TYPES.ANYTIME_TAKEAWAY &&
    !isAdmin
  ) {
    const expires = order.cancellationWindowExpiresAt;
    const expiresMs = expires && expires.toMillis ? expires.toMillis() : new Date(expires).getTime();
    if (Date.now() > expiresMs) {
      throw new Error('Cancellation window has passed (1 hour from order time).');
    }
  }

  const now = new Date();
  await ref.update({
    orderStatus: CAFE_ORDER_STATUS.CANCELLED,
    cancelledAt: now,
    cancelledByUid,
    cancelledByRole,
    cancellationReason,
    cancellationNote: (cancellationNote || '').trim() || null,
    updatedAt: now,
  });

  return { message: 'Order cancelled.', orderId };
}

// ─────────────────────────────────────────
// listMyOrders
// Returns the caller's own orders, most recent first. Default 30-day window.
// ─────────────────────────────────────────
async function listMyOrders({ tenantId, officialEmployeeNumber, days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snap = await db
    .collection(COLLECTIONS.CAFE_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .where('createdAt', '>=', since)
    .orderBy('createdAt', 'desc')
    .get();

  const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));
  return { orders, count: orders.length };
}

module.exports = {
  createSelfOrder,
  createSelfOrderBatch,
  createProxyOrderBatch,
  createProxyOrder,
  createWalkInOrder,
  cancelOrder,
  listMyOrders,
};