// ─────────────────────────────────────────
// bbqSettingsService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Centralised BBQ policy document, one per tenant — mirrors
// reservationSettings' role exactly (BBQ_V1.4_Design_Draft_10Jul2026.md
// §2.2). Read by BBQ booking/order logic before every action instead of
// hardcoding cutoff times into screens or services.
//
// Doc ID = tenantId ("ffl"). Admin-only read/write (locked 11-Jul-2026 —
// same access pattern as reservationSettings: employees never call this
// directly, only server-side booking logic reads it internally).
//
// GET pattern follows cafeMenuService.js / teabarMenuService.js —
// { notFound: true } instead of throwing, so the route can return a
// clean 404 without a try/catch doing double duty for two different
// failure meanings.
// ─────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS } = require('../constants');

const UPDATABLE_FIELDS = [
  'preorderCutoffTime',
  'orderWindowStartTime',
  'orderWindowEndTime',
  'closeoutTime',
  'allowManagerOverride',
  'requireOverrideReason',
  'tableBookingCutoffTime',
];

/**
 * Read bbqSettings for the given tenant.
 * @param {Object} args
 * @param {string} args.tenantId
 * @returns {Promise<Object|{notFound: true}>}
 */
async function getBbqSettings({ tenantId }) {
  const doc = await db.collection(COLLECTIONS.BBQ_SETTINGS).doc(tenantId).get();

  if (!doc.exists) {
    return { notFound: true };
  }

  const data = doc.data();
  return {
    notFound: false,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  };
}

/**
 * Update bbqSettings — only UPDATABLE_FIELDS accepted, everything else
 * in the request body is silently ignored (same pattern as
 * reservationSettingsRoutes.js).
 * @param {Object} args
 * @param {string} args.tenantId
 * @param {Object} args.body — raw req.body
 */
async function updateBbqSettings({ tenantId, body }) {
  const ref = db.collection(COLLECTIONS.BBQ_SETTINGS).doc(tenantId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error('BBQ settings not found for tenant. Seed the document before updating it.');
  }

  const updates = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No valid fields to update.');
  }

  updates.updatedAt = FieldValue.serverTimestamp();
  await ref.update(updates);

  return { updatedFields: Object.keys(updates).filter((k) => k !== 'updatedAt') };
}

module.exports = {
  getBbqSettings,
  updateBbqSettings,
  UPDATABLE_FIELDS,
};