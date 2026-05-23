// core/functions/src/rates/mealRatesService.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../constants');

// ─────────────────────────────────────────
// getPendingRateEntries
// Returns yesterday's served items needing rate entry
// Shows issued count for each item
// ─────────────────────────────────────────
async function getPendingRateEntries({ tenantId, rateDate }) {

  // --- 1. Get all 3 daily menu documents for the date ---
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const pendingItems = [];

  for (const mealType of mealTypes) {
    const docId = `${tenantId}_${rateDate}_${mealType}`;
    const dailyMenuDoc = await db
      .collection(COLLECTIONS.DAILY_MENUS)
      .doc(docId)
      .get();

    if (!dailyMenuDoc.exists) continue;

    const dailyMenu = dailyMenuDoc.data();

    // --- 2. For each combo in the menu, check issued count ---
    for (const combo of dailyMenu.combos) {
      const rateTargetKey = `${rateDate}_${mealType}_${combo.menuOptionKey}`;

      // Check if rate already entered for this item
      const existingRate = await db
        .collection(COLLECTIONS.MEAL_RATES)
        .where('tenantId', '==', tenantId)
        .where('rateTargetKey', '==', rateTargetKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      // Count how many reservations were issued for this item
      const issuedSnap = await db
        .collection(COLLECTIONS.MESS_RESERVATIONS)
        .where('tenantId', '==', tenantId)
        .where('rateTargetKey', '==', rateTargetKey)
        .where('issueStatus', '==', 'issued')
        .get();

      const issuedCount = issuedSnap.size;

      // Get last historical rate for this item if exists
      const lastRateSnap = await db
        .collection(COLLECTIONS.MEAL_RATES)
        .where('tenantId', '==', tenantId)
        .where('menuOptionKey', '==', combo.menuOptionKey)
        .where('mealType', '==', mealType)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      const lastHistoricalRate = lastRateSnap.empty
        ? null
        : lastRateSnap.docs[0].data().unitRate;

      pendingItems.push({
        rateTargetKey,
        mealType,
        menuOptionKey: combo.menuOptionKey,
        displayLabel: combo.displayLabel,
        comboId: combo.comboId,
        comboName: combo.comboName,
        issuedCount,
        lastHistoricalRate,
        rateAlreadyEntered: !existingRate.empty,
        existingRate: existingRate.empty ? null : existingRate.docs[0].data().unitRate,
      });
    }
  }

  return pendingItems;
}

// ─────────────────────────────────────────
// submitRateEntries
// Accounts supervisor submits rates for one date
// One rate document per item, then updates all matching reservations
// ─────────────────────────────────────────
async function submitRateEntries({ tenantId, rateDate, entryDate, entries, enteredByUid, enteredByName }) {
  // entries = [{ rateTargetKey, menuItemId, itemName, mealType, menuOptionKey, selectionMode, unitRate }]

  if (!entries || entries.length === 0) {
    throw new Error('No rate entries provided.');
  }

  const results = [];
  const reservationUpdates = [];

  for (const entry of entries) {
    const {
      rateTargetKey,
      menuItemId,
      itemName,
      mealType,
      menuOptionKey,
      selectionMode,
      unitRate,
    } = entry;

    if (!unitRate || unitRate <= 0) {
      throw new Error(`Invalid rate for ${itemName}. Rate must be greater than 0.`);
    }

    // --- Check if rate already entered (revision scenario) ---
    const existingSnap = await db
      .collection(COLLECTIONS.MEAL_RATES)
      .where('tenantId', '==', tenantId)
      .where('rateTargetKey', '==', rateTargetKey)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    const isRevision = !existingSnap.empty;
    let revisedFromId = null;

    // If revision: mark old rate inactive
    if (isRevision) {
      const oldRateRef = existingSnap.docs[0].ref;
      revisedFromId = existingSnap.docs[0].id;
      await oldRateRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // --- Count issued reservations for this item ---
    const issuedSnap = await db
      .collection(COLLECTIONS.MESS_RESERVATIONS)
      .where('tenantId', '==', tenantId)
      .where('rateTargetKey', '==', rateTargetKey)
      .where('issueStatus', '==', 'issued')
      .get();

    const issuedCount = issuedSnap.size;
    const totalAmount = unitRate * issuedCount;

    // --- Write mealRates document ---
    const rateRef = db.collection(COLLECTIONS.MEAL_RATES).doc();
    const rateId = rateRef.id;

    const rateDoc = {
      rateId,
      tenantId,
      rateDate,
      entryDate,
      menuItemId,
      itemName,
      mealType,
      menuOptionKey,
      selectionMode: selectionMode || 'combo',
      rateTargetKey,
      unitRate,
      lastHistoricalRate: null,
      issuedCount,
      totalAmount,
      entryMode: isRevision ? 'rate_change' : 'retrospective',
      rateStatus: 'entered',
      isActive: true,
      enteredByUid,
      enteredByName,
      enteredAt: FieldValue.serverTimestamp(),
      appliedAt: null,
      revisedFrom: revisedFromId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await rateRef.set(rateDoc);

    // --- Collect reservation IDs to update ---
    issuedSnap.docs.forEach(doc => {
      reservationUpdates.push({
        ref: doc.ref,
        unitRate,
        amount: unitRate * doc.data().quantity,
        rateId,
      });
    });

    results.push({
      rateId,
      rateTargetKey,
      itemName,
      mealType,
      unitRate,
      issuedCount,
      totalAmount,
      isRevision,
    });
  }

  // --- Batch update all matching reservations ---
  if (reservationUpdates.length > 0) {
    const batch = db.batch();

    for (const update of reservationUpdates) {
      batch.update(update.ref, {
        unitRate: update.unitRate,
        amount: update.amount,
        rateStatus: 'applied',
        rateAppliedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  return {
    rateDate,
    entriesProcessed: results.length,
    reservationsUpdated: reservationUpdates.length,
    entries: results,
  };
}

// ─────────────────────────────────────────
// getRatesForDate
// Returns all rate entries for a given date
// ─────────────────────────────────────────
async function getRatesForDate({ tenantId, rateDate }) {
  const snap = await db
    .collection(COLLECTIONS.MEAL_RATES)
    .where('tenantId', '==', tenantId)
    .where('rateDate', '==', rateDate)
    .where('isActive', '==', true)
    .get();

  return snap.docs.map(doc => doc.data());
}

module.exports = { getPendingRateEntries, submitRateEntries, getRatesForDate };