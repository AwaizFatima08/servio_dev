// ─────────────────────────────────────────
// cafeKitchenService.js — V1.2 Slice 2 (Cafe Kitchen Dashboard)
// HomiLabs | Servio
//
// Separate from cafeOrderService.js — mirrors the existing precedent in
// kitchenService.js (mess), which keeps kitchen logic distinct from the
// reservation/order service. This file handles the kitchen's two needs:
//
//   - getKitchenOrders   today's placed+accepted orders, oldest first
//   - acceptOrder        placed -> accepted, sets acceptedAt/acceptedByUid
//
// Design note (confirmed 20-Jun-2026): orderStatus has no state beyond
// 'accepted' in V1.2 — there is no 'ready'/'served' transition. This means
// accepted orders never leave the active set on their own. The kitchen
// list MUST scope to "today in PKT" or accepted orders would accumulate
// indefinitely across days. There is no date parameter by design — this
// is a live working tool, not a historical report.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS, CAFE_ORDER_STATUS } = require('../constants');
const { pktDateStr } = require('../utils');

// ─────────────────────────────────────────
// Start-of-today-in-PKT as a UTC Date object, for use as a Firestore
// range-filter boundary against createdAt (which is stored as a UTC
// timestamp written via `new Date()` at request time — see
// cafeOrderService.js for the same convention).
//
// PKT is UTC+5. Midnight PKT on date D = (D - 1 day, 19:00 UTC) i.e.
// 5 hours earlier than midnight UTC of the same calendar date D.
// ─────────────────────────────────────────
function startOfTodayPKTAsUTC() {
  const todayStr = pktDateStr(new Date()); // "YYYY-MM-DD" in PKT
  // Midnight PKT = 19:00 UTC the previous day. Easiest correct construction:
  // build the ISO string with explicit +05:00 offset and let Date parse it.
  return new Date(`${todayStr}T00:00:00+05:00`);
}

// ─────────────────────────────────────────
// getKitchenOrders
// Today's orders (PKT) with status 'placed' or 'accepted', oldest first.
// Cancelled orders are excluded — kitchen has no use for them.
// ─────────────────────────────────────────
async function getKitchenOrders({ tenantId }) {
  const startOfDay = startOfTodayPKTAsUTC();

  const snap = await db
    .collection(COLLECTIONS.CAFE_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('orderStatus', 'in', [CAFE_ORDER_STATUS.PLACED, CAFE_ORDER_STATUS.ACCEPTED])
    .where('createdAt', '>=', startOfDay)
    .orderBy('createdAt', 'asc')
    .get();

  const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));
  const unacknowledgedCount = orders.filter(
    (o) => o.orderStatus === CAFE_ORDER_STATUS.PLACED
  ).length;

  return {
    date: pktDateStr(new Date()),
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

module.exports = {
  getKitchenOrders,
  acceptOrder,
};