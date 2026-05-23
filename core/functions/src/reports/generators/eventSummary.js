// ─────────────────────────────────────────
// eventSummary.js — Snapshot Generator
// Release: V1 | Flow 11
// Type: SNAPSHOT — written nightly, read instantly
// ─────────────────────────────────────────
// Summarises a single event: attendance breakdown,
// response rates, category totals.
// Snapshot document ID: {tenantId}_event_summary_{eventId}
// ─────────────────────────────────────────

const { COLLECTIONS } = require('../../constants');

/**
 * Generate event summary snapshot for a specific event.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} eventId
 * @returns {object}
 */
async function generateForEvent(db, tenantId, eventId) {

  // Read the event document
  const eventDoc = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();
  if (!eventDoc.exists) {
    throw new Error(`Event not found: ${eventId}`);
  }
  const event = eventDoc.data();

  // Read the pre-aggregated attendance summary
  // This already exists — the attendanceAggregator Cloud Function
  // keeps eventAttendanceSummaries up to date on every response.
  // We just read it here and package it into the snapshot format.
  const summaryDoc = await db.collection(COLLECTIONS.EVENT_ATTENDANCE_SUMMARIES).doc(eventId).get();
  const attendanceSummary = summaryDoc.exists ? summaryDoc.data() : null;

  // Read feedback if any
  const feedbackSnap = await db.collection(COLLECTIONS.EVENT_FEEDBACK)
    .where('tenantId', '==', tenantId)
    .where('eventId', '==', eventId)
    .get();
  const feedbacks = feedbackSnap.docs.map(d => d.data());

  // ── Feedback averages per area ────────────────────────────────────────────
  const feedbackByArea = {};
  for (const f of feedbacks) {
    if (!feedbackByArea[f.feedbackArea]) {
      feedbackByArea[f.feedbackArea] = { total: 0, count: 0 };
    }
    feedbackByArea[f.feedbackArea].total += f.rating;
    feedbackByArea[f.feedbackArea].count += 1;
  }
  const feedbackAverages = {};
  for (const [area, { total, count }] of Object.entries(feedbackByArea)) {
    feedbackAverages[area] = parseFloat((total / count).toFixed(2));
  }

  return {
    reportType:  'event_summary',
    periodType:  'event',
    tenantId,
    eventId,
    generatedAt: new Date().toISOString(),
    data: {
      eventTitle:      event.title,
      eventDate:       event.eventDate,
      eventType:       event.eventType,
      eventCategory:   event.eventCategory,
      status:          event.status,
      billingDestination: event.billingDestination,
      attendance:      attendanceSummary || {},
      feedback: {
        totalSubmissions: feedbacks.length,
        averages:         feedbackAverages,
      },
    },
  };
}

/**
 * Generate monthly event summary — all events in a month.
 * Used by the nightly snapshot engine.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {object}
 */
async function generate(db, tenantId, periodStart, periodEnd) {

  const snap = await db.collection(COLLECTIONS.EVENTS)
    .where('tenantId', '==', tenantId)
    .where('eventDate', '>=', periodStart)
    .where('eventDate', '<=', periodEnd)
    .get();

  const events = snap.docs.map(d => d.data());

  return {
    reportType:  'event_summary',
    periodType:  'monthly',
    periodStart,
    periodEnd,
    tenantId,
    generatedAt: new Date().toISOString(),
    data: {
      totalEvents:    events.length,
      official:       events.filter(e => e.eventType === 'official').length,
      personal:       events.filter(e => e.eventType === 'personal').length,
      cancelled:      events.filter(e => e.status === 'cancelled').length,
      grandTotalAttendees: events.reduce((s, e) => s + (e.grandTotalAttendees || 0), 0),
      events: events.map(e => ({
        eventId:      e.eventId,
        title:        e.title,
        eventDate:    e.eventDate,
        eventType:    e.eventType,
        status:       e.status,
        grandTotal:   e.grandTotalAttendees || 0,
      })),
    },
  };
}

module.exports = { generate, generateForEvent };