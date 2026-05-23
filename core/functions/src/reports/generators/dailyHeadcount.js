// ─────────────────────────────────────────
// dailyHeadcount.js — Live Query Generator
// Release: V1 | Flow 11
// Type: LIVE — runs at query time, not pre-computed
// ─────────────────────────────────────────
// Queries messReservations for a given date.
// Returns headcount breakdown by meal type, subject type,
// dining mode, and issue status.
// Used by: kitchen dashboard, manager dashboard, admin dashboard.
// ─────────────────────────────────────────

const { COLLECTIONS, RESERVATION_STATUS, ISSUE_STATUS, SUBJECT_TYPES, DINING_MODES } = require('../../constants');

/**
 * Generate daily headcount report for a given date.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} date  — YYYY-MM-DD
 * @returns {object}
 */
async function generate(db, tenantId, date) {

  // Pull all active reservations for this tenant on this date.
  // We only count active (not cancelled) reservations.
  const snapshot = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', date)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .get();

  if (snapshot.empty) {
    return buildEmptyResult(date);
  }

  const reservations = snapshot.docs.map(d => d.data());

  // ── Meal type breakdown ───────────────────────────────────────────────────
  // For each meal (breakfast, lunch, dinner) we count:
  //   total booked, total issued, total pending, total no_show
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const byMeal = {};

  for (const mealType of mealTypes) {
    const forMeal = reservations.filter(r => r.mealType === mealType);

    byMeal[mealType] = {
      totalBooked:  forMeal.length,
      issued:       forMeal.filter(r => r.issueStatus === ISSUE_STATUS.ISSUED).length,
      pending:      forMeal.filter(r => r.issueStatus === ISSUE_STATUS.PENDING).length,
      noShow:       forMeal.filter(r => r.issueStatus === ISSUE_STATUS.NO_SHOW).length,
      dineIn:       forMeal.filter(r => r.diningMode  === DINING_MODES.DINE_IN).length,
      takeaway:     forMeal.filter(r => r.diningMode  === DINING_MODES.TAKEAWAY).length,
      // Subject type breakdown — who is eating
      selfCount:          forMeal.filter(r => r.subjectType === SUBJECT_TYPES.SELF).length,
      personalGuestCount: forMeal.filter(r => r.subjectType === SUBJECT_TYPES.PERSONAL_GUEST).length,
      officialGuestCount: forMeal.filter(r => r.subjectType === SUBJECT_TYPES.OFFICIAL_GUEST).length,
      officialMealCount:  forMeal.filter(r => r.subjectType === SUBJECT_TYPES.OFFICIAL_MEAL).length,
      specialMealCount:   forMeal.filter(r => r.subjectType === SUBJECT_TYPES.SPECIAL_MEAL).length,
    };
  }

  // ── Day totals ────────────────────────────────────────────────────────────
  const totals = {
    totalBooked: reservations.length,
    totalIssued: reservations.filter(r => r.issueStatus === ISSUE_STATUS.ISSUED).length,
    totalPending: reservations.filter(r => r.issueStatus === ISSUE_STATUS.PENDING).length,
    totalNoShow: reservations.filter(r => r.issueStatus === ISSUE_STATUS.NO_SHOW).length,
  };

  return {
    date,
    tenantId,
    generatedAt: new Date().toISOString(),
    reportType: 'daily_headcount',
    totals,
    byMeal,
  };
}

// Returns a zeroed-out result when no reservations exist for the date.
// This prevents the frontend from crashing on empty days.
function buildEmptyResult(date) {
  const emptyMeal = {
    totalBooked: 0, issued: 0, pending: 0, noShow: 0,
    dineIn: 0, takeaway: 0,
    selfCount: 0, personalGuestCount: 0, officialGuestCount: 0,
    officialMealCount: 0, specialMealCount: 0,
  };
  return {
    date,
    reportType: 'daily_headcount',
    generatedAt: new Date().toISOString(),
    totals: { totalBooked: 0, totalIssued: 0, totalPending: 0, totalNoShow: 0 },
    byMeal: {
      breakfast: { ...emptyMeal },
      lunch:     { ...emptyMeal },
      dinner:    { ...emptyMeal },
    },
  };
}

module.exports = { generate };