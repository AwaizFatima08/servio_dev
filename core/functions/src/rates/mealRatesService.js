// core/functions/src/rates/mealRatesService.js

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS, NOTIFICATION_TARGET_TYPES, NOTIFICATION_LAYERS } = require('../constants');

// Bug 3 fix: wire in notification service
const { createNotification } = require('../notifications/notificationService');

// ── getPendingRateEntries ──
async function getPendingRateEntries({ tenantId, rateDate }) {

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

    for (const combo of dailyMenu.combos) {
      const rateTargetKey = `${rateDate}_${mealType}_${combo.menuOptionKey}`;

      const existingRate = await db
        .collection(COLLECTIONS.MEAL_RATES)
        .where('tenantId', '==', tenantId)
        .where('rateTargetKey', '==', rateTargetKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      const issuedSnap = await db
        .collection(COLLECTIONS.MESS_RESERVATIONS)
        .where('tenantId', '==', tenantId)
        .where('rateTargetKey', '==', rateTargetKey)
        .where('issueStatus', '==', 'issued')
        .get();

      const issuedCount = issuedSnap.size;

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

// ── submitRateEntries ──
async function submitRateEntries({ tenantId, rateDate, entryDate, entries, enteredByUid, enteredByName }) {

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

    const existingSnap = await db
      .collection(COLLECTIONS.MEAL_RATES)
      .where('tenantId', '==', tenantId)
      .where('rateTargetKey', '==', rateTargetKey)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    const isRevision = !existingSnap.empty;
    let revisedFromId = null;

    if (isRevision) {
      const oldRateRef = existingSnap.docs[0].ref;
      revisedFromId = existingSnap.docs[0].id;
      await oldRateRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const issuedSnap = await db
      .collection(COLLECTIONS.MESS_RESERVATIONS)
      .where('tenantId', '==', tenantId)
      .where('rateTargetKey', '==', rateTargetKey)
      .where('issueStatus', '==', 'issued')
      .get();

    const issuedCount = issuedSnap.size;
    const totalAmount = unitRate * issuedCount;

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

  // Bug 3 fix: Notify admin/accounts that rates have been entered (fire-and-forget)
  const mealSummary = results.map(r => `${r.mealType} (${r.itemName}): Rs. ${r.unitRate}`).join(', ');
  createNotification({
    tenantId,
    createdByUid: enteredByUid,
    createdByName: enteredByName,
    notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
    notificationType: 'rates_entered',
    triggerSource: 'rate_entry',
    title: 'Meal Rates Entered',
    body: `Rates entered for ${rateDate} by ${enteredByName || 'Accounts'}. ${results.length} item(s): ${mealSummary}.`,
    targetType: NOTIFICATION_TARGET_TYPES.ADMIN_ONLY,
    contextType: 'rate_entry',
    contextId: rateDate,
  }).catch(err => console.error('[Notification] rates_entered failed:', err));

  return {
    rateDate,
    entriesProcessed: results.length,
    reservationsUpdated: reservationUpdates.length,
    entries: results,
  };
}

// ── getRatesForDate ──
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
