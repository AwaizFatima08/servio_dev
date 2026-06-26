// ─────────────────────────────────────────
// cafeRoutes.js — V1.2 Slice 1 (Cafe Indoor + Outdoor Mini Cafe)
// HomiLabs | Servio
//
// Mounted at /cafe by index.js.
//
// Routes:
//   GET    /cafe/menu                      any authenticated user                 (V1.2 Web Slice 1)
//   POST   /cafe/orders                    employee self-order
//   POST   /cafe/orders/batch              employee multi-item self-order (V1.2 Web Slice 2.3)
//   POST   /cafe/orders/proxy              cafe_supervisor | cafe_waiter | admin
//   POST   /cafe/orders/walk-in            cafe_supervisor | cafe_waiter | admin
//   GET    /cafe/orders/mine               any authenticated user
//   PATCH  /cafe/orders/:orderId/cancel    employee (own) | admin
//   PATCH  /cafe/orders/:orderId/accept    cafe_supervisor | cafe_waiter | manager | admin
//   PATCH  /cafe/orders/:orderId/prepared  cafe_supervisor | cafe_waiter | manager | admin
//   GET    /cafe/kitchen/orders            cafe_supervisor | cafe_waiter | manager | admin
//   POST   /cafe/admin/rebuild-menu        admin only
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
const cafeKitchenService = require('./cafeKitchenService');
const cafeMenuService = require('./cafeMenuService');

// ─────────────────────────────────────────
// GET /cafe/menu — read the resolved café menu (V1.2 Web Slice 1)
// No body, no query params. Returns the fat serviceMenuConfigs/cafe doc
// (filtered to a stable client shape). Broad role set — any authenticated
// user in the tenant can see what the café serves.
// ─────────────────────────────────────────
router.get(
  '/menu',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
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
      const result = await cafeMenuService.getCafeMenu({
        tenantId: req.tenantId,
      });
      return successResponse(res, result, 'Café menu retrieved.');
    } catch (err) {
      console.error('[GET /cafe/menu] error:', err);
      return errorResponse(res, err.message || 'Failed to load café menu.', 500, err);
    }
  }
);

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
// POST /cafe/orders/batch — employee multi-item self-order (one session)
// Body: { orderType, diningMode, requestedPickupTime?, consumerType,
//         consumerFamilyMemberId?, items: [{ menuItemId, quantity }] }
//
// One consumer for the whole order (session-level). One shared bookingGroupId.
// One cafeOrders document per line, each with its own billing hooks. See
// cafeOrderService.createSelfOrderBatch for the locked design.
// ─────────────────────────────────────────
router.post(
  '/orders/batch',
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
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return errorResponse(res, 'items array is required and must not be empty.', 400);
      }
      const result = await cafeOrderService.createSelfOrderBatch({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, `Order placed. ${result.orderCount} item(s).`, 201);
    } catch (err) {
      console.error('[POST /cafe/orders/batch] error:', err);
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
// POST /cafe/orders/proxy/batch — supervisor multi-item proxy order
// Body: same as /orders/batch plus targetEmployeeNumber
//   { targetEmployeeNumber, orderType, diningMode, requestedPickupTime?,
//     consumerType, consumerFamilyMemberId?, items: [{ menuItemId, quantity }] }
//
// Multi-item sibling of /orders/proxy. One consumer for the whole session, one
// shared bookingGroupId, one cafeOrders doc per line — see
// cafeOrderService.createProxyOrderBatch. walk_in merged under proxy for café.
// ─────────────────────────────────────────
router.post(
  '/orders/proxy/batch',
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
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return errorResponse(res, 'items array is required and must not be empty.', 400);
      }
      const result = await cafeOrderService.createProxyOrderBatch({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, `Proxy order placed. ${result.orderCount} item(s).`, 201);
    } catch (err) {
      console.error('[POST /cafe/orders/proxy/batch] error:', err);
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

// ─────────────────────────────────────────
// PATCH /cafe/orders/:orderId/accept — kitchen acknowledges an order
// placed -> accepted. No body required.
//
// 'accepted' is no longer terminal as of Slice 4 — an accepted order is next
// marked 'prepared' (see the /prepared route below) when handed over.
// ─────────────────────────────────────────
router.patch(
  '/orders/:orderId/accept',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeKitchenService.acceptOrder({
        orderId: req.params.orderId,
        tenantId: req.tenantId,
        acceptedByUid: req.user.uid,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PATCH /cafe/orders/:orderId/accept] error:', err);
      return errorResponse(res, err.message || 'Failed to accept order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// PATCH /cafe/orders/:orderId/prepared — kitchen hands over a finished order
// accepted -> prepared. No body required. Terminal state; the order then
// falls off the live kitchen board (board fetches placed+accepted only).
// NOT a billing event. Same role set as /accept — manager included per the
// locked rule that every operational café route admits manager unless the
// action is admin-reserved (this is not).
// ─────────────────────────────────────────
router.patch(
  '/orders/:orderId/prepared',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeKitchenService.markPrepared({
        orderId: req.params.orderId,
        tenantId: req.tenantId,
        preparedByUid: req.user.uid,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PATCH /cafe/orders/:orderId/prepared] error:', err);
      return errorResponse(res, err.message || 'Failed to mark order prepared.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// GET /cafe/kitchen/orders — today's orders for the kitchen view
// Returns placed + accepted orders (PKT today only), oldest first,
// plus unacknowledgedCount. No date parameter — see cafeKitchenService.js
// header for why this is scoped to today only by design.
// ─────────────────────────────────────────
router.get(
  '/kitchen/orders',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const result = await cafeKitchenService.getKitchenOrders({
        tenantId: req.tenantId,
      });
      return successResponse(res, result, 'Kitchen orders retrieved.');
    } catch (err) {
      console.error('[GET /cafe/kitchen/orders] error:', err);
      return errorResponse(res, err.message || 'Failed to retrieve kitchen orders.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// GET /cafe/history — café supervisor order-history view (V1.2 Slice 6)
//
// READ-ONLY paginated list of PAST orders (dispute-lookup + audit). Distinct
// from /cafe/kitchen/orders (live board). See Servio_Slice6_DesignLock.md.
//
// Query params (all optional):
//   days             default 7  — lookback window (createdAt >= today-days)
//   day              YYYY-MM-DD — single-day pick; WINS over days when present
//   includeCancelled "true"     — widen status set to include cancelled
//   cursor           ISO string — load-more: createdAt of the last row held
//
// NOTE: req.query values are STRINGS. includeCancelled must be compared to the
// literal 'true' — forwarding the raw string would make the toggle always-on.
// ─────────────────────────────────────────
router.get(
  '/history',
  verifyToken,
  verifyRole(
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
  ),
  async (req, res) => {
    try {
      const { day, cursor } = req.query;
      const lookbackDays = parseInt(req.query.days, 10); // service guards NaN/range
      const includeCancelled = req.query.includeCancelled === 'true'; // string → bool

      const result = await cafeKitchenService.listCafeOrderHistory({
        tenantId: req.tenantId,
        lookbackDays,
        day: day || null,
        includeCancelled,
        cursorCreatedAt: cursor || null,
      });
      return successResponse(res, result, 'Order history retrieved.');
    } catch (err) {
      console.error('[GET /cafe/history] error:', err);
      return errorResponse(res, err.message || 'Failed to retrieve order history.', 500, err);
    }
  }
);

module.exports = router;