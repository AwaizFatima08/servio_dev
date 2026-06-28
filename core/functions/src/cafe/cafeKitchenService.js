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

const { COLLECTIONS, CAFE_ORDER_STATUS, CAFE_ORDER_TYPES } = require('../constants');
const { pktDateStr } = require('../utils');

// Minutes an ACCEPTED order may sit in the kitchen (since acceptedAt) before
// it is flagged isOverrun. A named constant beside the café time-window
// constants in cafeOrderService.js conceptually — kept local to the kitchen
// because only the board consumes it. Promote to appSettings only when a café
// admin-settings screen exists to tune it (Slice 4 design lock, 23-Jun).
const CAFE_OVERRUN_MINUTES = 30;

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
    // Overrun applies ONLY to cafe_hours (dine-in / live takeaway), where the
    // kitchen owes a ≤30-min turnaround from acceptance. anytime_takeaway is
    // prepared to its scheduled pickup time, not a dwell clock — never overrun.
    o.isOverrun =
      o.orderType === CAFE_ORDER_TYPES.CAFE_HOURS &&
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

// ─────────────────────────────────────────
// listCafeOrderHistory  — V1.2 Slice 6 (Café Supervisor Order-History View)
//
// READ-ONLY. The supervisor's "what happened?" tool: a paginated, date-bounded
// list of PAST café orders, newest-placed first. Distinct from getKitchenOrders
// (the live board): this spans days, paginates with a cursor, sorts by
// createdAt (placement) DESC, and never mutates. See Servio_Slice6_DesignLock.md.
//
// PARAMS:
//   tenantId         (required) — tenant scope, equality filter.
//   lookbackDays     (default 7) — default window: createdAt >= today-Ndays.
//   day              (YYYY-MM-DD | null) — if set, WINS over lookbackDays and
//                    bounds to that single PKT day (half-open range, see below).
//   includeCancelled (default false) — false: show placed+accepted+prepared.
//                    true: also include cancelled (often the answer to a dispute).
//   cursorCreatedAt  (ISO string | null) — load-more cursor. The createdAt of the
//                    LAST row the client already has. null = first page.
//
// DATE FILTER — two shapes, both range-on-createdAt (one composite index covers both):
//   • default window  → single lower bound: createdAt >= since
//   • single-day pick → half-open range:    dayStart <= createdAt < nextDayStart
//     (createdAt is a timestamp, NOT a YYYY-MM-DD string, so a picked day must
//      become a [00:00 that day, 00:00 next day) window in PKT. The +05:00 anchor
//      makes the day boundaries unambiguous without any tz-library parsing.)
//
// STATUS — Firestore `in` filter. Default 3 values; +1 when includeCancelled.
//   Well under the 30-value `in` ceiling. Named array, single toggle branch.
//
// SORT + CURSOR — orderBy('createdAt','desc'); startAfter(cursorDate) when paging.
//   createdAt-ONLY cursor (single orderBy field → simplest index, single-value
//   cursor, no field-order trap). Exact-same-millisecond collisions in a single
//   café are near-impossible; if a real duplicate ever surfaces in field-test,
//   add an orderId tiebreak THEN (deferred by decision, 26-Jun).
//
// PAGE SIZE 25 — fetched as limit(26): the 26th row, if present, only tells us
//   hasMore. We return at most 25 and never expose the probe row. This avoids a
//   second count query.
//
// COMPOSITE INDEX — this query (tenantId == , orderStatus in , createdAt range +
//   orderBy createdAt desc) REQUIRES a composite index. Do NOT hand-author it:
//   run the query once in dev, capture the exact definition from Firestore's
//   emitted error link, deploy that index, confirm applied (deploy ≠ apply).
// ─────────────────────────────────────────

// Default status set: what actually got served. Cancelled added only on toggle.
const HISTORY_DEFAULT_STATUSES = [
  CAFE_ORDER_STATUS.PLACED,
  CAFE_ORDER_STATUS.ACCEPTED,
  CAFE_ORDER_STATUS.PREPARED,
];

const HISTORY_PAGE_SIZE = 25;

