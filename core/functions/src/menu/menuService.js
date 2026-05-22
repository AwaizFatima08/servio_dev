// ─────────────────────────────────────────
// menuService.js — Menu Catalogue Logic
// HomiLabs | Servio | Flow 03
// ─────────────────────────────────────────
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../constants');

const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

const _toISO = (t) => {
  if (!t) return null;
  if (t._seconds) return new Date(t._seconds * 1000).toISOString();
  if (t.toDate) return t.toDate().toISOString();
  return t;
};

const _cleanTimestamps = (data) => ({
  ...data,
  createdAt: _toISO(data.createdAt),
  updatedAt: _toISO(data.updatedAt),
});

// ─────────────────────────────────────────
// getFoodTypes
// ─────────────────────────────────────────
const getFoodTypes = async () => {
  const snapshot = await db.collection(COLLECTIONS.FOOD_TYPES)
    .where('isActive', '==', true)
    .get();

  const items = snapshot.docs
    .map(doc => _cleanTimestamps(doc.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { success: true, count: items.length, foodTypes: items };
};

// ─────────────────────────────────────────
// getMealTypes
// ─────────────────────────────────────────
const getMealTypes = async () => {
  const snapshot = await db.collection(COLLECTIONS.MEAL_TYPES)
    .where('isActive', '==', true)
    .get();

  const items = snapshot.docs
    .map(doc => _cleanTimestamps(doc.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { success: true, count: items.length, mealTypes: items };
};

// ─────────────────────────────────────────
// addMenuItem
// ─────────────────────────────────────────
const addMenuItem = async ({
  itemName, itemType, serviceCategories, foodTypeCode,
  baseUnit, supportsFeedback, supportsRate, sortOrder,
  constituentItemIds, constituentItemNames,
  rateType, tenantId, createdByUid,
}) => {

  // Validate foodTypeCode exists
  const ftDoc = await db.collection(COLLECTIONS.FOOD_TYPES).doc(foodTypeCode).get();
  if (!ftDoc.exists) {
    return { success: false, message: `Food type ${foodTypeCode} not found` };
  }

  const ref = db.collection(COLLECTIONS.MENU_ITEMS).doc();
  await ref.set({
    itemId: ref.id,
    itemName,
    itemType,
    serviceCategories: serviceCategories || [],
    foodTypeCode,
    baseUnit,
    constituentItemIds: constituentItemIds || null,
    constituentItemNames: constituentItemNames || null,
    baseRate: null,
    rateType: rateType || 'retrospective',
    effectiveFrom: null,
    effectiveTo: null,
    supportsFeedback: supportsFeedback !== false,
    supportsRate: supportsRate !== false,
    isActive: true,
    isVisible: true,
    sortOrder: sortOrder || 0,
    tenantId,
    createdAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Menu item "${itemName}" added successfully`,
    itemId: ref.id,
  };
};

// ─────────────────────────────────────────
// getMenuItems
// ─────────────────────────────────────────
const getMenuItems = async ({ serviceCategory, foodTypeCode, isActive, search, limit = 100 }) => {

  const snapshot = await db.collection(COLLECTIONS.MENU_ITEMS)
    .where('tenantId', '==', 'ffl')
    .limit(limit)
    .get();

  let items = snapshot.docs.map(doc => _cleanTimestamps(doc.data()));

  if (isActive !== undefined) {
    items = items.filter(i => i.isActive === isActive);
  }

  if (foodTypeCode) {
    items = items.filter(i => i.foodTypeCode === foodTypeCode);
  }

  if (serviceCategory) {
    items = items.filter(i => i.serviceCategories && i.serviceCategories.includes(serviceCategory));
  }

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(i => i.itemName.toLowerCase().includes(term));
  }

  items.sort((a, b) => a.sortOrder - b.sortOrder);

  return { success: true, count: items.length, items };
};

// ─────────────────────────────────────────
// getMenuItem
// ─────────────────────────────────────────
const getMenuItem = async (itemId) => {
  const doc = await db.collection(COLLECTIONS.MENU_ITEMS).doc(itemId).get();

  if (!doc.exists) {
    return { success: false, message: `Menu item ${itemId} not found` };
  }

  return { success: true, item: _cleanTimestamps(doc.data()) };
};

// ─────────────────────────────────────────
// updateMenuItem
// ─────────────────────────────────────────
const updateMenuItem = async (itemId, updates) => {
  const doc = await db.collection(COLLECTIONS.MENU_ITEMS).doc(itemId).get();

  if (!doc.exists) {
    return { success: false, message: `Menu item ${itemId} not found` };
  }

  // Only allow safe fields to be updated
  const allowed = ['itemName', 'serviceCategories', 'foodTypeCode', 'baseUnit',
    'supportsFeedback', 'supportsRate', 'sortOrder',
    'constituentItemIds', 'constituentItemNames'];

  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, message: 'No valid fields to update' };
  }

  safeUpdates.updatedAt = ts();
  await db.collection(COLLECTIONS.MENU_ITEMS).doc(itemId).update(safeUpdates);

  return { success: true, message: `Menu item updated`, itemId };
};

// ─────────────────────────────────────────
// setMenuItemStatus
// ─────────────────────────────────────────
const setMenuItemStatus = async (itemId, isActive) => {
  const doc = await db.collection(COLLECTIONS.MENU_ITEMS).doc(itemId).get();

  if (!doc.exists) {
    return { success: false, message: `Menu item ${itemId} not found` };
  }

  await db.collection(COLLECTIONS.MENU_ITEMS).doc(itemId).update({
    isActive,
    isVisible: isActive,
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Menu item ${isActive ? 'activated' : 'deactivated'}`,
    itemId,
    isActive,
  };
};

module.exports = { getFoodTypes, getMealTypes, addMenuItem, getMenuItems, getMenuItem, updateMenuItem, setMenuItemStatus };