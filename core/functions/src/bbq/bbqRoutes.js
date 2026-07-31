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
    createBbqOrder, createProxyBbqOrder, createOfficialBbqOrder, getMyBbqOrders, editBbqOrder,
} = require('./bbqOrderService');
const { getBbqLiveItemStatus } = require('./bbqLiveItemStatusService');
const {
  createTableRequest, approveTableRequest, returnTableRequest, rejectTableRequest,
  resubmitTableRequest, confirmTableRequest, cancelTableRequest,
  getTableRequests, getMyTableRequests,
} = require('./bbqTableRequestService');
const {
  getBbqKitchenOrders, getBbqExceptionQueue, acceptBbqOrder, markBbqOrderPrepared, cancelBbqOrder,
  approveLateOrder, rejectLateOrder, requestCancellation,
  approveCancellationRequest, rejectCancellationRequest,
  approveOfficialBbqOrder, rejectOfficialBbqOrder,
} = require('./bbqKitchenService');

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

// ── GET /bbq/orders/mine — employee's own order history (screen #3) ──
router.get('/orders/mine', anyAuthenticated, async (req, res) => {
  try {
    const orders = await getMyBbqOrders({
      tenantId: req.tenantId, officialEmployeeNumber: req.officialEmployeeNumber,
    });
    return successResponse(res, { count: orders.length, orders }, 'Your BBQ orders retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve your BBQ orders', 500, error);
  }
});