async function listCafeOrderHistory({
  tenantId,
  lookbackDays = 7,
  day = null,
  includeCancelled = false,
  cursorCreatedAt = null,
}) {
  // ── status set ──
  const statuses = includeCancelled
    ? [...HISTORY_DEFAULT_STATUSES, CAFE_ORDER_STATUS.CANCELLED]
    : HISTORY_DEFAULT_STATUSES;

  // ── date bounds (range on createdAt) ──
  // Single-day pick → half-open [dayStart, nextDayStart). Default → lower bound only.
  let lowerBound;          // createdAt >= lowerBound (always present)
  let upperBound = null;   // createdAt <  upperBound (single-day only)

  if (day) {
    // Validate YYYY-MM-DD before trusting it in a date anchor.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error('day must be in YYYY-MM-DD format.');
    }
    // PKT day window via the +05:00 anchor (same technique as cafeOrderService).
    lowerBound = new Date(`${day}T00:00:00+05:00`);
    const next = new Date(`${day}T00:00:00+05:00`);
    next.setUTCDate(next.getUTCDate() + 1);     // first instant of the NEXT PKT day
    upperBound = next;
  } else {
    // Default window: now - lookbackDays. Guard the input.
    let n = parseInt(lookbackDays, 10);
    if (!Number.isFinite(n) || n < 1) n = 7;
    if (n > 90) n = 90;                          // hard ceiling — history is dispute-lookup, not archive
    lowerBound = new Date();
    lowerBound.setDate(lowerBound.getDate() - n);
  }

  // ── build query ──
  let q = db
    .collection(COLLECTIONS.CAFE_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('orderStatus', 'in', statuses)
    .where('createdAt', '>=', lowerBound);

  if (upperBound) {
    q = q.where('createdAt', '<', upperBound);
  }

  q = q.orderBy('createdAt', 'desc');

  // Cursor: start AFTER the last row the client already holds.
  if (cursorCreatedAt) {
    const cursorDate = new Date(cursorCreatedAt);
    if (Number.isNaN(cursorDate.getTime())) {
      throw new Error('cursorCreatedAt must be a valid date.');
    }
    q = q.startAfter(cursorDate);
  }

  // Fetch one extra (the probe row) to compute hasMore without a second query.
  q = q.limit(HISTORY_PAGE_SIZE + 1);

  const snap = await q.get();
  const docs = snap.docs;

  const hasMore = docs.length > HISTORY_PAGE_SIZE;
  const pageDocs = hasMore ? docs.slice(0, HISTORY_PAGE_SIZE) : docs;

  const orders = pageDocs.map((d) => ({ orderId: d.id, ...d.data() }));

  // nextCursor = the last returned row's createdAt as ISO (what the client sends
  // back as cursorCreatedAt for the next page). null when there is no next page.
  let nextCursor = null;
  if (hasMore && orders.length > 0) {
    const last = orders[orders.length - 1].createdAt;
    // createdAt may be a Firestore Timestamp ({toDate}) or already a Date/ISO.
    nextCursor = last && last.toDate
      ? last.toDate().toISOString()
      : new Date(last).toISOString();
  }

  return {
    orders,
    count: orders.length,
    hasMore,
    nextCursor,
  };
}

// ─────────────────────────────────────────
// _resolveOrderGroup  — V1.2 whole-order kitchen model (28-Jun lock)
// Resolves a groupKey to the set of cafeOrders docs it covers.
//
// groupKey = order.bookingGroupId || order.orderId (derived at read by the
// board). Batch orders share a real bookingGroupId across N docs; single
// orders carry bookingGroupId = null, so their groupKey IS their orderId.
//
// Resolution (no client-trust about which kind of key it is):
//   1. Try where('bookingGroupId','==',groupKey) — finds all N docs of a batch.
//   2. If that returns zero docs, treat groupKey as a lone orderId and fetch
//      that single document (the single-order / legacy-null path).
//
// Returns an array of { ref, id, data } for the docs in the group. Throws if
// nothing is found or any doc is a different tenant.
// ─────────────────────────────────────────
async function _resolveOrderGroup({ groupKey, tenantId }) {
  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey is required.');
  }

  // 1) batch path — docs sharing a real bookingGroupId
  const snap = await db
    .collection(COLLECTIONS.CAFE_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('bookingGroupId', '==', groupKey)
    .get();

  let docs = snap.docs.map((d) => ({ ref: d.ref, id: d.id, data: d.data() }));

  // 2) single-order / legacy-null path — groupKey is actually an orderId
  if (docs.length === 0) {
    const single = await db.collection(COLLECTIONS.CAFE_ORDERS).doc(groupKey).get();
    if (single.exists) {
      const data = single.data();
      // Tenant check here (the batch query already filtered by tenant; the
      // direct doc fetch did not, so guard it explicitly).
      if (data.tenantId === tenantId) {
        docs = [{ ref: single.ref, id: single.id, data }];
      }
    }
  }

  if (docs.length === 0) {
    throw new Error('Order not found.');
  }

  return docs;
}

