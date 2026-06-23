// ─────────────────────────────────────────
// cafeKitchenService.js — V1.2 (Cafe Kitchen Dashboard)
// HomiLabs | Servio
//
// Separate from cafeOrderService.js — mirrors the existing precedent in
// kitchenService.js (mess), which keeps kitchen logic distinct from the
// reservation/order service. This file handles the kitchen's needs:
//
//   - getKitchenOrders   today's (by PICKUP date, PKT) placed+accepted
//                        orders, soonest pickup first, each flagged isOverrun
//   - acceptOrder        placed -> accepted, sets acceptedAt/acceptedByUid
//   - markPrepared       accepted -> prepared, sets preparedAt/preparedByUid
//
// ── Date semantics (Web Slice 3, 22-Jun-2026) ──
// The board keys off requestedPickupDate, NOT createdAt. With advance
// orders live (anytime_takeaway can be placed days ahead), an order PLACED
// yesterday for a pickup TODAY must appear on TODAY's board — and a same-day
// order still appears, because its pickup date is also today. Every order
// document carries requestedPickupDate (YYYY-MM-DD, PKT): anytime_takeaway
// carries the chosen pickup date; cafe_hours and same-day default it to the
// order date (see cafeOrderService._buildOrderDoc). Field-less legacy orders
// were purged from dev on 22-Jun, and no write path produces them — so a
// plain `requestedPickupDate == today` filter is complete (no fallback).
//
// ── Why still today-only (no date parameter) — Slice 4 update ──
// Slice 4 added the 'prepared' terminal state, so a completed order now
// leaves the board on its own (the query fetches placed+accepted only).
// But the board is STILL today-only, for a reason that survives that change:
// a 'placed' order nobody ever accepts would otherwise linger forever. The
// date bound (PICKUP date, PKT) is what keeps an abandoned/forgotten order
// from haunting the live board. This is a live working tool, not a report;
// the forward-looking "what's coming this week" view belongs on the
// supervisor/manager dashboard, not here.
//
// ── Overrun flag (Slice 4) ──
// Each order carries a computed isOverrun boolean: true when an ACCEPTED
// order has sat in the kitchen (since acceptedAt) longer than
// CAFE_OVERRUN_MINUTES. Measured from acceptedAt — the kitchen's own clock —
// so it is immune to how far ahead the order was placed. 'placed' orders
// have no kitchen clock running yet, so isOverrun is always false for them.
// Recomputed every read; with the board's 30s refresh it is at most ~30s
// stale, which is fine for a kitchen board (no live ticking clock needed).
// Duration math needs no timezone: both sides are absolute instants.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS, CAFE_ORDER_STATUS } = require('../constants');
const { pktDateStr } = require('../utils');

// Minutes an ACCEPTED order may sit in the kitchen (since acceptedAt) before
// it is flagged isOverrun. A named constant beside the café time-window
// constants in cafeOrderService.js conceptually — kept local to the kitchen
// because only the board consumes it. Promote to appSettings only when a café
// admin-settings screen exists to tune it (Slice 4 design lock, 23-Jun).
const CAFE_OVERRUN_MINUTES = 15;

