// ─────────────────────────────────────────
// billingService.js — Billing Dashboard Logic
// Release: V1 | Flow 14
// ─────────────────────────────────────────
// Reads from messReservations and mealRates.
// No writes — billing dashboard is read-only.
// Produces line-item detail that reporting snapshots do not carry.
//
// Three billing views:
//   1. Employee monthly statement — line items per employee
//   2. Official account charges — line items per cost centre
//   3. Pending billing — issued but not yet rated
//   4. Monthly summary — totals for management view
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const {
  COLLECTIONS,
  RESERVATION_STATUS,
  ISSUE_STATUS,
  BILLING_DESTINATIONS,
} = require('../constants');

function getDb() {
  const { getFirestore } = require('firebase-admin/firestore'); return getFirestore('servio-dev');
}

// ── Helper: parse YYYY-MM into date range ─────────────────────────────────
// Returns first and last day of the given month as YYYY-MM-DD strings.
function getMonthRange(month) {
  // month format: YYYY-MM
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay  = new Date(year, mon, 0); // day 0 of next month = last day of this month
  const pad = (n) => String(n).padStart(2, '0');
  return {
    start: `${year}-${pad(mon)}-01`,
    end:   `${year}-${pad(mon)}-${pad(lastDay.getDate())}`,
  };
}

// ── 1. Employee monthly statement ─────────────────────────────────────────
/**
 * Returns all issued reservations for a specific employee in a given month.
 * Includes line items, rates, and totals.
 * Used by: accounts supervisor to prepare salary deduction list.
 *
 * @param {string} tenantId
 * @param {string} employeeNumber
 * @param {string} month — YYYY-MM
 */
async function getEmployeeStatement(tenantId, employeeNumber, month) {
  const db = getDb();
  const { start, end } = getMonthRange(month);

  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', employeeNumber)
    .where('reservationDate', '>=', start)
    .where('reservationDate', '<=', end)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .where('issueStatus', '==', ISSUE_STATUS.ISSUED)
    .orderBy('reservationDate', 'asc')
    .get();

  const reservations = snap.docs.map(d => d.data());

  // Split into employee-account and official-account charges
  const employeeCharges = reservations.filter(
    r => r.billingDestination === BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT
  );
  const officialCharges = reservations.filter(
    r => r.billingDestination === BILLING_DESTINATIONS.OFFICIAL_ACCOUNT
  );

  const totalAmount        = employeeCharges.reduce((s, r) => s + (r.amount || 0), 0);
  const pendingRateCount   = employeeCharges.filter(r => r.rateStatus !== 'applied').length;
  const confirmedAmount    = employeeCharges
    .filter(r => r.rateStatus === 'applied')
    .reduce((s, r) => s + (r.amount || 0), 0);

  return {
    tenantId,
    employeeNumber,
    employeeName:   reservations[0]?.employeeName || null,
    month,
    periodStart:    start,
    periodEnd:      end,
    generatedAt:    new Date().toISOString(),
    summary: {
      totalIssuedMeals:  reservations.length,
      employeeCharges:   employeeCharges.length,
      officialCharges:   officialCharges.length,
      totalAmount,
      confirmedAmount,
      pendingRateCount,
      pendingAmount:     totalAmount - confirmedAmount,
    },
    lineItems: employeeCharges.map(r => ({
      reservationId:  r.reservationId,
      reservationDate:r.reservationDate,
      mealType:       r.mealType,
      itemName:       r.itemName,
      optionLabel:    r.optionLabel,
      diningMode:     r.diningMode,
      quantity:       r.quantity,
      unitRate:       r.unitRate || null,
      amount:         r.amount || null,
      rateStatus:     r.rateStatus,
    })),
    officialLineItems: officialCharges.map(r => ({
      reservationId:  r.reservationId,
      reservationDate:r.reservationDate,
      mealType:       r.mealType,
      itemName:       r.itemName,
      quantity:       r.quantity,
      costCentreCode: r.costCentreCode,
      unitRate:       r.unitRate || null,
      amount:         r.amount || null,
      rateStatus:     r.rateStatus,
    })),
  };
}

// ── 2. Official account charges ───────────────────────────────────────────
/**
 * Returns all official account charges for a given month.
 * Grouped by cost centre code.
 * Used by: accounts supervisor for departmental billing.
 *
 * @param {string} tenantId
 * @param {string} month — YYYY-MM
 */
