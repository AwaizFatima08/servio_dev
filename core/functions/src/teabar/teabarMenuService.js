// ─────────────────────────────────────────
// teabarMenuService.js — V1.3 (Tea Bar — Menu, second slice)
// HomiLabs | Servio
//
// Mirrors cafeMenuService.js exactly, pointed at Tea Bar's own resolved
// document. Read-only access to the resolved Tea Bar menu.
// Backs GET /teabar/menu — a broad, employee-facing read endpoint. An
// employee needs to see this before choosing an item and a location.
//
// Reads the fat document at serviceMenuConfigs/teabar written by
// teabarMenuResolver.js. Does not query menuItems directly — the
// resolver is the only writer; this service is the only reader.
//
// Returns { notFound: true } for any of:
//   - doc does not exist (resolver never ran for this tenant)
//   - doc exists but tenantId does not match the caller's tenant
//   - doc exists but isActive === false
// Same deliberate "all three look identical to the caller" behaviour as
// café's version — a not-yet-built menu and a soft-disabled one should not
// be distinguishable to an ordinary employee.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS } = require('../constants');

const TEABAR_SERVICE_ID = 'teabar';

/**
 * Read the Tea Bar menu fat document for the given tenant.
 *
 * @param {Object} args
 * @param {string} args.tenantId
 * @returns {Promise<{
 *   serviceName: string,
 *   items: Array,
 *   updatedAt: string | null,
 *   notFound: false
 * } | { notFound: true }>}
 */
async function getTeabarMenu({ tenantId }) {
  if (!tenantId) throw new Error('tenantId is required.');

  const snap = await db
    .collection(COLLECTIONS.SERVICE_MENU_CONFIGS)
    .doc(TEABAR_SERVICE_ID)
    .get();

  if (!snap.exists) {
    return { notFound: true };
  }

  const data = snap.data() || {};

  // Tenant guard — same defensive check café's version has.
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
    serviceName: data.serviceName || 'Tea Bar',
    items:       Array.isArray(data.items) ? data.items : [],
    updatedAt,
    notFound: false,
  };
}

module.exports = {
  getTeabarMenu,
};
