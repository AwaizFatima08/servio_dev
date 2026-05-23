// ─────────────────────────────────────────
// feedbackTrends.js — Snapshot Generator
// Release: V1 | Flow 11
// Type: SNAPSHOT — written nightly, read instantly
// ─────────────────────────────────────────
// Aggregates mealFeedback for a given month.
// Produces average ratings per feedback area,
// per meal type, and flags low-rated areas.
// ─────────────────────────────────────────

const { COLLECTIONS, FEEDBACK_AREAS_MEAL } = require('../../constants');

/**
 * Generate monthly feedback trends snapshot.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} periodStart — YYYY-MM-DD
 * @param {string} periodEnd   — YYYY-MM-DD
 * @returns {object}
 */
async function generate(db, tenantId, periodStart, periodEnd) {

  const snapshot = await db.collection(COLLECTIONS.MEAL_FEEDBACK)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '>=', periodStart)
    .where('reservationDate', '<=', periodEnd)
    .get();

  const feedbacks = snapshot.docs.map(d => d.data());

  if (feedbacks.length === 0) {
    return buildEmptyResult(tenantId, periodStart, periodEnd);
  }

  // ── Average rating per feedback area ──────────────────────────────────────
  const areaAverages = {};
  const areas = Object.values(FEEDBACK_AREAS_MEAL);

  for (const area of areas) {
    const forArea = feedbacks.filter(f => f.feedbackArea === area);
    if (forArea.length === 0) {
      areaAverages[area] = { count: 0, average: null };
    } else {
      const total = forArea.reduce((s, f) => s + f.rating, 0);
      areaAverages[area] = {
        count:   forArea.length,
        average: parseFloat((total / forArea.length).toFixed(2)),
      };
    }
  }

  // ── Average rating per meal type ──────────────────────────────────────────
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const byMealType = {};

  for (const mealType of mealTypes) {
    const forMeal = feedbacks.filter(f => f.mealType === mealType);
    if (forMeal.length === 0) {
      byMealType[mealType] = { count: 0, average: null };
    } else {
      const total = forMeal.reduce((s, f) => s + f.rating, 0);
      byMealType[mealType] = {
        count:   forMeal.length,
        average: parseFloat((total / forMeal.length).toFixed(2)),
      };
    }
  }

  // ── Flag low-rated areas ──────────────────────────────────────────────────
  // Threshold: average below 3.0 is flagged for management attention.
  // This threshold can be moved to appSettings in a future release.
  const LOW_RATING_THRESHOLD = 3.0;
  const flaggedAreas = Object.entries(areaAverages)
    .filter(([, v]) => v.average !== null && v.average < LOW_RATING_THRESHOLD)
    .map(([area, v]) => ({ area, average: v.average, count: v.count }));

  // ── Overall average ───────────────────────────────────────────────────────
  const overallAverage = parseFloat(
    (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(2)
  );

  return {
    reportType:  'feedback_trends',
    periodType:  'monthly',
    periodStart,
    periodEnd,
    tenantId,
    generatedAt: new Date().toISOString(),
    data: {
      totalSubmissions: feedbacks.length,
      overallAverage,
      areaAverages,
      byMealType,
      flaggedAreas,
    },
  };
}

function buildEmptyResult(tenantId, periodStart, periodEnd) {
  return {
    reportType: 'feedback_trends',
    periodType: 'monthly',
    periodStart,
    periodEnd,
    tenantId,
    generatedAt: new Date().toISOString(),
    data: {
      totalSubmissions: 0,
      overallAverage: null,
      areaAverages: {},
      byMealType: {},
      flaggedAreas: [],
    },
  };
}

module.exports = { generate };