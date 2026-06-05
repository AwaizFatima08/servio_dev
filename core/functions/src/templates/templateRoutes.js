// ─────────────────────────────────────────
// templateRoutes.js — Templates & Cycles Endpoints
// HomiLabs | Servio | Flow 04
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  createTemplate, getTemplates, getTemplate, updateTemplate,
  createCycle, getCycles, getActiveCycle, setCycleStatus,
} = require('./templateService');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse, validateRequired } = require('../utils');
const { ROLES, CYCLE_STATUS } = require('../constants');

const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const managerAndAbove = [verifyToken, verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const TENANT_ID = 'ffl';

// ─────────────────────────────────────────
// POST /templates
// Body: { templateName, description, schedule }
// ─────────────────────────────────────────
router.post('/', managerAndAbove, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['templateName', 'schedule']);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    const result = await createTemplate({
      templateName: req.body.templateName,
      description: req.body.description || null,
      schedule: req.body.schedule,
      tenantId: TENANT_ID,
      createdByUid: req.user.uid,
    });

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { templateId: result.templateId }, result.message, 201);

  } catch (error) {
    return errorResponse(res, 'Failed to create template', 500, error);
  }
});

// ─────────────────────────────────────────
// POST /templates/cycles
// Body: { cycleName, startDate, weekTemplateId }
// Placed before /:templateId to avoid route conflict
// ─────────────────────────────────────────
router.post('/cycles', managerAndAbove, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['cycleName', 'startDate', 'weekTemplateId']);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    const result = await createCycle({
      cycleName: req.body.cycleName,
      startDate: req.body.startDate,
      weekTemplateId: req.body.weekTemplateId,
      tenantId: TENANT_ID,
      createdByUid: req.user.uid,
    });

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { cycleId: result.cycleId }, result.message, 201);

  } catch (error) {
    return errorResponse(res, 'Failed to create cycle', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /templates
// ─────────────────────────────────────────
router.get('/', managerAndAbove, async (req, res) => {
  try {
    const result = await getTemplates(TENANT_ID);
    return successResponse(res, { count: result.count, templates: result.templates }, 'Templates retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve templates', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /templates/cycles/active
// Placed before /cycles and /:templateId to avoid route conflict
// ─────────────────────────────────────────
router.get('/cycles/active', managerAndAbove, async (req, res) => {
  try {
    const result = await getActiveCycle(TENANT_ID);

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, { cycle: result.cycle }, 'Active cycle retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve active cycle', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /templates/cycles
// Placed before /:templateId to avoid route conflict
// ─────────────────────────────────────────
router.get('/cycles', managerAndAbove, async (req, res) => {
  try {
    const result = await getCycles(TENANT_ID);
    return successResponse(res, { count: result.count, cycles: result.cycles }, 'Cycles retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve cycles', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /templates/cycles/:cycleId/status
// Body: { status: 'active' | 'closed', endDate? }
// Placed before /:templateId to avoid route conflict
// ─────────────────────────────────────────
router.patch('/cycles/:cycleId/status', managerAndAbove, async (req, res) => {
  try {
    const { status, endDate } = req.body;

    if (!status) {
      return errorResponse(res, 'status field is required', 400);
    }

    if (![CYCLE_STATUS.ACTIVE, CYCLE_STATUS.CLOSED].includes(status)) {
      return errorResponse(res, `Invalid status. Use: active or closed`, 400);
    }

    const result = await setCycleStatus({
      cycleId: req.params.cycleId,
      status,
      endDate: endDate || null,
      updatedByUid: req.user.uid,
      tenantId: TENANT_ID,
    });

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { cycleId: result.cycleId }, result.message);

  } catch (error) {
    return errorResponse(res, 'Failed to update cycle status', 500, error);
  }
});

// ─────────────────────────────────────────
// GET /templates/:templateId
// Parameterised — must come after all specific /cycles routes
// ─────────────────────────────────────────
router.get('/:templateId', managerAndAbove, async (req, res) => {
  try {
    const result = await getTemplate(req.params.templateId);

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, { template: result.template }, 'Template retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve template', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /templates/:templateId
// Parameterised — must come after all specific /cycles routes
// ─────────────────────────────────────────
router.patch('/:templateId', managerAndAbove, async (req, res) => {
  try {
    const result = await updateTemplate(req.params.templateId, req.body);

    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, { templateId: result.templateId }, result.message);

  } catch (error) {
    return errorResponse(res, 'Failed to update template', 500, error);
  }
});

module.exports = router;