// ─────────────────────────────────────────
// bbqEventService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Manager-draft / Admin-approve lifecycle for bbqEvents, mirroring
// eventService.js's official-event flow (createEvent/submitEvent/
// publishEvent/returnEvent/cancelEvent) and reusing EVENT_STATUS_OFFICIAL
// verbatim — locked design doc §2.1, confirmed 10-Jul-2026.
//
// Doc ID = `${tenantId}_${eventDate}` (composite, deterministic) — NOT
// Firestore auto-ID like events. saveBbqEventDraft is an upsert against
// that known ID, guarded so it can only overwrite draft/returned events.
//
// menu shape AMENDED 11-Jul-2026 from the original design doc's 5-array
// structure to 6 arrays — bread and dessert split into separate
// bbqMenuGroup catalogue values AND separate resolved arrays (Homi's
// deliberate decision, confirmed in session). See CB update for
// reasoning; design doc itself carries a dated amendment note.
// ─────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const {
  COLLECTIONS,
  BBQ_MENU_GROUPS,
  EVENT_STATUS_OFFICIAL,
} = require('../constants');

const GROUP_TO_MENU_KEY = {
  [BBQ_MENU_GROUPS.PREORDER]:  'preorderItems',
  [BBQ_MENU_GROUPS.LIVE_COOK]: 'liveCookItems',
  [BBQ_MENU_GROUPS.KIDS]:      'kidsItems',
  [BBQ_MENU_GROUPS.BEVERAGE]:  'beverages',
  [BBQ_MENU_GROUPS.BREAD]:     'breadItems',
  [BBQ_MENU_GROUPS.DESSERT]:   'dessertItems',
};

const EMPTY_MENU = () => ({
  preorderItems: [],
  liveCookItems: [],
  kidsItems: [],
  beverages: [],
  breadItems: [],
  dessertItems: [],
});

// Firestore Timestamp -> ISO string, tolerant of already-ISO or null.
function _toISO(t) {
  if (!t) return null;
  if (t._seconds) return new Date(t._seconds * 1000).toISOString();
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return t;
}

function _cleanEvent(data) {
  return {
    ...data,
    preorderCutoffAt:    _toISO(data.preorderCutoffAt),
    orderWindowStartAt:  _toISO(data.orderWindowStartAt),
    orderWindowEndAt:    _toISO(data.orderWindowEndAt),
    closeoutAt:           _toISO(data.closeoutAt),
    kitchenTargetLockedAt: _toISO(data.kitchenTargetLockedAt),
    publishedAt:          _toISO(data.publishedAt),
    createdAt:            _toISO(data.createdAt),
    updatedAt:            _toISO(data.updatedAt),
  };
}

/**
 * Create or update a BBQ event's draft menu. Manager-only at the route
 * level. Upsert against the deterministic doc ID.
 *
 * Guard: if the doc already exists and is NOT draft/returned, this
 * throws rather than silently overwriting a submitted/published event.
 *
 * Item validation is all-or-nothing — if ANY itemId fails any check,
 * the whole save is rejected with the full list of failures (schema
 * reference doc's "no phantom writes" principle — no partial saves).
 *
 * @param {Object} args
 * @param {string} args.tenantId
 * @param {string} args.eventDate — YYYY-MM-DD, must be a Friday
 * @param {string[]} args.itemIds — menuItems doc IDs to include this week
 * @param {string} args.uid — Manager's uid (createdByUid)
 */
