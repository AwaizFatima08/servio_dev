// ─────────────────────────────────────────
// bbqLiveItemStatusService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Live, per-item ordered/prepared counters for the supervisor's
// cumulative-count screen (design doc §2.5, screen #7). One document
// per event: bbqLiveItemStatus/{tenantId}_{eventDate}.
//
// Chosen pattern: incremental FieldValue.increment on each order
// transition (Option 2, confirmed 12-Jul-2026) — NOT a full re-query/
// re-sum like eventService.js's aggregateAttendance(). Chosen for
// speed under live kitchen-floor conditions; the tradeoff accepted is
// that a missed transition would drift the counter silently, with no
// self-correction. See the full trigger map in the design conversation
// for every call site — do not add a new bbqOrders quantity-changing
// path without also wiring a call here.
// ─────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS } = require('../constants');

// ── applyBbqItemDeltas ──
// items: the order's resolved items[] array — [{itemId, itemName, quantity, ...}]
// orderedDelta / preparedDelta: +1 to add this order's quantities,
//   -1 to remove them. 0 (default) means "don't touch that counter".
// Uses set(..., {merge:true}) with nested objects (not update()) so:
//   (a) the document is created automatically on the first order of the
//       night — update() would throw "not found" instead, and
//   (b) only the touched itemIds' fields change — Firestore deep-merges
//       nested map fields on a merge-write, so sibling itemIds already
//       in itemCounts are left completely alone.
async function applyBbqItemDeltas({ tenantId, eventDate, items, orderedDelta = 0, preparedDelta = 0 }) {
  if (!items || items.length === 0) return;
  if (orderedDelta === 0 && preparedDelta === 0) return;

  const docId = `${tenantId}_${eventDate}`;
  const ref = db.collection(COLLECTIONS.BBQ_LIVE_ITEM_STATUS).doc(docId);

  const itemCounts = {};
  for (const it of items) {
    const entry = { itemName: it.itemName };
    if (orderedDelta !== 0)  entry.orderedCount  = FieldValue.increment(orderedDelta * it.quantity);
    if (preparedDelta !== 0) entry.preparedCount = FieldValue.increment(preparedDelta * it.quantity);
    itemCounts[it.itemId] = entry;
  }

  try {
    await ref.set({
      eventDate, tenantId,
      itemCounts,
      lastAggregatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Deliberately not rethrown — bbqOrders is the source of truth;
    // this live counter is a dashboard aid, not the transaction ledger.
    console.error(`[bbqLiveItemStatus] Failed to update counts for ${docId}:`, err);
  }
}

// ─────────────────────────────────────────
// getBbqLiveItemStatus — reads the live per-item counters for the
// supervisor's cumulative-count screen (design doc screen #7). Returns
// notFound:true with empty counts before the first order of the night
// has been placed, since applyBbqItemDeltas's set({merge:true}) means
// the document simply doesn't exist yet at that point — this is a
// normal, expected state, not an error.
// ─────────────────────────────────────────
async function getBbqLiveItemStatus({ tenantId, eventDate }) {
  const docId = `${tenantId}_${eventDate}`;
  const doc = await db.collection(COLLECTIONS.BBQ_LIVE_ITEM_STATUS).doc(docId).get();
  if (!doc.exists) return { notFound: true, eventDate, itemCounts: {} };

  const data = doc.data();
  return {
    notFound: false,
    eventDate: data.eventDate,
    itemCounts: data.itemCounts || {},
    lastAggregatedAt: data.lastAggregatedAt && data.lastAggregatedAt.toDate
      ? data.lastAggregatedAt.toDate().toISOString()
      : (data.lastAggregatedAt || null),
  };
}

module.exports = { applyBbqItemDeltas, getBbqLiveItemStatus };