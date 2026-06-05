// functions/src/scheduled/menuResolver.js
// Runs nightly at 23:50 PKT
// Generates dailyMenus documents for the next 7 days
//
// ─────────────────────────────────────────────────────
// FIX (Batch 1, 01 Jun 2026): Bug 1 — "Weekly menu shows dashes"
//
// Root cause: the previous addDays() and dayOfWeek() helpers built a Date
// using new Date(dateStr + 'T00:00:00+05:00') and then called .getDate() /
// .getDay() on it. Those methods return the value in the SERVER's local
// timezone — but Cloud Functions run in UTC, where the same instant is
// 19:00 the previous day. The result on a UTC server:
//   addDays('2026-06-01', 0)   →  '2026-05-31'   (off by one day)
//   dayOfWeek('2026-06-01')    →  'sunday'       (it's actually Monday)
//
// So the resolver was looking up the WRONG day's template entry. If that
// day had no combos defined (e.g. Sunday left empty in the weekly template),
// the generated dailyMenus document would have combos: [] — which is exactly
// what shows up as "—" on the home screen and book-meal screen.
//
// New implementation: treat YYYY-MM-DD strings as pure dates with no
// timezone semantics. Build the Date in UTC with Date.UTC(y, m-1, d) and
// read it back with getUTCDate() / getUTCDay(). This is timezone-neutral
// and gives the same answer on every server.
// ─────────────────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');

const DAYS_AHEAD = 7;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

// ─── Date helpers (timezone-neutral) ──────────────────
// dateStr is always YYYY-MM-DD. We never attach a timezone offset.

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + n);
  return utc.toISOString().split('T')[0];
}

function todayPKT() {
  // Convert "now" to PKT (Asia/Karachi) and take the date portion.
  // toLocaleString with en-CA gives ISO-like "YYYY-MM-DD, HH:MM:SS" — we
  // take the first 10 chars, which is the PKT calendar date regardless
  // of what the server thinks the local time is.
  const pktStr = new Date().toLocaleString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA returns "YYYY-MM-DD" for the date-only format.
  // Defensive: take first 10 chars in case of locale variations.
  return pktStr.substring(0, 10);
}

function dayOfWeek(dateStr) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return days[utc.getUTCDay()];
}

