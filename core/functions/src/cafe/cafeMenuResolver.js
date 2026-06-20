// ─────────────────────────────────────────
// cafeMenuResolver.js — V1.2 Slice 1
// HomiLabs | Servio
//
// Reads menuItems where serviceCategories includes 'cafe' AND tenantId
// matches AND isActive=true AND isVisible=true. Builds the fat
// serviceMenuConfigs/cafe document.
//
// Called by:
//   - POST /cafe/admin/rebuild-menu  (admin endpoint, future web UI)
//   - seed_cafe_menu.js              (one-time dev seed script)
//
// SLICE 1 SIMPLIFICATION: all items go into items[]. The beverages[]
// array (per schema, for items with foodTypeCode = BEV_*) is left empty
// for now. Proper beverage split handled in a later slice when
// tuck shop / tea bar are built and need the same auto-include logic.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS } = require('../constants');

const CAFE_SERVICE_ID    = 'cafe';
const CAFE_SERVICE_LABEL = 'Café';

// foodTypes lookup — cached per call to avoid N reads.
async function _loadFoodTypeNameMap() {
  const snap = await db.collection(COLLECTIONS.FOOD_TYPES).get();
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data && data.foodTypeCode) {
      map[data.foodTypeCode] = data.displayName || data.foodTypeCode;
    }
  });
  return map;
}

/**
 * Rebuild the serviceMenuConfigs/cafe document for the given tenant.
 *
 * @param {Object} args
 * @param {string} args.tenantId
 * @param {string} args.triggeredByUid — for audit (lastUpdatedBy)
 * @returns {Promise<{itemCount: number, beverageCount: number}>}
 */
async function rebuildCafeMenu({ tenantId, triggeredByUid }) {
  if (!tenantId) throw new Error('tenantId is required.');

  // 1. Fetch all menuItems for this tenant tagged 'cafe', active and visible.
  // Firestore array-contains on serviceCategories.
  const snap = await db
    .collection(COLLECTIONS.MENU_ITEMS)
    .where('tenantId', '==', tenantId)
    .where('serviceCategories', 'array-contains', 'cafe')
    .where('isActive', '==', true)
    .where('isVisible', '==', true)
    .get();

  // 2. Load food type name map for denormalisation.
  const foodTypeMap = await _loadFoodTypeNameMap();

  // 3. Build items array. Sort by sortOrder ascending.
  const items = snap.docs
    .map((d) => {
      const m = d.data();
      return {
        itemId:        m.itemId || d.id,
        itemName:      m.itemName,
        foodTypeCode:  m.foodTypeCode,
        foodTypeName:  foodTypeMap[m.foodTypeCode] || m.foodTypeCode,
        baseUnit:      m.baseUnit,
        sortOrder:     typeof m.sortOrder === 'number' ? m.sortOrder : 999,
        unitRate:      null,            // FFL is retrospective
        rateType:      m.rateType || 'retrospective',
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // 4. Write the fat document.
  const now = new Date();
  const docRef = db.collection(COLLECTIONS.SERVICE_MENU_CONFIGS).doc(CAFE_SERVICE_ID);
  const existing = await docRef.get();

  const payload = {
    serviceId:       CAFE_SERVICE_ID,
    serviceName:     CAFE_SERVICE_LABEL,
    menuMode:        'alacarte',
    displayStyle:    'restaurant',
    items,
    beverages:       [],               // Slice 1 simplification — see file header
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
    itemCount:     items.length,
    beverageCount: 0,
  };
}

module.exports = {
  rebuildCafeMenu,
};