async function saveBbqEventDraft({ tenantId, eventDate, itemIds, uid }) {
  // --- 1. Validate eventDate is a Friday ---
  const dateObj = new Date(`${eventDate}T00:00:00`);
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid eventDate: ${eventDate}. Use YYYY-MM-DD.`);
  }
  if (dateObj.getDay() !== 5) {
    throw new Error(`eventDate must be a Friday. ${eventDate} is not a Friday.`);
  }

  // --- 2. Validate itemIds shape, dedupe silently ---
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('itemIds must be a non-empty array.');
  }
  const uniqueItemIds = Array.from(new Set(itemIds));

  // --- 3. Check existing doc status before doing any real work ---
  const eventId = `${tenantId}_${eventDate}`;
  const ref = db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId);
  const existing = await ref.get();

  if (existing.exists) {
    const currentStatus = existing.data().status;
    const editableStatuses = [EVENT_STATUS_OFFICIAL.DRAFT, EVENT_STATUS_OFFICIAL.RETURNED];
    if (!editableStatuses.includes(currentStatus)) {
      throw new Error(
        `Cannot edit event with status: ${currentStatus}. Only draft or returned events can be updated.`
      );
    }
  }

  // --- 4. Fetch and validate every item ---
  const itemDocs = await Promise.all(
    uniqueItemIds.map((id) => db.collection(COLLECTIONS.MENU_ITEMS).doc(id).get())
  );

  const validGroups = Object.values(BBQ_MENU_GROUPS);
  const errors = [];
  const validItems = [];

  itemDocs.forEach((doc, idx) => {
    const itemId = uniqueItemIds[idx];
    if (!doc.exists) {
      errors.push(`${itemId}: not found`);
      return;
    }
    const data = doc.data();
    if (data.tenantId !== tenantId) {
      errors.push(`${itemId}: tenant mismatch`);
      return;
    }
    if (!Array.isArray(data.serviceCategories) || !data.serviceCategories.includes('bbq')) {
      errors.push(`${itemId}: not tagged 'bbq'`);
      return;
    }
    if (!data.isActive || !data.isVisible) {
      errors.push(`${itemId}: not active/visible`);
      return;
    }
    if (!data.bbqMenuGroup || !validGroups.includes(data.bbqMenuGroup)) {
      errors.push(`${itemId}: invalid or missing bbqMenuGroup`);
      return;
    }
    validItems.push({ itemId, data });
  });

  if (errors.length > 0) {
    const err = new Error(`Cannot save draft — ${errors.length} item(s) failed validation.`);
    err.itemErrors = errors;
    throw err;
  }

  // --- 5. Load foodTypes for denormalisation (same pattern as
  //         cafeMenuResolver.js / teabarMenuResolver.js) ---
  const foodTypeSnap = await db.collection(COLLECTIONS.FOOD_TYPES).get();
  const foodTypeMap = {};
  foodTypeSnap.docs.forEach((d) => {
    const ft = d.data();
    if (ft && ft.foodTypeCode) {
      foodTypeMap[ft.foodTypeCode] = ft.displayName || ft.foodTypeCode;
    }
  });

  // --- 6. Build the 6-array resolved menu ---
  const menu = EMPTY_MENU();
  for (const { itemId, data } of validItems) {
    const key = GROUP_TO_MENU_KEY[data.bbqMenuGroup];
    menu[key].push({
      itemId,
      itemName:     data.itemName,
      foodTypeCode: data.foodTypeCode,
      foodTypeName: foodTypeMap[data.foodTypeCode] || data.foodTypeCode,
      baseUnit:     data.baseUnit,
      sortOrder:    typeof data.sortOrder === 'number' ? data.sortOrder : 999,
    });
  }
  Object.keys(menu).forEach((key) => {
    menu[key].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  // --- 7. Read bbqSettings for the four cutoff/window timestamps ---
  const settingsDoc = await db.collection(COLLECTIONS.BBQ_SETTINGS).doc(tenantId).get();
  if (!settingsDoc.exists) {
    throw new Error('bbqSettings not found for tenant. Seed it before creating a BBQ event.');
  }
  const settings = settingsDoc.data();
  const toTimestamp = (timeStr) => new Date(`${eventDate}T${timeStr}:00+05:00`);

  // --- 8. Write ---
  const payload = {
    eventDate,
    tenantId,
    status: EVENT_STATUS_OFFICIAL.DRAFT, // saving always (re)sets to draft —
      // including when overwriting a 'returned' event, which is the
      // expected "Manager fixes it and it's a fresh draft again" flow.
    menu,
    preorderCutoffAt:   toTimestamp(settings.preorderCutoffTime),
    orderWindowStartAt: toTimestamp(settings.orderWindowStartTime),
    orderWindowEndAt:   toTimestamp(settings.orderWindowEndTime),
    closeoutAt:          toTimestamp(settings.closeoutTime),
    kitchenTargetLockedAt: null,
    kitchenTargetSnapshot: null,
    createdByUid: uid,
    approvedByUid: null,
    publishedAt: null,
    returnedByUid: null,
    returnComments: null,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing.exists) {
    await ref.update(payload);
  } else {
    await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp() });
  }

  return { eventId, eventDate, status: EVENT_STATUS_OFFICIAL.DRAFT, itemCount: validItems.length };
}

async function submitBbqEvent({ eventId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('BBQ event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const submittableStatuses = [EVENT_STATUS_OFFICIAL.DRAFT, EVENT_STATUS_OFFICIAL.RETURNED];
  if (!submittableStatuses.includes(event.status)) {
    throw new Error(`Cannot submit event with status: ${event.status}`);
  }

  await ref.update({ status: EVENT_STATUS_OFFICIAL.PENDING_REVIEW, updatedAt: FieldValue.serverTimestamp() });
  return { eventId, status: EVENT_STATUS_OFFICIAL.PENDING_REVIEW };
}

async function publishBbqEvent({ eventId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('BBQ event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');
  if (event.status !== EVENT_STATUS_OFFICIAL.PENDING_REVIEW) {
    throw new Error(`Cannot publish event with status: ${event.status}`);
  }

  await ref.update({
    status: EVENT_STATUS_OFFICIAL.PUBLISHED,
    approvedByUid: uid,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { eventId, status: EVENT_STATUS_OFFICIAL.PUBLISHED };
}

async function returnBbqEvent({ eventId, tenantId, uid, returnComments }) {
  if (!returnComments) throw new Error('returnComments is required when returning a BBQ event.');
  const ref = db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('BBQ event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');
  if (event.status !== EVENT_STATUS_OFFICIAL.PENDING_REVIEW) {
    throw new Error(`Cannot return event with status: ${event.status}`);
  }

  await ref.update({
    status: EVENT_STATUS_OFFICIAL.RETURNED,
    returnedByUid: uid,
    returnComments,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { eventId, status: EVENT_STATUS_OFFICIAL.RETURNED, returnComments };
}

async function cancelBbqEvent({ eventId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('BBQ event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const terminalStatuses = [EVENT_STATUS_OFFICIAL.CLOSED, EVENT_STATUS_OFFICIAL.CANCELLED];
  if (terminalStatuses.includes(event.status)) {
    throw new Error(`Cannot cancel event with status: ${event.status}`);
  }

  await ref.update({
    status: EVENT_STATUS_OFFICIAL.CANCELLED,
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { eventId, status: EVENT_STATUS_OFFICIAL.CANCELLED };
}

async function getBbqEvent({ tenantId, eventId }) {
  const doc = await db.collection(COLLECTIONS.BBQ_EVENTS).doc(eventId).get();
  if (!doc.exists) return { notFound: true };
  const data = doc.data();
  if (data.tenantId !== tenantId) return { notFound: true };
  return { notFound: false, ..._cleanEvent(data) };
}

async function getBbqEvents({ tenantId, status, limit }) {
  let query = db.collection(COLLECTIONS.BBQ_EVENTS).where('tenantId', '==', tenantId);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('eventDate', 'desc').limit(limit || 20);

  const snap = await query.get();
  return snap.docs.map((d) => _cleanEvent(d.data()));
}

module.exports = {
  saveBbqEventDraft,
  submitBbqEvent,
  publishBbqEvent,
  returnBbqEvent,
  cancelBbqEvent,
  getBbqEvent,
  getBbqEvents,
};