// ─────────────────────────────────────────
// getKitchenOrders
// Today's orders (by PICKUP date, PKT) with status 'placed' or 'accepted'.
// Cancelled orders are excluded — kitchen has no use for them.
//
// Sort: soonest pickup first (what to make next). requestedPickupTime is
// "HH:MM" for takeaway/outdoor and null for dine_in (eaten at table whenever
// ready). Timed orders sort by time; untimed (dine_in) orders sink below
// them, ordered by placement. Equal pickup times tie-break by createdAt.
//
// Sorting is done in memory (not orderBy) so the Firestore query stays a
// pure equality/in filter set — no composite index required, and the
// per-day set is tiny (dozens of orders).
// ─────────────────────────────────────────
async function getKitchenOrders({ tenantId }) {
  const todayStr = pktDateStr(new Date()); // "YYYY-MM-DD" in PKT

  const snap = await db
    .collection(COLLECTIONS.CAFE_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('orderStatus', 'in', [CAFE_ORDER_STATUS.PLACED, CAFE_ORDER_STATUS.ACCEPTED])
    .where('requestedPickupDate', '==', todayStr)
    .get();

  const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));

  // pickup time as minutes-of-day, or null when there is none (dine_in)
  const pickupMin = (o) => {
    if (typeof o.requestedPickupTime !== 'string') return null;
    const m = o.requestedPickupTime.match(/^(\d{2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  // createdAt may be a Firestore Timestamp ({toMillis}) or an ISO/ms value
  const createdMs = (o) =>
    o.createdAt && o.createdAt.toMillis
      ? o.createdAt.toMillis()
      : (o.createdAt ? new Date(o.createdAt).getTime() : 0);
  // acceptedAt: same Timestamp-or-ISO/ms ambiguity as createdAt. null until
  // the order is accepted. Returns null (not 0) when absent so overrun math
  // can distinguish "never accepted" from "accepted at epoch".
  const acceptedMs = (o) => {
    if (!o.acceptedAt) return null;
    return o.acceptedAt.toMillis ? o.acceptedAt.toMillis() : new Date(o.acceptedAt).getTime();
  };

  orders.sort((a, b) => {
    const pa = pickupMin(a);
    const pb = pickupMin(b);
    if (pa !== null && pb !== null && pa !== pb) return pa - pb; // both timed → soonest first
    if (pa !== null && pb === null) return -1;                   // timed before untimed
    if (pa === null && pb !== null) return 1;
    return createdMs(a) - createdMs(b);                          // same time / both untimed → first-placed
  });

  // isOverrun: true only for ACCEPTED orders whose kitchen dwell time exceeds
  // CAFE_OVERRUN_MINUTES. 'placed' orders have no kitchen clock yet → false.
  // Computed against Date.now() — a pure duration, timezone-irrelevant.
  const overrunMs = CAFE_OVERRUN_MINUTES * 60 * 1000;
  const now = Date.now();
  for (const o of orders) {
    const acc = acceptedMs(o);
    o.isOverrun =
      o.orderStatus === CAFE_ORDER_STATUS.ACCEPTED &&
      acc !== null &&
      (now - acc) > overrunMs;
  }

  const unacknowledgedCount = orders.filter(
    (o) => o.orderStatus === CAFE_ORDER_STATUS.PLACED
  ).length;

  return {
    date: todayStr,
    orders,
    totalCount: orders.length,
    unacknowledgedCount,
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// acceptOrder
// placed -> accepted only. Rejects if the order is already accepted or
// cancelled, or doesn't exist, or belongs to a different tenant.
// ─────────────────────────────────────────
async function acceptOrder({ orderId, tenantId, acceptedByUid }) {
  const ref = db.collection(COLLECTIONS.CAFE_ORDERS).doc(orderId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();

  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  if (order.orderStatus === CAFE_ORDER_STATUS.CANCELLED) {
    throw new Error('Cannot accept a cancelled order.');
  }
  if (order.orderStatus === CAFE_ORDER_STATUS.ACCEPTED) {
    throw new Error('Order is already accepted.');
  }
  if (order.orderStatus !== CAFE_ORDER_STATUS.PLACED) {
    throw new Error(`Unexpected order status: ${order.orderStatus}`);
  }

  const now = new Date();
  await ref.update({
    orderStatus: CAFE_ORDER_STATUS.ACCEPTED,
    acceptedAt: now,
    acceptedByUid,
    updatedAt: now,
  });

  return { message: 'Order accepted.', orderId };
}

// ─────────────────────────────────────────
// markPrepared
// accepted -> prepared only. 'prepared' is the terminal "handed over from
// kitchen" state — NOT a billing event (café bills on order-placed). A
// prepared order falls out of the placed+accepted board query, so it leaves
// the live board on its own.
//
// Strict transition (Slice 4 lock): rejects anything that is not 'accepted'.
// This catches 'placed' too — an order cannot skip placed -> prepared; it
// must be accepted first. Mirrors acceptOrder's guard shape.
// ─────────────────────────────────────────
async function markPrepared({ orderId, tenantId, preparedByUid }) {
  const ref = db.collection(COLLECTIONS.CAFE_ORDERS).doc(orderId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();

  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  if (order.orderStatus === CAFE_ORDER_STATUS.CANCELLED) {
    throw new Error('Cannot prepare a cancelled order.');
  }
  if (order.orderStatus === CAFE_ORDER_STATUS.PREPARED) {
    throw new Error('Order is already prepared.');
  }
  if (order.orderStatus === CAFE_ORDER_STATUS.PLACED) {
    throw new Error('Order must be accepted before it can be marked prepared.');
  }
  if (order.orderStatus !== CAFE_ORDER_STATUS.ACCEPTED) {
    throw new Error(`Unexpected order status: ${order.orderStatus}`);
  }

  const now = new Date();
  await ref.update({
    orderStatus: CAFE_ORDER_STATUS.PREPARED,
    preparedAt: now,
    preparedByUid,
    updatedAt: now,
  });

  return { message: 'Order marked prepared.', orderId };
}

module.exports = {
  getKitchenOrders,
  acceptOrder,
  markPrepared,
};