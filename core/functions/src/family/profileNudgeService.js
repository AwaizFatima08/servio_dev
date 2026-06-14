// ─────────────────────────────────────────
// profileNudgeService.js — Profile Completion Banner Logic
// HomiLabs | Servio | V1 Extension V1.1
//
// FILE LOCATION: functions/src/family/profileNudgeService.js
//
// Drives the smart home-screen banner (NOT a bell notification).
// Checks four conditions:
//   1. displayName filled        (users doc)
//   2. phoneNumber filled        (employees doc)
//   3. maritalStatus set         (employees doc)
//   4. if married — at least one ACTIVE family member exists
//
// Banner shows while any applicable condition is unmet; clears automatically
// once all applicable conditions are met. tenantId-scoped.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS, MARITAL_STATUS } = require('../constants');

const _filled = (v) => typeof v === 'string' && v.trim().length > 0;

// ─────────────────────────────────────────
// getProfileCompletion
// Returns per-condition booleans + an overall complete flag the UI uses to
// decide whether to render the banner.
// ─────────────────────────────────────────
async function getProfileCompletion({ uid, tenantId }) {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) throw new Error('User account not found');
  const user = userDoc.data();
  const officialEmployeeNumber = user.officialEmployeeNumber;

  const empDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();
  const emp = empDoc.exists ? empDoc.data() : {};

  const hasDisplayName = _filled(user.displayName);
  const hasPhoneNumber = _filled(emp.phoneNumber);
  const hasMaritalStatus = _filled(emp.maritalStatus);
  const isMarried = emp.maritalStatus === MARITAL_STATUS.MARRIED;

  // Condition 4 only applies when married.
  let hasActiveFamilyMember = true; // default true when not applicable
  if (isMarried) {
    const famSnap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
      .where('tenantId', '==', tenantId)
      .where('officialEmployeeNumber', '==', officialEmployeeNumber)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    hasActiveFamilyMember = !famSnap.empty;
  }

  const conditions = {
    displayName: hasDisplayName,
    phoneNumber: hasPhoneNumber,
    maritalStatus: hasMaritalStatus,
    activeFamilyMember: hasActiveFamilyMember, // true when not married (n/a)
  };

  const isComplete =
    hasDisplayName && hasPhoneNumber && hasMaritalStatus && hasActiveFamilyMember;

  return {
    officialEmployeeNumber,
    isComplete,
    showBanner: !isComplete,
    conditions,
    familyConditionApplicable: isMarried,
  };
}

module.exports = { getProfileCompletion };