async function getOfficialCharges(tenantId, month) {
  const db = getDb();
  const { start, end } = getMonthRange(month);

  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('billingDestination', '==', BILLING_DESTINATIONS.OFFICIAL_ACCOUNT)
    .where('reservationDate', '>=', start)
    .where('reservationDate', '<=', end)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .where('issueStatus', '==', ISSUE_STATUS.ISSUED)
    .orderBy('reservationDate', 'asc')
    .get();

  const reservations = snap.docs.map(d => d.data());

  // Group by cost centre code
  const byCostCentre = {};
  for (const r of reservations) {
    const code = r.costCentreCode || 'unassigned';
    if (!byCostCentre[code]) {
      byCostCentre[code] = {
        costCentreCode: code,
        totalAmount:    0,
        mealCount:      0,
        pendingRateCount: 0,
        lineItems:      [],
      };
    }
    byCostCentre[code].totalAmount    += (r.amount || 0);
    byCostCentre[code].mealCount      += 1;
    byCostCentre[code].pendingRateCount += r.rateStatus !== 'applied' ? 1 : 0;
    byCostCentre[code].lineItems.push({
      reservationId:  r.reservationId,
      reservationDate:r.reservationDate,
      mealType:       r.mealType,
      itemName:       r.itemName,
      employeeName:   r.employeeName,
      employeeNumber: r.employeeNumber,
      subjectType:    r.subjectType,
      guestName:      r.guestName || null,
      quantity:       r.quantity,
      unitRate:       r.unitRate || null,
      amount:         r.amount || null,
      rateStatus:     r.rateStatus,
    });
  }

  const accounts = Object.values(byCostCentre)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    tenantId,
    month,
    periodStart:  start,
    periodEnd:    end,
    generatedAt:  new Date().toISOString(),
    summary: {
      totalCharges:     reservations.length,
      totalAmount:      reservations.reduce((s, r) => s + (r.amount || 0), 0),
      totalAccounts:    accounts.length,
      pendingRateCount: reservations.filter(r => r.rateStatus !== 'applied').length,
    },
    accounts,
  };
}

// ── 3. Pending billing ────────────────────────────────────────────────────
/**
 * Returns issued reservations where rate has not been applied yet.
 * Used by: accounts supervisor to know what rate entry is still outstanding.
 * Can be filtered by date — defaults to yesterday.
 *
 * @param {string} tenantId
 * @param {string} date — YYYY-MM-DD (optional, defaults to yesterday)
 */
async function getPendingBilling(tenantId, date) {
  const db = getDb();

  // Default to yesterday if no date provided
  const targetDate = date || getYesterday();

  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', targetDate)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .where('issueStatus', '==', ISSUE_STATUS.ISSUED)
    .where('rateStatus', '==', 'pending')
    .get();

  const reservations = snap.docs.map(d => d.data());

  // Group by meal type for easier reading
  const byMealType = {};
  for (const r of reservations) {
    if (!byMealType[r.mealType]) {
      byMealType[r.mealType] = { mealType: r.mealType, count: 0, items: [] };
    }
    byMealType[r.mealType].count += 1;
    byMealType[r.mealType].items.push({
      reservationId:    r.reservationId,
      employeeNumber:   r.employeeNumber,
      employeeName:     r.employeeName,
      itemName:         r.itemName,
      menuOptionKey:    r.menuOptionKey,
      rateTargetKey:    r.rateTargetKey,
      billingDestination: r.billingDestination,
      costCentreCode:   r.costCentreCode || null,
    });
  }

  return {
    tenantId,
    date: targetDate,
    generatedAt: new Date().toISOString(),
    totalPending: reservations.length,
    byMealType: Object.values(byMealType),
  };
}

// ── 4. Monthly billing summary ────────────────────────────────────────────
/**
 * Returns month-level totals — employee vs official, pending counts.
 * Used by: manager and admin for monthly overview.
 * This is the dashboard-level view — no line items.
 *
 * @param {string} tenantId
 * @param {string} month — YYYY-MM
 */
async function getMonthlySummary(tenantId, month) {
  const db = getDb();
  const { start, end } = getMonthRange(month);

  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '>=', start)
    .where('reservationDate', '<=', end)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .where('issueStatus', '==', ISSUE_STATUS.ISSUED)
    .get();

  const all = snap.docs.map(d => d.data());

  const employeeBilled = all.filter(
    r => r.billingDestination === BILLING_DESTINATIONS.EMPLOYEE_ACCOUNT
  );
  const officialBilled = all.filter(
    r => r.billingDestination === BILLING_DESTINATIONS.OFFICIAL_ACCOUNT
  );
  const pending = all.filter(r => r.rateStatus !== 'applied');

  // Unique employees billed this month
  const uniqueEmployees = new Set(all.map(r => r.employeeNumber)).size;

  // Meal type breakdown
  const byMealType = {
    breakfast: all.filter(r => r.mealType === 'breakfast').reduce((s, r) => s + (r.amount || 0), 0),
    lunch:     all.filter(r => r.mealType === 'lunch').reduce((s, r) => s + (r.amount || 0), 0),
    dinner:    all.filter(r => r.mealType === 'dinner').reduce((s, r) => s + (r.amount || 0), 0),
  };

  return {
    tenantId,
    month,
    periodStart:  start,
    periodEnd:    end,
    generatedAt:  new Date().toISOString(),
    summary: {
      totalIssuedMeals:    all.length,
      uniqueEmployeesBilled: uniqueEmployees,
      employeeAmount:      employeeBilled.reduce((s, r) => s + (r.amount || 0), 0),
      officialAmount:      officialBilled.reduce((s, r) => s + (r.amount || 0), 0),
      totalAmount:         all.reduce((s, r) => s + (r.amount || 0), 0),
      pendingRateCount:    pending.length,
      rateCompletionPct:   all.length > 0
        ? Math.round(((all.length - pending.length) / all.length) * 100)
        : 100,
      byMealType,
    },
  };
}

// ── Helper ────────────────────────────────────────────────────────────────
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

module.exports = {
  getEmployeeStatement,
  getOfficialCharges,
  getPendingBilling,
  getMonthlySummary,
};