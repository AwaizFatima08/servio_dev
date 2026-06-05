// ─────────────────────────────────────────
// kitchenService.js — Kitchen Dashboard Logic
// HomiLabs | Servio | Flow 15
// ─────────────────────────────────────────
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS, RESERVATION_STATUS, ISSUE_STATUS } = require('../constants');

const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

// ─────────────────────────────────────────
// HELPER — PKT cutoff check
// BF cutoff 03:00, Lunch 10:00, Dinner 16:00
// ─────────────────────────────────────────
const isCutoffPassed = (mealType) => {
  const now = new Date();
  const pktMinutes = ((now.getUTCHours() + 5) % 24) * 60 + now.getUTCMinutes();
  const cutoffs = { breakfast: 180, lunch: 600, dinner: 960 };
  return pktMinutes >= (cutoffs[mealType] ?? 0);
};

// ─────────────────────────────────────────
// HELPER — fetch combo labels from dailyMenus
// Returns { comboId: comboName, ... }
// ─────────────────────────────────────────
const getComboLabels = async (tenantId, date, mealType) => {
  const docId = `${tenantId}_${date}_${mealType}`;
  const snap = await db.collection(COLLECTIONS.DAILY_MENUS).doc(docId).get();
  if (!snap.exists) return {};

  const labels = {};
  const data = snap.data();
  if (Array.isArray(data.combos)) {
    data.combos.forEach(c => {
      labels[c.comboId] = c.comboName || c.displayLabel || c.comboId;
    });
  }
  return labels;
};

// ─────────────────────────────────────────
// getHeadcount
// Post-cutoff confirmed booking count per combo
// Used by kitchen to know how many meals to prepare
// ─────────────────────────────────────────
const getHeadcount = async (tenantId, date, mealType) => {
  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', date)
    .where('mealType', '==', mealType)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .get();

  const comboLabels = await getComboLabels(tenantId, date, mealType);

  const combos = {};
  let grandTotal = 0;

  snap.forEach(doc => {
    const r = doc.data();
    const key = r.menuOptionKey || 'unknown';
    const qty = r.quantity || 1;

    if (!combos[key]) {
      combos[key] = {
        menuOptionKey: key,
        comboName: comboLabels[r.menuItemId] || r.itemName || key,
        itemName: r.itemName || key,
        menuItemId: r.menuItemId || null,
        totalBooked: 0,
        selfCount: 0,
        guestCount: 0,
        officialCount: 0,
        dineInCount: 0,
        takeawayCount: 0,
      };
    }

    combos[key].totalBooked += qty;
    grandTotal += qty;

    if (r.subjectType === 'self') combos[key].selfCount += qty;
    else if (['personal_guest', 'official_guest'].includes(r.subjectType)) combos[key].guestCount += qty;
    else if (r.subjectType === 'official_meal') combos[key].officialCount += qty;

    if (r.diningMode === 'dine_in') combos[key].dineInCount += qty;
    else if (r.diningMode === 'takeaway') combos[key].takeawayCount += qty;
  });

  return {
    success: true,
    date,
    mealType,
    grandTotalBooked: grandTotal,
    cutoffPassed: isCutoffPassed(mealType),
    combos: Object.values(combos).sort((a, b) => a.menuOptionKey.localeCompare(b.menuOptionKey)),
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────
// getIssuanceProgress
// Live issued / pending / no-show per combo
// Updates in real time as supervisor issues meals
// ─────────────────────────────────────────
const getIssuanceProgress = async (tenantId, date, mealType) => {
  const snap = await db.collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', date)
    .where('mealType', '==', mealType)
    .where('reservationStatus', '==', RESERVATION_STATUS.ACTIVE)
    .get();

  const comboLabels = await getComboLabels(tenantId, date, mealType);

  const combos = {};
  let grandTotalBooked = 0;
  let grandTotalIssued = 0;
  let grandTotalPending = 0;
  let grandTotalNoShow = 0;

  snap.forEach(doc => {
    const r = doc.data();
    const key = r.menuOptionKey || 'unknown';
    const qty = r.quantity || 1;

    if (!combos[key]) {
      combos[key] = {
        menuOptionKey: key,
        comboName: comboLabels[r.menuItemId] || r.itemName || key,
        itemName: r.itemName || key,
        menuItemId: r.menuItemId || null,
        totalBooked: 0,
        totalIssued: 0,
        totalPending: 0,
        totalNoShow: 0,
        issuancePercent: 0,
      };
    }

    combos[key].totalBooked += qty;
    grandTotalBooked += qty;

    if (r.issueStatus === ISSUE_STATUS.ISSUED) {
      combos[key].totalIssued += qty;
      grandTotalIssued += qty;
    } else if (r.issueStatus === ISSUE_STATUS.NO_SHOW) {
      combos[key].totalNoShow += qty;
      grandTotalNoShow += qty;
    } else {
      combos[key].totalPending += qty;
      grandTotalPending += qty;
    }
  });

  Object.values(combos).forEach(c => {
    c.issuancePercent = c.totalBooked > 0
      ? Math.round((c.totalIssued / c.totalBooked) * 100)
      : 0;
  });

  return {
    success: true,
    date,
    mealType,
    grandTotalBooked,
    grandTotalIssued,
    grandTotalPending,
    grandTotalNoShow,
    overallIssuancePercent: grandTotalBooked > 0
      ? Math.round((grandTotalIssued / grandTotalBooked) * 100)
      : 0,
    issuanceComplete: grandTotalPending === 0 && grandTotalBooked > 0,
    combos: Object.values(combos).sort((a, b) => a.menuOptionKey.localeCompare(b.menuOptionKey)),
    asOf: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────
// getDaySummary
// All three meal types in one call
// Used by kitchen screen on first load
// ─────────────────────────────────────────
const getDaySummary = async (tenantId, date) => {
  const mealTypes = ['breakfast', 'lunch', 'dinner'];

  const results = await Promise.all(
    mealTypes.map(async (mealType) => {
      const [headcount, progress] = await Promise.all([
        getHeadcount(tenantId, date, mealType),
        getIssuanceProgress(tenantId, date, mealType),
      ]);
      return {
        mealType,
        headcount: headcount.grandTotalBooked,
        issued: progress.grandTotalIssued,
        pending: progress.grandTotalPending,
        noShow: progress.grandTotalNoShow,
        issuancePercent: progress.overallIssuancePercent,
        issuanceComplete: progress.issuanceComplete,
        cutoffPassed: headcount.cutoffPassed,
        comboCount: headcount.combos.length,
      };
    })
  );

  return {
    success: true,
    date,
    meals: results,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = { getHeadcount, getIssuanceProgress, getDaySummary };