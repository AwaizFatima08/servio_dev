// ─────────────────────────────────────────────────────────────────────────────
// appSettingsRoutes.js — App Settings API
// HomiLabs | Servio
//
// FILE LOCATION: functions/src/appSettings/appSettingsRoutes.js
// This is a NEW file inside the NEW folder: functions/src/appSettings/
//
// Endpoints:
//   GET   /app-settings    — any authenticated user reads settings
//   PATCH /app-settings    — admin updates settings
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const { getAppSettings, updateAppSettings } = require('./appSettingsService');

const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.ACCOUNTS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

const adminOnly = [verifyToken, verifyRole(
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

// ─────────────────────────────────────────────────────────────────────────────
// GET /app-settings
// Returns the tenant's app settings
// Any authenticated user — settings like feedback window and date format
// are needed by multiple screens
// Used by: Screen 19 — App Settings (admin view)
//          Also used on app startup to cache settings on the frontend
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const settings = await getAppSettings({ tenantId });

    return res.status(200).json({ settings });

  } catch (error) {
    console.error('GET /app-settings error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /app-settings
// Admin updates one or more configurable settings
// Body: object with one or more allowed setting fields
// Example: { "mealFeedbackWindowHours": 48, "notificationExpiryDays": 60 }
// Admin / super_admin only
// Used by: Screen 19 — App Settings (edit)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const updatedByUid = req.user.uid;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(res, 'No update fields provided', 400);
    }

    const result = await updateAppSettings({ tenantId, updates, updatedByUid });

    return res.status(200).json({ message: result.message, updatedFields: result.updatedFields });

  } catch (error) {
    console.error('PATCH /app-settings error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
