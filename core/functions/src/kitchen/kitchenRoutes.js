// ─────────────────────────────────────────
// kitchenRoutes.js — Kitchen Dashboard Endpoints
// HomiLabs | Servio | Flow 15
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { getHeadcount, getIssuanceProgress, getDaySummary } = require('./kitchenService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse } = require('../utils');
const { ROLES } = require('../constants');

// Accessible to mess supervisor, manager, admin, super_admin
const kitchenAccess = [
  verifyToken,
  verifyRole(ROLES.MESS_SUPERVISOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
];

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

// ─────────────────────────────────────────
// GET /kitchen/headcount
// Post-cutoff confirmed booking count per combo
// Kitchen uses this to know how many meals to prepare
// Query: ?date=YYYY-MM-DD&mealType=lunch
// ─────────────────────────────────────────
router.get('/headcount', kitchenAccess, async (req, res) => {
  try {
    const { date, mealType } = req.query;

    if (!date || !mealType) {
      return errorResponse(res, 'date and mealType are required', 400);
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return errorResponse(res, 'mealType must be breakfast, lunch, or dinner', 400);
    }

    const result = await getHeadcount(req.tenantId, date, mealType);
    return successResponse(res, result, 'Kitchen headcount retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve kitchen headcount', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /kitchen/issuance-progress
// Live issued / pending / no-show per combo
// Supervisor refreshes this as meals are served
// Query: ?date=YYYY-MM-DD&mealType=lunch
// ─────────────────────────────────────────
router.get('/issuance-progress', kitchenAccess, async (req, res) => {
  try {
    const { date, mealType } = req.query;

    if (!date || !mealType) {
      return errorResponse(res, 'date and mealType are required', 400);
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return errorResponse(res, 'mealType must be breakfast, lunch, or dinner', 400);
    }

    const result = await getIssuanceProgress(req.tenantId, date, mealType);
    return successResponse(res, result, 'Issuance progress retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve issuance progress', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /kitchen/summary
// All three meal types in one call — full day view
// Query: ?date=YYYY-MM-DD
// ─────────────────────────────────────────
router.get('/summary', kitchenAccess, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return errorResponse(res, 'date is required', 400);
    }

    const result = await getDaySummary(req.tenantId, date);
    return successResponse(res, result, 'Kitchen day summary retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve kitchen day summary', 500, error);
  }
});

module.exports = router;