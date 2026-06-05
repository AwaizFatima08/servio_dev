// ─────────────────────────────────────────────────────────────────────────────
// profileService.js — Employee Profile Logic
// HomiLabs | Servio
//
// FILE LOCATION: functions/src/profile/profileService.js
//
// Three operations:
//   1. getMyProfile       — read own employee + user data
//   2. updateMyProfile    — submit a pending change (grade, designation, house)
//                           + apply phoneNumber and displayName immediately
//   3. getPendingChange   — admin reads what change is waiting for approval
// ─────────────────────────────────────────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS } = require('../constants');

// ─────────────────────────────────────────────────────────────────────────────
// getMyProfile
// Returns merged data from users + employees collections for the current user
// Used by: Screen 18 — My Profile (display)
// ─────────────────────────────────────────────────────────────────────────────
async function getMyProfile({ uid, tenantId }) {
  // 1. Get users document
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User account not found');
  }
  const user = userDoc.data();

  // 2. Get employees document
  const empDoc = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(user.officialEmployeeNumber)
    .get();

  const emp = empDoc.exists ? empDoc.data() : {};

  return {
    // From users
    uid: user.uid,
    officialEmployeeNumber: user.officialEmployeeNumber,
    personalEmail: user.personalEmail,
    role: user.role,
    status: user.status,
    defaultView: user.defaultView,
    displayName: user.displayName || '',   // Bug 18 fix: read from users doc
    // From employees
    fullName: emp.fullName || '',
    grade: emp.grade || '',
    designation: emp.designation || '',
    department: emp.department || '',
    houseNumber: emp.houseNumber || '',
    residenceType: emp.residenceType || '',
    phoneNumber: emp.phoneNumber || '',
    employeeType: emp.employeeType || '',
    // Pending changes (null if nothing pending)
    pendingGrade: emp.pendingGrade || null,
    pendingDesignation: emp.pendingDesignation || null,
    pendingHouseNumber: emp.pendingHouseNumber || null,
    pendingResidenceType: emp.pendingResidenceType || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateMyProfile
// Employee submits a change to their profile fields
// Fields allowed to change: grade, designation, houseNumber, residenceType,
//                           phoneNumber, displayName
// HR fields (grade, designation, houseNumber, residenceType) go to pending
// phoneNumber and displayName are applied directly (no approval needed)
//
// Bug 18a fix: displayName is written to the USERS collection (not employees)
//              phoneNumber is written to EMPLOYEES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
async function updateMyProfile({ uid, tenantId, updates }) {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User account not found');
  }
  const { officialEmployeeNumber } = userDoc.data();

  const empRef = db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber);
  const empDoc = await empRef.get();
  if (!empDoc.exists) {
    throw new Error('Employee record not found');
  }

  // Employee record updates (pending fields + phoneNumber)
  const empUpdateData = { updatedAt: FieldValue.serverTimestamp() };
  const pendingFields = ['grade', 'designation', 'houseNumber', 'residenceType'];

  // Pending fields — stored as pendingGrade, pendingDesignation etc.
  for (const field of pendingFields) {
    if (updates[field] !== undefined && updates[field] !== null && updates[field] !== '') {
      const pendingKey = `pending${field.charAt(0).toUpperCase()}${field.slice(1)}`;
      empUpdateData[pendingKey] = updates[field];
    }
  }

  // phoneNumber — applied directly to employees doc
  if (updates.phoneNumber !== undefined && updates.phoneNumber !== '') {
    empUpdateData.phoneNumber = updates.phoneNumber;
  }

  // Users record updates (displayName only)
  const userUpdateData = {};

  // Bug 18a fix: displayName lives on the users doc, not employees
  if (updates.displayName !== undefined) {
    userUpdateData.displayName = updates.displayName.trim();
    userUpdateData.updatedAt = FieldValue.serverTimestamp();
  }

  // Check something is actually being changed
  const empChanges = Object.keys(empUpdateData).length > 1; // more than just updatedAt
  const userChanges = Object.keys(userUpdateData).length > 0;

  if (!empChanges && !userChanges) {
    throw new Error('No valid fields to update');
  }

  // Write both in parallel
  const writes = [];
  if (empChanges) writes.push(empRef.update(empUpdateData));
  if (userChanges) writes.push(db.collection(COLLECTIONS.USERS).doc(uid).update(userUpdateData));
  await Promise.all(writes);

  return {
    officialEmployeeNumber,
    message: 'Profile update submitted. Fields requiring approval are pending admin review.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingChange
// Returns the pending profile fields for a given employee (for admin review)
// Used by: Screen 13 — User Management (profile change review)
// ─────────────────────────────────────────────────────────────────────────────
async function getPendingChange({ officialEmployeeNumber, tenantId }) {
  const empDoc = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(officialEmployeeNumber)
    .get();

  if (!empDoc.exists) {
    throw new Error('Employee record not found');
  }

  const emp = empDoc.data();

  // Return current + pending side by side so admin can compare
  return {
    officialEmployeeNumber,
    fullName: emp.fullName || '',
    current: {
      grade: emp.grade || null,
      designation: emp.designation || null,
      houseNumber: emp.houseNumber || null,
      residenceType: emp.residenceType || null,
    },
    pending: {
      grade: emp.pendingGrade || null,
      designation: emp.pendingDesignation || null,
      houseNumber: emp.pendingHouseNumber || null,
      residenceType: emp.pendingResidenceType || null,
    },
    hasPendingChanges: !!(
      emp.pendingGrade ||
      emp.pendingDesignation ||
      emp.pendingHouseNumber ||
      emp.pendingResidenceType
    ),
  };
}

module.exports = { getMyProfile, updateMyProfile, getPendingChange };
