// ─────────────────────────────────────────
// authRoutes.js — Auth & Identity Endpoints
// HomiLabs | Servio | Flow 01
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  registerEmployee, approveRegistration, getUserProfile,
  getPendingRequests, rejectRegistration,
  listUsers, changeUserRole, changeUserStatus, resetThrottle,
  getUserByEmployeeNumber,
} = require('./authService');
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

// ─────────────────────────────────────────────────────────────────────────────
// authRoutes_ADDITIONS.js
// HomiLabs | Servio
//
// INSTRUCTIONS FOR HOMI:
// These are NEW routes to ADD to your existing authRoutes.js file.
// Do NOT replace authRoutes.js — paste these routes BEFORE the final line:
//   module.exports = router;
//
// Also update the require at the top of authRoutes.js:
// CHANGE this line:
//   const { registerEmployee, approveRegistration, getUserProfile } = require('./authService');
// TO:
//   const {
//     registerEmployee, approveRegistration, getUserProfile,
//     getPendingRequests, rejectRegistration,
//     listUsers, changeUserRole, changeUserStatus, resetThrottle,
//   } = require('./authService');
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/pending-requests
// Returns all registration requests with status "pending"
// Admin / super_admin only
// Used by: Screen 13 — User Management (pending approvals tab)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending-requests',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const result = await getPendingRequests({ tenantId });
      return res.status(200).json({
        count: result.length,
        requests: result,
      });
    } catch (error) {
      console.error('GET pending-requests error:', error);
      return errorResponse(res, 'Failed to fetch pending requests', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/reject/:requestId
// Rejects a pending registration request
// Admin / super_admin only
// Used by: Screen 13 — User Management (reject button)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reject/:requestId',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const rejectedByUid = req.user.uid;

      if (!requestId) {
        return errorResponse(res, 'requestId is required', 400);
      }

      const result = await rejectRegistration({ requestId, rejectedByUid });

      if (!result.success) {
        return errorResponse(res, result.message, 400);
      }

      return res.status(200).json({ message: result.message });

    } catch (error) {
      console.error('REJECT registration error:', error);
      return errorResponse(res, 'Failed to reject registration', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/users
// Returns all active user accounts for the tenant
// Admin / super_admin only
// Used by: Screen 13 — User Management (users list tab)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const result = await listUsers({ tenantId });
      return res.status(200).json({
        count: result.length,
        users: result,
      });
    } catch (error) {
      console.error('GET /auth/users error:', error);
      return errorResponse(res, 'Failed to fetch users', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /auth/users/:uid/role
// Changes a user's role
// Admin / super_admin only
// Body: { role }
// Used by: Screen 13 — User Management (change role)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/users/:uid/role',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const { role } = req.body;
      const changedByUid = req.user.uid;

      if (!role) {
        return errorResponse(res, 'role is required', 400);
      }

      const result = await changeUserRole({ uid, role, changedByUid });

      if (!result.success) {
        return errorResponse(res, result.message, 400);
      }

      return res.status(200).json({ message: result.message });

    } catch (error) {
      console.error('PATCH role error:', error);
      return errorResponse(res, 'Failed to change role', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /auth/users/:uid/status
// Activates or deactivates a user account
// Admin / super_admin only
// Body: { status }  — "active" | "inactive" | "suspended"
// Used by: Screen 13 — User Management (activate/deactivate toggle)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/users/:uid/status',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const { status } = req.body;
      const changedByUid = req.user.uid;

      if (!status) {
        return errorResponse(res, 'status is required', 400);
      }

      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 400);
      }

      const result = await changeUserStatus({ uid, status, changedByUid });

      if (!result.success) {
        return errorResponse(res, result.message, 400);
      }

      return res.status(200).json({ message: result.message });

    } catch (error) {
      console.error('PATCH status error:', error);
      return errorResponse(res, 'Failed to change status', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/users/:uid/reset-throttle
// Clears the isThrottled flag on an employee record
// Admin / super_admin only
// Used by: Screen 13 — User Management (reset throttle button)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/users/:uid/reset-throttle',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const resetByUid = req.user.uid;

      const result = await resetThrottle({ uid, resetByUid });

      if (!result.success) {
        return errorResponse(res, result.message, 400);
      }

      return res.status(200).json({ message: result.message });

    } catch (error) {
      console.error('POST reset-throttle error:', error);
      return errorResponse(res, 'Failed to reset throttle', 500, error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/user-by-employee-number/:officialEmployeeNumber
// Looks up ONE user account by employee number — returns minimal identity
// fields, only for an ACTIVE account. Built for Tea Bar Screen 8 (attendant
// assignment).
// Manager / admin / super_admin only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/user-by-employee-number/:officialEmployeeNumber',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { officialEmployeeNumber } = req.params;
      const tenantId = req.tenantId;

      const result = await getUserByEmployeeNumber({ officialEmployeeNumber, tenantId });

      if (!result.success) {
        return errorResponse(res, result.message, 404);
      }

      return res.status(200).json({
        fullName: result.fullName,
        officialEmployeeNumber: result.officialEmployeeNumber,
        uid: result.uid,
        role: result.role,
      });

    } catch (error) {
      console.error('GET user-by-employee-number error:', error);
      return errorResponse(res, 'Failed to look up user', 500, error);
    }
  }
);

module.exports = router;