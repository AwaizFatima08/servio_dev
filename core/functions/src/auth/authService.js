// ─────────────────────────────────────────
// authService.js — Identity & Registration Logic
// HomiLabs | Servio | Flow 01
// ─────────────────────────────────────────
const admin = require('firebase-admin');
const { COLLECTIONS, REGISTRATION_STATUS, FAILURE_REASONS, ACCOUNT_STATUS, ROLES, DEFAULT_VIEWS, ACCOUNT_TYPES } = require('../constants');
const { nowISO } = require('../utils');

const db = admin.firestore();
db.settings({ databaseId: 'servio-dev' });

// ── Helper: get Firestore server timestamp ──
const { FieldValue } = require('firebase-admin/firestore');
const ts = () => FieldValue.serverTimestamp();

// ─────────────────────────────────────────
// registerEmployee
// Called when a management employee signs up
// uid comes from Firebase Auth (already created on client)
// ─────────────────────────────────────────
const registerEmployee = async ({ uid, officialEmployeeNumber, cnicLast4, dateOfBirth, personalEmail, ipAddress }) => {

  // 1. Read deploymentConfig
  const configDoc = await db.collection(COLLECTIONS.DEPLOYMENT_CONFIG).doc('ffl').get();
  if (!configDoc.exists) {
    throw new Error('Deployment configuration not found');
  }
  const config = configDoc.data();

  // 2. Check prefix is allowed
  const prefix = officialEmployeeNumber.replace(/[0-9]/g, '');
  if (!config.allowedEmployeePrefixes.includes(prefix)) {
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_VALIDATION,
      failureReason: FAILURE_REASONS.EMPLOYEE_NOT_FOUND,
    });
    return { success: false, code: FAILURE_REASONS.EMPLOYEE_NOT_FOUND };
  }

  // 3. Look up employee record
  const employeeDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).get();
  if (!employeeDoc.exists) {
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_VALIDATION,
      failureReason: FAILURE_REASONS.EMPLOYEE_NOT_FOUND,
    });
    return { success: false, code: FAILURE_REASONS.EMPLOYEE_NOT_FOUND };
  }

  const employee = employeeDoc.data();

  // 4. Check employee is active
  if (!employee.isActive) {
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_INACTIVE,
      failureReason: FAILURE_REASONS.EMPLOYEE_INACTIVE,
    });
    return { success: false, code: FAILURE_REASONS.EMPLOYEE_INACTIVE };
  }

  // 5. Check throttle
  if (employee.isThrottled) {
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_THROTTLED,
      failureReason: FAILURE_REASONS.THROTTLE_EXCEEDED,
    });
    return { success: false, code: FAILURE_REASONS.THROTTLE_EXCEEDED };
  }

  // 6. Check not already registered
  const existingUser = await db.collection(COLLECTIONS.USERS)
  .where('officialEmployeeNumber', '==', officialEmployeeNumber)
  .limit(1)
  .get();

if (!existingUser.empty) {
  await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
    requestType: ACCOUNT_TYPES.SELF_SIGNUP,
    requestStatus: REGISTRATION_STATUS.FAILED_DUPLICATE,
    failureReason: FAILURE_REASONS.ACCOUNT_EXISTS,
  });
  return { success: false, code: FAILURE_REASONS.ACCOUNT_EXISTS };
}

// 6b. Check not already pending in registrationRequests
const existingRequest = await db.collection(COLLECTIONS.REGISTRATION_REQUESTS)
  .where('officialEmployeeNumber', '==', officialEmployeeNumber)
  .where('requestStatus', '==', REGISTRATION_STATUS.PENDING)
  .limit(1)
  .get();

if (!existingRequest.empty) {
  await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
    requestType: ACCOUNT_TYPES.SELF_SIGNUP,
    requestStatus: REGISTRATION_STATUS.FAILED_DUPLICATE,
    failureReason: FAILURE_REASONS.ACCOUNT_EXISTS,
  });
  return { success: false, code: FAILURE_REASONS.ACCOUNT_EXISTS };
}

  // 7. Validate cnicLast4
  if (employee.cnicLast4 !== cnicLast4) {
    await _incrementFailedAttempts(officialEmployeeNumber, employee);
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_VALIDATION,
      failureReason: FAILURE_REASONS.CNIC_MISMATCH,
    });
    return { success: false, code: FAILURE_REASONS.CNIC_MISMATCH };
  }

  // 8. Validate dateOfBirth
  if (employee.dateOfBirth !== dateOfBirth) {
    await _incrementFailedAttempts(officialEmployeeNumber, employee);
    await _logRequest({ officialEmployeeNumber, uid, personalEmail, ipAddress,
      requestType: ACCOUNT_TYPES.SELF_SIGNUP,
      requestStatus: REGISTRATION_STATUS.FAILED_VALIDATION,
      failureReason: FAILURE_REASONS.DOB_MISMATCH,
    });
    return { success: false, code: FAILURE_REASONS.DOB_MISMATCH };
  }

  // 9. All validations passed — create pending registration request
  const requestRef = db.collection(COLLECTIONS.REGISTRATION_REQUESTS).doc();
  await requestRef.set({
    requestId: requestRef.id,
    officialEmployeeNumber,
    tenantId: config.tenantId,
    requestType: ACCOUNT_TYPES.SELF_SIGNUP,
    requestStatus: REGISTRATION_STATUS.PENDING,
    failureReason: null,
    attemptedEmail: personalEmail,
    uid,
    ipAddress: ipAddress || null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  });

  // 10. Reset failed attempt count on successful validation
  await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).update({
    failedAttemptCount: 0,
    lastFailedAt: null,
    updatedAt: ts(),
  });

  return {
    success: true,
    requestId: requestRef.id,
    message: 'Registration submitted. Awaiting admin approval.',
  };
};

