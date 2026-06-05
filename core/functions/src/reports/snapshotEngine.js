// ─────────────────────────────────────────
// snapshotEngine.js — Nightly KPI Snapshot Engine
// Release: V1 | Flow 11
// ─────────────────────────────────────────
// This engine runs nightly at 23:30 PKT.
// It loops through all registered generators,
// computes their snapshots, and writes them
// to the reportingSnapshots collection.
//
// HOW TO ADD A NEW REPORT TYPE (future flows):
//   1. Create a generator file in /generators/
//   2. Import it here
//   3. Add it to SNAPSHOT_GENERATORS registry below
//   4. Add the report type key to constants.js REPORT_TYPES
//   That is all. The engine handles the rest.
//
// Live-query reports (daily_headcount, admin_alerts) are NOT
// in this engine — they are always run at request time in reportService.js.
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const { COLLECTIONS, REPORT_TYPES, TENANTS } = require('../constants');

// ── Generator registry ────────────────────────────────────────────────────
// Each entry maps a report type to its generator function and period type.
// periodType 'monthly': engine generates for previous calendar month
// periodType 'weekly':  engine generates for previous Mon–Sun week
// periodType 'event':   not in this engine — event snapshots are on-demand
//
// TO ACTIVATE a stub generator (e.g. Flow 12):
//   1. Uncomment the import
//   2. Uncomment the registry entry
// ─────────────────────────────────────────

const weeklyBookingSummaryGen = require('./generators/weeklyBookingSummary');
const monthlyBillingGen       = require('./generators/monthlyBilling');
const feedbackTrendsGen       = require('./generators/feedbackTrends');
const eventSummaryGen         = require('./generators/eventSummary');

// V1.1 — uncomment when Flow 12 is built
// const cafeDailySummaryGen = require('./generators/cafeDailySummary');

// V1.2 — uncomment when Flow 13 is built
// const bbqEventSummaryGen = require('./generators/bbqEventSummary');

const SNAPSHOT_GENERATORS = [

  // ── V1 active generators ─────────────────────────────────────────────────
  {
    reportType:  REPORT_TYPES.WEEKLY_BOOKING_SUMMARY,
    periodType:  'weekly',
    generator:   weeklyBookingSummaryGen,
    // Monthly billing returns three separate snapshots — handled specially below
  },
  {
    reportType:  REPORT_TYPES.MONTHLY_BILLING_SUMMARY,
    periodType:  'monthly',
    generator:   monthlyBillingGen,
    isMonthlyBilling: true, // special flag — this generator returns 3 snapshots
  },
  {
    reportType:  REPORT_TYPES.FEEDBACK_TRENDS,
    periodType:  'monthly',
    generator:   feedbackTrendsGen,
  },
  {
    reportType:  REPORT_TYPES.EVENT_SUMMARY,
    periodType:  'monthly',
    generator:   eventSummaryGen,
  },

  // ── V1.1 stubs — uncomment to activate ───────────────────────────────────
  // { reportType: 'cafe_daily_summary', periodType: 'monthly', generator: cafeDailySummaryGen },

  // ── V1.2 stubs — uncomment to activate ───────────────────────────────────
  // { reportType: 'bbq_event_summary', periodType: 'monthly', generator: bbqEventSummaryGen },
];

/**
 * Main entry point — called by the scheduled Cloud Function.
 * Can also be called manually via the admin trigger endpoint for testing.
 * @param {string|null} targetTenantId  — null means run for all active tenants
 */
