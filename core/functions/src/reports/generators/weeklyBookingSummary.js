// ─────────────────────────────────────────
// weeklyBookingSummary.js — Snapshot Generator
// Release: V1 | Flow 11
// Type: SNAPSHOT — written nightly, read instantly
// ─────────────────────────────────────────
// Summarises all mess reservations for a Mon–Sun week.
// Gives management a weekly view of booking patterns,
// cancellations, no-shows, and subject type mix.
// ─────────────────────────────────────────

const { COLLECTIONS, RESERVATION_STATUS, ISSUE_STATUS, SUBJECT_TYPES, BOOKING_SOURCES } = require('../../constants');

/**
 * Generate weekly booking summary snapshot.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} periodStart — YYYY-MM-DD (Monday)
 * @param {string} periodEnd   — YYYY-MM-DD (Sunday)
 * @returns {object}
 */
async function generate(db, tenantId, periodStart, periodEnd) {

  const snapshot = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '>=', periodStart)
    .where('reservationDate', '<=', periodEnd)
    .get();

  const all = snapshot.docs.map(d => d.data());
  const active    = all.filter(r => r.reservationStatus === RESERVATION_STATUS.ACTIVE);
  const cancelled = all.filter(r => r.reservationStatus === RESERVATION_STATUS.CANCELLED);

  // ── Day-by-day breakdown ──────────────────────────────────────────────────
  // Useful for spotting which days have high or low turnout
  const byDay = {};
  const dates = getDatesInRange(periodStart, periodEnd);

  for (const date of dates) {
    const forDay = active.filter(r => r.reservationDate === date);
    byDay[date] = {
      booked:    forDay.length,
      issued:    forDay.filter(r => r.issueStatus === ISSUE_STATUS.ISSUED).length,
      noShow:    forDay.filter(r => r.issueStatus === ISSUE_STATUS.NO_SHOW).length,
      pending:   forDay.filter(r => r.issueStatus === ISSUE_STATUS.PENDING).length,
    };
  }

  // ── Subject type mix for the week ─────────────────────────────────────────
  const subjectMix = {
    self:          active.filter(r => r.subjectType === SUBJECT_TYPES.SELF).length,
    personalGuest: active.filter(r => r.subjectType === SUBJECT_TYPES.PERSONAL_GUEST).length,
    officialGuest: active.filter(r => r.subjectType === SUBJECT_TYPES.OFFICIAL_GUEST).length,
    officialMeal:  active.filter(r => r.subjectType === SUBJECT_TYPES.OFFICIAL_MEAL).length,
    specialMeal:   active.filter(r => r.subjectType === SUBJECT_TYPES.SPECIAL_MEAL).length,
  };

  // ── Booking source mix ────────────────────────────────────────────────────
  const sourceMix = {
    self:    active.filter(r => r.bookingSource === BOOKING_SOURCES.SELF).length,
    proxy:   active.filter(r => r.bookingSource === BOOKING_SOURCES.PROXY).length,
    walkIn:  active.filter(r => r.bookingSource === BOOKING_SOURCES.WALK_IN).length,
    official:active.filter(r => r.bookingSource === BOOKING_SOURCES.OFFICIAL).length,
    special: active.filter(r => r.bookingSource === BOOKING_SOURCES.SPECIAL).length,
  };

  return {
    reportType:   'weekly_booking_summary',
    periodType:   'weekly',
    periodStart,
    periodEnd,
    tenantId,
    generatedAt:  new Date().toISOString(),
    data: {
      totalBookings:    all.length,
      activeBookings:   active.length,
      cancelledBookings:cancelled.length,
      totalIssued:      active.filter(r => r.issueStatus === ISSUE_STATUS.ISSUED).length,
      totalNoShow:      active.filter(r => r.issueStatus === ISSUE_STATUS.NO_SHOW).length,
      byDay,
      subjectMix,
      sourceMix,
    },
  };
}

// Helper — returns all YYYY-MM-DD strings between two dates inclusive
function getDatesInRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

module.exports = { generate };