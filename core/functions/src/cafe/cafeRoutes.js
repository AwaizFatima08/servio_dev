// ─────────────────────────────────────────
// cafeRoutes.js — V1.2 Slice 1 (Cafe Indoor + Outdoor Mini Cafe)
// HomiLabs | Servio
//
// Mounted at /cafe by index.js.
//
// Routes:
//   POST   /cafe/orders               employee self-order
//   POST   /cafe/orders/proxy         cafe_supervisor | cafe_waiter | admin
//   POST   /cafe/orders/walk-in       cafe_supervisor | cafe_waiter | admin
//   GET    /cafe/orders/mine          any authenticated user
//   PATCH  /cafe/orders/:orderId/cancel    employee (own) | admin
//
// Specific routes are declared before parameterised :orderId routes
// (Technical Rule #18).
// ─────────────────────────────────────────

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const verifyRole  = require('../middleware/verifyRole');

const { successResponse, errorResponse } = require('../utils');
const { ROLES } = require('../constants');

const cafeOrderService = require('./cafeOrderService');
const cafeMenuResolver = require('./cafeMenuResolver');

// ─────────────────────────────────────────
// POST /cafe/orders — employee self-order
// Body: { orderType, menuItemId, quantity, diningMode,
//         requestedPickupTime?, consumerType, consumerFamilyMemberId? }
// ─────────────────────────────────────────
router.post(
  '/orders',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy V1 role — kept for V1 compatibility
    ROLES.ACCOUNTS_SUPERVISOR,
    ROLES.GH_SUPERVISOR,
    ROLES.BOQ_SUPERVISOR,
    ROLES.STORE_SUPERVISOR,
    ROLES.PURCHASER,
    ROLES.SPORTS_SUPERVISOR,
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeOrderService.createSelfOrder({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, 'Order placed.', 201);
    } catch (err) {
      console.error('[POST /cafe/orders] error:', err);
      return errorResponse(res, err.message || 'Failed to place order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /cafe/orders/proxy — supervisor proxy order on behalf of employee
// Body: same as /orders plus targetEmployeeNumber
// ─────────────────────────────────────────
router.post(
  '/orders/proxy',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeOrderService.createProxyOrder({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, 'Proxy order placed.', 201);
    } catch (err) {
      console.error('[POST /cafe/orders/proxy] error:', err);
      return errorResponse(res, err.message || 'Failed to place proxy order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /cafe/orders/walk-in — supervisor walk-in order
// Body: same as /orders plus targetEmployeeNumber
// ─────────────────────────────────────────
router.post(
  '/orders/walk-in',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeOrderService.createWalkInOrder({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, 'Walk-in order placed.', 201);
    } catch (err) {
      console.error('[POST /cafe/orders/walk-in] error:', err);
      return errorResponse(res, err.message || 'Failed to place walk-in order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// GET /cafe/orders/mine — list caller's own orders (last 30 days)
// Query: ?days=N (optional, default 30, max 90)
// ─────────────────────────────────────────
router.get(
  '/orders/mine',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR,
    ROLES.ACCOUNTS_SUPERVISOR,
    ROLES.GH_SUPERVISOR,
    ROLES.BOQ_SUPERVISOR,
    ROLES.STORE_SUPERVISOR,
    ROLES.PURCHASER,
    ROLES.SPORTS_SUPERVISOR,
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      let days = parseInt(req.query.days, 10);
      if (!Number.isFinite(days) || days < 1) days = 30;
      if (days > 90) days = 90;

      const result = await cafeOrderService.listMyOrders({
        tenantId: req.tenantId,
        officialEmployeeNumber: req.officialEmployeeNumber,
        days,
      });
      return successResponse(res, result, 'Orders fetched.');
    } catch (err) {
      console.error('[GET /cafe/orders/mine] error:', err);
      return errorResponse(res, err.message || 'Failed to fetch orders.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// PATCH /cafe/orders/:orderId/cancel — cancel an order
// Body: { cancellationReason, cancellationNote? }
//
// Rules enforced in service:
//   - cafe_hours orders cannot be cancelled by employee.
//   - anytime_takeaway: employee allowed only within cancellationWindowExpiresAt.
//   - admin / super_admin can cancel either order type at any time.
// ─────────────────────────────────────────
router.patch(
  '/orders/:orderId/cancel',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR,
    ROLES.ACCOUNTS_SUPERVISOR,
    ROLES.GH_SUPERVISOR,
    ROLES.BOQ_SUPERVISOR,
    ROLES.STORE_SUPERVISOR,
    ROLES.PURCHASER,
    ROLES.SPORTS_SUPERVISOR,
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const isAdmin = req.userRole === ROLES.ADMIN || req.userRole === ROLES.SUPER_ADMIN;

      const result = await cafeOrderService.cancelOrder({
        orderId: req.params.orderId,
        tenantId: req.tenantId,
        cancelledByUid: req.user.uid,
        cancelledByRole: req.userRole,
        cancelledByEmployeeNumber: req.officialEmployeeNumber,
        isAdmin,
        cancellationReason: req.body.cancellationReason,
        cancellationNote: req.body.cancellationNote,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PATCH /cafe/orders/:orderId/cancel] error:', err);
      return errorResponse(res, err.message || 'Failed to cancel order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /cafe/admin/rebuild-menu — rebuild serviceMenuConfigs/cafe from menuItems
//
// Admin / super_admin only. Called manually for now. A future web slice
// will trigger this automatically when admin edits the cafe menu via UI.
// ─────────────────────────────────────────
router.post(
  '/admin/rebuild-menu',
  verifyToken,
  verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await cafeMenuResolver.rebuildCafeMenu({
        tenantId: req.tenantId,
        triggeredByUid: req.user.uid,
      });
      return successResponse(res, result, `Cafe menu rebuilt. ${result.itemCount} item(s) loaded.`);
    } catch (err) {
      console.error('[POST /cafe/admin/rebuild-menu] error:', err);
      return errorResponse(res, err.message || 'Failed to rebuild cafe menu.', 500, err);
    }
  }
);

module.exports = router;