// ── POST /bbq/table-requests — employee submits ──
router.post('/table-requests', anyAuthenticated, async (req, res) => {
  try {
    const { eventDate, expectedGuestCount, requestNote } = req.body;
    const result = await createTableRequest({
      tenantId: req.tenantId, eventDate, uid: req.user.uid,
      officialEmployeeNumber: req.officialEmployeeNumber,
      employeeName: req.body.employeeName || req.officialEmployeeNumber,
      expectedGuestCount, requestNote,
    });
    return successResponse(res, result, 'Table request submitted', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── GET /bbq/table-requests — Admin/Manager list+filter ──
router.get('/table-requests', managerAndAbove, async (req, res) => {
  try {
    const { eventDate, status } = req.query;
    const requests = await getTableRequests({ tenantId: req.tenantId, eventDate, status });
    return successResponse(res, { count: requests.length, requests }, 'Table requests retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve table requests', 500, error);
  }
});

// ── GET /bbq/table-requests/mine — employee's own history ──
router.get('/table-requests/mine', anyAuthenticated, async (req, res) => {
  try {
    const requests = await getMyTableRequests({ tenantId: req.tenantId, officialEmployeeNumber: req.officialEmployeeNumber });
    return successResponse(res, { count: requests.length, requests }, 'Your table requests retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve your table requests', 500, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/approve — Admin ──
router.patch('/table-requests/:requestId/approve', adminOnly, async (req, res) => {
  try {
    const result = await approveTableRequest({ requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid });
    return successResponse(res, result, 'Table request approved');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/return — Admin ──
router.patch('/table-requests/:requestId/return', adminOnly, async (req, res) => {
  try {
    const result = await returnTableRequest({
      requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid,
      returnComments: req.body.returnComments,
    });
    return successResponse(res, result, 'Table request returned');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/reject — Admin ──
router.patch('/table-requests/:requestId/reject', adminOnly, async (req, res) => {
  try {
    const result = await rejectTableRequest({
      requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid,
      rejectionReason: req.body.rejectionReason,
    });
    return successResponse(res, result, 'Table request rejected');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/resubmit — Employee (own request only) ──
router.patch('/table-requests/:requestId/resubmit', anyAuthenticated, async (req, res) => {
  try {
    const result = await resubmitTableRequest({
      requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid,
      expectedGuestCount: req.body.expectedGuestCount, requestNote: req.body.requestNote,
    });
    return successResponse(res, result, 'Table request resubmitted');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/confirm — Manager ──
router.patch('/table-requests/:requestId/confirm', managerAndAbove, async (req, res) => {
  try {
    const result = await confirmTableRequest({ requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid });
    return successResponse(res, result, 'Table request confirmed');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/table-requests/:requestId/cancel — owner or Manager+ ──
router.patch('/table-requests/:requestId/cancel', anyAuthenticated, async (req, res) => {
  try {
    const result = await cancelTableRequest({
      requestId: req.params.requestId, tenantId: req.tenantId, uid: req.user.uid, userRole: req.userRole,
    });
    return successResponse(res, result, 'Table request cancelled');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── GET /bbq/live-status?eventDate=... — bbq_supervisor+ (screen #7) ──
router.get('/live-status', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const { eventDate } = req.query;
    if (!eventDate) return errorResponse(res, 'eventDate is required.', 400);
    const result = await getBbqLiveItemStatus({ tenantId: req.tenantId, eventDate });
    return successResponse(res, result, 'BBQ live item status retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve BBQ live item status', 500, error);
  }
});

// ── GET /bbq/kitchen/orders?eventDate=... — bbq_supervisor+ ──
router.get('/kitchen/orders', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const { eventDate } = req.query;
    if (!eventDate) return errorResponse(res, 'eventDate is required.', 400);
    const result = await getBbqKitchenOrders({ tenantId: req.tenantId, eventDate });
    return successResponse(res, result, 'BBQ kitchen orders retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve kitchen orders', 500, error);
  }
});

// ── GET /bbq/exceptions?eventDate=... — Manager's Exception Review Queue (Screen #8) ──
router.get('/exceptions', managerAndAbove, async (req, res) => {
  try {
    const { eventDate } = req.query;
    if (!eventDate) return errorResponse(res, 'eventDate is required.', 400);
    const result = await getBbqExceptionQueue({ tenantId: req.tenantId, eventDate });
    return successResponse(res, result, 'BBQ exception queue retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve exception queue', 500, error);
  }
});

// ── PATCH /bbq/orders/:orderId/accept — bbq_supervisor+ ──
router.patch('/orders/:orderId/accept', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const result = await acceptBbqOrder({ orderId: req.params.orderId, tenantId: req.tenantId, acceptedByUid: req.user.uid });
    return successResponse(res, result, 'Order accepted');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/prepared — bbq_supervisor+ ──
router.patch('/orders/:orderId/prepared', bbqSupervisorAndAbove, async (req, res) => {
  try {
    const result = await markBbqOrderPrepared({ orderId: req.params.orderId, tenantId: req.tenantId, preparedByUid: req.user.uid });
    return successResponse(res, result, 'Order marked prepared');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/edit — owner or bbq_supervisor+, placed only ──
router.patch('/orders/:orderId/edit', anyAuthenticated, async (req, res) => {
  try {
    const result = await editBbqOrder({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid, userRole: req.userRole,
      items: req.body.items,
    });
    return successResponse(res, result, 'Order updated');
  } catch (error) {
    if (error.itemErrors) {
      return res.status(400).json({ success: false, message: error.message, itemErrors: error.itemErrors });
    }
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/cancel — owner or bbq_supervisor+, placed only ──
router.patch('/orders/:orderId/cancel', anyAuthenticated, async (req, res) => {
  try {
    const result = await cancelBbqOrder({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid, userRole: req.userRole,
      cancellationReason: req.body.cancellationReason,
    });
    return successResponse(res, result, 'Order cancelled');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/late-request/approve — managerAndAbove ──
router.patch('/orders/:orderId/late-request/approve', managerAndAbove, async (req, res) => {
  try {
    const result = await approveLateOrder({ orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid });
    return successResponse(res, result, 'Late order approved');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/late-request/reject — managerAndAbove ──
router.patch('/orders/:orderId/late-request/reject', managerAndAbove, async (req, res) => {
  try {
    const result = await rejectLateOrder({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid,
      lateRequestDecisionReason: req.body.lateRequestDecisionReason,
    });
    return successResponse(res, result, 'Late order rejected');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/request-cancellation — owner or bbq_supervisor+, accepted only ──
router.patch('/orders/:orderId/request-cancellation', anyAuthenticated, async (req, res) => {
  try {
    const result = await requestCancellation({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid, userRole: req.userRole,
      reason: req.body.reason,
    });
    return successResponse(res, result, 'Cancellation requested');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/cancellation-request/approve — managerAndAbove ──
router.patch('/orders/:orderId/cancellation-request/approve', managerAndAbove, async (req, res) => {
  try {
    const result = await approveCancellationRequest({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid, decisionReason: req.body.decisionReason,
    });
    return successResponse(res, result, 'Cancellation approved');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/cancellation-request/reject — managerAndAbove ──
router.patch('/orders/:orderId/cancellation-request/reject', managerAndAbove, async (req, res) => {
  try {
    const result = await rejectCancellationRequest({
      orderId: req.params.orderId, tenantId: req.tenantId, uid: req.user.uid, decisionReason: req.body.decisionReason,
    });
    return successResponse(res, result, 'Cancellation request rejected');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/official/approve — adminOnly ──
router.patch('/orders/:orderId/official/approve', adminOnly, async (req, res) => {
  try {
    const result = await approveOfficialBbqOrder({ orderId: req.params.orderId, tenantId: req.tenantId, approvedByUid: req.user.uid });
    return successResponse(res, result, 'Official order approved');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

// ── PATCH /bbq/orders/:orderId/official/reject — adminOnly ──
router.patch('/orders/:orderId/official/reject', adminOnly, async (req, res) => {
  try {
    const result = await rejectOfficialBbqOrder({
      orderId: req.params.orderId, tenantId: req.tenantId, rejectedByUid: req.user.uid, approvalNote: req.body.approvalNote,
    });
    return successResponse(res, result, 'Official order rejected');
  } catch (error) {
    return errorResponse(res, error.message, 400, error);
  }
});

module.exports = router;