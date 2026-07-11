// ─────────────────────────────────────────
// bbqRoutes.js — V1.4 BBQ
// HomiLabs | Servio
//
// Single combined route file for the whole BBQ module — follows the
// café/Tea Bar convention (one router per module, mounted once, logic
// split across service files underneath) rather than mess/events'
// one-route-file-per-collection pattern. Confirmed with Homi 11-Jul-2026.
//
// Mounted at /bbq in index.js. Grows collection-by-collection as each
// piece is built and field-tested:
//   /bbq/settings   — THIS SLICE (bbqSettingsService.js)
//   /bbq/events     — next slice, not yet added
//   /bbq/orders, /bbq/table-requests, /bbq/live-status — later slices
// ─────────────────────────────────────────

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { successResponse, errorResponse } = require('../utils');

const { getBbqSettings, updateBbqSettings } = require('./bbqSettingsService');
const {
  saveBbqEventDraft, submitBbqEvent, publishBbqEvent,
  returnBbqEvent, cancelBbqEvent, getBbqEvent, getBbqEvents,
} = require('./bbqEventService');
const {
  createBbqOrder, createProxyBbqOrder, createOfficialBbqOrder,
} = require('./bbqOrderService');

const adminOnly       = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const managerAndAbove = [verifyToken, verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE, ROLES.BBQ_SUPERVISOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN
)];
// Design doc §4/§8.2: official BBQ orders can be initiated by bbq_supervisor
// OR manager (both floor-present) — a genuinely different group from
// managerAndAbove, which excludes bbq_supervisor entirely.
const bbqSupervisorAndAbove = [verifyToken, verifyRole(
  ROLES.BBQ_SUPERVISOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN
)];

// ── GET /bbq/settings ──
router.get('/settings', adminOnly, async (req, res) => {
  try {
    const settings = await getBbqSettings({ tenantId: req.tenantId });

    if (settings.notFound) {
      return errorResponse(res, 'BBQ settings not found for tenant. Run the seed script first.', 404);
    }

    return successResponse(res, { settings }, 'BBQ settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve BBQ settings', 500, error);
  }
});

// ── PATCH /bbq/settings ──
router.patch('/settings', adminOnly, async (req, res) => {
  try {
    const result = await updateBbqSettings({ tenantId: req.tenantId, body: req.body });
    return successResponse(res, result, 'BBQ settings updated');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── POST /bbq/events — save/update draft menu ──
router.post('/events', managerAndAbove, async (req, res) => {
  try {
    const { eventDate, itemIds } = req.body;
    if (!eventDate) return errorResponse(res, 'eventDate is required.', 400);
    if (!itemIds) return errorResponse(res, 'itemIds is required.', 400);

    const result = await saveBbqEventDraft({
      tenantId: req.tenantId, eventDate, itemIds, uid: req.user.uid,
    });
    return successResponse(res, result, 'BBQ event draft saved', 201);
  } catch (error) {
    if (error.itemErrors) {
      return res.status(400).json({ success: false, message: error.message, itemErrors: error.itemErrors });
    }
    return errorResponse(res, error.message, 400, error);
  }
});

// ── GET /bbq/events — list, optional ?status= filter ──
router.get('/events', anyAuthenticated, async (req, res) => {
  try {
    const { status, limit } = req.query;
    const events = await getBbqEvents({
      tenantId: req.tenantId, status, limit: limit ? parseInt(limit) : 20,
    });
    return successResponse(res, { count: events.length, events }, 'BBQ events retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve BBQ events', 500, error);
  }
});

// ── GET /bbq/events/:eventId ──
router.get('/events/:eventId', anyAuthenticated, async (req, res) => {
  try {
    const event = await getBbqEvent({ tenantId: req.tenantId, eventId: req.params.eventId });
    if (event.notFound) return errorResponse(res, 'BBQ event not found.', 404);
    return successResponse(res, { event }, 'BBQ event retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve BBQ event', 500, error);
  }
});

// ── PATCH /bbq/events/:eventId/submit ──
router.patch('/events/:eventId/submit', managerAndAbove, async (req, res) => {
  try {
    const result = await submitBbqEvent({
      eventId: req.params.eventId, tenantId: req.tenantId, uid: req.user.uid,
    });
    return successResponse(res, result, 'BBQ event submitted for review');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/events/:eventId/publish — admin only ──
router.patch('/events/:eventId/publish', adminOnly, async (req, res) => {
  try {
    const result = await publishBbqEvent({
      eventId: req.params.eventId, tenantId: req.tenantId, uid: req.user.uid,
    });
    return successResponse(res, result, 'BBQ event published');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/events/:eventId/return — admin only ──
router.patch('/events/:eventId/return', adminOnly, async (req, res) => {
  try {
    const { returnComments } = req.body;
    const result = await returnBbqEvent({
      eventId: req.params.eventId, tenantId: req.tenantId, uid: req.user.uid, returnComments,
    });
    return successResponse(res, result, 'BBQ event returned');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/events/:eventId/cancel ──
router.patch('/events/:eventId/cancel', managerAndAbove, async (req, res) => {
  try {
    const result = await cancelBbqEvent({
      eventId: req.params.eventId, tenantId: req.tenantId, uid: req.user.uid,
    });
    return successResponse(res, result, 'BBQ event cancelled');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── POST /bbq/orders — employee self-order ──
router.post('/orders', anyAuthenticated, async (req, res) => {
  try {
    const { eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId } = req.body;
    const result = await createBbqOrder({
      uid: req.user.uid, officialEmployeeNumber: req.officialEmployeeNumber,
      tenantId: req.tenantId, userRole: req.userRole,
      eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId,
    });
    return successResponse(res, result, 'BBQ order placed', 201);
  } catch (error) {
    if (error.itemErrors) {
      return res.status(400).json({ success: false, message: error.message, itemErrors: error.itemErrors });
    }
    return errorResponse(res, error.message, 400, error);
  }
});

// ── POST /bbq/orders/proxy — supervisor/manager, on behalf of an employee ──
router.post('/orders/proxy', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const { targetEmployeeNumber, eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId } = req.body;
    const result = await createProxyBbqOrder({
      uid: req.user.uid, tenantId: req.tenantId, userRole: req.userRole,
      targetEmployeeNumber, eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId,
    });
    return successResponse(res, result, 'BBQ proxy order placed', 201);
  } catch (error) {
    if (error.itemErrors) {
      return res.status(400).json({ success: false, message: error.message, itemErrors: error.itemErrors });
    }
    return errorResponse(res, error.message, 400, error);
  }
});

// ── POST /bbq/orders/official — bbq_supervisor or manager, admin approves billing ──
router.post('/orders/official', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const { sponsoringEmployeeNumber, guestName, eventDate, orderType, items, diningMode, costCentreCode } = req.body;
    const result = await createOfficialBbqOrder({
      uid: req.user.uid, tenantId: req.tenantId, userRole: req.userRole,
      sponsoringEmployeeNumber, guestName, eventDate, orderType, items, diningMode, costCentreCode,
    });
    return successResponse(res, result, 'Official BBQ order placed', 201);
  } catch (error) {
    if (error.itemErrors) {
      return res.status(400).json({ success: false, message: error.message, itemErrors: error.itemErrors });
    }
    return errorResponse(res, error.message, 400, error);
  }
});

module.exports = router;