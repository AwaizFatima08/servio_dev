// core/functions/src/feedback/feedbackService.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../constants');

const VALID_FEEDBACK_AREAS = ['quality', 'quantity', 'ambience', 'rate', 'service', 'overall'];

// ─────────────────────────────────────────
// submitFeedback
// Employee submits feedback for an issued meal
// One submission per feedbackArea per reservationId
// ─────────────────────────────────────────
async function submitFeedback({
  uid,
  officialEmployeeNumber,
  tenantId,
  reservationId,
  feedbackArea,
  rating,
  isAnonymous,
}) {

  // --- 1. Validate inputs ---
  if (!VALID_FEEDBACK_AREAS.includes(feedbackArea)) {
    throw new Error(`Invalid feedbackArea. Valid values: ${VALID_FEEDBACK_AREAS.join(', ')}`);
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be an integer between 1 and 5.');
  }

  // --- 2. Fetch the reservation ---
  const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const reservationDoc = await reservationRef.get();

  if (!reservationDoc.exists) {
    throw new Error('Reservation not found.');
  }

  const reservation = reservationDoc.data();

  if (reservation.tenantId !== tenantId) {
    throw new Error('Access denied.');
  }

  // --- 3. Check eligibility ---
  if (reservation.issueStatus !== 'issued') {
    throw new Error('Feedback can only be submitted for issued reservations.');
  }

  if (reservation.reservationStatus !== 'active') {
    throw new Error('Feedback cannot be submitted for a cancelled reservation.');
  }

  // Employee can only submit feedback for their own reservation
  if (reservation.employeeNumber !== officialEmployeeNumber) {
    throw new Error('You can only submit feedback for your own reservations.');
  }

  // --- 4. Check feedback window ---
  const appSettingsDoc = await db
    .collection(COLLECTIONS.APP_SETTINGS)
    .doc(tenantId)
    .get();

  if (appSettingsDoc.exists) {
    const appSettings = appSettingsDoc.data();
    const windowHours = appSettings.mealFeedbackWindowHours || 24;

    // Get meal service end time from mealTypes
    const mealTypeDoc = await db
      .collection(COLLECTIONS.MEAL_TYPES)
      .doc(reservation.mealType)
      .get();

    if (mealTypeDoc.exists) {
      const mealTypeData = mealTypeDoc.data();
      const [endHour, endMinute] = mealTypeData.serviceWindowEnd.split(':').map(Number);

      // Build window close time for reservation date
      const windowClose = new Date(reservation.reservationDate + 'T00:00:00');
      windowClose.setHours(endHour + windowHours, endMinute, 0, 0);

      if (new Date() > windowClose) {
        throw new Error(`Feedback window has closed. Feedback must be submitted within ${windowHours} hours of meal service.`);
      }
    }
  }

  // --- 5. Check for duplicate feedbackArea submission ---
  const duplicateCheck = await db
    .collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId)
    .where('reservationId', '==', reservationId)
    .where('feedbackArea', '==', feedbackArea)
    .limit(1)
    .get();

  if (!duplicateCheck.empty) {
    throw new Error(`You have already submitted feedback for "${feedbackArea}" on this meal.`);
  }

  // --- 6. Write feedback document ---
  const feedbackRef = db.collection(COLLECTIONS.MEAL_FEEDBACK).doc();
  const feedbackId = feedbackRef.id;

  const feedbackDoc = {
    feedbackId,
    tenantId,
    reservationId,
    reservationDate: reservation.reservationDate,
    mealType: reservation.mealType,
    menuItemId: reservation.menuItemId,
    itemName: reservation.itemName,
    menuOptionKey: reservation.menuOptionKey,
    employeeNumber: officialEmployeeNumber,
    employeeName: reservation.employeeName,
    submittedByUid: uid,
    feedbackArea,
    rating,
    isAnonymous: isAnonymous || false,
    status: 'open',
    reviewedByUid: null,
    reviewedAt: null,
    submittedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await feedbackRef.set(feedbackDoc);

  // --- 7. Update reservation feedbackStatus to "submitted" ---
  await reservationRef.update({
    feedbackStatus: 'submitted',
    feedbackSubmittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    feedbackId,
    reservationId,
    feedbackArea,
    rating,
    isAnonymous: isAnonymous || false,
  };
}

// ─────────────────────────────────────────
// getFeedbackForReservation
// Returns all feedback submitted for a reservation
// ─────────────────────────────────────────
async function getFeedbackForReservation({ tenantId, reservationId }) {
  const snap = await db
    .collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId)
    .where('reservationId', '==', reservationId)
    .get();

  return snap.docs.map(doc => doc.data());
}

// ─────────────────────────────────────────
// getFeedbackSummary
// Returns aggregated feedback for a date and mealType
// Admin dashboard use
// ─────────────────────────────────────────
async function getFeedbackSummary({ tenantId, date, mealType }) {
  const query = db
    .collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', date);

  const snap = mealType
    ? await query.where('mealType', '==', mealType).get()
    : await query.get();

  const feedback = snap.docs.map(doc => doc.data());

  // Aggregate by feedbackArea
  const summary = {};
  for (const area of VALID_FEEDBACK_AREAS) {
    const areaFeedback = feedback.filter(f => f.feedbackArea === area);
    if (areaFeedback.length === 0) {
      summary[area] = { count: 0, average: null };
    } else {
      const total = areaFeedback.reduce((sum, f) => sum + f.rating, 0);
      summary[area] = {
        count: areaFeedback.length,
        average: parseFloat((total / areaFeedback.length).toFixed(2)),
      };
    }
  }

  return {
    date,
    mealType: mealType || 'all',
    totalSubmissions: feedback.length,
    summary,
  };
}

module.exports = { submitFeedback, getFeedbackForReservation, getFeedbackSummary };