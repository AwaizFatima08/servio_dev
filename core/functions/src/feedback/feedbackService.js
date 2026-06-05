// core/functions/src/feedback/feedbackService.js

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
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

    const mealTypeDoc = await db
      .collection(COLLECTIONS.MEAL_TYPES)
      .doc(reservation.mealType)
      .get();

    if (mealTypeDoc.exists) {
      const mealTypeData = mealTypeDoc.data();
      const [endHour, endMinute] = mealTypeData.serviceWindowEnd.split(':').map(Number);
      const serviceEndMinutesUTC = (endHour * 60) + endMinute;
      const windowCloseMinutesUTC = serviceEndMinutesUTC + (windowHours * 60);
      const reservationMidnightUTC = new Date(reservation.reservationDate + 'T00:00:00Z');
      const windowClose = new Date(
        reservationMidnightUTC.getTime() + (windowCloseMinutesUTC * 60 * 1000)
      );
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
    feedbackId, tenantId, reservationId,
    reservationDate: reservation.reservationDate,
    mealType: reservation.mealType,
    menuItemId: reservation.menuItemId,
    itemName: reservation.itemName,
    menuOptionKey: reservation.menuOptionKey,
    employeeNumber: officialEmployeeNumber,
    employeeName: reservation.employeeName,
    submittedByUid: uid,
    feedbackArea, rating,
    isAnonymous: isAnonymous || false,
    status: 'open',
    reviewedByUid: null, reviewedAt: null,
    submittedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await feedbackRef.set(feedbackDoc);
  await reservationRef.update({
    feedbackStatus: 'submitted',
    feedbackSubmittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { feedbackId, reservationId, feedbackArea, rating, isAnonymous: isAnonymous || false };
}

async function getFeedbackForReservation({ tenantId, reservationId }) {
  const snap = await db.collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId).where('reservationId', '==', reservationId).get();
  return snap.docs.map(doc => doc.data());
}

async function getFeedbackSummary({ tenantId, date, mealType }) {
  const query = db.collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId).where('reservationDate', '==', date);
  const snap = mealType ? await query.where('mealType', '==', mealType).get() : await query.get();
  const feedback = snap.docs.map(doc => doc.data());
  const summary = {};
  for (const area of VALID_FEEDBACK_AREAS) {
    const areaFeedback = feedback.filter(f => f.feedbackArea === area);
    summary[area] = areaFeedback.length === 0
      ? { count: 0, average: null }
      : { count: areaFeedback.length, average: parseFloat((areaFeedback.reduce((s, f) => s + f.rating, 0) / areaFeedback.length).toFixed(2)) };
  }
  return { date, mealType: mealType || 'all', totalSubmissions: feedback.length, summary };
}

// ── getEligibleReservations
// Returns issued reservations for the current employee that are still
// within the feedback window and have feedbackStatus = "pending"
// NO date filter — queries ALL pending-feedback reservations
// then filters by the 24hr window in JS
async function getEligibleReservations({ tenantId, officialEmployeeNumber }) {
  const snap = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .where('reservationStatus', '==', 'active')
    .where('issueStatus', '==', 'issued')
    .where('feedbackStatus', '==', 'pending')
    .orderBy('reservationDate', 'desc')
    .get();

  if (snap.empty) return [];

  let windowHours = 24;
  const settingsDoc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();
  if (settingsDoc.exists) {
    windowHours = settingsDoc.data().mealFeedbackWindowHours || 24;
  }

  const mealTypeSnap = await db.collection(COLLECTIONS.MEAL_TYPES).get();
  const mealTypeMap = {};
  mealTypeSnap.docs.forEach(doc => { mealTypeMap[doc.id] = doc.data(); });

  const now = new Date();
  const eligible = [];

  for (const doc of snap.docs) {
    const r = doc.data();
    const mealType = mealTypeMap[r.mealType];
    if (!mealType) { eligible.push(r); continue; }
    const [endHour, endMinute] = mealType.serviceWindowEnd.split(':').map(Number);
    const serviceEndMinutesUTC = (endHour * 60) + endMinute;
    const windowCloseMinutesUTC = serviceEndMinutesUTC + (windowHours * 60);
    const reservationMidnightUTC = new Date(r.reservationDate + 'T00:00:00Z');
    const windowClose = new Date(
      reservationMidnightUTC.getTime() + (windowCloseMinutesUTC * 60 * 1000)
    );
    if (now <= windowClose) { eligible.push(r); }
  }
  return eligible;
}

async function getMyFeedback({ tenantId, officialEmployeeNumber, month }) {
  let query = db.collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId).where('employeeNumber', '==', officialEmployeeNumber);
  if (month) {
    const [year, mon] = month.split('-');
    const pad = n => String(n).padStart(2, '0');
    const monthNum = parseInt(mon, 10);
    const lastDay = new Date(parseInt(year, 10), monthNum, 0).getDate();
    query = query.where('reservationDate', '>=', `${year}-${pad(monthNum)}-01`)
                 .where('reservationDate', '<=', `${year}-${pad(monthNum)}-${pad(lastDay)}`);
  }
  const snap = await query.orderBy('reservationDate', 'desc').get();
  return snap.docs.map(doc => doc.data());
}

module.exports = {
  submitFeedback, getFeedbackForReservation, getFeedbackSummary,
  getEligibleReservations, getMyFeedback,
};