// ─────────────────────────────────────────
// approveRegistration
// Called by admin to approve a pending request
// Creates the users document
// ─────────────────────────────────────────
const approveRegistration = async ({ requestId, approvedByUid }) => {

  // 1. Get the registration request
  const requestDoc = await db.collection(COLLECTIONS.REGISTRATION_REQUESTS).doc(requestId).get();
  if (!requestDoc.exists) {
    return { success: false, message: 'Registration request not found' };
  }

  const request = requestDoc.data();

  if (request.requestStatus !== REGISTRATION_STATUS.PENDING) {
    return { success: false, message: `Request is already ${request.requestStatus}` };
  }

  // 2. Get employee record for fullName
  const employeeDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(request.officialEmployeeNumber).get();
  if (!employeeDoc.exists) {
    return { success: false, message: 'Employee record not found' };
  }
  const employee = employeeDoc.data();

  // 3. Create users document
  const usersRef = db.collection(COLLECTIONS.USERS).doc(request.uid);
  await usersRef.set({
    uid: request.uid,
    officialEmployeeNumber: request.officialEmployeeNumber,
    tenantId: request.tenantId,
    personalEmail: request.attemptedEmail,
    role: ROLES.EMPLOYEE,
    status: ACCOUNT_STATUS.ACTIVE,
    defaultView: DEFAULT_VIEWS.EMPLOYEE,
    accountType: ACCOUNT_TYPES.SELF_SIGNUP,
    lastLoginAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  });

  // 4. Update registration request to activated
  await db.collection(COLLECTIONS.REGISTRATION_REQUESTS).doc(requestId).update({
    requestStatus: REGISTRATION_STATUS.ACTIVATED,
    resolvedBy: approvedByUid,
    resolvedAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Account activated for ${employee.fullName}`,
    uid: request.uid,
    officialEmployeeNumber: request.officialEmployeeNumber,
  };
};

// ─────────────────────────────────────────
// getUserProfile
// Called on login — returns user + employee data
// ─────────────────────────────────────────
const getUserProfile = async (uid) => {

  // 1. Get users document
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    return { success: false, message: 'User account not found' };
  }

  const user = userDoc.data();

  if (user.status !== ACCOUNT_STATUS.ACTIVE) {
    return { success: false, message: `Account is ${user.status}` };
  }

  // 2. Get employee record
  const employeeDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(user.officialEmployeeNumber).get();
  const employee = employeeDoc.exists ? employeeDoc.data() : {};

  // 3. Update lastLoginAt
  await db.collection(COLLECTIONS.USERS).doc(uid).update({
    lastLoginAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    user: {
      uid: user.uid,
      officialEmployeeNumber: user.officialEmployeeNumber,
      role: user.role,
      status: user.status,
      defaultView: user.defaultView,
      tenantId: user.tenantId,
      personalEmail: user.personalEmail,
    },
    employee: {
      fullName: employee.fullName || '',
      designation: employee.designation || '',
      department: employee.department || '',
      grade: employee.grade || '',
      houseNumber: employee.houseNumber || '',
      residenceType: employee.residenceType || '',
      phoneNumber: employee.phoneNumber || '',
    },
  };
};

// ─────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────

const _logRequest = async ({ officialEmployeeNumber, uid, personalEmail, ipAddress, requestType, requestStatus, failureReason }) => {
  const ref = db.collection(COLLECTIONS.REGISTRATION_REQUESTS).doc();
  await ref.set({
    requestId: ref.id,
    officialEmployeeNumber,
    tenantId: 'ffl',
    requestType,
    requestStatus,
    failureReason: failureReason || null,
    attemptedEmail: personalEmail || null,
    uid: uid || null,
    ipAddress: ipAddress || null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  });
};

const _incrementFailedAttempts = async (officialEmployeeNumber, employee) => {
  const newCount = (employee.failedAttemptCount || 0) + 1;
  const updateData = {
    failedAttemptCount: newCount,
    lastFailedAt: ts(),
    updatedAt: ts(),
  };
  // Throttle after 5 failures
  if (newCount >= 5) {
    updateData.isThrottled = true;
  }
  await db.collection(COLLECTIONS.EMPLOYEES).doc(officialEmployeeNumber).update(updateData);
};

module.exports = { registerEmployee, approveRegistration, getUserProfile };