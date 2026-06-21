// ─────────────────────────────────────────
// cafeMenuService.js — V1.2 Web Slice 1
// HomiLabs | Servio
//
// Read-only access to the resolved café menu document.
// Backs GET /cafe/menu (employee-facing read endpoint).
//
// Reads the fat document at serviceMenuConfigs/cafe written by
// cafeMenuResolver.js. Does not query menuItems directly — the resolver
// is the only writer; this service is the only reader (Slice 1).
//
// Returns { notFound: true } for any of:
//   - doc does not exist (resolver never ran for this tenant)
//   - doc exists but tenantId does not match the caller's tenant
//   - doc exists but isActive === false
// All three states render the same "menu is being set up" empty state
// on the client. This is deliberate — soft-disable and never-published
// are indistinguishable to an employee, and that's fine.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS } = require('../constants');

const CAFE_SERVICE_ID = 'cafe';

/**
 * Read the café menu fat document for the given tenant.
 *
 * @param {Object} args
 * @param {string} args.tenantId
 * @returns {Promise<{
 *   serviceName: string,
 *   items: Array,
 *   beverages: Array,
 *   updatedAt: string | null,
 *   notFound: false
 * } | { notFound: true }>}
 */
async function getCafeMenu({ tenantId }) {
  if (!tenantId) throw new Error('tenantId is required.');

  const snap = await db
    .collection(COLLECTIONS.SERVICE_MENU_CONFIGS)
    .doc(CAFE_SERVICE_ID)
    .get();

  if (!snap.exists) {
    return { notFound: true };
  }

  const data = snap.data() || {};

  // Tenant guard. In V1 there is only one tenant, but we never want a
  // single misconfigured doc to leak across tenants in the future.
  if (data.tenantId !== tenantId) {
    return { notFound: true };
  }

  // Treat soft-disabled as "not published" — same UX as not-found.
  if (data.isActive === false) {
    return { notFound: true };
  }

  // Convert Firestore Timestamp -> ISO string for HTTP transport.
  const updatedAt =
    data.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate().toISOString()
      : null;

  return {
    serviceName: data.serviceName || 'Café',
    items:       Array.isArray(data.items)     ? data.items     : [],
    beverages:   Array.isArray(data.beverages) ? data.beverages : [],
    updatedAt,
    notFound: false,
  };
}

module.exports = {
  getCafeMenu,
};