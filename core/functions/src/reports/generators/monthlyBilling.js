// ─────────────────────────────────────────
// monthlyBilling.js — Snapshot Generator
// Release: V1 | Flow 11
// Type: SNAPSHOT — written nightly, read instantly
// ─────────────────────────────────────────
// Produces three billing snapshots:
//   monthly_billing_employee — per-employee charges for the month
//   monthly_billing_official — per cost-centre charges for the month
//   monthly_billing_summary  — combined totals for management view
//
// IMPORTANT: This generator only covers messReservations.
// When Flow 12 (cafe/tuckshop) and Flow 14 (billing dashboard)
// are built, this generator must be extended to include
// cafeOrders and tuckShopTransactions as well.
// A TODO marker is placed at that extension point.
// ─────────────────────────────────────────

const { COLLECTIONS, RESERVATION_STATUS, ISSUE_STATUS, BILLING_DESTINATIONS } = require('../../constants');

/**
 * Generate monthly billing snapshots.
 * Returns three separate data objects — caller decides which snapshot to write.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @param {string} periodStart — YYYY-MM-DD (first day of month)
 * @param {string} periodEnd   — YYYY-MM-DD (last day of month)
 * @returns {{ employee: object, official: object, summary: object }}
 */
async function generate(db, tenantId, periodStart, periodEnd) {

  // Only issued reservations count for billing.
  // Pending or no-show reservations may not have rates applied yet.
  // Cancelled reservations never count.
  const snapshot = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '>=', periodStart)
    .where('reservationDate', '<=', periodEnd)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .where('issueStatus', '==', ISSUE_STATUS.ISSUED)
    .get();

  const issued = snapshot.docs.map(d => d.data());

  // TODO — Flow 12 extension point:
  // Also query cafeOrders and tuckShopTransactions here
  // and merge into the issued array with a sourceModule field
  // so billing totals cover all club services, not just mess.

  // ── Employee billing ──────────────────────────────────────────────────────
  // Group by employeeNumber, sum amount
  const employeeMap = {};
  for (const r of issued.filter(r => r.billingDestination === BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT)) {
    if (!employeeMap[r.employeeNumber]) {
      employeeMap[r.employeeNumber] = {
        employeeNumber: r.employeeNumber,
        employeeName:   r.employeeName,
        totalAmount:    0,
        mealCount:      0,
        ratedCount:     0,   // how many have a rate applied
        pendingRateCount: 0, // how many still waiting for rate
        byMealType:     { breakfast: 0, lunch: 0, dinner: 0 },
      };
    }
    const entry = employeeMap[r.employeeNumber];
    entry.totalAmount    += (r.amount || 0);
    entry.mealCount      += 1;
    entry.ratedCount     += r.rateStatus === 'applied' ? 1 : 0;
    entry.pendingRateCount += r.rateStatus !== 'applied' ? 1 : 0;
    if (entry.byMealType[r.mealType] !== undefined) {
      entry.byMealType[r.mealType] += (r.amount || 0);
    }
  }

  // ── Official account billing ───────────────────────────────────────────────
  // Group by costCentreCode, sum amount
  const officialMap = {};
  for (const r of issued.filter(r => r.billingDestination === BILLING_DESTINATIONS.OFFICIAL_ACCOUNT)) {
    const code = r.costCentreCode || 'unknown';
    if (!officialMap[code]) {
      officialMap[code] = {
        costCentreCode: code,
        totalAmount:    0,
        mealCount:      0,
        pendingRateCount: 0,
      };
    }
    officialMap[code].totalAmount    += (r.amount || 0);
    officialMap[code].mealCount      += 1;
    officialMap[code].pendingRateCount += r.rateStatus !== 'applied' ? 1 : 0;
  }

  // ── Summary totals ────────────────────────────────────────────────────────
  const totalAmount   = issued.reduce((sum, r) => sum + (r.amount || 0), 0);
  const employeeTotal = Object.values(employeeMap).reduce((s, e) => s + e.totalAmount, 0);
  const officialTotal = Object.values(officialMap).reduce((s, e) => s + e.totalAmount, 0);

  const base = { tenantId, periodStart, periodEnd, generatedAt: new Date().toISOString() };

  return {
    employee: {
      ...base,
      reportType: 'monthly_billing_employee',
      periodType: 'monthly',
      data: {
        totalEmployees:   Object.keys(employeeMap).length,
        totalAmount:      employeeTotal,
        pendingRateCount: Object.values(employeeMap).reduce((s,e) => s + e.pendingRateCount, 0),
        employees:        Object.values(employeeMap).sort((a,b) => b.totalAmount - a.totalAmount),
      },
    },
    official: {
      ...base,
      reportType: 'monthly_billing_official',
      periodType: 'monthly',
      data: {
        totalAccounts:   Object.keys(officialMap).length,
        totalAmount:     officialTotal,
        accounts:        Object.values(officialMap).sort((a,b) => b.totalAmount - a.totalAmount),
      },
    },
    summary: {
      ...base,
      reportType: 'monthly_billing_summary',
      periodType: 'monthly',
      data: {
        totalIssuedMeals:    issued.length,
        totalAmount,
        employeeAmount:      employeeTotal,
        officialAmount:      officialTotal,
        pendingRateCount:    issued.filter(r => r.rateStatus !== 'applied').length,
        // Meal type breakdown of total spend
        byMealType: {
          breakfast: issued.filter(r => r.mealType === 'breakfast').reduce((s,r) => s+(r.amount||0),0),
          lunch:     issued.filter(r => r.mealType === 'lunch').reduce((s,r) => s+(r.amount||0),0),
          dinner:    issued.filter(r => r.mealType === 'dinner').reduce((s,r) => s+(r.amount||0),0),
        },
      },
    },
  };
}

module.exports = { generate };