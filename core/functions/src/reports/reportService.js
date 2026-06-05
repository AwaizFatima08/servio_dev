// ─────────────────────────────────────────
// reportService.js — Reporting Business Logic
// Release: V1 | Flow 11
// ─────────────────────────────────────────
// Two responsibilities:
//   1. Live queries — run at request time (headcount, admin alerts)
//   2. Snapshot reads — fetch pre-computed documents from reportingSnapshots
//
// Routes call this service. Service does not know about HTTP.
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const { COLLECTIONS } = require('../constants');

const dailyHeadcountGen = require('./generators/dailyHeadcount');
const adminAlertsGen    = require('./generators/adminAlerts');
const { generateForEvent } = require('./generators/eventSummary');
const snapshotEngine    = require('./snapshotEngine');

function getDb() {
  const { getFirestore } = require('firebase-admin/firestore'); return getFirestore('servio-dev');
}

// ── LIVE QUERIES ──────────────────────────────────────────────────────────

/**
 * Daily headcount — live query.
 * Called by kitchen dashboard, manager dashboard.
 * @param {string} tenantId
 * @param {string} date — YYYY-MM-DD
 */
async function getDailyHeadcount(tenantId, date) {
  const db = getDb();
  return await dailyHeadcountGen.generate(db, tenantId, date);
}

/**
 * Admin alerts — live query.
 * Called by admin dashboard on load.
 * @param {string} tenantId
 */
async function getAdminAlerts(tenantId) {
  const db = getDb();
  return await adminAlertsGen.generate(db, tenantId);
}

// ── SNAPSHOT READS ────────────────────────────────────────────────────────

/**
 * Generic snapshot read.
 * Reads a pre-computed reportingSnapshots document.
 * Document ID: {tenantId}_{reportType}_{period}
 *
 * @param {string} tenantId
 * @param {string} reportType  — e.g. 'weekly_booking_summary'
 * @param {string} period      — YYYY-MM for monthly, YYYY-MM-DD for weekly
 */
async function getSnapshot(tenantId, reportType, period) {
  const db    = getDb();
  const docId = `${tenantId}_${reportType}_${period}`;
  const doc   = await db.collection(COLLECTIONS.REPORTING_SNAPSHOTS).doc(docId).get();

  if (!doc.exists) {
    return null; // caller handles the not-found case
  }
  return doc.data();
}

/**
 * List available snapshots for a report type.
 * Useful for showing a picker of available months/weeks.
 * @param {string} tenantId
 * @param {string} reportType
 * @param {number} limit — max results, default 12
 */
async function listSnapshots(tenantId, reportType, limit = 12) {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.REPORTING_SNAPSHOTS)
    .where('tenantId', '==', tenantId)
    .where('reportType', '==', reportType)
    .orderBy('periodStart', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(d => ({
    snapshotId:  d.id,
    reportType:  d.data().reportType,
    periodType:  d.data().periodType,
    periodStart: d.data().periodStart,
    periodEnd:   d.data().periodEnd,
    generatedAt: d.data().generatedAt,
    isComplete:  d.data().isComplete,
  }));
}

/**
 * Event summary — on-demand snapshot for a specific event.
 * Does not use the nightly engine — generated on request.
 * @param {string} tenantId
 * @param {string} eventId
 */
async function getEventSummary(tenantId, eventId) {
  const db = getDb();
  return await generateForEvent(db, tenantId, eventId);
}

/**
 * Manual snapshot trigger — for admin testing without waiting for midnight.
 * Runs the full snapshot engine for a specific tenant.
 * @param {string} tenantId
 */
async function triggerManualSnapshot(tenantId) {
  return await snapshotEngine.run(tenantId);
}

module.exports = {
  getDailyHeadcount,
  getAdminAlerts,
  getSnapshot,
  listSnapshots,
  getEventSummary,
  triggerManualSnapshot,
};