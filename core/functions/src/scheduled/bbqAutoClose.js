// ─────────────────────────────────────────
// bbqAutoClose.js — V1.4 BBQ
// HomiLabs | Servio
//
// Scheduled Cloud Function, runs 23:50 PKT every Friday — auto-closes
// any BBQ event still sitting 'published' by the time the night ends.
// Confirmed with Homi 12-Jul-2026: "Friday Night 12:00" = end of Friday,
// simplified to 23:50 same-day (Friday) rather than 00:00 Saturday, to
// match the existing resolveDaily precedent (23:50 PKT) and avoid
// day-of-week arithmetic across the midnight boundary.
//
// Exists so GET /bbq/events?status=published&limit=1 (used by the
// frontend to find "this Friday's" event) never returns a stale,
// already-happened week — without this, a published event from last
// Friday would keep looking "current" indefinitely.
//
// Sweep rule: closes every event where status == 'published' AND
// eventDate <= today (PKT) — NOT a blind sweep of every published event
// regardless of date, unlike teabarAutoCancel.js. BBQ menus are
// sometimes published a week ahead (Thursday, for the following
// Friday), so a blind sweep risks closing a genuinely future,
// not-yet-happened event. The <= today bound still gives the same
// "a missed run never leaves something stuck forever" protection
// teabarAutoCancel is built around, just bounded to the past instead of
// unbounded. Confirm with Homi if this scenario (two events published
// at once) is even possible in practice — flagged, not assumed.
//
// Tenant loop pattern copied from bbqKitchenTargetLocker.js's exports.run.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const { COLLECTIONS, EVENT_STATUS_OFFICIAL } = require('../constants');

// Same PKT date helper as bbqKitchenTargetLocker.js's todayPKT().
function todayPKT() {
  const pktStr = new Date().toLocaleString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return pktStr.substring(0, 10);
}

async function closeForTenant(db, tenantId, dateOverride = null) {
  const today = dateOverride || todayPKT();

  const snap = await db.collection(COLLECTIONS.BBQ_EVENTS)
    .where('tenantId', '==', tenantId)
    .where('status', '==', EVENT_STATUS_OFFICIAL.PUBLISHED)
    .where('eventDate', '<=', today)
    .get();

  if (snap.empty) {
    console.log(`[bbqAutoClose] No published BBQ events due to close for tenant=${tenantId}.`);
    return 0;
  }

  const now = new Date();
  let closedCount = 0;
  for (const doc of snap.docs) {
    await doc.ref.update({ status: EVENT_STATUS_OFFICIAL.CLOSED, updatedAt: now });
    closedCount += 1;
  }

  console.log(`[bbqAutoClose] Closed ${closedCount} BBQ event(s) for tenant=${tenantId}.`);
  return closedCount;
}

exports.run = async (options = {}) => {
  const db = getFirestore('servio-dev');
  const { eventDate } = options; // optional override for manual testing — real Friday 23:50 cron never passes this

  const tenantsSnap = await db.collection(COLLECTIONS.DEPLOYMENT_CONFIG)
    .where('isActive', '==', true)
    .get();

  for (const doc of tenantsSnap.docs) {
    try {
      await closeForTenant(db, doc.id, eventDate);
    } catch (err) {
      console.error(`[bbqAutoClose] Error for tenant ${doc.id}:`, err.message);
    }
  }
};