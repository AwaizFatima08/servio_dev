// ─────────────────────────────────────────
// employeeRoutes.js — Employee Master Endpoints
// HomiLabs | Servio | Flow 02
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { addEmployee, getEmployees, getEmployee, setEmployeeStatus, updateEmployeeFields } = require('./employeeService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse, validateRequired } = require('../utils');
const { ROLES } = require('../constants');

const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const searchRoles = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.MESS_SUPERVISOR, ROLES.ACCOUNTS_SUPERVISOR)];

// ─────────────────────────────────────────
// POST /employees
// ─────────────────────────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const missing = validateRequired(req.body, [
      'officialEmployeeNumber', 'fullName', 'employeeType',
    ]);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }
    const { officialEmployeeNumber, fullName, cnicLast4, dateOfBirth, employeeType } = req.body;
    const result = await addEmployee({
      officialEmployeeNumber: officialEmployeeNumber.trim().toUpperCase(),
      fullName: fullName.trim(),
      cnicLast4: cnicLast4 ? cnicLast4.trim() : null,
      dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
      employeeType,
      createdByUid: req.user.uid,
    });
    if (!result.success) return errorResponse(res, result.message, 400);
    return successResponse(res, { officialEmployeeNumber: result.officialEmployeeNumber }, result.message, 201);
  } catch (error) {
    console.error('ADD EMPLOYEE ERROR:', error);
    return errorResponse(res, 'Failed to add employee', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /employees
// ─────────────────────────────────────────
router.get('/', searchRoles, async (req, res) => {
  try {
    const { search, employeeType, isActive } = req.query;
    const result = await getEmployees({
      search: search || null,
      employeeType: employeeType || null,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return successResponse(res, { count: result.count, employees: result.employees }, 'Employees retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve employees', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /employees/:employeeNumber
// ─────────────────────────────────────────
router.get('/:employeeNumber', adminOnly, async (req, res) => {
  try {
    const result = await getEmployee(req.params.employeeNumber.toUpperCase());
    if (!result.success) return errorResponse(res, result.message, 404);
    return successResponse(res, { employee: result.employee }, 'Employee retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve employee', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /employees/:employeeNumber
// Update editable fields — admin only
// Body: { grade, designation, department, phoneNumber,
//         houseNumber, residenceType, cnicLast4, dateOfBirth }
// ─────────────────────────────────────────
router.patch('/:employeeNumber', adminOnly, async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const result = await updateEmployeeFields({
      officialEmployeeNumber: employeeNumber.toUpperCase(),
      updates: req.body,
      updatedByUid: req.user.uid,
    });
    if (!result.success) return errorResponse(res, result.message, 404);
    return successResponse(res, {
      officialEmployeeNumber: result.officialEmployeeNumber,
      employee: result.employee,
    }, result.message);
  } catch (error) {
    console.error('PATCH EMPLOYEE ERROR:', error);
    return errorResponse(res, 'Failed to update employee', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /employees/:employeeNumber/status
// ─────────────────────────────────────────
router.patch('/:employeeNumber/status', adminOnly, async (req, res) => {
  try {
    if (req.body.isActive === undefined) {
      return errorResponse(res, 'isActive field is required', 400);
    }
    const result = await setEmployeeStatus({
      officialEmployeeNumber: req.params.employeeNumber.toUpperCase(),
      isActive: Boolean(req.body.isActive),
      updatedByUid: req.user.uid,
    });
    if (!result.success) return errorResponse(res, result.message, 404);
    // V1.1 carry fix (19-Jun-2026): pass full service result through so the
    // admin UI can show the family cascade count.
    return successResponse(res, {
      officialEmployeeNumber: result.officialEmployeeNumber,
      isActive: result.isActive,
      familyMembersDeactivated: result.familyMembersDeactivated,
    }, result.message);
  } catch (error) {
    return errorResponse(res, 'Failed to update employee status', 500, error);
  }
});

module.exports = router;