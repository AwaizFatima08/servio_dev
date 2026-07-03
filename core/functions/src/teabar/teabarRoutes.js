// ─────────────────────────────────────────
// teabarRoutes.js — V1.3 (Tea Bar — Locations, first slice)
// HomiLabs | Servio
//
// Intended to be mounted at /teabar by index.js (mounting not yet confirmed —
// see next step: check how cafeRoutes is mounted, then mirror it here).
//
// This first slice covers LOCATIONS ONLY. Order placement, the attendant
// dashboard, and official-order approval are separate, later slices — see
// TeaBar_Design_Lock_03Jul2026.md §12 (Build Order).
//
// Routes:
//   GET    /teabar/menu                     any authenticated user (broad —
//                                            same reasoning as /cafe/menu)
//   POST   /teabar/admin/rebuild-menu       manager | admin | super_admin
//   GET    /teabar/locations                any authenticated user (broad —
//   GET    /teabar/locations                any authenticated user (broad —
//                                            employees need this to pick a
//                                            location when self-ordering)
//   GET    /teabar/locations/mine            teabar_attendant | admin | super_admin
//   POST   /teabar/locations                 manager | admin | super_admin
//   PUT    /teabar/locations/:locationId     manager | admin | super_admin
//   PATCH  /teabar/locations/:locationId/assign    manager | admin | super_admin
//   PATCH  /teabar/locations/:locationId/unassign  manager | admin | super_admin
//
// Specific routes (/mine) are declared before parameterised :locationId
// routes (Technical Rule #18 — same convention café's cafeRoutes.js follows).
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const verifyRole  = require('../middleware/verifyRole');

const { successResponse, errorResponse } = require('../utils');
const { ROLES } = require('../constants');

const teabarLocationService = require('./teabarLocationService');
const teabarMenuService = require('./teabarMenuService');
const teabarMenuResolver = require('./teabarMenuResolver');
const teabarOrderService = require('./teabarOrderService');

