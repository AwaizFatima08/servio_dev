// ─────────────────────────────────────────
// bbqKitchenTargetLocker.js — V1.4 BBQ
// HomiLabs | Servio
//
// Scheduled Cloud Function, runs 17:30 PKT every Friday (design doc §2.5/§5).
// Snapshots bbqLiveItemStatus's live orderedCount per item into
// bbqEvents.kitchenTargetSnapshot, and stamps kitchenTargetLockedAt.
//
// Assumption confirmed with Homi 12-Jul-2026: live ordering doesn't open
// until 19:30 (orderWindowStartAt), two hours after this function runs —
// so whatever is in bbqLiveItemStatus.itemCounts at 17:30 is automatically
// 100% preorder data. No orderType filtering needed here.
//
// Per design doc: "frozen at 17:30, never regenerated (same permanence
// rule as dailyMenus)" — this function refuses to overwrite an
// already-locked event (kitchenTargetLockedAt already set). To re-test,
// manually null kitchenTargetLockedAt via the Firestore console first.
//
// Tenant loop pattern copied from menuResolver.js's exports.run —
// same deploymentConfig / isActive query, same try/catch-per-tenant so
// one tenant's failure doesn't block another's.
// ─────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../constants');

// Same PKT date helper as menuResolver.js's todayPKT() — kept local
// rather than imported, since menuResolver.js doesn't export it.
function todayPKT() {
  const pktStr = new Date().toLocaleString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return pktStr.substring(0, 10);
}

async function lockForTenant(db, tenantId, eventDateOverride = null) {
  const eventDate = eventDateOverride || todayPKT();
  const bbqEventRef = db.collection(COLLECTIONS.BBQ_EVENTS).doc(`${tenantId}_${eventDate}`);
  const eventDoc = await bbqEventRef.get();

  if (!eventDoc.exists) {
    console.log(`[bbqKitchenTargetLocker] No bbqEvent for ${tenantId}_${eventDate} — nothing to lock.`);
    return;
  }
  const event = eventDoc.data();

  if (event.status !== 'published') {
    console.log(`[bbqKitchenTargetLocker] ${tenantId}_${eventDate} is not published (status: ${event.status}) — skipping.`);
    return;
  }

  if (event.kitchenTargetLockedAt) {
    console.warn(`[bbqKitchenTargetLocker] ${tenantId}_${eventDate} already locked — refusing to overwrite (permanence rule).`);
    return;
  }

  const liveStatusDoc = await db.collection(COLLECTIONS.BBQ_LIVE_ITEM_STATUS).doc(`${tenantId}_${eventDate}`).get();
  const itemCounts = liveStatusDoc.exists ? (liveStatusDoc.data().itemCounts || {}) : {};

  // Flatten {itemId: {orderedCount, ...}} → {itemId: lockedQuantity}
  const kitchenTargetSnapshot = {};
  for (const [itemId, counts] of Object.entries(itemCounts)) {
    kitchenTargetSnapshot[itemId] = counts.orderedCount || 0;
  }

  await bbqEventRef.update({
    kitchenTargetSnapshot,
    kitchenTargetLockedAt: FieldValue.serverTimestamp(),
    updatedAt: new Date(),
  });

  console.log(`[bbqKitchenTargetLocker] Locked ${tenantId}_${eventDate} — ${Object.keys(kitchenTargetSnapshot).length} items.`);
}

exports.run = async (options = {}) => {
  const db = getFirestore('servio-dev');
  const { eventDate } = options; // optional override — real 17:30 cron never passes this

  const tenantsSnap = await db.collection(COLLECTIONS.DEPLOYMENT_CONFIG)
    .where('isActive', '==', true)
    .get();

  for (const doc of tenantsSnap.docs) {
    try {
      await lockForTenant(db, doc.id, eventDate);
    } catch (err) {
      console.error(`[bbqKitchenTargetLocker] Error for tenant ${doc.id}:`, err.message);
    }
  }
};