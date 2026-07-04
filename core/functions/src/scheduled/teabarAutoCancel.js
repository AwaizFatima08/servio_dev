// functions/src/scheduled/teabarAutoCancel.js
// Runs daily at 17:15 PKT — the moment Tea Bar closes for the day.
//
// Locked 04-Jul-2026: any Tea Bar order still sitting 'pending' (never
// handed over) by the time the counter closes is automatically cancelled.
// No exceptions by bookingSource — self, proxy, and official orders are
// all treated the same way here.
//
// Sweeps ALL stuck pending orders regardless of which day they were
// placed on — not just "today's" — as a deliberate safety net in case
// this job itself ever fails to run on a given day (confirmed with Homi
// 04-Jul-2026). A missed run should never let an order sit stuck forever.
//
// This is a SYSTEM decision, not a human one — no real person's uid goes
// into cancelledByUid. Instead we use a clearly-labeled sentinel value so
// anyone reading the record later (in History, or while debugging) can
// immediately tell this wasn't a person acting.
//
// Known, accepted consequence (already flagged elsewhere in project
// notes): an official order that was already approved for billing before
// it auto-cancels will end up marked BOTH "approved" and "cancelled" at
// once. Not fixed here — no billing logic exists yet to be affected by it.

const { getFirestore } = require('firebase-admin/firestore');
const { COLLECTIONS, TEABAR_ORDER_STATUS, ISSUE_STATUS } = require('../constants');

const SYSTEM_CANCEL_UID = 'system_auto_cancel';

// ─── Main cleanup per tenant ───────────────────────────
async function cancelStaleOrdersForTenant(db, tenantId) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('orderStatus', '==', TEABAR_ORDER_STATUS.PLACED)
    .where('issueStatus', '==', ISSUE_STATUS.PENDING)
    .get();

  if (snap.empty) {
    console.log(`[TeaBarAutoCancel] No stale pending orders for tenant=${tenantId}.`);
    return 0;
  }

  const now = new Date();
  const docs = snap.docs;
  let cancelledCount = 0;

  // Firestore caps a single batch write at 500 operations. Tea Bar volume
  // is nowhere near that today, but chunking defensively costs nothing and
  // means this never silently breaks if volume grows later.
  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, {
        orderStatus: TEABAR_ORDER_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledByUid: SYSTEM_CANCEL_UID,
        updatedAt: now,
      });
    }
    await batch.commit();
    cancelledCount += chunk.length;
  }

  console.log(`[TeaBarAutoCancel] Cancelled ${cancelledCount} stale order(s) for tenant=${tenantId}.`);
  return cancelledCount;
}

// ─── Scheduled entry point (called daily at 17:15 PKT) ──
exports.run = async (context) => {
  const db = getFirestore('servio-dev');

  const tenantsSnap = await db.collection('deploymentConfig')
    .where('isActive', '==', true)
    .get();

  for (const doc of tenantsSnap.docs) {
    try {
      await cancelStaleOrdersForTenant(db, doc.id);
    } catch (err) {
      console.error(`[TeaBarAutoCancel] Error for tenant ${doc.id}:`, err.message);
    }
  }
};

// ─── Manual trigger helper (not wired up by default — same convention
// as menuResolver.runForTenant) ──
exports.runForTenant = async (tenantId) => {
  const db = getFirestore('servio-dev');
  return cancelStaleOrdersForTenant(db, tenantId);
};
