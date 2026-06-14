// ─────────────────────────────────────────
// employeeService.js — Employee Master Logic
// HomiLabs | Servio | Flow 02
// ─────────────────────────────────────────
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS, EMPLOYEE_TYPES, EMPLOYEE_PREFIXES } = require('../constants');

const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

const VALID_PREFIXES = Object.values(EMPLOYEE_PREFIXES);

const UPDATABLE_FIELDS = [
  'grade', 'designation', 'department', 'phoneNumber',
  'houseNumber', 'residenceType', 'cnicLast4', 'dateOfBirth',
];

const addEmployee = async ({ officialEmployeeNumber, fullName, cnicLast4, dateOfBirth, employeeType, createdByUid }) => {

  const prefix = officialEmployeeNumber.replace(/[0-9]/g, '');
  if (!VALID_PREFIXES.includes(prefix)) {
    return { success: false, message: `Invalid employee number prefix: ${prefix}` };
  }

  const existing = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();
  if (existing.exists) {
    return { success: false, message: `Employee ${officialEmployeeNumber} already exists` };
  }

  if (!Object.values(EMPLOYEE_TYPES).includes(employeeType)) {
    return { success: false, message: `Invalid employeeType: ${employeeType}` };
  }

  if (employeeType === EMPLOYEE_TYPES.MANAGEMENT) {
    if (!cnicLast4 || cnicLast4.length !== 4) {
      return { success: false, message: 'cnicLast4 must be a 4-digit string for management employees' };
    }
    if (!dateOfBirth) {
      return { success: false, message: 'dateOfBirth is required for management employees' };
    }
  }

  await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).set({
    officialEmployeeNumber,
    fullName,
    employeeType,
    cnicLast4: cnicLast4 || null,
    dateOfBirth: dateOfBirth || null,
    grade: null,
    designation: null,
    department: null,
    phoneNumber: null,
    houseNumber: null,
    residenceType: null,
    pendingGrade: null,
    pendingDesignation: null,
    pendingHouseNumber: null,
    pendingResidenceType: null,
    failedAttemptCount: 0,
    lastFailedAt: null,
    isThrottled: false,
    isActive: true,
    tenantId: 'ffl',
    createdAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Employee ${officialEmployeeNumber} added successfully`,
    officialEmployeeNumber,
  };
};

const getEmployees = async ({ search, employeeType, isActive }) => {

  const snapshot = await db.collection(COLLECTIONS.EMPLOYEES)
    .where('tenantId', '==', 'ffl')
    .get();

  let employees = snapshot.docs.map(doc => _sanitize(doc.data()));

  if (employeeType) {
    employees = employees.filter(e => e.employeeType === employeeType);
  }

  if (isActive !== undefined) {
    employees = employees.filter(e => e.isActive === isActive);
  }

  if (search) {
    const term = search.toLowerCase();
    employees = employees.filter(e =>
      e.officialEmployeeNumber.toLowerCase().includes(term) ||
      e.fullName.toLowerCase().includes(term) ||
      (e.department && e.department.toLowerCase().includes(term))
    );
  }

  return { success: true, count: employees.length, employees };
};

const getEmployee = async (officialEmployeeNumber) => {

  const doc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();

  if (!doc.exists) {
    return { success: false, message: `Employee ${officialEmployeeNumber} not found` };
  }

  return { success: true, employee: _sanitize(doc.data()) };
};

const setEmployeeStatus = async ({ officialEmployeeNumber, isActive, updatedByUid }) => {

  const empRef = db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber);
  const doc = await empRef.get();

  if (!doc.exists) {
    return { success: false, message: `Employee ${officialEmployeeNumber} not found` };
  }

  // V1.1: employee status + family cascade committed together in ONE batch,
  // so we never land in a split state (employee toggled but family not).
  const batch = db.batch();
  const stamp = ts();

  batch.update(empRef, { isActive, updatedAt: stamp });

  // On DEACTIVATION, cascade-deactivate all active family members.
  // On reactivation we deliberately do NOT auto-restore them — the employee
  // reviews and restores manually (scope decision).
  //
  // Query is two-equality only (tenantId + officialEmployeeNumber) to avoid
  // needing a composite index; the isActive check is done in memory.
  let cascadedCount = 0;
  if (isActive === false) {
    const famSnap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
      .where('tenantId', '==', 'ffl')
      .where('officialEmployeeNumber', '==', officialEmployeeNumber)
      .get();

    const activeMembers = famSnap.docs.filter(d => d.data().isActive === true);
    activeMembers.forEach(d => batch.update(d.ref, { isActive: false, updatedAt: stamp }));
    cascadedCount = activeMembers.length;
  }

  await batch.commit();

  return {
    success: true,
    message: `Employee ${officialEmployeeNumber} ${isActive ? 'activated' : 'deactivated'}`,
    officialEmployeeNumber,
    isActive,
    familyMembersDeactivated: cascadedCount,
  };
};

const updateEmployeeFields = async ({ officialEmployeeNumber, updates, updatedByUid }) => {

  const doc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();

  if (!doc.exists) {
    return { success: false, message: `Employee ${officialEmployeeNumber} not found` };
  }

  // Only allow whitelisted fields — never allow isActive, tenantId, etc.
  const safeUpdates = {};
  for (const field of UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, message: 'No valid fields to update' };
  }

  safeUpdates.updatedAt = ts();

  await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).update(safeUpdates);

  // Return the updated record with admin fields visible
  const updated = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();

  return {
    success: true,
    message: `Employee ${officialEmployeeNumber} updated successfully`,
    officialEmployeeNumber,
    employee: _sanitizeAdmin(updated.data()),
  };
};

const _toISO = (ts) => {
  if (!ts) return null;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return ts;
};

// Standard sanitize — strips sensitive fields for general use
const _sanitize = (data) => {
  const { cnicLast4, dateOfBirth, failedAttemptCount, lastFailedAt, isThrottled, ...safe } = data;
  safe.createdAt = _toISO(safe.createdAt);
  safe.updatedAt = _toISO(safe.updatedAt);
  return safe;
};

// Admin sanitize — keeps cnicLast4 and dateOfBirth for admin edit panel
const _sanitizeAdmin = (data) => {
  const { failedAttemptCount, lastFailedAt, isThrottled, ...safe } = data;
  safe.createdAt = _toISO(safe.createdAt);
  safe.updatedAt = _toISO(safe.updatedAt);
  return safe;
};

module.exports = { addEmployee, getEmployees, getEmployee, setEmployeeStatus, updateEmployeeFields };