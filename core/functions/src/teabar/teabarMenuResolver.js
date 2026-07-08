// ─────────────────────────────────────────
// teabarMenuResolver.js — V1.3 (Tea Bar — Menu, second slice)
// HomiLabs | Servio
//
// Mirrors cafeMenuResolver.js exactly, pointed at Tea Bar's own tag and
// its own resolved document instead of café's. Café's resolver has
// "cafe" written directly into its logic in several places — it cannot
// be reused as-is for another service, which is why this is its own file.
//
// Reads menuItems where serviceCategories includes 'teabar' AND tenantId
// matches AND isActive=true AND isVisible=true. Builds the fat
// serviceMenuConfigs/teabar document.
//
// Called by:
//   - POST /teabar/admin/rebuild-menu  (admin/manager endpoint)
//
// Tea Bar serves only pre-packaged or machine/microwave-prepared items —
// hot beverages (Nestlé machine + teabags), cold beverages, packed juices,
// packed snacks, and microwave-warmed items. No kitchen, no cooking, no
// prep-time tracking (locked design decision, TeaBar_Design_Lock §9,
// reconfirmed 03-Jul-2026). This is WHY teabarOrders has no third
// "preparing" status, unlike café.
//
// SIMPLIFICATION (deliberate, matches Tea Bar's "list" display style,
// unlike café's "restaurant" style): everything goes into ONE flat
// items[] array. Café splits food vs beverages because beverages are a
// secondary addition there — for Tea Bar, beverages ARE the point, so a
// split adds complexity with no real benefit. No beverages[] array here.
//
// "Packed juices" folded into the existing BEV_COLD foodTypeCode rather
// than a new code (03-Jul-2026 — simplicity default, easy to split later
// if reporting ever needs it).
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS } = require('../constants');

const TEABAR_SERVICE_ID    = 'teabar';
const TEABAR_SERVICE_LABEL = 'Tea Bar';

// foodTypes lookup — cached per call to avoid N reads. Duplicated from
// cafeMenuResolver.js rather than shared, matching this project's existing
// convention of each service module being self-contained.
async function _loadFoodTypeMap() {
  const snap = await db.collection(COLLECTIONS.FOOD_TYPES).get();
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data && data.foodTypeCode) {
      map[data.foodTypeCode] = {
        displayName: data.displayName || data.foodTypeCode,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
      };
    }
  });
  return map;
}

/**
 * Rebuild the serviceMenuConfigs/teabar document for the given tenant.
 *
 * @param {Object} args
 * @param {string} args.tenantId
 * @param {string} args.triggeredByUid — for audit (lastUpdatedBy)
 * @returns {Promise<{itemCount: number}>}
 */
async function rebuildTeabarMenu({ tenantId, triggeredByUid }) {
  if (!tenantId) throw new Error('tenantId is required.');

  // 1. Fetch all menuItems for this tenant tagged 'teabar', active and visible.
  const snap = await db
    .collection(COLLECTIONS.MENU_ITEMS)
    .where('tenantId', '==', tenantId)
    .where('serviceCategories', 'array-contains', 'teabar')
    .where('isActive', '==', true)
    .where('isVisible', '==', true)
    .get();

  // 2. Load food type map (name + sortOrder) for denormalisation and grouping.
  const foodTypeMap = await _loadFoodTypeMap();

  // 3. Build ONE flat items array (no beverages[] split — see file header).
  //    Grouped by food type first — using foodTypes.sortOrder, the
  //    admin-controlled display order for food types themselves — then by
  //    each item's own sortOrder within that food type. Matches the locked
  //    design decision in
  //    TeaBar_Frontend_Screen_Map_and_History_Filters_05Jul2026.md §1a.
  //    Fixed 08-Jul-2026 — this resolver previously sorted by item
  //    sortOrder only, with no food-type grouping at all; caught while
  //    building Screen 1.
  const items = snap.docs
    .map((d) => {
      const m = d.data();
      const foodType = foodTypeMap[m.foodTypeCode] || { displayName: m.foodTypeCode, sortOrder: 999 };
      return {
        itemId:             m.itemId || d.id,
        itemName:           m.itemName,
        foodTypeCode:       m.foodTypeCode,
        foodTypeName:       foodType.displayName,
        baseUnit:           m.baseUnit,
        sortOrder:          typeof m.sortOrder === 'number' ? m.sortOrder : 999,
        unitRate:           null,            // FFL is retrospective
        rateType:           m.rateType || 'retrospective',
        _foodTypeSortOrder: foodType.sortOrder, // temp, sort key only — stripped below
      };
    })
    .sort((a, b) => {
      if (a._foodTypeSortOrder !== b._foodTypeSortOrder) {
        return a._foodTypeSortOrder - b._foodTypeSortOrder;
      }
      return a.sortOrder - b.sortOrder;
    })
    .map(({ _foodTypeSortOrder, ...item }) => item); // strip temp field before writing to Firestore

  // 4. Write the fat document.
  const now = new Date();
  const docRef = db.collection(COLLECTIONS.SERVICE_MENU_CONFIGS).doc(TEABAR_SERVICE_ID);
  const existing = await docRef.get();

  const payload = {
    serviceId:       TEABAR_SERVICE_ID,
    serviceName:     TEABAR_SERVICE_LABEL,
    menuMode:        'alacarte',
    displayStyle:    'list',   // Tea Bar + Tuck Shop use 'list', not café's 'restaurant'
    items,
    beverages:       [],       // always empty for Tea Bar — no split, see file header
    isActive:        true,
    tenantId,
    lastUpdatedBy:   triggeredByUid || 'system',
    updatedAt:       now,
  };

  if (existing.exists) {
    await docRef.update(payload);
  } else {
    await docRef.set({ ...payload, createdAt: now });
  }

  return {
    itemCount: items.length,
  };
}

module.exports = {
  rebuildTeabarMenu,
};
