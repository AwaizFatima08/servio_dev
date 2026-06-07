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
const { createSelfBooking, createProxyBooking, createWalkInBooking, cancelReservation, getIssuanceList, issueReservation, markNoShow, createAlaCarteBooking, createSpecialMealWalkIn, createOfficialGuestWalkIn, approveOfficialGuestMeal, rejectOfficialGuestMeal } = require('./messReservationService');

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
router.post('/reservations/walk-in', supervisorAndAbove, async (req, res) => {
  try {
    const uid                     = req.user.uid;
    const createdByRole           = req.userRole;
    const createdByEmployeeNumber = req.officialEmployeeNumber;
    const tenantId                = req.tenantId;
 
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
      quantity,
    } = req.body;
 
    const required = [
      'targetEmployeeNumber',
      'reservationDate',
      'mealType',
      'menuItemId',
      'menuOptionKey',
      'optionLabel',
      'itemName',
      'diningMode',
      'selectionMode',
    ];
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
 
    const result = await createWalkInBooking({
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
      quantity: quantity || 1,
    });
 
    return res.status(201).json({
      message: 'Walk-in reservation created and issued.',
      reservation: result,
    });
 
  } catch (error) {
    console.error('Walk-in booking error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

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


/**
 * GET /mess/menu-items/active
 * Returns all active menuItems for the tenant.
 * Used by WalkInPage special meal item search.
 * Supervisor and above only.
 */
router.get('/menu-items/active', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const snap = await db
      .collection('menuItems')
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('itemName', 'asc')
      .get();

    const items = snap.docs.map(doc => {
      const d = doc.data();
      return {
        itemId:       d.itemId,
        itemName:     d.itemName,
        baseUnit:     d.baseUnit,
        foodTypeCode: d.foodTypeCode,
        sortOrder:    d.sortOrder || 0,
      };
    });

    return res.status(200).json({ count: items.length, items });

  } catch (error) {
    console.error('GET menu-items/active error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});


/**
 * POST /mess/reservations/special-meal
 * Supervisor walk-in special meal for lunch or dinner.
 * Allows selection of any active menuItem — not restricted to daily menu.
 * Supervisor and above only.
 * Body: { targetEmployeeNumber, reservationDate, mealType, diningMode,
 *         items: [{ itemId, itemName, baseUnit, foodTypeCode, quantity }] }
 */
router.post('/reservations/special-meal', supervisorAndAbove, async (req, res) => {
  try {
    const uid                     = req.user.uid;
    const createdByRole           = req.userRole;
    const createdByEmployeeNumber = req.officialEmployeeNumber;
    const tenantId                = req.tenantId;

    const { targetEmployeeNumber, reservationDate, mealType, diningMode, items } = req.body;

    // Validate required fields
    if (!targetEmployeeNumber) return errorResponse(res, 'targetEmployeeNumber is required.', 400);
    if (!reservationDate)      return errorResponse(res, 'reservationDate is required.', 400);
    if (!mealType)             return errorResponse(res, 'mealType is required.', 400);
    if (!diningMode)           return errorResponse(res, 'diningMode is required.', 400);
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'items array is required and must not be empty.', 400);
    }

    // Validate controlled values
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return errorResponse(res, 'Invalid reservationDate format. Use YYYY-MM-DD.', 400);
    }
    if (!['lunch', 'dinner'].includes(mealType)) {
      return errorResponse(res, 'Special meal walk-in is only available for lunch and dinner.', 400);
    }
    if (!['dine_in', 'takeaway'].includes(diningMode)) {
      return errorResponse(res, 'Invalid diningMode. Use dine_in or takeaway.', 400);
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemId)   return errorResponse(res, `Item at index ${i} is missing itemId.`, 400);
      if (!item.itemName) return errorResponse(res, `Item at index ${i} is missing itemName.`, 400);
      if (item.quantity !== undefined) {
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty < 1 || qty > 10) {
          return errorResponse(res, `Item "${item.itemName}" has invalid quantity. Must be 1-10.`, 400);
        }
        item.quantity = qty;
      }
    }

    const booking = await createSpecialMealWalkIn({
      uid,
      createdByRole,
      createdByEmployeeNumber,
      tenantId,
      targetEmployeeNumber,
      reservationDate,
      mealType,
      items,
      diningMode,
    });

    return res.status(201).json({
      message: 'Special meal walk-in recorded and issued successfully.',
      booking,
    });

  } catch (error) {
    console.error('Special meal walk-in error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * POST /mess/reservations/official-guest-walkin
 * Supervisor walk-in for an official guest (no system account).
 * Handles all meal types — breakfast combo+alacarte, lunch/dinner full catalogue.
 * issueStatus: issued immediately. approvalStatus: pending_approval.
 * Supervisor and above only.
 */
router.post('/reservations/official-guest-walkin', supervisorAndAbove, async (req, res) => {
  try {
    const uid                     = req.user.uid;
    const createdByRole           = req.userRole;
    const createdByEmployeeNumber = req.officialEmployeeNumber;
    const tenantId                = req.tenantId;

    const {
      guestName,
      sponsoringEmployeeNumber,
      reservationDate,
      mealType,
      diningMode,
      comboItem,
      items,
    } = req.body;

    // Validate required fields
    if (!guestName || !guestName.trim()) return errorResponse(res, 'guestName is required.', 400);
    if (!sponsoringEmployeeNumber) return errorResponse(res, 'sponsoringEmployeeNumber is required.', 400);
    if (!reservationDate) return errorResponse(res, 'reservationDate is required.', 400);
    if (!mealType) return errorResponse(res, 'mealType is required.', 400);
    if (!diningMode) return errorResponse(res, 'diningMode is required.', 400);

    // Validate controlled values
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return errorResponse(res, 'Invalid reservationDate format. Use YYYY-MM-DD.', 400);
    }
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return errorResponse(res, 'Invalid mealType.', 400);
    }
    if (!['dine_in', 'takeaway'].includes(diningMode)) {
      return errorResponse(res, 'Invalid diningMode.', 400);
    }

    // Must have at least one item
    const hasCombo = !!comboItem;
    const hasItems = Array.isArray(items) && items.length > 0;
    if (!hasCombo && !hasItems) {
      return errorResponse(res, 'At least one meal item (combo or individual) must be selected.', 400);
    }

    // Validate items array if present
    if (hasItems) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.itemId)   return errorResponse(res, `Item at index ${i} is missing itemId.`, 400);
        if (!item.itemName) return errorResponse(res, `Item at index ${i} is missing itemName.`, 400);
        if (item.quantity !== undefined) {
          const qty = parseInt(item.quantity, 10);
          if (isNaN(qty) || qty < 1 || qty > 10) {
            return errorResponse(res, `Item "${item.itemName}" has invalid quantity. Must be 1-10.`, 400);
          }
          item.quantity = qty;
        }
      }
    }

    const booking = await createOfficialGuestWalkIn({
      uid,
      createdByRole,
      createdByEmployeeNumber,
      tenantId,
      guestName: guestName.trim(),
      sponsoringEmployeeNumber,
      reservationDate,
      mealType,
      diningMode,
      comboItem: comboItem || null,
      items: items || [],
    });

    return res.status(201).json({
      message: 'Official guest walk-in recorded and issued successfully.',
      booking,
    });

  } catch (error) {
    console.error('Official guest walk-in error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});


/**
 * PATCH /mess/reservations/:reservationId/approve-official-guest
 * Admin approves billing for an official guest reservation.
 * Admin only.
 */
router.patch('/reservations/:reservationId/approve-official-guest', adminOnly, async (req, res) => {
  try {
    const tenantId      = req.tenantId;
    const approvedByUid = req.user.uid;
    const { reservationId } = req.params;

    const result = await approveOfficialGuestMeal({ reservationId, tenantId, approvedByUid });

    return res.status(200).json({
      message: 'Official guest meal approved.',
      result,
    });

  } catch (error) {
    console.error('Approve official guest error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});


/**
 * PATCH /mess/reservations/:reservationId/reject-official-guest
 * Admin rejects billing for an official guest reservation.
 * Admin only.
 * Body: { approvalNote? }
 */
router.patch('/reservations/:reservationId/reject-official-guest', adminOnly, async (req, res) => {
  try {
    const tenantId      = req.tenantId;
    const rejectedByUid = req.user.uid;
    const { reservationId } = req.params;
    const { approvalNote } = req.body;

    const result = await rejectOfficialGuestMeal({ reservationId, tenantId, rejectedByUid, approvalNote });

    return res.status(200).json({
      message: 'Official guest meal rejected.',
      result,
    });

  } catch (error) {
    console.error('Reject official guest error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});


/**
 * GET /mess/reservations/official-guest-pending
 * Returns all official guest reservations with approvalStatus: pending_approval.
 * Admin only.
 * Query: ?date=YYYY-MM-DD (optional — omit to get all pending)
 */
router.get('/reservations/official-guest-pending', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date } = req.query;

    let query = db
      .collection('messReservations')
      .where('tenantId', '==', tenantId)
      .where('subjectType', '==', 'official_guest')
      .where('approvalStatus', '==', 'pending_approval');

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
      }
      query = query.where('reservationDate', '==', date);
    }

    const snap = await query.orderBy('createdAt', 'desc').get();
    const reservations = snap.docs.map(d => d.data());

    return res.status(200).json({ count: reservations.length, reservations });

  } catch (error) {
    console.error('GET official-guest-pending error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * GET /mess/reservation-settings
 * Returns the tenant's reservationSettings document.
 * Admin only — used by the Booking Policy widget on AppSettingsPage.
 */
router.get('/reservation-settings', adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const doc = await db.collection('reservationSettings').doc(tenantId).get();
    if (!doc.exists) return errorResponse(res, 'Reservation settings not found.', 404);
    return res.status(200).json({ settings: doc.data() });
  } catch (error) {
    console.error('GET reservation-settings error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * PATCH /mess/reservation-settings
 * Admin updates whitelisted fields in reservationSettings.
 * Whitelisted: cutoffHoursBeforeMeal, bookingWindowDays, maxGuestQuantityPerBooking.
 * Admin only.
 * Body: { cutoffHoursBeforeMeal?: number, bookingWindowDays?: number, maxGuestQuantityPerBooking?: number }
 */
router.patch('/reservation-settings', adminOnly, async (req, res) => {
  try {
    const tenantId      = req.tenantId;
    const updatedByUid  = req.user.uid;
    const updates       = req.body;

    const ALLOWED = ['cutoffHoursBeforeMeal', 'bookingWindowDays', 'maxGuestQuantityPerBooking'];

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(res, 'No update fields provided.', 400);
    }

    const unknown = Object.keys(updates).filter(k => !ALLOWED.includes(k));
    if (unknown.length > 0) {
      return errorResponse(res, `Unknown or protected fields: ${unknown.join(', ')}`, 400);
    }

    // Validate numeric values
    for (const key of Object.keys(updates)) {
      const val = parseInt(updates[key], 10);
      if (isNaN(val) || val < 1) {
        return errorResponse(res, `${key} must be a positive integer.`, 400);
      }
      updates[key] = val;
    }

    const doc = await db.collection('reservationSettings').doc(tenantId).get();
    if (!doc.exists) return errorResponse(res, 'Reservation settings not found.', 404);

    await db.collection('reservationSettings').doc(tenantId).update({
      ...updates,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      message: 'Reservation settings updated successfully.',
      updatedFields: Object.keys(updates),
    });

  } catch (error) {
    console.error('PATCH reservation-settings error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;