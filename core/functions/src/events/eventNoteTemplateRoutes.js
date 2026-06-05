// ─────────────────────────────────────────────────────────────────────────────
// eventNoteTemplateRoutes.js — Event Note Template Endpoints
// HomiLabs | Servio | Backend
// Flow 10 support: admin manages note templates, event creation loads them
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const {
  getNoteTemplates,
  createNoteTemplate,
  toggleNoteTemplate,
} = require('./eventNoteTemplateService');

const managerAndAbove = [verifyToken, verifyRole(
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

const adminOnly = [verifyToken, verifyRole(
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

// ─────────────────────────────────────────────────────────────────────────────
// GET /event-note-templates
// Returns all active + visible templates for the tenant
// Manager and above — needed at event creation time
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', managerAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await getNoteTemplates({ tenantId });

    return res.status(200).json({
      count: result.count,
      templates: result.templates,
    });

  } catch (error) {
    console.error('Get note templates error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /event-note-templates
// Create a new note template
// Admin only
// Body: { title, body }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { title, body } = req.body;

    if (!title || !title.trim()) {
      return errorResponse(res, 'title is required.', 400);
    }
    if (!body || !body.trim()) {
      return errorResponse(res, 'body is required.', 400);
    }

    const result = await createNoteTemplate({ tenantId, createdByUid: uid, title, body });

    return res.status(201).json({
      message: 'Note template created successfully.',
      templateId: result.templateId,
    });

  } catch (error) {
    console.error('Create note template error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /event-note-templates/:templateId/status
// Activate or deactivate a note template
// Admin only
// Body: { isActive: true | false }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:templateId/status', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { templateId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return errorResponse(res, 'isActive must be true or false.', 400);
    }

    const result = await toggleNoteTemplate({ tenantId, templateId, isActive });

    return res.status(200).json({
      message: `Note template ${isActive ? 'activated' : 'deactivated'} successfully.`,
      templateId: result.templateId,
    });

  } catch (error) {
    console.error('Toggle note template error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
