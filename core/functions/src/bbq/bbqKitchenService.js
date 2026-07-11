// ─────────────────────────────────────────
// bbqKitchenService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Kitchen/approval logic, separate from bbqOrderService.js's create-path —
// mirrors cafeKitchenService.js's file split. Since bbqOrders holds a
// multi-item array per document (not one-item-per-doc like café), there is
// no group-resolution layer here — every transition is a single-document
// update, simpler than café's batch pattern.
//
// Two audit-field gaps caught and filled 11-Jul-2026 (see bbqOrderService.js
// edit): lateRequestDecisionByUid/At/Reason added (doc originally gave
// cancellationRequestStatus its own audit trail but not lateRequestApprovalStatus
// — inconsistent, fixed to match). cancelledAt/cancelledByUid/cancellationReason
// added for the plain self-cancel path (see cancelBbqOrder below), which
// itself is a confirmed ADDITION beyond the original locked design doc —
// the doc only defined a Manager-approval-gated cancel for already-accepted
// orders; a still-'placed' order had no cancel path at all until now.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS, CAFE_ORDER_STATUS } = require('../constants');

// ─────────────────────────────────────────
// getBbqKitchenOrders
// eventDate-scoped (not "today" — BBQ orders are always tied to a specific
// Friday), status placed|accepted. A still-pending late request is excluded
// from the live board — design doc: "nothing in the kitchen flow acts on it
// until Manager approves." Sort: createdAt ascending (no pickup-time concept
// in BBQ, unlike café's takeaway scheduling).
// ─────────────────────────────────────────
async function getBbqKitchenOrders({ tenantId, eventDate }) {
  const snap = await db
    .collection(COLLECTIONS.BBQ_ORDERS)
    .where('tenantId', '==', tenantId)
    .where('eventDate', '==', eventDate)
    .where('orderStatus', 'in', [CAFE_ORDER_STATUS.PLACED, CAFE_ORDER_STATUS.ACCEPTED])
    .get();

  const allOrders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));

  // Exclude still-pending late requests — kitchen has nothing to act on yet.
  const orders = allOrders.filter(
    (o) => !(o.isLateRequest && o.lateRequestApprovalStatus === 'pending')
  );

  const createdMs = (o) =>
    o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : (o.createdAt ? new Date(o.createdAt).getTime() : 0);
  orders.sort((a, b) => createdMs(a) - createdMs(b));

  const unacknowledgedCount = orders.filter((o) => o.orderStatus === CAFE_ORDER_STATUS.PLACED).length;

  return {
    eventDate,
    orders,
    totalCount: orders.length,
    unacknowledgedCount,
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// acceptBbqOrder — placed -> accepted. Strict transition, mirrors café.
// Also blocks accepting a still-pending late request.
// ─────────────────────────────────────────
async function acceptBbqOrder({ orderId, tenantId, acceptedByUid }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  if (order.isLateRequest && order.lateRequestApprovalStatus === 'pending') {
    throw new Error('Cannot accept — this order is a late request pending Manager approval.');
  }
  if (order.orderStatus === CAFE_ORDER_STATUS.CANCELLED) throw new Error('Cannot accept a cancelled order.');
  if (order.orderStatus === CAFE_ORDER_STATUS.ACCEPTED) throw new Error('Order is already accepted.');
  if (order.orderStatus !== CAFE_ORDER_STATUS.PLACED) throw new Error(`Unexpected order status: ${order.orderStatus}`);

  const now = new Date();
  await ref.update({ orderStatus: CAFE_ORDER_STATUS.ACCEPTED, acceptedAt: now, acceptedByUid, updatedAt: now });
  return { message: 'Order accepted.', orderId };
}

// ─────────────────────────────────────────
// markBbqOrderPrepared — accepted -> prepared. Strict transition.
// No extra cancellation-request guard needed: if a cancellation request
// gets approved, orderStatus already flips to 'cancelled' at that moment,
// which this same strict check catches naturally.
// ─────────────────────────────────────────
async function markBbqOrderPrepared({ orderId, tenantId, preparedByUid }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  if (order.orderStatus === CAFE_ORDER_STATUS.CANCELLED) throw new Error('Cannot prepare a cancelled order.');
  if (order.orderStatus === CAFE_ORDER_STATUS.PREPARED) throw new Error('Order is already prepared.');
  if (order.orderStatus === CAFE_ORDER_STATUS.PLACED) throw new Error('Order must be accepted before it can be marked prepared.');
  if (order.orderStatus !== CAFE_ORDER_STATUS.ACCEPTED) throw new Error(`Unexpected order status: ${order.orderStatus}`);

  const now = new Date();
  await ref.update({ orderStatus: CAFE_ORDER_STATUS.PREPARED, preparedAt: now, preparedByUid, updatedAt: now });
  return { message: 'Order marked prepared.', orderId };
}

// ─────────────────────────────────────────
// cancelBbqOrder — plain self-cancel, 'placed' only, no approval needed.
// CONFIRMED ADDITION (11-Jul-2026) beyond the original locked design doc.
// Owner (createdByUid) or bbq_supervisor/manager/admin may call this.
// Once accepted, this path is closed — must go through
// requestCancellation/approveCancellationRequest instead.
// ─────────────────────────────────────────
async function cancelBbqOrder({ orderId, tenantId, uid, userRole, cancellationReason }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  const isOwner = order.createdByUid === uid;
  const isSupervisorPlus = ['bbq_supervisor', 'manager', 'admin', 'super_admin'].includes(userRole);
  if (!isOwner && !isSupervisorPlus) {
    throw new Error('Only the order creator or a supervisor/manager/admin can cancel this order.');
  }

  if (order.orderStatus !== CAFE_ORDER_STATUS.PLACED) {
    throw new Error(`Cannot directly cancel an order with status: ${order.orderStatus}. Accepted orders require a cancellation request.`);
  }

  const now = new Date();
  await ref.update({
    orderStatus: CAFE_ORDER_STATUS.CANCELLED,
    cancelledAt: now, cancelledByUid: uid, cancellationReason: cancellationReason || null,
    updatedAt: now,
  });
  return { message: 'Order cancelled.', orderId };
}

// ─────────────────────────────────────────
// approveLateOrder / rejectLateOrder — Manager only.
// Approve: lateRequestApprovalStatus -> approved, orderStatus untouched
// (stays 'placed', now visible to kitchen normally).
// Reject: lateRequestApprovalStatus -> rejected AND orderStatus -> cancelled
// (inference confirmed 11-Jul — a rejected late order can't sit as a
// phantom order the kitchen will never process).
// ─────────────────────────────────────────
async function approveLateOrder({ orderId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (!order.isLateRequest) throw new Error('This order is not a late request.');
  if (order.lateRequestApprovalStatus !== 'pending') {
    throw new Error(`Cannot approve — current status is ${order.lateRequestApprovalStatus}.`);
  }

  const now = new Date();
  await ref.update({
    lateRequestApprovalStatus: 'approved',
    lateRequestDecisionByUid: uid, lateRequestDecisionAt: now,
    updatedAt: now,
  });
  return { message: 'Late order approved.', orderId };
}

async function rejectLateOrder({ orderId, tenantId, uid, lateRequestDecisionReason }) {
  if (!lateRequestDecisionReason) throw new Error('lateRequestDecisionReason is required when rejecting a late order.');
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (!order.isLateRequest) throw new Error('This order is not a late request.');
  if (order.lateRequestApprovalStatus !== 'pending') {
    throw new Error(`Cannot reject — current status is ${order.lateRequestApprovalStatus}.`);
  }

  const now = new Date();
  await ref.update({
    lateRequestApprovalStatus: 'rejected',
    lateRequestDecisionByUid: uid, lateRequestDecisionAt: now, lateRequestDecisionReason,
    orderStatus: CAFE_ORDER_STATUS.CANCELLED,
    cancelledAt: now, cancelledByUid: uid, cancellationReason: `Late order rejected: ${lateRequestDecisionReason}`,
    updatedAt: now,
  });
  return { message: 'Late order rejected and cancelled.', orderId };
}

// ─────────────────────────────────────────
// requestCancellation — for an already-'accepted' order only. Owner or
// supervisor+ may request. Does NOT touch orderStatus.
// ─────────────────────────────────────────
async function requestCancellation({ orderId, tenantId, uid, userRole, reason }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');

  const isOwner = order.createdByUid === uid;
  const isSupervisorPlus = ['bbq_supervisor', 'manager', 'admin', 'super_admin'].includes(userRole);
  if (!isOwner && !isSupervisorPlus) {
    throw new Error('Only the order creator or a supervisor/manager/admin can request cancellation.');
  }
  if (order.orderStatus !== CAFE_ORDER_STATUS.ACCEPTED) {
    throw new Error(`Cannot request cancellation for an order with status: ${order.orderStatus}. Only accepted orders need this flow — a still-placed order can be cancelled directly.`);
  }
  if (order.cancellationRequestStatus === 'pending') {
    throw new Error('A cancellation request is already pending for this order.');
  }

  const now = new Date();
  await ref.update({
    cancellationRequestStatus: 'pending',
    cancellationRequestedAt: now, cancellationRequestedByUid: uid,
    updatedAt: now,
  });
  return { message: 'Cancellation requested.', orderId };
}

// ─────────────────────────────────────────
// approveCancellationRequest — Manager only. Atomic: sets
// cancellationRequestStatus AND orderStatus together in one update. This
// IS the actual cancellation — there is no separate later action that
// performs it (confirmed 11-Jul-2026).
// ─────────────────────────────────────────
async function approveCancellationRequest({ orderId, tenantId, uid, decisionReason }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (order.cancellationRequestStatus !== 'pending') {
    throw new Error(`Cannot approve — current cancellation request status is ${order.cancellationRequestStatus}.`);
  }

  const now = new Date();
  await ref.update({
    cancellationRequestStatus: 'approved',
    cancellationDecisionAt: now, cancellationDecisionByUid: uid, cancellationDecisionReason: decisionReason || null,
    orderStatus: CAFE_ORDER_STATUS.CANCELLED,
    cancelledAt: now, cancelledByUid: uid, cancellationReason: decisionReason || 'Cancellation request approved.',
    updatedAt: now,
  });
  return { message: 'Cancellation approved — order cancelled.', orderId };
}

async function rejectCancellationRequest({ orderId, tenantId, uid, decisionReason }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (order.cancellationRequestStatus !== 'pending') {
    throw new Error(`Cannot reject — current cancellation request status is ${order.cancellationRequestStatus}.`);
  }

  const now = new Date();
  await ref.update({
    cancellationRequestStatus: 'rejected',
    cancellationDecisionAt: now, cancellationDecisionByUid: uid, cancellationDecisionReason: decisionReason || null,
    updatedAt: now,
    // orderStatus deliberately untouched — order continues normally.
  });
  return { message: 'Cancellation request rejected — order continues.', orderId };
}

// ─────────────────────────────────────────
// approveOfficialBbqOrder / rejectOfficialBbqOrder — Admin only.
// Approval axis only, independent of orderStatus (mirrors café exactly).
// ─────────────────────────────────────────
async function approveOfficialBbqOrder({ orderId, tenantId, approvedByUid }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (order.approvalStatus !== 'pending_approval') throw new Error(`Cannot approve — current status is ${order.approvalStatus}.`);

  const now = new Date();
  await ref.update({ approvalStatus: 'approved', approvedByUid, approvedAt: now, updatedAt: now });
  return { message: 'Official BBQ order approved.', orderId };
}

async function rejectOfficialBbqOrder({ orderId, tenantId, rejectedByUid, approvalNote }) {
  const ref = db.collection(COLLECTIONS.BBQ_ORDERS).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Order not found.');
  const order = doc.data();
  if (order.tenantId !== tenantId) throw new Error('Order not found.');
  if (order.approvalStatus !== 'pending_approval') throw new Error(`Cannot reject — current status is ${order.approvalStatus}.`);

  const now = new Date();
  await ref.update({ approvalStatus: 'rejected', rejectedByUid, rejectedAt: now, approvalNote: approvalNote || null, updatedAt: now });
  return { message: 'Official BBQ order rejected.', orderId };
}

module.exports = {
  getBbqKitchenOrders,
  acceptBbqOrder,
  markBbqOrderPrepared,
  cancelBbqOrder,
  approveLateOrder,
  rejectLateOrder,
  requestCancellation,
  approveCancellationRequest,
  rejectCancellationRequest,
  approveOfficialBbqOrder,
  rejectOfficialBbqOrder,
};