// ─────────────────────────────────────────
// acceptOrderGroup  — whole-order accept (placed -> accepted), atomic.
// Verifies EVERY doc in the group is 'placed' (don't assume uniformity, even
// though the whole-order model should guarantee it — 28-Jun lock). Rejects the
// whole operation if any doc is not 'placed'. Shared acceptedAt across the group
// so the board's overrun clock is one clock for the order.
// ─────────────────────────────────────────
async function acceptOrderGroup({ groupKey, tenantId, acceptedByUid }) {
  const docs = await _resolveOrderGroup({ groupKey, tenantId });

  // Verify-don't-assume: every doc must be 'placed'.
  for (const { data } of docs) {
    if (data.orderStatus === CAFE_ORDER_STATUS.CANCELLED) {
      throw new Error('Cannot accept a cancelled order.');
    }
    if (data.orderStatus === CAFE_ORDER_STATUS.ACCEPTED) {
      throw new Error('Order is already accepted.');
    }
    if (data.orderStatus === CAFE_ORDER_STATUS.PREPARED) {
      throw new Error('Order is already prepared.');
    }
    if (data.orderStatus !== CAFE_ORDER_STATUS.PLACED) {
      throw new Error(`Unexpected order status: ${data.orderStatus}`);
    }
  }

  const now = new Date();
  const batch = db.batch();
  for (const { ref } of docs) {
    batch.update(ref, {
      orderStatus: CAFE_ORDER_STATUS.ACCEPTED,
      acceptedAt: now,
      acceptedByUid,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { message: 'Order accepted.', groupKey, count: docs.length };
}

// ─────────────────────────────────────────
// markOrderGroupPrepared  — whole-order prepared (accepted -> prepared), atomic.
// Verifies EVERY doc is 'accepted'. Mirrors markPrepared's strict guard: an
// order cannot skip placed -> prepared. Rejects the whole op if any doc isn't
// 'accepted'.
// ─────────────────────────────────────────
async function markOrderGroupPrepared({ groupKey, tenantId, preparedByUid }) {
  const docs = await _resolveOrderGroup({ groupKey, tenantId });

  for (const { data } of docs) {
    if (data.orderStatus === CAFE_ORDER_STATUS.CANCELLED) {
      throw new Error('Cannot prepare a cancelled order.');
    }
    if (data.orderStatus === CAFE_ORDER_STATUS.PREPARED) {
      throw new Error('Order is already prepared.');
    }
    if (data.orderStatus === CAFE_ORDER_STATUS.PLACED) {
      throw new Error('Order must be accepted before it can be marked prepared.');
    }
    if (data.orderStatus !== CAFE_ORDER_STATUS.ACCEPTED) {
      throw new Error(`Unexpected order status: ${data.orderStatus}`);
    }
  }

  const now = new Date();
  const batch = db.batch();
  for (const { ref } of docs) {
    batch.update(ref, {
      orderStatus: CAFE_ORDER_STATUS.PREPARED,
      preparedAt: now,
      preparedByUid,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { message: 'Order marked prepared.', groupKey, count: docs.length };
}

module.exports = {
  getKitchenOrders,
  acceptOrder,
  markPrepared,
  listCafeOrderHistory,
  acceptOrderGroup,
  markOrderGroupPrepared,
};