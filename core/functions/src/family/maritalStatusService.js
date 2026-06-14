// ─────────────────────────────────────────
// maritalStatusService.js — Marital Status Logic
// HomiLabs | Servio | V1 Extension V1.1
//
// FILE LOCATION: functions/src/family/maritalStatusService.js
//
// maritalStatus lives on the employees document.
//   single → married : employee changes freely, immediate effect.
//   married → single : pending model. Admin approval required. Family members
//                      remain accessible during the pending period. On admin
//                      approval, all active family members auto-deactivate.
//
// The "My Family" tab is hidden in the UI until married status is declared;
// that gating is a frontend concern driven by the maritalStatus this service
// returns. tenantId-scoped throughout. new Date() timestamps (Rule #11).
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
// single → married : applied immediately.
// married → single : stored as pendingMaritalStatus, awaits admin approval.
// Same value as current : no-op error.
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

  // single (or unset) → married : immediate.
  if (maritalStatus === MARITAL_STATUS.MARRIED) {
    await ref.update({
      maritalStatus: MARITAL_STATUS.MARRIED,
      pendingMaritalStatus: null,
      updatedAt: now(),
    });
    return {
      message: 'Marital status updated to married',
      maritalStatus: MARITAL_STATUS.MARRIED,
      pending: false,
    };
  }

  // married → single : pending admin approval.
  if (maritalStatus === MARITAL_STATUS.SINGLE) {
    if (current !== MARITAL_STATUS.MARRIED) {
      // No married state to step down from.
      await ref.update({ maritalStatus: MARITAL_STATUS.SINGLE, pendingMaritalStatus: null, updatedAt: now() });
      return { message: 'Marital status set to single', maritalStatus: MARITAL_STATUS.SINGLE, pending: false };
    }
    if (emp.pendingMaritalStatus === MARITAL_STATUS.SINGLE) {
      throw new Error('A change to single is already pending admin approval');
    }
    await ref.update({ pendingMaritalStatus: MARITAL_STATUS.SINGLE, updatedAt: now() });
    return {
      message: 'Change to single submitted. Pending admin approval. Family members remain accessible until approved.',
      maritalStatus: current,
      pending: true,
    };
  }

  throw new Error('Unsupported marital status transition');
}

// ─────────────────────────────────────────
// ADMIN — listPendingMaritalChanges
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
// ADMIN — approveMaritalChange
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
// ADMIN — rejectMaritalChange
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
