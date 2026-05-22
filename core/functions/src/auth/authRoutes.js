// ─────────────────────────────────────────
// authRoutes.js — Auth & Identity Endpoints
// HomiLabs | Servio | Flow 01
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { registerEmployee, approveRegistration, getUserProfile } = require('./authService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse, validateRequired } = require('../utils');
const { ROLES } = require('../constants');

// ─────────────────────────────────────────
// POST /auth/register
// Public — called right after Firebase Auth account creation
// Body: { officialEmployeeNumber, cnicLast4, dateOfBirth, personalEmail, uid }
// ─────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const missing = validateRequired(req.body, [
      'officialEmployeeNumber',
      'cnicLast4',
      'dateOfBirth',
      'personalEmail',
      'uid',
    ]);

    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    const { officialEmployeeNumber, cnicLast4, dateOfBirth, personalEmail, uid } = req.body;
    const ipAddress = req.ip || null;

    const result = await registerEmployee({
      uid,
      officialEmployeeNumber: officialEmployeeNumber.trim().toUpperCase(),
      cnicLast4: cnicLast4.trim(),
      dateOfBirth: dateOfBirth.trim(),
      personalEmail: personalEmail.trim().toLowerCase(),
      ipAddress,
    });

    if (!result.success) {
      return errorResponse(res, `Registration failed: ${result.code}`, 400);
    }

    return successResponse(res, { requestId: result.requestId }, result.message, 201);

  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return errorResponse(res, 'Registration failed due to a server error', 500, error);
  }
});

// ─────────────────────────────────────────
// POST /auth/approve/:requestId
// Protected — admin or super_admin only
// Approves a pending registration request
// ─────────────────────────────────────────
router.post('/approve/:requestId',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        return errorResponse(res, 'Request ID is required', 400);
      }

      const result = await approveRegistration({
        requestId,
        approvedByUid: req.user.uid,
      });

      if (!result.success) {
        return errorResponse(res, result.message, 400);
      }

      return successResponse(res, {
        uid: result.uid,
        officialEmployeeNumber: result.officialEmployeeNumber,
      }, result.message);

    } catch (error) {
      return errorResponse(res, 'Approval failed due to a server error', 500, error);
    }
  }
);

// ─────────────────────────────────────────
// GET /auth/profile
// Protected — any authenticated user
// Returns user role + employee data on login
// ─────────────────────────────────────────
router.get('/profile',
  verifyToken,
  async (req, res) => {
    try {
      const result = await getUserProfile(req.user.uid);

      if (!result.success) {
        return errorResponse(res, result.message, 403);
      }

      return successResponse(res, {
        user: result.user,
        employee: result.employee,
      }, 'Profile loaded');

    } catch (error) {
      return errorResponse(res, 'Failed to load profile', 500, error);
    }
  }
);

// ─────────────────────────────────────────
// GET /auth/ping
// Public — health check for auth routes
// ─────────────────────────────────────────
router.get('/ping', (req, res) => {
  return successResponse(res, {}, 'Auth routes active');
});

module.exports = router;