// core/functions/src/mess/messRoutes.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { resolveDailyMenus } = require('./dailyMenuResolver');
const { errorResponse } = require('../utils');
const { createSelfBooking, getIssuanceList, issueReservation, markNoShow } = require('./messReservationService');

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
    });

    return res.status(201).json({
      message: 'Reservation created successfully.',
      reservation: result,
    });

  } catch (error) {
    console.error('Create reservation error:', error.message);
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

module.exports = router;