// ─── Main resolver per tenant ─────────────────────────
async function resolveForTenant(db, tenantId) {
  const today = todayPKT();
  const results = [];

  console.log(`[Resolver] Starting for tenant=${tenantId}, today(PKT)=${today}`);

  // 1. Find active cycle
  const cycleSnap = await db.collection('menuCycles')
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (cycleSnap.empty) {
    console.warn(`[Resolver] No active cycle found for tenant=${tenantId}. ` +
      `Check that a menuCycles doc exists with isActive=true AND status='active'.`);
    return results;
  }

  const cycle = cycleSnap.docs[0].data();
  const { cycleId, weekTemplateId } = cycle;
  console.log(`[Resolver] Using cycle=${cycleId}, template=${weekTemplateId}`);

  // 2. Load the weekly template
  const templateDoc = await db.collection('messWeeklyTemplates').doc(weekTemplateId).get();
  if (!templateDoc.exists) {
    console.error(`[Resolver] Template ${weekTemplateId} referenced by cycle ${cycleId} not found.`);
    return results;
  }
  const template = templateDoc.data();
  const schedule = template.schedule || {};
  console.log(`[Resolver] Template loaded. Days with schedule: ${Object.keys(schedule).join(', ') || '(none)'}`);

  // 3. Load all menu items referenced (for constituent details)
  const allItemIds = new Set();
  for (const dayData of Object.values(schedule)) {
    for (const mealData of Object.values(dayData)) {
      for (const key of Object.keys(mealData)) {
        if (key.endsWith('Id')) allItemIds.add(mealData[key]);
      }
    }
  }

  // Batch fetch menuItems
  const itemMap = {};
  const itemIdArray = [...allItemIds].filter(Boolean);
  for (let i = 0; i < itemIdArray.length; i += 10) {
    const batch = itemIdArray.slice(i, i + 10);
    const snap = await db.collection('menuItems')
      .where('itemId', 'in', batch)
      .get();
    snap.docs.forEach(d => { itemMap[d.data().itemId] = d.data(); });
  }

  // 4. Generate dailyMenus for today + DAYS_AHEAD days
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = addDays(today, d);
    const dow  = dayOfWeek(date);
    const daySchedule = schedule[dow] || {};

    for (const mealType of MEAL_TYPES) {
      const docId = `${tenantId}_${date}_${mealType}`;
      const mealSchedule = daySchedule[mealType] || {};

      // Build combos from schedule
      // schedule structure: { combo1Id, combo1Name, combo2Id, combo2Name, ... }
      const combos = [];
      let comboIdx = 1;
      while (mealSchedule[`combo${comboIdx}Id`]) {
        const comboId   = mealSchedule[`combo${comboIdx}Id`];
        const comboName = mealSchedule[`combo${comboIdx}Name`] || comboId;
        const item      = itemMap[comboId] || {};

        // Build constituents from constituentItemIds
        const constituents = [];
        if (item.constituentItemIds && Array.isArray(item.constituentItemIds)) {
          for (const cid of item.constituentItemIds) {
            const cItem = itemMap[cid];
            if (cItem) {
              constituents.push({
                itemId:   cid,
                itemName: cItem.itemName || cid,
                baseUnit: cItem.baseUnit || '',
              });
            }
          }
        }

        combos.push({
          displayLabel:  `Combo ${comboIdx}`,
          menuOptionKey: `combo_${comboIdx}`,
          comboId,
          comboName,
          foodTypeCode:  item.foodTypeCode || '',
          foodTypeName:  item.foodTypeName || '',
          constituents,
          unitRate:      null,
          rateEnteredBy: null,
          rateEnteredAt: null,
        });
        comboIdx++;
      }

      // Ala carte — fixed items for breakfast; empty for lunch/dinner at generation
      const alaCarte = [];
      if (mealType === 'breakfast') {
        const bfItems = await db.collection('menuItems')
          .where('tenantId', '==', tenantId)
          .where('serviceCategories', 'array-contains', 'bf_alacarte')
          .where('isActive', '==', true)
          .get();
        bfItems.docs.forEach((doc, i) => {
          const it = doc.data();
          alaCarte.push({
            itemId:        it.itemId,
            menuOptionKey: `alacarte_${i+1}`,
            itemName:      it.itemName,
            foodTypeCode:  it.foodTypeCode || '',
            foodTypeName:  it.foodTypeName || '',
            baseUnit:      it.baseUnit || '',
            unitRate:      null,
            rateEnteredBy: null,
            rateEnteredAt: null,
          });
        });
      }

      const menuDoc = {
        menuDate:        date,
        mealType,
        tenantId,
        sourceCycleId:   cycleId,
        sourceTemplateId: weekTemplateId,
        combos,
        alaCarte,
        rateEntryStatus: 'pending',
        isActive:        true,
        generatedAt:     new Date(),
        updatedAt:       new Date(),
      };

      await db.collection('dailyMenus').doc(docId).set(menuDoc, { merge: false });
      results.push(docId);
    }
  }

  console.log(`[Resolver] Generated ${results.length} dailyMenu docs for tenant=${tenantId}`);
  return results;
}

// ─── Scheduled entry point (called nightly at 23:50 PKT) ──
exports.run = async (context) => {
  const db = getFirestore('servio-dev');

  // Get all active tenants
  const tenantsSnap = await db.collection('deploymentConfig')
    .where('isActive', '==', true)
    .get();

  for (const doc of tenantsSnap.docs) {
    try {
      await resolveForTenant(db, doc.id);
    } catch (err) {
      console.error(`[Resolver] Error for tenant ${doc.id}:`, err.message);
    }
  }
};

// ─── Manual trigger helper (callable from index.js if exposed) ──
// Lets you re-run the resolver on demand without waiting for the
// 23:50 PKT cron. Not wired up by default — see BATCH1_README.md
// for the optional index.js snippet to expose it as an HTTP endpoint.
exports.runForTenant = async (tenantId) => {
  const db = getFirestore('servio-dev');
  return resolveForTenant(db, tenantId);
};
