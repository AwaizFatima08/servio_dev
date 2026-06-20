// ─────────────────────────────────────────
// maritalStatusService.js — Marital Status Logic
// HomiLabs | Servio | V1 Extension V1.1
//
// FILE LOCATION: functions/src/family/maritalStatusService.js
//
// SLICE 3a (19-Jun-2026): simplified model.
//   - Vocabulary expanded to 4 values: single / married / divorced / widowed.
//   - Employee changes status directly. No admin approval. No pending state.
//   - No cascade. Spouse deactivation happens on the family page if/when
//     the employee chooses; marital status is a personal label.
//   - listPendingMaritalChanges / approveMaritalChange / rejectMaritalChange
//     remain in the file but are now PARKED — no UI route reaches them.
//     Retained for possible future admin tooling. Do not delete without
//     also removing the corresponding routes in familyRoutes.js.
//
// tenantId-scoped throughout. new Date() timestamps (Rule #11).
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS, MARITAL_STATUS } = require('../constants');

const now = () => new Date();

async function _resolveEmployeeNumber(uid) {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) throw new Error('User account not found');
  const { officialEmployeeNumber } = userDoc.data();
  if (!officialEmployeeNumber) throw new Error('No employee number linked to this account');
  return officialEmployeeNumber;
}

// ─────────────────────────────────────────
// getMyMaritalStatus
// Returns current + pending marital status for the caller.
// ─────────────────────────────────────────
async function getMyMaritalStatus({ uid }) {
  const officialEmployeeNumber = await _resolveEmployeeNumber(uid);
  const empDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();
  if (!empDoc.exists) throw new Error('Employee record not found');
  const emp = empDoc.data();
  return {
    officialEmployeeNumber,
    maritalStatus: emp.maritalStatus || null,
    pendingMaritalStatus: emp.pendingMaritalStatus || null,
  };
}

// ─────────────────────────────────────────
// setMyMaritalStatus
// Employee self-declares marital status. Any of the four values may be set
// from any current state. No admin approval. No pending state. No cascade
// onto family members — the employee manages spouse deactivation separately
// on the family page.
//
// Defensive: clears pendingMaritalStatus on every write, in case the field
// was set by an older (pre-Slice 3a) flow.
// ─────────────────────────────────────────
async function setMyMaritalStatus({ uid, maritalStatus }) {
  const valid = Object.values(MARITAL_STATUS);
  if (!maritalStatus || !valid.includes(maritalStatus)) {
    throw new Error(`maritalStatus must be one of: ${valid.join(', ')}`);
  }

  const officialEmployeeNumber = await _resolveEmployeeNumber(uid);
  const ref = db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Employee record not found');
  const emp = doc.data();
  const current = emp.maritalStatus || null;

  if (current === maritalStatus) {
    throw new Error(`Marital status is already ${maritalStatus}`);
  }

  await ref.update({
    maritalStatus,
    pendingMaritalStatus: null,
    updatedAt: now(),
  });

  return {
    message: `Marital status updated to ${maritalStatus}`,
    maritalStatus,
    // Kept in the response for backward compatibility with the Slice 1 web
    // service which still reads this field. Always false going forward.
    pending: false,
  };
}

// ═════════════════════════════════════════
// PARKED — Admin marital approval flow (Slice 3a)
// ═════════════════════════════════════════
// These three functions remain deployed but are not reachable from any UI
// route in the simplified Slice 3a model (employee declares marital status
// directly; no pending state; no admin approval). They are retained for
// possible future admin tooling (e.g. correcting a misclicked status on
// behalf of an employee). Same parking pattern as the family deletion flow.
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// ADMIN — listPendingMaritalChanges  [PARKED]
// Lists employees with a pendingMaritalStatus for the tenant.
// ─────────────────────────────────────────
async function listPendingMaritalChanges({ tenantId }) {
  const snap = await db.collection(COLLECTIONS.EMPLOYEES)
    .where('tenantId', '==', tenantId)
    .where('pendingMaritalStatus', '==', MARITAL_STATUS.SINGLE)
    .get();

  const pending = snap.docs.map(d => {
    const e = d.data();
    return {
      officialEmployeeNumber: e.officialEmployeeNumber,
      fullName: e.fullName || '',
      currentMaritalStatus: e.maritalStatus || null,
      pendingMaritalStatus: e.pendingMaritalStatus,
    };
  });
  return { count: pending.length, pending };
}

// ─────────────────────────────────────────
// ADMIN — approveMaritalChange  [PARKED]
// Approves married → single. Applies status and auto-deactivates ALL active
// family members for that employee (single batch).
// ─────────────────────────────────────────
async function approveMaritalChange({ tenantId, officialEmployeeNumber }) {
  const ref = db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Employee record not found');
  const emp = doc.data();
  if (emp.tenantId !== tenantId) throw new Error('Employee record not found');
  if (emp.pendingMaritalStatus !== MARITAL_STATUS.SINGLE) {
    throw new Error('No pending marital change for this employee');
  }

  const batch = db.batch();
  const ts = now();

  batch.update(ref, {
    maritalStatus: MARITAL_STATUS.SINGLE,
    pendingMaritalStatus: null,
    updatedAt: ts,
  });

  // Auto-deactivate all active family members.
  const famSnap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
    .where('tenantId', '==', tenantId)
    .where('officialEmployeeNumber', '==', officialEmployeeNumber)
    .where('isActive', '==', true)
    .get();

  famSnap.docs.forEach(d => batch.update(d.ref, { isActive: false, updatedAt: ts }));

  await batch.commit();

  return {
    message: 'Marital change approved. Family members deactivated.',
    officialEmployeeNumber,
    deactivatedCount: famSnap.size,
  };
}

// ─────────────────────────────────────────
// ADMIN — rejectMaritalChange  [PARKED]
// Clears the pending change; current married status stays in force.
// ─────────────────────────────────────────
async function rejectMaritalChange({ tenantId, officialEmployeeNumber }) {
  const ref = db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Employee record not found');
  const emp = doc.data();
  if (emp.tenantId !== tenantId) throw new Error('Employee record not found');
  if (emp.pendingMaritalStatus !== MARITAL_STATUS.SINGLE) {
    throw new Error('No pending marital change for this employee');
  }

  await ref.update({ pendingMaritalStatus: null, updatedAt: now() });
  return { message: 'Marital change rejected. Status remains married.', officialEmployeeNumber };
}

module.exports = {
  getMyMaritalStatus,
  setMyMaritalStatus,
  listPendingMaritalChanges,
  approveMaritalChange,
  rejectMaritalChange,
};