// core/functions/src/mess/messReservationService.js

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS, NOTIFICATION_TARGET_TYPES, NOTIFICATION_LAYERS } = require('../constants');

// Bug 3 fix: wire in notification service
const { createNotification } = require('../notifications/notificationService');

// ── pktDateStr ──
// Returns today's date as YYYY-MM-DD in PKT (UTC+5).
function pktDateStr(date) {
  const pkt = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  return (
    pkt.getFullYear() +
    '-' + String(pkt.getMonth() + 1).padStart(2, '0') +
    '-' + String(pkt.getDate()).padStart(2, '0')
  );
}

// ── createSelfBooking ──
async function createSelfBooking({
  uid,
  officialEmployeeNumber,
  tenantId,
  reservationDate,
  mealType,
  menuItemId,
  menuOptionKey,
  optionLabel,
  itemName,
  diningMode,
  selectionMode,
  quantity,
}) {

  // --- 1. Read reservationSettings ---
  const settingsDoc = await db
    .collection(COLLECTIONS.RESERVATION_SETTINGS)
    .doc(tenantId)
    .get();

  if (!settingsDoc.exists) {
    throw new Error('Reservation settings not found for tenant.');
  }
  const settings = settingsDoc.data();

  // --- 2. Validate reservation date ---
  const todayStr = pktDateStr(new Date());

  if (reservationDate < todayStr) {
    throw new Error('Cannot book for a past date.');
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays);
  const maxDateStr = pktDateStr(maxDate);

  if (reservationDate > maxDateStr) {
    throw new Error(`Booking window is ${settings.bookingWindowDays} days. Cannot book this far ahead.`);
  }

  // --- 3. Check cutoff ---
  const mealTypeDoc = await db
    .collection(COLLECTIONS.MEAL_TYPES)
    .doc(mealType)
    .get();

  if (!mealTypeDoc.exists) {
    throw new Error(`Meal type not found: ${mealType}`);
  }

  const mealTypeData = mealTypeDoc.data();

  if (!mealTypeData.isActive || !mealTypeData.isBookable) {
    throw new Error(`Meal type ${mealType} is not available for booking.`);
  }

  if (reservationDate === todayStr) {
    const cutoffBreached = isCutoffBreached(
      mealTypeData.serviceWindowStart,
      settings.cutoffHoursBeforeMeal
    );
    if (cutoffBreached) {
      throw new Error(
        `Booking cutoff has passed for ${mealType}. Cutoff is ${settings.cutoffHoursBeforeMeal} hours before meal start.`
      );
    }
  }

  // --- 4. Validate menu selection against dailyMenus ---
  const dailyMenuDocId = `${tenantId}_${reservationDate}_${mealType}`;
  const dailyMenuDoc = await db
    .collection(COLLECTIONS.DAILY_MENUS)
    .doc(dailyMenuDocId)
    .get();

  if (!dailyMenuDoc.exists) {
    throw new Error(`No menu available for ${reservationDate} ${mealType}. Menu may not have been generated yet.`);
  }

  const dailyMenu = dailyMenuDoc.data();

  const comboExists = dailyMenu.combos.some(c => c.menuOptionKey === menuOptionKey);
  if (selectionMode === 'combo' && !comboExists) {
    throw new Error(`Selected option ${menuOptionKey} does not exist in today's menu.`);
  }

  // --- 5. Check for duplicate booking ---
  const duplicateCheck = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .where('reservationDate', '==', reservationDate)
    .where('mealType', '==', mealType)
    .where('menuOptionKey', '==', menuOptionKey)
    .where('reservationStatus', '==', 'active')
    .where('subjectType', '==', 'self')
    .limit(1)
    .get();

  if (!duplicateCheck.empty) {
    const existingId = duplicateCheck.docs[0].data().reservationId;
    const err = new Error(`You already have an active booking for ${menuOptionKey} on ${reservationDate} ${mealType}. Cancel it first if you want to change the quantity.`);
    err.existingReservationId = existingId;
    throw err;
  }

  // --- 6. Fetch employee name ---
  const employeeDoc = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(officialEmployeeNumber)
    .get();

  if (!employeeDoc.exists) {
    throw new Error(`Employee record not found: ${officialEmployeeNumber}`);
  }
  const employeeData = employeeDoc.data();

  // --- 7. Build menuSnapshot ---
  const selectedCombo = dailyMenu.combos.find(c => c.menuOptionKey === menuOptionKey) || null;
  const menuSnapshot = selectedCombo ? {
    comboId: selectedCombo.comboId,
    comboName: selectedCombo.comboName,
    displayLabel: selectedCombo.displayLabel,
    menuOptionKey: selectedCombo.menuOptionKey,
  } : null;

  // --- 8. Build rateTargetKey ---
  const rateTargetKey = `${reservationDate}_${mealType}_${menuOptionKey}`;

  // --- 9. Build bookingGroupId ---
  const bookingGroupId = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc().id;

  // --- 10. Write reservation document ---
  const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
  const reservationId = reservationRef.id;

  const reservationDoc = {
    reservationId,
    bookingGroupId,
    tenantId,
    createdByUid: uid,
    createdByRole: 'employee',
    createdByEmployeeNumber: officialEmployeeNumber,
    bookingSource: 'self',
    subjectType: 'self',
    employeeNumber: officialEmployeeNumber,
    employeeName: employeeData.fullName,
    guestName: null,
    quantity: quantity || 1,
    reservationDate,
    mealType,
    menuItemId,
    itemName,
    menuOptionKey,
    optionLabel,
    diningMode,
    selectionMode,
    billingDestination: 'employee_account',
    costCentreCode: null,
    rateTargetKey,
    unitRate: null,
    amount: null,
    rateStatus: 'pending',
    rateAppliedAt: null,
    reservationStatus: 'active',
    issueStatus: 'pending',
    feedbackStatus: 'pending',
    cutoffWaived: false,
    overrideReason: null,
    overrideByUid: null,
    proxyOverrideUsed: false,
    isSpecialMeal: false,
    allowAnyMenuItem: false,
    issuedAt: null,
    issuedByUid: null,
    issuedByRole: null,
    cancelledAt: null,
    cancelledByUid: null,
    cancelledByRole: null,
    cancellationReason: null,
    cancellationNote: null,
    feedbackSubmittedAt: null,
    menuSnapshot,
    isVisible: true,
    remarks: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reservationRef.set(reservationDoc);

  // --- 11. Bug 3 fix: Notify employee of confirmed booking (fire-and-forget) ---
  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
  const comboLabel = menuSnapshot?.comboName || itemName || menuOptionKey;
  createNotification({
    tenantId,
    createdByUid: uid,
    createdByName: employeeData.fullName,
    notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
    notificationType: 'booking_confirmed',
    triggerSource: 'self_booking',
    title: 'Meal Booked',
    body: `Your ${mealLabel} booking (${comboLabel}) for ${reservationDate} has been confirmed.`,
    targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
    targetUserUids: [uid],
    contextType: 'reservation',
    contextId: reservationId,
  }).catch(err => console.error('[Notification] booking_confirmed failed:', err));

  return {
    reservationId,
    bookingGroupId,
    rateTargetKey,
    reservationDate,
    mealType,
    itemName,
    menuOptionKey,
    diningMode,
    quantity: quantity || 1,
  };
}

// ── createProxyBooking ──
async function createProxyBooking({
  uid,
  createdByRole,
  createdByEmployeeNumber,
  tenantId,
  targetEmployeeNumber,
  reservationDate,
  mealType,
  menuItemId,
  menuOptionKey,
  optionLabel,
  itemName,
  diningMode,
  selectionMode,
  quantity,
}) {

  // --- 1. Read reservationSettings ---
  const settingsDoc = await db
    .collection(COLLECTIONS.RESERVATION_SETTINGS)
    .doc(tenantId)
    .get();

  if (!settingsDoc.exists) {
    throw new Error('Reservation settings not found for tenant.');
  }
  const settings = settingsDoc.data();

  if (!settings.allowProxyBooking) {
    throw new Error('Proxy booking is not enabled for this tenant.');
  }

  // --- 2. Validate reservation date ---
  const todayStr = pktDateStr(new Date());

  if (reservationDate < todayStr) {
    throw new Error('Cannot book for a past date.');
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays);
  const maxDateStr = pktDateStr(maxDate);

  if (reservationDate > maxDateStr) {
    throw new Error(`Booking window is ${settings.bookingWindowDays} days. Cannot book this far ahead.`);
  }

  // --- 3. Validate meal type ---
  const mealTypeDoc = await db
    .collection(COLLECTIONS.MEAL_TYPES)
    .doc(mealType)
    .get();

  if (!mealTypeDoc.exists) {
    throw new Error(`Meal type not found: ${mealType}`);
  }

  const mealTypeData = mealTypeDoc.data();

  if (!mealTypeData.isActive || !mealTypeData.isBookable) {
    throw new Error(`Meal type ${mealType} is not available for booking.`);
  }

  // No cutoff check for proxy bookings — supervisor/manager/admin exempt

  // --- 4. Validate target employee ---
  const targetEmployeeDoc = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(targetEmployeeNumber)
    .get();

  if (!targetEmployeeDoc.exists) {
    throw new Error(`Employee not found: ${targetEmployeeNumber}`);
  }

  const targetEmployee = targetEmployeeDoc.data();

  if (targetEmployee.tenantId !== tenantId) {
    throw new Error('Employee does not belong to this tenant.');
  }

  if (!targetEmployee.isActive) {
    throw new Error(`Employee ${targetEmployeeNumber} is inactive.`);
  }

  // --- 5. Validate menu selection against dailyMenus ---
  const dailyMenuDocId = `${tenantId}_${reservationDate}_${mealType}`;
  const dailyMenuDoc = await db
    .collection(COLLECTIONS.DAILY_MENUS)
    .doc(dailyMenuDocId)
    .get();

  if (!dailyMenuDoc.exists) {
    throw new Error(`No menu available for ${reservationDate} ${mealType}.`);
  }

  const dailyMenu = dailyMenuDoc.data();

  const comboExists = dailyMenu.combos.some(c => c.menuOptionKey === menuOptionKey);
  if (selectionMode === 'combo' && !comboExists) {
    throw new Error(`Selected option ${menuOptionKey} does not exist in menu for ${reservationDate}.`);
  }

  // --- 6. Check for duplicate booking ---
  const duplicateCheck = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', targetEmployeeNumber)
    .where('reservationDate', '==', reservationDate)
    .where('mealType', '==', mealType)
    .where('menuOptionKey', '==', menuOptionKey)
    .where('reservationStatus', '==', 'active')
    .where('subjectType', '==', 'self')
    .limit(1)
    .get();

  if (!duplicateCheck.empty) {
    throw new Error(`Employee ${targetEmployeeNumber} already has an active booking for ${menuOptionKey} on ${reservationDate} ${mealType}.`);
  }

  // --- 7. Build menuSnapshot ---
  const selectedCombo = dailyMenu.combos.find(c => c.menuOptionKey === menuOptionKey) || null;
  const menuSnapshot = selectedCombo ? {
    comboId: selectedCombo.comboId,
    comboName: selectedCombo.comboName,
    displayLabel: selectedCombo.displayLabel,
    menuOptionKey: selectedCombo.menuOptionKey,
  } : null;

  // --- 8. Build rateTargetKey ---
  const rateTargetKey = `${reservationDate}_${mealType}_${menuOptionKey}`;

  // --- 9. Build bookingGroupId ---
  const bookingGroupId = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc().id;

  // --- 10. Write reservation document ---
  const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
  const reservationId = reservationRef.id;

  const reservationDoc = {
    reservationId,
    bookingGroupId,
    tenantId,
    createdByUid: uid,
    createdByRole,
    createdByEmployeeNumber,
    bookingSource: 'proxy',
    subjectType: 'self',
    employeeNumber: targetEmployeeNumber,
    employeeName: targetEmployee.fullName,
    guestName: null,
    quantity: quantity || 1,
    reservationDate,
    mealType,
    menuItemId,
    itemName,
    menuOptionKey,
    optionLabel,
    diningMode,
    selectionMode,
    billingDestination: 'employee_account',
    costCentreCode: null,
    rateTargetKey,
    unitRate: null,
    amount: null,
    rateStatus: 'pending',
    rateAppliedAt: null,
    reservationStatus: 'active',
    issueStatus: 'pending',
    feedbackStatus: 'pending',
    cutoffWaived: false,
    overrideReason: null,
    overrideByUid: null,
    proxyOverrideUsed: true,
    isSpecialMeal: false,
    allowAnyMenuItem: false,
    issuedAt: null,
    issuedByUid: null,
    issuedByRole: null,
    cancelledAt: null,
    cancelledByUid: null,
    cancelledByRole: null,
    cancellationReason: null,
    cancellationNote: null,
    feedbackSubmittedAt: null,
    menuSnapshot,
    isVisible: true,
    remarks: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reservationRef.set(reservationDoc);

  // --- 11. Bug 3 fix: Notify target employee of proxy booking (fire-and-forget) ---
  // Look up target employee's uid from users collection
  const targetUserSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('tenantId', '==', tenantId)
    .where('officialEmployeeNumber', '==', targetEmployeeNumber)
    .limit(1)
    .get();

  if (!targetUserSnap.empty) {
    const targetUid = targetUserSnap.docs[0].data().uid;
    const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    const comboLabel = menuSnapshot?.comboName || itemName || menuOptionKey;
    createNotification({
      tenantId,
      createdByUid: uid,
      createdByName: null,
      notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
      notificationType: 'proxy_booking_confirmed',
      triggerSource: 'proxy_booking',
      title: 'Meal Booked on Your Behalf',
      body: `A ${mealLabel} booking (${comboLabel}) for ${reservationDate} was made for you by the supervisor.`,
      targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
      targetUserUids: [targetUid],
      contextType: 'reservation',
      contextId: reservationId,
    }).catch(err => console.error('[Notification] proxy_booking_confirmed failed:', err));
  }

  return {
    reservationId,
    bookingGroupId,
    rateTargetKey,
    reservationDate,
    mealType,
    itemName,
    menuOptionKey,
    diningMode,
    quantity: quantity || 1,
    bookedFor: targetEmployeeNumber,
    bookedByRole: createdByRole,
  };
}

// ── cancelReservation ──
async function cancelReservation({
  reservationId,
  tenantId,
  cancelledByUid,
  cancelledByRole,
  cancelledByEmployeeNumber,
  cancellationReason,
  cancellationNote,
}) {

  const validReasons = [
    'employee_request',
    'employee_absent',
    'official_duty',
    'medical',
    'data_correction',
    'other',
  ];

  if (!validReasons.includes(cancellationReason)) {
    throw new Error(`Invalid cancellationReason. Valid values: ${validReasons.join(', ')}`);
  }

  if (cancellationReason === 'other' && !cancellationNote) {
    throw new Error('cancellationNote is required when cancellationReason is "other".');
  }

  const ref = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error('Reservation not found.');
  }

  const data = doc.data();

  if (data.tenantId !== tenantId) {
    throw new Error('Access denied.');
  }

  if (data.reservationStatus !== 'active') {
    throw new Error('Reservation is already cancelled.');
  }

  if (data.issueStatus === 'issued') {
    throw new Error('Cannot cancel a reservation that has already been issued.');
  }

  const isSupervisorOrAbove = ['mess_supervisor', 'manager', 'admin', 'super_admin']
    .includes(cancelledByRole);

  if (!isSupervisorOrAbove && data.employeeNumber !== cancelledByEmployeeNumber) {
    throw new Error('You can only cancel your own reservations.');
  }

  if (!isSupervisorOrAbove) {
    const settingsDoc = await db
      .collection(COLLECTIONS.RESERVATION_SETTINGS)
      .doc(tenantId)
      .get();
    const settings = settingsDoc.data();

    const mealTypeDoc = await db
      .collection(COLLECTIONS.MEAL_TYPES)
      .doc(data.mealType)
      .get();
    const mealTypeData = mealTypeDoc.data();

    const todayStr = pktDateStr(new Date());
    if (data.reservationDate === todayStr) {
      const cutoffBreached = isCutoffBreached(
        mealTypeData.serviceWindowStart,
        settings.cutoffHoursBeforeMeal
      );
      if (cutoffBreached) {
        throw new Error('Cancellation cutoff has passed. Contact supervisor to cancel.');
      }
    }
  }

  await ref.update({
    reservationStatus: 'cancelled',
    cancelledAt: FieldValue.serverTimestamp(),
    cancelledByUid,
    cancelledByRole,
    cancellationReason,
    cancellationNote: cancellationNote || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reservationId, reservationStatus: 'cancelled', cancellationReason };
}

// ── isCutoffBreached ──
function isCutoffBreached(serviceWindowStart, cutoffHours) {
  const nowPkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const [utcHour, utcMin] = serviceWindowStart.split(':').map(Number);
  const pktStartHour = utcHour + 5;
  const cutoff = new Date(nowPkt);
  cutoff.setHours(pktStartHour - cutoffHours, utcMin, 0, 0);
  return nowPkt >= cutoff;
}

// ── getIssuanceList ──
async function getIssuanceList({ tenantId, reservationDate, mealType }) {
  const snapshot = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', reservationDate)
    .where('mealType', '==', mealType)
    .where('reservationStatus', '==', 'active')
    .where('issueStatus', '==', 'pending')
    .get();

  return snapshot.docs.map(doc => doc.data());
}

// ── issueReservation ──
async function issueReservation({ reservationId, tenantId, issuedByUid, issuedByRole }) {
  const ref = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Reservation not found.');

  const data = doc.data();

  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.reservationStatus !== 'active') throw new Error('Cannot issue a cancelled reservation.');
  if (data.issueStatus !== 'pending') throw new Error(`Reservation is already ${data.issueStatus}.`);

  await ref.update({
    issueStatus: 'issued',
    issuedAt: FieldValue.serverTimestamp(),
    issuedByUid,
    issuedByRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reservationId, issueStatus: 'issued' };
}

// ── markNoShow ──
async function markNoShow({ reservationId, tenantId, issuedByUid, issuedByRole }) {
  const ref = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Reservation not found.');

  const data = doc.data();

  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  if (data.reservationStatus !== 'active') throw new Error('Cannot update a cancelled reservation.');
  if (data.issueStatus !== 'pending') throw new Error(`Reservation is already ${data.issueStatus}.`);

  await ref.update({
    issueStatus: 'no_show',
    issuedAt: FieldValue.serverTimestamp(),
    issuedByUid,
    issuedByRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reservationId, issueStatus: 'no_show' };
}

module.exports = { createSelfBooking, createProxyBooking, cancelReservation, getIssuanceList, issueReservation, markNoShow };
