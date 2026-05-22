// ─────────────────────────────────────────
// menuRoutes.js — Menu Catalogue Endpoints
// HomiLabs | Servio | Flow 03
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  getFoodTypes, getMealTypes,
  addMenuItem, getMenuItems, getMenuItem,
  updateMenuItem, setMenuItemStatus,
} = require('./menuService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse, validateRequired } = require('../utils');
const { ROLES } = require('../constants');

const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

// ─────────────────────────────────────────
// GET /menu/food-types
// ─────────────────────────────────────────
router.get('/food-types', adminOnly, async (req, res) => {
  try {
    const result = await getFoodTypes();
    return successResponse(res, { count: result.count, foodTypes: result.foodTypes }, 'Food types retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve food types', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /menu/meal-types
// ─────────────────────────────────────────
router.get('/meal-types', adminOnly, async (req, res) => {
  try {
    const result = await getMealTypes();
    return successResponse(res, { count: result.count, mealTypes: result.mealTypes }, 'Meal types retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve meal types', 500, error);
  }
});

// ─────────────────────────────────────────
// POST /menu/items
// Body: { itemName, itemType, serviceCategories, foodTypeCode, baseUnit,
//         supportsFeedback, supportsRate, sortOrder, rateType,
//         constituentItemIds, constituentItemNames }
// ─────────────────────────────────────────
router.post('/items', adminOnly, async (req, res) => {
  try {
    const missing = validateRequired(req.body, [
      'itemName', 'itemType', 'foodTypeCode', 'baseUnit',
    ]);

    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    const result = await addMenuItem({
      ...req.body,
      tenantId: 'ffl',
      createdByUid: req.user.uid,
    });

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { itemId: result.itemId }, result.message, 201);

  } catch (error) {
    return errorResponse(res, 'Failed to add menu item', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /menu/items
// Query: serviceCategory, foodTypeCode, isActive, search, limit
// ─────────────────────────────────────────
router.get('/items', adminOnly, async (req, res) => {
  try {
    const { serviceCategory, foodTypeCode, isActive, search, limit } = req.query;

    const result = await getMenuItems({
      serviceCategory: serviceCategory || null,
      foodTypeCode: foodTypeCode || null,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search || null,
      limit: limit ? parseInt(limit) : 100,
    });

    return successResponse(res, { count: result.count, items: result.items }, 'Menu items retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve menu items', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /menu/items/:itemId
// ─────────────────────────────────────────
router.get('/items/:itemId', adminOnly, async (req, res) => {
  try {
    const result = await getMenuItem(req.params.itemId);

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, { item: result.item }, 'Menu item retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve menu item', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /menu/items/:itemId
// Update item fields
// ─────────────────────────────────────────
router.patch('/items/:itemId', adminOnly, async (req, res) => {
  try {
    const result = await updateMenuItem(req.params.itemId, req.body);

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { itemId: result.itemId }, result.message);

  } catch (error) {
    return errorResponse(res, 'Failed to update menu item', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /menu/items/:itemId/status
// Body: { isActive: true | false }
// ─────────────────────────────────────────
router.patch('/items/:itemId/status', adminOnly, async (req, res) => {
  try {
    if (req.body.isActive === undefined) {
      return errorResponse(res, 'isActive field is required', 400);
    }

    const result = await setMenuItemStatus(req.params.itemId, Boolean(req.body.isActive));

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, { itemId: result.itemId, isActive: result.isActive }, result.message);

  } catch (error) {
    return errorResponse(res, 'Failed to update menu item status', 500, error);
  }
});

module.exports = router;