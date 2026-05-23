// core/functions/src/mess/dailyMenuResolver.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Resolves tomorrow's daily menus from the active cycle + template.
 * Called by scheduled Cloud Function (23:55 nightly) OR manual trigger.
 *
 * @param {string} tenantId - e.g. "ffl"
 * @param {string|null} targetDateOverride - "YYYY-MM-DD" for manual trigger, null for nightly
 * @returns {object} result summary
 */
async function resolveDailyMenus(tenantId, targetDateOverride = null) {

  // --- 1. Determine target date ---
  // Nightly run: resolve for tomorrow
  // Manual run: resolve for the date provided
  let targetDate;
  if (targetDateOverride) {
    targetDate = targetDateOverride;
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetDate = tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"
  }

  // --- 2. Find the active cycle for this tenant ---
  const cycleSnap = await db.collection('menuCycles')
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (cycleSnap.empty) {
    throw new Error(`No active menu cycle found for tenant: ${tenantId}`);
  }

  const cycle = cycleSnap.docs[0].data();

  // --- 3. Validate cycle covers the target date ---
  if (targetDate < cycle.startDate) {
    throw new Error(`Target date ${targetDate} is before cycle start ${cycle.startDate}`);
  }
  if (cycle.endDate && targetDate > cycle.endDate) {
    throw new Error(`Target date ${targetDate} is after cycle end ${cycle.endDate}`);
  }

  // --- 4. Fetch the weekly template linked to this cycle ---
  const templateDoc = await db.collection('messWeeklyTemplates')
    .doc(cycle.weekTemplateId)
    .get();

  if (!templateDoc.exists) {
    throw new Error(`Template not found: ${cycle.weekTemplateId}`);
  }

  const template = templateDoc.data();

  // --- 5. Determine which day of the week the target date falls on ---
  // JavaScript getDay(): 0=Sunday, 1=Monday, ... 6=Saturday
  // We need lowercase string: "monday", "tuesday", etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dateObj = new Date(targetDate + 'T00:00:00'); // force local midnight parse
  const dayName = dayNames[dateObj.getDay()];

  const daySchedule = template.schedule[dayName];
  if (!daySchedule) {
    throw new Error(`No schedule found for day: ${dayName} in template: ${cycle.weekTemplateId}`);
  }

  // --- 6. Build and write dailyMenus documents for all 3 meal types ---
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const results = [];
  const batch = db.batch();

  for (const mealType of mealTypes) {
    const mealSchedule = daySchedule[mealType];

    if (!mealSchedule) {
      console.warn(`No ${mealType} found for ${dayName} — skipping`);
      continue;
    }

    // Build combos array from flat combo1Id/combo1Name/combo2Id/combo2Name structure
    const combos = buildCombosArray(mealSchedule, mealType);

    // Document ID format: {tenantId}_{YYYY-MM-DD}_{mealType}
    const docId = `${tenantId}_${targetDate}_${mealType}`;
    const docRef = db.collection('dailyMenus').doc(docId);

    const dailyMenuDoc = {
      menuDate: targetDate,
      mealType: mealType,
      sourceCycleId: cycle.cycleId,
      sourceTemplateId: cycle.weekTemplateId,
      combos: combos,
      alaCarte: [],           // populated separately for breakfast in a future step
      rateEntryStatus: 'pending',
      isActive: true,
      generatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      tenantId: tenantId,
    };

    batch.set(docRef, dailyMenuDoc);
    results.push({ docId, mealType, combosCount: combos.length });
  }

  await batch.commit();

  return {
    targetDate,
    tenantId,
    cycleId: cycle.cycleId,
    templateId: cycle.weekTemplateId,
    dayName,
    documentsWritten: results,
  };
}

/**
 * Transforms flat combo fields from template into a clean combos array.
 * Template stores: combo1Id, combo1Name, combo2Id, combo2Name (flat)
 * dailyMenus needs: [ { comboId, comboName, displayLabel, menuOptionKey } ]
 */
function buildCombosArray(mealSchedule, mealType) {
  const combos = [];

  // Breakfast has only combo1. Lunch and dinner can have combo1 + combo2.
  const maxCombos = mealType === 'breakfast' ? 1 : 3; // up to 3, stops when not found

  for (let i = 1; i <= maxCombos; i++) {
    const idKey = `combo${i}Id`;
    const nameKey = `combo${i}Name`;

    if (mealSchedule[idKey] && mealSchedule[nameKey]) {
      combos.push({
        comboId: mealSchedule[idKey],
        comboName: mealSchedule[nameKey],
        displayLabel: `Combo ${i}`,
        menuOptionKey: `combo_${i}`,
        unitRate: null,           // filled next day by accounts supervisor
        rateEnteredBy: null,
        rateEnteredAt: null,
      });
    }
  }

  return combos;
}

module.exports = { resolveDailyMenus };