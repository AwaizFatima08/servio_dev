// ─────────────────────────────────────────────────────────────────────────────
// profileRoutes.js — Employee Profile API
// HomiLabs | Servio
//
// FILE LOCATION: functions/src/profile/profileRoutes.js
//
// Endpoints:
//   GET   /profile/me                           — get own profile
//   PATCH /profile/me                           — submit profile update
//   GET   /profile/pending-change/:employeeNumber — admin reads pending change
//   POST  /profile/pending-change               — Bug 17 fix: mobile submit pending change
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const { getMyProfile, updateMyProfile, getPendingChange } = require('./profileService');

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
// GET /profile/me
// Returns the current user's profile (users + employees data merged)
// Used by: Screen 18 — My Profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;

    const profile = await getMyProfile({ uid, tenantId });

    return res.status(200).json({ profile });

  } catch (error) {
    console.error('GET /profile/me error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /profile/me
// Employee submits a profile update
// Sensitive fields (grade, designation, house) go to pending state
// phoneNumber and displayName are applied immediately
// Body: { grade, designation, houseNumber, residenceType, phoneNumber, displayName }
//       — all optional, send only what is changing
// Used by: Screen 18 — My Profile (edit)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/me', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(res, 'No update fields provided', 400);
    }

    // Only allow known fields — reject unknown keys for safety
    // Bug 18a fix: added displayName
    const allowedFields = ['grade', 'designation', 'houseNumber', 'residenceType', 'phoneNumber', 'displayName'];
    const unknownFields = Object.keys(updates).filter(k => !allowedFields.includes(k));
    if (unknownFields.length > 0) {
      return errorResponse(res, `Unknown fields: ${unknownFields.join(', ')}`, 400);
    }

    const result = await updateMyProfile({ uid, tenantId, updates });

    return res.status(200).json({ message: result.message });

  } catch (error) {
    console.error('PATCH /profile/me error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /profile/pending-change/:employeeNumber
// Admin reads the pending profile change for a specific employee
// Shows current values vs pending values side by side
// Admin / super_admin only
// Used by: Screen 13 — User Management (review pending changes)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending-change/:employeeNumber', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { employeeNumber } = req.params;

    if (!employeeNumber) {
      return errorResponse(res, 'employeeNumber is required', 400);
    }

    const result = await getPendingChange({ officialEmployeeNumber: employeeNumber, tenantId });

    return res.status(200).json(result);

  } catch (error) {
    console.error('GET /profile/pending-change error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /profile/pending-change
// Bug 17 fix: mobile profile screen calls this endpoint to submit a change.
// Routes to the same updateMyProfile() as PATCH /profile/me.
// Body: { grade, designation, houseNumber, residenceType, phoneNumber }
//       — all optional, send only what is changing
// Any authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/pending-change', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(res, 'No update fields provided', 400);
    }

    const allowedFields = ['grade', 'designation', 'houseNumber', 'residenceType', 'phoneNumber', 'displayName'];
    const unknownFields = Object.keys(updates).filter(k => !allowedFields.includes(k));
    if (unknownFields.length > 0) {
      return errorResponse(res, `Unknown fields: ${unknownFields.join(', ')}`, 400);
    }

    const result = await updateMyProfile({ uid, tenantId, updates });

    return res.status(200).json({ message: result.message });

  } catch (error) {
    console.error('POST /profile/pending-change error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
