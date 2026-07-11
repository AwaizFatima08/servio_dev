// ─────────────────────────────────────────
// bbqTableRequestService.js — V1.4 BBQ
// HomiLabs | Servio
//
// Lightweight request-and-approval record for large-group/special-request
// table bookings — design doc §2.4. No table/seat entity anywhere in the
// system; the "reserved" tag is a physical, off-system action.
//
// Status vocabulary and audit fields AMENDED 11-Jul-2026 from the original
// design draft: returnedByUid/returnedAt/returnComments and
// rejectedByUid/rejectedAt/rejectionReason added (doc originally had status
// values for returned/rejected but no fields to record who/when/why —
// gap caught and filled per Homi's confirmation, matching the audit-trail
// pattern used everywhere else in the schema).
//
// Flow: Employee submits (pending) → Admin approves/returns/rejects →
// (if returned) Employee resubmits → pending again → Manager confirms
// (only from approved). Cancel allowed by the requesting employee OR
// Manager+, from pending/approved/returned — confirmed 11-Jul-2026.
// ─────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS, BBQ_TABLE_REQUEST_STATUS } = require('../constants');

function _toISO(t) {
  if (!t) return null;
  if (t._seconds) return new Date(t._seconds * 1000).toISOString();
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return t;
}

function _clean(data) {
  return {
    ...data,
    approvedAt:  _toISO(data.approvedAt),
    returnedAt:  _toISO(data.returnedAt),
    rejectedAt:  _toISO(data.rejectedAt),
    confirmedAt: _toISO(data.confirmedAt),
    createdAt:   _toISO(data.createdAt),
    updatedAt:   _toISO(data.updatedAt),
  };
}

// ── Confirm the event exists and is published — same guard bbqOrderService uses ──
async function _assertEventPublished({ tenantId, eventDate }) {
  const doc = await db.collection(COLLECTIONS.BBQ_EVENTS).doc(`${tenantId}_${eventDate}`).get();
  if (!doc.exists) throw new Error(`No BBQ event found for ${eventDate}.`);
  const event = doc.data();
  if (event.status !== 'published') {
    throw new Error(`BBQ event for ${eventDate} is not published (status: ${event.status}).`);
  }
}

async function createTableRequest({
  tenantId, eventDate, uid, officialEmployeeNumber, employeeName, expectedGuestCount, requestNote,
}) {
  if (!Number.isInteger(expectedGuestCount) || expectedGuestCount < 1) {
    throw new Error('expectedGuestCount must be a positive integer.');
  }
  await _assertEventPublished({ tenantId, eventDate });

  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc();
  const now = new Date();
  const doc = {
    requestId: ref.id,
    tenantId,
    eventDate,
    requestedByUid: uid,
    employeeNumber: officialEmployeeNumber,
    employeeName,
    expectedGuestCount,
    requestNote: requestNote || null,
    status: BBQ_TABLE_REQUEST_STATUS.PENDING,
    approvedByUid: null, approvedAt: null,
    returnedByUid: null, returnedAt: null, returnComments: null,
    rejectedByUid: null, rejectedAt: null, rejectionReason: null,
    confirmedByUid: null, confirmedAt: null,
    createdAt: now, updatedAt: now,
  };
  await ref.set(doc);
  return { requestId: ref.id, status: doc.status };
}