async function run(targetTenantId = null) {

  const { getFirestore } = require('firebase-admin/firestore');
  const db = getFirestore('servio-dev');

  const results = { success: [], failed: [], skipped: [] };

  // ── Determine which tenants to run for ───────────────────────────────────
  // In V1 there is only FFL. Multi-tenant support is built in from day one.
  const tenants = targetTenantId
    ? [targetTenantId]
    : await getActiveTenants(db);

  // ── Date ranges ───────────────────────────────────────────────────────────
  const { weekStart, weekEnd }     = getPreviousWeekRange();
  const { monthStart, monthEnd }   = getPreviousMonthRange();

  for (const tenantId of tenants) {
    for (const config of SNAPSHOT_GENERATORS) {
      try {

        const periodStart = config.periodType === 'weekly' ? weekStart : monthStart;
        const periodEnd   = config.periodType === 'weekly' ? weekEnd   : monthEnd;

        // ── Special case: monthly billing returns 3 snapshots ────────────
        if (config.isMonthlyBilling) {
          const { employee, official, summary } = await monthlyBillingGen.generate(
            db, tenantId, periodStart, periodEnd
          );
          await writeSnapshot(db, tenantId, REPORT_TYPES.MONTHLY_BILLING_EMPLOYEE, monthStart, employee);
          await writeSnapshot(db, tenantId, REPORT_TYPES.MONTHLY_BILLING_OFFICIAL, monthStart, official);
          await writeSnapshot(db, tenantId, REPORT_TYPES.MONTHLY_BILLING_SUMMARY,  monthStart, summary);
          results.success.push(`${tenantId}:monthly_billing (3 snapshots)`);
          continue;
        }

        // ── Standard single-snapshot generator ───────────────────────────
        const data = await config.generator.generate(db, tenantId, periodStart, periodEnd);
        const period = config.periodType === 'weekly' ? weekStart : monthStart;
        await writeSnapshot(db, tenantId, config.reportType, period, data);
        results.success.push(`${tenantId}:${config.reportType}`);

      } catch (err) {
        console.error(`Snapshot failed — ${tenantId}:${config.reportType}`, err.message);
        results.failed.push({ tenantId, reportType: config.reportType, error: err.message });
      }
    }
  }

  console.log('Snapshot engine complete:', JSON.stringify(results, null, 2));
  return results;
}

/**
 * Write one snapshot document to reportingSnapshots.
 * Document ID format: {tenantId}_{reportType}_{period}
 * e.g. ffl_monthly_billing_summary_2026-05
 */
async function writeSnapshot(db, tenantId, reportType, period, data) {
  // Period for monthly: YYYY-MM  (e.g. 2026-05)
  // Period for weekly:  YYYY-MM-DD (Monday of the week)
  const periodKey = period.length === 10 && period.includes('-')
    ? (data.periodType === 'monthly' ? period.substring(0, 7) : period)
    : period;

  const docId = `${tenantId}_${reportType}_${periodKey}`;

  await db.collection(COLLECTIONS.REPORTING_SNAPSHOTS).doc(docId).set({
    snapshotId:   docId,
    tenantId,
    reportType,
    periodType:   data.periodType || 'unknown',
    periodStart:  data.periodStart || period,
    periodEnd:    data.periodEnd   || period,
    generatedAt:  new Date(),
    dataAsOf:     new Date(),
    isComplete:   true,
    data:         data.data || data,
    metaData:     { engine: 'snapshotEngine_v1', triggeredBy: 'scheduled' },
    createdAt:    new Date(),
    updatedAt:    new Date(),
  }, { merge: true }); // merge:true allows re-runs to overwrite safely
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function getActiveTenants(db) {
  const snap = await db.collection(COLLECTIONS.DEPLOYMENT_CONFIG)
    .where('isActive', '==', true)
    .get();
  return snap.docs.map(d => d.id);
}

function getPreviousWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // Go back to last Monday
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  return {
    weekStart: lastMonday.toISOString().split('T')[0],
    weekEnd:   lastSunday.toISOString().split('T')[0],
  };
}

function getPreviousMonthRange() {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrevMonth  = new Date(firstOfThisMonth - 1);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  return {
    monthStart: firstOfPrevMonth.toISOString().split('T')[0],
    monthEnd:   lastOfPrevMonth.toISOString().split('T')[0],
  };
}

module.exports = { run, writeSnapshot };