// ─────────────────────────────────────────
// GET /teabar/menu — read the resolved Tea Bar menu
// No body, no query params. Returns the fat serviceMenuConfigs/teabar doc.
// Broad role set — mirrors GET /cafe/menu exactly, same reasoning: any
// authenticated employee needs to see what they can order.
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
    ROLES.TEABAR_ATTENDANT,
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
      const result = await teabarMenuService.getTeabarMenu({ tenantId: req.tenantId });
      return successResponse(res, result, 'Tea Bar menu retrieved.');
    } catch (err) {
      console.error('[GET /teabar/menu] error:', err);
      return errorResponse(res, err.message || 'Failed to load Tea Bar menu.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /teabar/admin/rebuild-menu — rebuild serviceMenuConfigs/teabar
// Manager / admin / super_admin. Called manually for now, same as café.
// ─────────────────────────────────────────
router.post(
  '/admin/rebuild-menu',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarMenuResolver.rebuildTeabarMenu({
        tenantId: req.tenantId,
        triggeredByUid: req.user.uid,
      });
      return successResponse(res, result, `Tea Bar menu rebuilt. ${result.itemCount} item(s) loaded.`);
    } catch (err) {
      console.error('[POST /teabar/admin/rebuild-menu] error:', err);
      return errorResponse(res, err.message || 'Failed to rebuild Tea Bar menu.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// GET /teabar/locations — list Tea Bar locations
// Query: ?activeOnly=false to include inactive locations (default: true,
// i.e. active only). Broad role set — an employee browsing where to order
// from needs this exactly as much as an admin managing the list.
// ─────────────────────────────────────────
router.get(
  '/locations',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.TEABAR_ATTENDANT,
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
      const activeOnly = req.query.activeOnly !== 'false'; // string → bool, default true
      const result = await teabarLocationService.listLocations({
        tenantId: req.tenantId,
        activeOnly,
      });
      return successResponse(res, result, 'Tea Bar locations retrieved.');
    } catch (err) {
      console.error('[GET /teabar/locations] error:', err);
      return errorResponse(res, err.message || 'Failed to retrieve Tea Bar locations.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// GET /teabar/locations/mine — "which location do I currently cover?"
// Always resolved from the caller's OWN verified uid — never from anything
// the client sends. Returns null (inside data, still a 200) if the caller
// is not currently assigned anywhere, rather than treating that as an error.
// ─────────────────────────────────────────
router.get(
  '/locations/mine',
  verifyToken,
  verifyRole(ROLES.TEABAR_ATTENDANT, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarLocationService.getLocationForAttendant({
        tenantId: req.tenantId,
        attendantUid: req.user.uid,
      });
      return successResponse(res, { location: result }, 'Assigned location retrieved.');
    } catch (err) {
      console.error('[GET /teabar/locations/mine] error:', err);
      return errorResponse(res, err.message || 'Failed to retrieve assigned location.', 500, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /teabar/locations — admin adds a new Tea Bar location
// Body: { locationName }
// ─────────────────────────────────────────
router.post(
  '/locations',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarLocationService.createLocation({
        tenantId: req.tenantId,
        locationName: req.body.locationName,
      });
      return successResponse(res, result, 'Tea Bar location created.', 201);
    } catch (err) {
      console.error('[POST /teabar/locations] error:', err);
      return errorResponse(res, err.message || 'Failed to create Tea Bar location.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// PUT /teabar/locations/:locationId — admin edits name and/or active flag
// Body: { locationName?, isActive? } — both optional, only sent fields change
// ─────────────────────────────────────────
router.put(
  '/locations/:locationId',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarLocationService.updateLocation({
        locationId: req.params.locationId,
        tenantId: req.tenantId,
        locationName: req.body.locationName,
        isActive: req.body.isActive,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PUT /teabar/locations/:locationId] error:', err);
      return errorResponse(res, err.message || 'Failed to update Tea Bar location.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// PATCH /teabar/locations/:locationId/assign — admin assigns an attendant
// Body: { attendantUid }
// Any location this attendant was previously covering is automatically
// cleared in the same atomic action — see teabarLocationService.assignAttendant.
// ─────────────────────────────────────────
router.patch(
  '/locations/:locationId/assign',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarLocationService.assignAttendant({
        locationId: req.params.locationId,
        tenantId: req.tenantId,
        attendantUid: req.body.attendantUid,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PATCH /teabar/locations/:locationId/assign] error:', err);
      return errorResponse(res, err.message || 'Failed to assign attendant.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// PATCH /teabar/locations/:locationId/unassign — admin removes coverage
// No body required.
// ─────────────────────────────────────────
router.patch(
  '/locations/:locationId/unassign',
  verifyToken,
  verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await teabarLocationService.unassignAttendant({
        locationId: req.params.locationId,
        tenantId: req.tenantId,
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      console.error('[PATCH /teabar/locations/:locationId/unassign] error:', err);
      return errorResponse(res, err.message || 'Failed to unassign attendant.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /teabar/orders — employee self-order
// Body: { locationId, items: [{ itemId, quantity }] }
// ─────────────────────────────────────────
router.post(
  '/orders',
  verifyToken,
  verifyRole(
    ROLES.EMPLOYEE,
    ROLES.MESS_SUPERVISOR,
    ROLES.CAFE_SUPERVISOR,
    ROLES.CAFE_WAITER,
    ROLES.CAFE_BAKERY_TUCKSHOP_SUPERVISOR, // legacy
    ROLES.TEABAR_ATTENDANT,
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
      const result = await teabarOrderService.createSelfOrderBatch({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, `Order placed. ${result.orderCount} item(s).`, 201);
    } catch (err) {
      console.error('[POST /teabar/orders] error:', err);
      return errorResponse(res, err.message || 'Failed to place order.', 400, err);
    }
  }
);

// ─────────────────────────────────────────
// POST /teabar/orders/proxy — attendant places an order on someone's behalf
// Body: { targetEmployeeNumber, items: [{ itemId, quantity }] }
// locationId is intentionally NOT accepted here — always resolved from the
// attendant's own current assignment.
// ─────────────────────────────────────────
router.post(
  '/orders/proxy',
  verifyToken,
  verifyRole(ROLES.TEABAR_ATTENDANT, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return errorResponse(res, 'items array is required and must not be empty.', 400);
      }
      const result = await teabarOrderService.createProxyOrderBatch({
        uid: req.user.uid,
        officialEmployeeNumber: req.officialEmployeeNumber,
        tenantId: req.tenantId,
        userRole: req.userRole,
        ...req.body,
      });
      return successResponse(res, result, `Proxy order placed. ${result.orderCount} item(s).`, 201);
    } catch (err) {
      console.error('[POST /teabar/orders/proxy] error:', err);
      return errorResponse(res, err.message || 'Failed to place proxy order.', 400, err);
    }
  }
);

module.exports = router;