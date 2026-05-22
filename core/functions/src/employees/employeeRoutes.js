// ─────────────────────────────────────────
// employeeRoutes.js — Employee Master Endpoints
// HomiLabs | Servio | Flow 02
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { addEmployee, getEmployees, getEmployee, setEmployeeStatus } = require('./employeeService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse, validateRequired } = require('../utils');
const { ROLES } = require('../constants');

// All employee routes require authentication and admin/super_admin role
const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

// ─────────────────────────────────────────
// POST /employees
// Add a single employee
// Body: { officialEmployeeNumber, fullName, cnicLast4, dateOfBirth, employeeType }
// ─────────────────────────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const missing = validateRequired(req.body, [
      'officialEmployeeNumber',
      'fullName',
      'employeeType',
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

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { officialEmployeeNumber: result.officialEmployeeNumber }, result.message, 201);

  } catch (error) {
    console.error('GET EMPLOYEES ERROR:', error);
    return errorResponse(res, 'Failed to add employee', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /employees
// List employees with optional filters
// Query params: search, employeeType, isActive, limit
// ─────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { search, employeeType, isActive, limit } = req.query;

    const result = await getEmployees({
      search: search || null,
      employeeType: employeeType || null,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
    });

    return successResponse(res, {
      count: result.count,
      employees: result.employees,
    }, 'Employees retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve employees', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /employees/:employeeNumber
// Get single employee detail
// ─────────────────────────────────────────
router.get('/:employeeNumber', adminOnly, async (req, res) => {
  try {
    const result = await getEmployee(req.params.employeeNumber.toUpperCase());

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, { employee: result.employee }, 'Employee retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve employee', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /employees/:employeeNumber/status
// Activate or deactivate an employee
// Body: { isActive: true | false }
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

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, {
      officialEmployeeNumber: result.officialEmployeeNumber,
      isActive: result.isActive,
    }, result.message);

  } catch (error) {
    return errorResponse(res, 'Failed to update employee status', 500, error);
  }
});

module.exports = router;