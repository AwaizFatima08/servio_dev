// ─────────────────────────────────────────
// reservationSettingsRoutes.js — Reservation Settings
// HomiLabs | Servio | Flow 05
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { successResponse, errorResponse } = require('../utils');
const { ROLES } = require('../constants');

const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();
const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const TENANT_ID = 'ffl';

// Allowed fields that admin can update
const UPDATABLE_FIELDS = [
  'bookingWindowOpensOn', 'bookingWeekStartDay', 'bookingWindowDays',
  'cutoffHoursBeforeMeal', 'weeklyOptinResidenceTypes', 'flexibleResidenceTypes',
  'allowWalkIn', 'allowGuestBooking', 'allowProxyBooking',
  'allowSupervisorCancellation', 'requireSupervisorCancelReason',
  'allowManagerOverride', 'allowSupervisorOverride', 'requireOverrideReason',
  'maxGuestQuantityPerBooking', 'allowOfficialMeals', 'officialMealMaxHeadcount',
  'allowSpecialMeals', 'specialMealStaffPunchedOnly',
];

// ─────────────────────────────────────────
// GET /reservation-settings
// ─────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('reservationSettings').doc(TENANT_ID).get();

    if (!doc.exists) {
      return errorResponse(res, 'Reservation settings not found', 404);
    }

    const data = doc.data();
    // Clean timestamps
    const clean = {
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return successResponse(res, { settings: clean }, 'Reservation settings retrieved');

  } catch (error) {
    return errorResponse(res, 'Failed to retrieve reservation settings', 500, error);
  }
});

// ─────────────────────────────────────────
// PATCH /reservation-settings
// Only allowed fields can be updated
// ─────────────────────────────────────────
router.patch('/', adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('reservationSettings').doc(TENANT_ID).get();

    if (!doc.exists) {
      return errorResponse(res, 'Reservation settings not found', 404);
    }

    const updates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 'No valid fields to update', 400);
    }

    updates.updatedAt = ts();
    await db.collection('reservationSettings').doc(TENANT_ID).update(updates);

    return successResponse(res, { updatedFields: Object.keys(updates).filter(k => k !== 'updatedAt') }, 'Reservation settings updated');

  } catch (error) {
    return errorResponse(res, 'Failed to update reservation settings', 500, error);
  }
});

module.exports = router;