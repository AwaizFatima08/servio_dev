// core/functions/src/mess/messRoutes.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { resolveDailyMenus } = require('./dailyMenuResolver');
const { errorResponse } = require('../utils');
const { createSelfBooking, createProxyBooking, createWalkInBooking, cancelReservation, getIssuanceList, issueReservation, markNoShow, createAlaCarteBooking } = require('./messReservationService');

const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

/**
 * POST /mess/resolve-daily-menus
 * Manual trigger for the daily menu resolver.
 * Admin / super_admin only.
 * Body: { date: "2026-05-23" }  ← optional, defaults to tomorrow
 */
router.post('/resolve-daily-menus', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const targetDate = req.body.date || null;

    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const result = await resolveDailyMenus(tenantId, targetDate);

    return res.status(200).json({
      message: 'Daily menus resolved successfully.',
      result,
    });

  } catch (error) {
    console.error('Daily menu resolver error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * GET /mess/daily-menu/:date/:mealType
 * Fetch a single resolved daily menu document.
 * Any authenticated user.
 */
router.get('/daily-menu/:date/:mealType', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date, mealType } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner'];
    if (!validMealTypes.includes(mealType)) {
      return errorResponse(res, 'Invalid mealType. Use breakfast, lunch, or dinner.', 400);
    }

    const docId = `${tenantId}_${date}_${mealType}`;
    const doc = await db.collection('dailyMenus').doc(docId).get();

    if (!doc.exists) {
      return errorResponse(res, `No daily menu found for ${date} ${mealType}`, 404);
    }

    return res.status(200).json({ menu: doc.data() });

  } catch (error) {
    console.error('Get daily menu error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});


/**
 * POST /mess/reservations
 * Create a self-booking (employee books for themselves)
 * Employee role only for self-booking
 */
router.post('/reservations', [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)], async (req, res) => {
  try {
    const uid = req.user.uid;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const tenantId = req.tenantId;

    const {
      reservationDate,
      mealType,
      menuItemId,
      menuOptionKey,
      optionLabel,
      itemName,
      diningMode,
      selectionMode,
    } = req.body;

    // Validate required fields
    const required = ['reservationDate', 'mealType', 'menuItemId', 'menuOptionKey', 'optionLabel', 'itemName', 'diningMode', 'selectionMode'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    // Validate controlled values
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return errorResponse(res, 'Invalid mealType.', 400);
    }
    if (!['dine_in', 'takeaway'].includes(diningMode)) {
      return errorResponse(res, 'Invalid diningMode. Use dine_in or takeaway.', 400);
    }
    if (!['combo', 'alacarte'].includes(selectionMode)) {
      return errorResponse(res, 'Invalid selectionMode. Use combo or alacarte.', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return errorResponse(res, 'Invalid reservationDate format. Use YYYY-MM-DD.', 400);
    }

    const result = await createSelfBooking({
      uid,
      officialEmployeeNumber,
      tenantId,
      reservationDate,
      mealType,
      menuItemId,
      menuOptionKey,
      optionLabel,
      itemName,
      diningMode,
      selectionMode,
      bookingSource: req.body.bookingSource || 'self',
    });

    return res.status(201).json({
      message: 'Reservation created successfully.',
      reservation: result,
    });

  } catch (error) {
    console.error('Create reservation error:', error.message);
    if (error.existingReservationId) {
      return res.status(409).json({
        success: false,
        message: error.message,
        existingReservationId: error.existingReservationId,
      });
    }
    return errorResponse(res, error.message, 400);
  }
});


const supervisorAndAbove = [verifyToken, verifyRole(
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

/**
 * GET /mess/reservations/issuance-list?date=2026-05-23&mealType=lunch
 * Get pending reservations for issuance
 * Supervisor and above only
 */
router.get('/reservations/issuance-list', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date, mealType } = req.query;

    if (!date || !mealType) {
      return errorResponse(res, 'date and mealType are required query parameters.', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return errorResponse(res, 'Invalid mealType.', 400);
    }

    const reservations = await getIssuanceList({ tenantId, reservationDate: date, mealType });

    return res.status(200).json({
      date,
      mealType,
      count: reservations.length,
      reservations,
    });

  } catch (error) {
    console.error('Get issuance list error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * PATCH /mess/reservations/:reservationId/issue
 * Mark reservation as issued
 * Supervisor and above only
 */
router.patch('/reservations/:reservationId/issue', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { reservationId } = req.params;
    const issuedByUid = req.user.uid;
    const issuedByRole = req.userRole;

    const result = await issueReservation({ reservationId, tenantId, issuedByUid, issuedByRole });

    return res.status(200).json({
      message: 'Reservation issued successfully.',
      result,
    });

  } catch (error) {
    console.error('Issue reservation error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * PATCH /mess/reservations/:reservationId/no-show
 * Mark reservation as no-show
 * Supervisor and above only
 */
router.patch('/reservations/:reservationId/no-show', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { reservationId } = req.params;
    const issuedByUid = req.user.uid;
    const issuedByRole = req.userRole;

    const result = await markNoShow({ reservationId, tenantId, issuedByUid, issuedByRole });

    return res.status(200).json({
      message: 'Reservation marked as no-show.',
      result,
    });

  } catch (error) {
    console.error('No-show error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * POST /mess/reservations/proxy
 * Supervisor/Manager/Admin books on behalf of an employee
 * No cutoff restriction
 */
router.post('/reservations/proxy', supervisorAndAbove, async (req, res) => {
  try {
    const uid = req.user.uid;
    const createdByRole = req.userRole;
    const createdByEmployeeNumber = req.officialEmployeeNumber;
    const tenantId = req.tenantId;

    const {
      targetEmployeeNumber,
      reservationDate,
      mealType,
      menuItemId,
      menuOptionKey,
      optionLabel,
      itemName,
      diningMode,
      selectionMode,
    } = req.body;

    const required = ['targetEmployeeNumber', 'reservationDate', 'mealType', 'menuItemId', 'menuOptionKey', 'optionLabel', 'itemName', 'diningMode', 'selectionMode'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return errorResponse(res, 'Invalid mealType.', 400);
    }
    if (!['dine_in', 'takeaway'].includes(diningMode)) {
      return errorResponse(res, 'Invalid diningMode.', 400);
    }
    if (!['combo', 'alacarte'].includes(selectionMode)) {
      return errorResponse(res, 'Invalid selectionMode.', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return errorResponse(res, 'Invalid reservationDate format. Use YYYY-MM-DD.', 400);
    }

    const result = await createProxyBooking({
      uid,
      createdByRole,
      createdByEmployeeNumber,
      tenantId,
      targetEmployeeNumber,
      reservationDate,
      mealType,
      menuItemId,
      menuOptionKey,
      optionLabel,
      itemName,
      diningMode,
      selectionMode,
    });

    return res.status(201).json({
      message: 'Proxy reservation created successfully.',
      reservation: result,
    });

  } catch (error) {
    console.error('Proxy booking error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});



/**
 * PATCH /mess/reservations/:reservationId/cancel
 * Cancel a reservation
 * Employee can cancel own, supervisor can cancel any
 */
router.patch('/reservations/:reservationId/cancel', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const cancelledByRole = req.userRole;
    const cancelledByEmployeeNumber = req.officialEmployeeNumber;
    const tenantId = req.tenantId;
    const { reservationId } = req.params;
    const { cancellationReason, cancellationNote } = req.body;

    if (!cancellationReason) {
      return errorResponse(res, 'cancellationReason is required.', 400);
    }

    const result = await cancelReservation({
      reservationId,
      tenantId,
      cancelledByUid: uid,
      cancelledByRole,
      cancelledByEmployeeNumber,
      cancellationReason,
      cancellationNote,
    });

    return res.status(200).json({
      message: 'Reservation cancelled successfully.',
      result,
    });

  } catch (error) {
    console.error('Cancel reservation error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// messRoutes_ADDITION.js
// HomiLabs | Servio
//
// INSTRUCTIONS FOR HOMI:
// ONE new route to ADD to your existing messRoutes.js file.
// No changes needed to messReservationService.js — this route
// queries Firestore directly (simple read, no business logic needed).
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /mess/my-reservations
// Returns the current employee's own reservations
// Query params:
//   ?month=YYYY-MM          — filter by month (optional)
//   ?status=active|cancelled — filter by reservationStatus (optional)
// Any authenticated user — returns only their own records
// Used by: Screen 11 — My Bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-reservations', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const { month, status } = req.query;

    // Validate month if provided
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse(res, 'Invalid month format. Use YYYY-MM.', 400);
    }

    // Validate status if provided
    const validStatuses = ['active', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 400);
    }

    // Build query
    let query = db
      .collection('messReservations')
      .where('tenantId', '==', tenantId)
      .where('employeeNumber', '==', officialEmployeeNumber);

    // Filter by reservationStatus if requested
    if (status) {
      query = query.where('reservationStatus', '==', status);
    }

    // Filter by month if requested
    if (month) {
      const [year, mon] = month.split('-');
      const pad = (n) => String(n).padStart(2, '0');
      const monthNum = parseInt(mon, 10);
      const lastDay = new Date(parseInt(year, 10), monthNum, 0).getDate();
      const start = `${year}-${pad(monthNum)}-01`;
      const end = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

      query = query
        .where('reservationDate', '>=', start)
        .where('reservationDate', '<=', end);
    }

    query = query.orderBy('reservationDate', 'desc');

    const snap = await query.get();
    const reservations = snap.docs.map(doc => doc.data());

    return res.status(200).json({
      count: reservations.length,
      reservations,
    });

  } catch (error) {
    console.error('GET my-reservations error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

router.post('/reservations/alacarte', [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)], async (req, res) => {
  try {
    const uid                   = req.user.uid;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const tenantId              = req.tenantId;
    const createdByRole         = req.userRole;
 
    const { reservationDate, diningMode, items, bookingSource, targetEmployeeNumber } = req.body;

 
    // ── Validate required top-level fields ──
    if (!reservationDate) {
      return errorResponse(res, 'reservationDate is required.', 400);
    }
    if (!diningMode) {
      return errorResponse(res, 'diningMode is required.', 400);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'items array is required and must not be empty.', 400);
    }
 
    // ── Validate controlled values ──
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return errorResponse(res, 'Invalid reservationDate format. Use YYYY-MM-DD.', 400);
    }
    if (!['dine_in', 'takeaway'].includes(diningMode)) {
      return errorResponse(res, 'Invalid diningMode. Use dine_in or takeaway.', 400);
    }
 
    // ── Validate each item in the array ──
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemId) {
        return errorResponse(res, `Item at index ${i} is missing itemId.`, 400);
      }
      if (!item.itemName) {
        return errorResponse(res, `Item at index ${i} is missing itemName.`, 400);
      }
      if (item.quantity !== undefined) {
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty < 1 || qty > 20) {
          return errorResponse(res, `Item "${item.itemName}" has invalid quantity. Must be 1–20.`, 400);
        }
        item.quantity = qty;  // normalise to integer
      }
    }
 
    // Determine booking source — self if not specified or caller is employee
    const resolvedSource = bookingSource || 'self';
    const validSources = ['self', 'proxy', 'walk_in'];
    if (!validSources.includes(resolvedSource)) {
      return errorResponse(res, 'Invalid bookingSource.', 400);
    }

    // For proxy/walk-in, supervisor specifies targetEmployeeNumber in body
    // For self, target is always the caller themselves
    const resolvedTarget = resolvedSource === 'self'
      ? officialEmployeeNumber
      : targetEmployeeNumber;

    if (resolvedSource !== 'self' && !resolvedTarget) {
      return errorResponse(res, 'targetEmployeeNumber is required for proxy and walk-in bookings.', 400);
    }

    const booking = await createAlaCarteBooking({
      uid,
      officialEmployeeNumber,
      targetEmployeeNumber: resolvedTarget,
      targetEmployeeName: null,
      tenantId,
      reservationDate,
      items,
      diningMode,
      bookingSource: resolvedSource,
      createdByRole,
      createdByEmployeeNumber: officialEmployeeNumber,
    });
 
    return res.status(201).json({
      message: 'Ala carte booking created successfully.',
      booking,
    });
 
  } catch (error) {
    console.error('Ala carte booking error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;