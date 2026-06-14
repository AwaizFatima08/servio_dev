// ─────────────────────────────────────────
// familyRoutes.js — Family Member API
// HomiLabs | Servio | V1 Extension V1.1
//
// FILE LOCATION: functions/src/family/familyRoutes.js
//
// Employee self-service endpoints:
//   GET    /family/me                          — list own family members
//   POST   /family/me                          — add a family member
//   PATCH  /family/me/:familyMemberId          — edit name / DOB
//   PATCH  /family/me/:familyMemberId/status   — activate / deactivate
//   POST   /family/me/:familyMemberId/delete-request   — request permanent deletion
//   DELETE /family/me/:familyMemberId/delete-request   — cancel own deletion request
//
// Admin endpoints:
//   GET    /family/deletion-requests           — list pending deletions (tenant)
//   POST   /family/deletion-requests/:familyMemberId/approve  — permanent delete
//   POST   /family/deletion-requests/:familyMemberId/reject   — reject with note
//
// Route ordering: specific/static segments are declared before the
// parameterised /:familyMemberId routes (Key Technical Rule #9).
// ─────────────────────────────────────────

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { successResponse, errorResponse } = require('../utils');
const {
  listMyFamily,
  addFamilyMember,
  updateFamilyMember,
  setFamilyMemberStatus,
  requestDeletion,
  cancelDeletionRequest,
  listDeletionRequests,
  approveDeletion,
  rejectDeletion,
} = require('./familyService');
const {
  getMyMaritalStatus,
  setMyMaritalStatus,
  listPendingMaritalChanges,
  approveMaritalChange,
  rejectMaritalChange,
} = require('./maritalStatusService');
const { getProfileCompletion } = require('./profileNudgeService');

// Family is a management-employee feature; managers/supervisors who are also
// employees can manage their own family too. Mirrors profileRoutes auth set.
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

// ─────────────────────────────────────────
// ADMIN — deletion request queue
// Declared FIRST so /family/deletion-requests is not captured by /me/:param.
// ─────────────────────────────────────────

// GET /family/deletion-requests
router.get('/deletion-requests', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await listDeletionRequests({ tenantId });
    return successResponse(res, result, 'Deletion requests retrieved');
  } catch (error) {
    console.error('GET /family/deletion-requests error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// POST /family/deletion-requests/:familyMemberId/approve
router.post('/deletion-requests/:familyMemberId/approve', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const result = await approveDeletion({ tenantId, familyMemberId });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('POST /family/deletion-requests/:id/approve error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// POST /family/deletion-requests/:familyMemberId/reject
router.post('/deletion-requests/:familyMemberId/reject', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const { note } = req.body || {};
    const result = await rejectDeletion({ tenantId, familyMemberId, note });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('POST /family/deletion-requests/:id/reject error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────
// EMPLOYEE — self-service
// ─────────────────────────────────────────

// GET /family/me
router.get('/me', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const result = await listMyFamily({ uid, tenantId });
    return successResponse(res, result, 'Family members retrieved');
  } catch (error) {
    console.error('GET /family/me error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// POST /family/me
router.post('/me', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { relation, fullName, dateOfBirth } = req.body || {};
    const result = await addFamilyMember({ uid, tenantId, relation, fullName, dateOfBirth });
    return successResponse(res, result, result.message, 201);
  } catch (error) {
    console.error('POST /family/me error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// PATCH /family/me/:familyMemberId/status   (specific suffix before bare :param)
router.patch('/me/:familyMemberId/status', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const { isActive } = req.body || {};
    const result = await setFamilyMemberStatus({ uid, tenantId, familyMemberId, isActive });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('PATCH /family/me/:id/status error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// POST /family/me/:familyMemberId/delete-request
router.post('/me/:familyMemberId/delete-request', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const { reason } = req.body || {};
    const result = await requestDeletion({ uid, tenantId, familyMemberId, reason });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('POST /family/me/:id/delete-request error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// DELETE /family/me/:familyMemberId/delete-request   (cancel own request)
router.delete('/me/:familyMemberId/delete-request', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const result = await cancelDeletionRequest({ uid, tenantId, familyMemberId });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('DELETE /family/me/:id/delete-request error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// PATCH /family/me/:familyMemberId   (bare param LAST among /me routes)
router.patch('/me/:familyMemberId', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { familyMemberId } = req.params;
    const { fullName, dateOfBirth } = req.body || {};
    const result = await updateFamilyMember({ uid, tenantId, familyMemberId, fullName, dateOfBirth });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('PATCH /family/me/:id error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────
// MARITAL STATUS — employee self-service
// ─────────────────────────────────────────

// GET /family/marital-status/me
router.get('/marital-status/me', anyAuthenticated, async (req, res) => {
  try {
    const result = await getMyMaritalStatus({ uid: req.user.uid });
    return successResponse(res, result, 'Marital status retrieved');
  } catch (error) {
    console.error('GET /family/marital-status/me error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// PATCH /family/marital-status/me   body: { maritalStatus }
router.patch('/marital-status/me', anyAuthenticated, async (req, res) => {
  try {
    const { maritalStatus } = req.body || {};
    const result = await setMyMaritalStatus({ uid: req.user.uid, maritalStatus });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('PATCH /family/marital-status/me error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────
// MARITAL STATUS — admin approval queue
// ─────────────────────────────────────────

// GET /family/marital-status/pending
router.get('/marital-status/pending', adminOnly, async (req, res) => {
  try {
    const result = await listPendingMaritalChanges({ tenantId: req.tenantId });
    return successResponse(res, result, 'Pending marital changes retrieved');
  } catch (error) {
    console.error('GET /family/marital-status/pending error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// POST /family/marital-status/pending/:employeeNumber/approve
router.post('/marital-status/pending/:employeeNumber/approve', adminOnly, async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const result = await approveMaritalChange({
      tenantId: req.tenantId,
      officialEmployeeNumber: employeeNumber,
    });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('POST /family/marital-status/pending/:id/approve error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// POST /family/marital-status/pending/:employeeNumber/reject
router.post('/marital-status/pending/:employeeNumber/reject', adminOnly, async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const result = await rejectMaritalChange({
      tenantId: req.tenantId,
      officialEmployeeNumber: employeeNumber,
    });
    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('POST /family/marital-status/pending/:id/reject error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────
// PROFILE COMPLETION NUDGE
// Drives the smart home-screen banner (not a bell notification).
// ─────────────────────────────────────────

// GET /family/profile-completion/me
router.get('/profile-completion/me', anyAuthenticated, async (req, res) => {
  try {
    const result = await getProfileCompletion({ uid: req.user.uid, tenantId: req.tenantId });
    return successResponse(res, result, 'Profile completion retrieved');
  } catch (error) {
    console.error('GET /family/profile-completion/me error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