async function approveTableRequest({ requestId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.status !== BBQ_TABLE_REQUEST_STATUS.PENDING) {
    throw new Error(`Cannot approve request with status: ${data.status}`);
  }
  await ref.update({
    status: BBQ_TABLE_REQUEST_STATUS.APPROVED,
    approvedByUid: uid, approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.APPROVED };
}

async function returnTableRequest({ requestId, tenantId, uid, returnComments }) {
  if (!returnComments) throw new Error('returnComments is required when returning a table request.');
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.status !== BBQ_TABLE_REQUEST_STATUS.PENDING) {
    throw new Error(`Cannot return request with status: ${data.status}`);
  }
  await ref.update({
    status: BBQ_TABLE_REQUEST_STATUS.RETURNED,
    returnedByUid: uid, returnedAt: FieldValue.serverTimestamp(), returnComments,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.RETURNED, returnComments };
}

async function rejectTableRequest({ requestId, tenantId, uid, rejectionReason }) {
  if (!rejectionReason) throw new Error('rejectionReason is required when rejecting a table request.');
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.status !== BBQ_TABLE_REQUEST_STATUS.PENDING) {
    throw new Error(`Cannot reject request with status: ${data.status}`);
  }
  await ref.update({
    status: BBQ_TABLE_REQUEST_STATUS.REJECTED,
    rejectedByUid: uid, rejectedAt: FieldValue.serverTimestamp(), rejectionReason,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.REJECTED, rejectionReason };
}

async function resubmitTableRequest({ requestId, tenantId, uid, expectedGuestCount, requestNote }) {
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.requestedByUid !== uid) throw new Error('Only the original requester can resubmit this request.');
  if (data.status !== BBQ_TABLE_REQUEST_STATUS.RETURNED) {
    throw new Error(`Cannot resubmit request with status: ${data.status}`);
  }

  const updates = {
    status: BBQ_TABLE_REQUEST_STATUS.PENDING,
    returnedByUid: null, returnedAt: null, returnComments: null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (expectedGuestCount !== undefined) {
    if (!Number.isInteger(expectedGuestCount) || expectedGuestCount < 1) {
      throw new Error('expectedGuestCount must be a positive integer.');
    }
    updates.expectedGuestCount = expectedGuestCount;
  }
  if (requestNote !== undefined) updates.requestNote = requestNote || null;

  await ref.update(updates);
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.PENDING };
}

async function confirmTableRequest({ requestId, tenantId, uid }) {
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.status !== BBQ_TABLE_REQUEST_STATUS.APPROVED) {
    throw new Error(`Cannot confirm request with status: ${data.status}. Must be approved first.`);
  }
  await ref.update({
    status: BBQ_TABLE_REQUEST_STATUS.CONFIRMED,
    confirmedByUid: uid, confirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.CONFIRMED };
}

// ── uid + userRole passed so the route can allow "own request" OR "manager+" ──
async function cancelTableRequest({ requestId, tenantId, uid, userRole }) {
  const ref = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Table request not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');

  const isOwner = data.requestedByUid === uid;
  const isManagerPlus = ['manager', 'admin', 'super_admin'].includes(userRole);
  if (!isOwner && !isManagerPlus) {
    throw new Error('Only the requesting employee or a manager/admin can cancel this request.');
  }

  const cancellableStatuses = [
    BBQ_TABLE_REQUEST_STATUS.PENDING,
    BBQ_TABLE_REQUEST_STATUS.APPROVED,
    BBQ_TABLE_REQUEST_STATUS.RETURNED,
  ];
  if (!cancellableStatuses.includes(data.status)) {
    throw new Error(`Cannot cancel request with status: ${data.status}`);
  }

  await ref.update({
    status: BBQ_TABLE_REQUEST_STATUS.CANCELLED,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: BBQ_TABLE_REQUEST_STATUS.CANCELLED };
}

async function getTableRequests({ tenantId, eventDate, status }) {
  let q = db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS).where('tenantId', '==', tenantId);
  if (eventDate) q = q.where('eventDate', '==', eventDate);
  if (status) q = q.where('status', '==', status);
  const snap = await q.orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => _clean(d.data()));
}

async function getMyTableRequests({ tenantId, officialEmployeeNumber }) {
  const snap = await db.collection(COLLECTIONS.BBQ_TABLE_REQUESTS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => _clean(d.data()));
}

module.exports = {
  createTableRequest,
  approveTableRequest,
  returnTableRequest,
  rejectTableRequest,
  resubmitTableRequest,
  confirmTableRequest,
  cancelTableRequest,
  getTableRequests,
  getMyTableRequests,
};