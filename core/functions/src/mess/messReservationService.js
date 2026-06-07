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

// Formats YYYY-MM-DD as "Mon, 8 Jun" for notification bodies
function formatDateForNotification(dateStr) {
  const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
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
  bookingSource,
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

  // Walk-in bookings bypass cutoff entirely — supervisor is physically present
  if (bookingSource !== 'walk_in' && reservationDate === todayStr) {
    // F7: read cutoff from appSettings first, fall back to reservationSettings
    let cutoffHours = settings.cutoffHoursBeforeMeal;
    const appSettingsDoc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();
    if (appSettingsDoc.exists) {
      const appSettings = appSettingsDoc.data();
      if (typeof appSettings.cutoffHoursBeforeMeal === 'number') {
        cutoffHours = appSettings.cutoffHoursBeforeMeal;
      }
    }
    const cutoffBreached = isCutoffBreached(
      mealTypeData.serviceWindowStart,
      cutoffHours
    );
    if (cutoffBreached) {
      throw new Error(
        `Booking cutoff has passed for ${mealType}. Cutoff is ${cutoffHours} hours before meal start.`
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
  const rateTargetKey = `${reservationDate}_${mealType}_${menuItemId}`;

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
    bookingSource: bookingSource || 'self',
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
    issueStatus: bookingSource === 'walk_in' ? 'issued' : 'pending',
    feedbackStatus: 'pending',
    cutoffWaived: bookingSource === 'walk_in' ? true : false,
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
    body: `Your ${mealLabel} booking (${comboLabel}) for ${formatDateForNotification(reservationDate)} has been confirmed.`,
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
  const rateTargetKey = `${reservationDate}_${mealType}_${menuItemId}`;

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
      body: `A ${mealLabel} booking (${comboLabel}) for ${formatDateForNotification(reservationDate)} was made for you by the supervisor.`,
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

// ── createWalkInBooking ──
async function createWalkInBooking({
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

  if (!settings.allowWalkIn) {
    throw new Error('Walk-in booking is not enabled for this tenant.');
  }

  // --- 2. Validate reservation date — walk-in is TODAY only ---
  const todayStr = pktDateStr(new Date());

  if (reservationDate !== todayStr) {
    throw new Error('Walk-in bookings can only be made for today.');
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

  // No cutoff check — walk-in supervisor is physically present

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
    throw new Error(`Selected option ${menuOptionKey} does not exist in today's menu.`);
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
  const rateTargetKey = `${reservationDate}_${mealType}_${menuItemId}`;

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
    bookingSource: 'walk_in',
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
    issueStatus: 'issued',
    feedbackStatus: 'pending',
    cutoffWaived: true,
    overrideReason: null,
    overrideByUid: null,
    proxyOverrideUsed: false,
    isSpecialMeal: false,
    allowAnyMenuItem: false,
    issuedAt: new Date(),
    issuedByUid: uid,
    issuedByRole: createdByRole,
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

  // --- 11. Notify target employee (fire-and-forget) ---
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
      notificationType: 'booking_confirmed',
      triggerSource: 'walk_in',
      title: 'Meal Booked',
      body: `Your ${mealLabel} (${comboLabel}) on ${formatDateForNotification(reservationDate)} has been recorded as a walk-in and issued.`,
      targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
      targetUserUids: [targetUid],
      contextType: 'reservation',
      contextId: reservationId,
    }).catch(err => console.error('[Notification] walk_in booking_confirmed failed:', err));
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
      // F7: read cutoff from appSettings first, fall back to reservationSettings
      let cutoffHours = settings.cutoffHoursBeforeMeal;
      const appSettingsDoc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();
      if (appSettingsDoc.exists) {
        const appSettings = appSettingsDoc.data();
        if (typeof appSettings.cutoffHoursBeforeMeal === 'number') {
          cutoffHours = appSettings.cutoffHoursBeforeMeal;
        }
      }
      const cutoffBreached = isCutoffBreached(
        mealTypeData.serviceWindowStart,
        cutoffHours
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

// ── createAlaCarteBooking ──
// Handles self-booking of multiple ala carte breakfast items in one session.
// Each item creates one messReservations document.
// All documents from the same session share one bookingGroupId.
// No cutoff check. No duplicate check. Cancellable until issued.
// bookingSource param allows proxy and walk-in to reuse this function later (F2).
async function createAlaCarteBooking({
  uid,
  officialEmployeeNumber,       // the account holder — always the employee
  targetEmployeeNumber,         // who the meal is FOR (same as above for self-booking)
  targetEmployeeName,           // pass null to let function fetch it
  tenantId,
  reservationDate,
  items,                        // array: [{ itemId, itemName, quantity }]
  diningMode,
  bookingSource,                // 'self' | 'proxy' | 'walk_in'
  createdByRole,                // role of the person submitting
  createdByEmployeeNumber,      // employee number of the person submitting
}) {
 
  // ── 1. Basic validations ──
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one ala carte item must be selected.');
  }
  if (!['dine_in', 'takeaway'].includes(diningMode)) {
    throw new Error('Invalid diningMode. Use dine_in or takeaway.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
    throw new Error('Invalid reservationDate format. Use YYYY-MM-DD.');
  }
 
  const validSources = ['self', 'proxy', 'walk_in'];
  if (!validSources.includes(bookingSource)) {
    throw new Error('Invalid bookingSource.');
  }
 
  // Validate each item in the array
  for (const item of items) {
    if (!item.itemId || !item.itemName) {
      throw new Error('Each item must have itemId and itemName.');
    }
    const qty = item.quantity || 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new Error(`Invalid quantity for item ${item.itemName}. Must be between 1 and 20.`);
    }
  }
 
  // ── 2. Date validation ──
  // Walk-in: today only. Self/proxy: within booking window.
  const todayStr = pktDateStr(new Date());
 
  if (bookingSource === 'walk_in') {
    if (reservationDate !== todayStr) {
      throw new Error('Walk-in bookings can only be made for today.');
    }
  } else {
    if (reservationDate < todayStr) {
      throw new Error('Cannot book for a past date.');
    }
    const settingsDoc = await db
      .collection(COLLECTIONS.RESERVATION_SETTINGS)
      .doc(tenantId)
      .get();
    if (!settingsDoc.exists) {
      throw new Error('Reservation settings not found for tenant.');
    }
    const settings = settingsDoc.data();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays);
    const maxDateStr = pktDateStr(maxDate);
    if (reservationDate > maxDateStr) {
      throw new Error(`Booking window is ${settings.bookingWindowDays} days. Cannot book this far ahead.`);
    }
  }
 
  // ── 3. Validate mealType = breakfast only for ala carte ──
  const mealType = 'breakfast';
  const mealTypeDoc = await db
    .collection(COLLECTIONS.MEAL_TYPES)
    .doc(mealType)
    .get();
  if (!mealTypeDoc.exists) {
    throw new Error('Breakfast meal type configuration not found.');
  }
  const mealTypeData = mealTypeDoc.data();
  if (!mealTypeData.isActive || !mealTypeData.isBookable) {
    throw new Error('Breakfast is not available for booking.');
  }
 
  // ── 4. Read dailyMenus and validate each submitted item ──
  const dailyMenuDocId = `${tenantId}_${reservationDate}_${mealType}`;
  const dailyMenuDoc = await db
    .collection(COLLECTIONS.DAILY_MENUS)
    .doc(dailyMenuDocId)
    .get();
 
  if (!dailyMenuDoc.exists) {
    throw new Error(`No breakfast menu available for ${reservationDate}. Menu may not have been generated yet.`);
  }
 
  const dailyMenu = dailyMenuDoc.data();
  const alaCarteMenu = dailyMenu.alaCarte || [];
 
  if (alaCarteMenu.length === 0) {
    throw new Error('No ala carte items are available for this breakfast.');
  }
 
  // Validate every submitted item exists in the menu
  // Also build a lookup map so we can get the full item object per itemId
  const alaCarteMap = {};
  for (const menuItem of alaCarteMenu) {
    alaCarteMap[menuItem.itemId] = menuItem;
  }
 
  for (const item of items) {
    if (!alaCarteMap[item.itemId]) {
      throw new Error(`Item "${item.itemName}" (${item.itemId}) is not available in today's breakfast ala carte menu.`);
    }
  }
 
  // ── 5. Fetch target employee name if not provided ──
  let resolvedEmployeeName = targetEmployeeName;
  if (!resolvedEmployeeName) {
    const empDoc = await db
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(targetEmployeeNumber)
      .get();
    if (!empDoc.exists) {
      throw new Error(`Employee record not found: ${targetEmployeeNumber}`);
    }
    const empData = empDoc.data();
    if (empData.tenantId !== tenantId) {
      throw new Error('Employee does not belong to this tenant.');
    }
    if (!empData.isActive) {
      throw new Error(`Employee ${targetEmployeeNumber} is inactive.`);
    }
    resolvedEmployeeName = empData.fullName;
  }
 
  // ── 6. Generate one shared bookingGroupId for the entire session ──
  const bookingGroupId = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc().id;
 
  // ── 7. Write one reservation document per item ──
  const createdReservations = [];
 
  for (const item of items) {
    const menuItem = alaCarteMap[item.itemId];
    const quantity = item.quantity || 1;
 
    // rateTargetKey: stable, item-specific, unique per day
// Format: {date}_{mealType}_{itemId}  — universal format for all booking types
    const rateTargetKey = `${reservationDate}_breakfast_${item.itemId}`;
 
    const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
    const reservationId = reservationRef.id;
 
    const reservationDoc = {
      reservationId,
      bookingGroupId,
      tenantId,
      createdByUid: uid,
      createdByRole: createdByRole || 'employee',
      createdByEmployeeNumber: createdByEmployeeNumber || officialEmployeeNumber,
      bookingSource,
      subjectType: 'self',
      employeeNumber: targetEmployeeNumber,
      employeeName: resolvedEmployeeName,
      guestName: null,
      quantity,
      reservationDate,
      mealType,
      // menuItemId stores the itemId — field name kept consistent with existing schema
      menuItemId: item.itemId,
      itemName: item.itemName,
      // menuOptionKey = 'alacarte' identifies the section (not numbered)
      // The specific item is identified by menuItemId
      menuOptionKey: 'alacarte',
      optionLabel: 'Ala Carte',
      diningMode,
      selectionMode: 'alacarte',
      billingDestination: 'employee_account',
      costCentreCode: null,
      rateTargetKey,
      unitRate: null,
      amount: null,
      rateStatus: 'pending',
      rateAppliedAt: null,
      reservationStatus: 'active',
      // Walk-in: immediately issued. Self/proxy: pending until supervisor issues.
      issueStatus: bookingSource === 'walk_in' ? 'issued' : 'pending',
      feedbackStatus: 'pending',
      cutoffWaived: true,           // no cutoff for ala carte
      overrideReason: null,
      overrideByUid: null,
      proxyOverrideUsed: bookingSource === 'proxy',
      isSpecialMeal: false,
      allowAnyMenuItem: false,
      issuedAt: bookingSource === 'walk_in' ? new Date() : null,
      issuedByUid: bookingSource === 'walk_in' ? uid : null,
      issuedByRole: bookingSource === 'walk_in' ? createdByRole : null,
      cancelledAt: null,
      cancelledByUid: null,
      cancelledByRole: null,
      cancellationReason: null,
      cancellationNote: null,
      feedbackSubmittedAt: null,
      // menuSnapshot for ala carte: the item details at booking time
      menuSnapshot: {
        itemId: menuItem.itemId,
        itemName: menuItem.itemName,
        baseUnit: menuItem.baseUnit,
        foodTypeCode: menuItem.foodTypeCode,
      },
      isVisible: true,
      remarks: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
 
    await reservationRef.set(reservationDoc);
 
    createdReservations.push({
      reservationId,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity,
      rateTargetKey,
    });
  }
 
  // ── 8. Send one combined notification per session ──
  const dateLabel = formatDateForNotification(reservationDate);
  const itemCount = items.length;
 
  if (bookingSource === 'self') {
    // Notify the booking employee directly
    const notificationBody = itemCount === 1
      ? `Your Breakfast ala carte booking (${items[0].itemName}) for ${dateLabel} has been confirmed.`
      : `Your Breakfast ala carte booking — ${itemCount} items — for ${dateLabel} has been confirmed.`;
 
    createNotification({
      tenantId,
      createdByUid: uid,
      createdByName: resolvedEmployeeName,
      notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
      notificationType: 'booking_confirmed',
      triggerSource: 'self_booking_alacarte',
      title: 'Ala Carte Booked',
      body: notificationBody,
      targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
      targetUserUids: [uid],
      contextType: 'reservation',
      contextId: createdReservations[0].reservationId,
    }).catch(err => console.error('[Notification] alacarte booking_confirmed failed:', err));
 
  } else if (bookingSource === 'proxy' || bookingSource === 'walk_in') {
    // Notify the TARGET employee — the person the meal was booked for
    // Look up target employee's uid from users collection
    const targetUserSnap = await db
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', tenantId)
      .where('officialEmployeeNumber', '==', targetEmployeeNumber)
      .limit(1)
      .get();
 
    if (!targetUserSnap.empty) {
      const targetUid = targetUserSnap.docs[0].data().uid;
 
      const notificationBody = bookingSource === 'proxy'
        ? (itemCount === 1
            ? `A Breakfast ala carte booking (${items[0].itemName}) for ${dateLabel} was made for you by the supervisor.`
            : `A Breakfast ala carte booking — ${itemCount} items — for ${dateLabel} was made for you by the supervisor.`)
        : (itemCount === 1
            ? `Your Breakfast ala carte (${items[0].itemName}) for ${dateLabel} has been recorded as a walk-in and issued.`
            : `Your Breakfast ala carte — ${itemCount} items — for ${dateLabel} has been recorded as a walk-in and issued.`);
 
      createNotification({
        tenantId,
        createdByUid: uid,
        createdByName: null,
        notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
        notificationType: 'booking_confirmed',
        triggerSource: bookingSource === 'proxy' ? 'proxy_booking_alacarte' : 'walk_in_alacarte',
        title: 'Ala Carte Booked',
        body: notificationBody,
        targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
        targetUserUids: [targetUid],
        contextType: 'reservation',
        contextId: createdReservations[0].reservationId,
      }).catch(err => console.error(`[Notification] alacarte ${bookingSource} failed:`, err));
    }
  }

  return {
    bookingGroupId,
    reservationDate,
    mealType,
    diningMode,
    bookingSource,
    bookedFor: targetEmployeeNumber,
    itemCount: createdReservations.length,
    reservations: createdReservations,
  };
}

// ── createSpecialMealWalkIn ──
// Supervisor walk-in for lunch/dinner using any active menuItem.
// Used when employee has a special food requirement not covered by daily menu.
// One document per item, shared bookingGroupId. issueStatus: 'issued' immediately.
async function createSpecialMealWalkIn({
  uid,
  createdByRole,
  createdByEmployeeNumber,
  tenantId,
  targetEmployeeNumber,
  reservationDate,
  mealType,
  items,           // [{ itemId, itemName, baseUnit, foodTypeCode, quantity }]
  diningMode,
}) {

  // ── 1. Validate mealType — special meal is lunch/dinner only ──
  if (!['lunch', 'dinner'].includes(mealType)) {
    throw new Error('Special meal walk-in is only available for lunch and dinner.');
  }

  // ── 2. Validate date — walk-in is today only ──
  const todayStr = pktDateStr(new Date());
  if (reservationDate !== todayStr) {
    throw new Error('Walk-in bookings can only be made for today.');
  }

  // ── 3. Validate items array ──
  if (!items || items.length === 0) {
    throw new Error('At least one item is required for a special meal.');
  }

  // ── 4. Validate meal type config ──
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

  // ── 5. Validate target employee ──
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

  // ── 6. Validate each item exists in menuItems and is active ──
  for (const item of items) {
    const itemDoc = await db
      .collection(COLLECTIONS.MENU_ITEMS)
      .doc(item.itemId)
      .get();
    if (!itemDoc.exists) {
      throw new Error(`Menu item not found: ${item.itemName} (${item.itemId})`);
    }
    const itemData = itemDoc.data();
    if (itemData.tenantId !== tenantId) {
      throw new Error(`Item ${item.itemName} does not belong to this tenant.`);
    }
    if (!itemData.isActive) {
      throw new Error(`Item ${item.itemName} is not currently active.`);
    }
  }

  // ── 7. Generate one shared bookingGroupId for the session ──
  const bookingGroupId = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc().id;

  // ── 8. Write one reservation document per item ──
  const createdReservations = [];

  for (const item of items) {
    const quantity = item.quantity || 1;
    const rateTargetKey = `${reservationDate}_${mealType}_${item.itemId}`;

    const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
    const reservationId = reservationRef.id;

    const reservationDoc = {
      reservationId,
      bookingGroupId,
      tenantId,
      createdByUid: uid,
      createdByRole,
      createdByEmployeeNumber,
      bookingSource: 'walk_in',
      subjectType: 'self',
      employeeNumber: targetEmployeeNumber,
      employeeName: targetEmployee.fullName,
      guestName: null,
      quantity,
      reservationDate,
      mealType,
      menuItemId: item.itemId,
      itemName: item.itemName,
      menuOptionKey: 'special',
      optionLabel: 'Special Meal',
      diningMode,
      selectionMode: 'special',
      billingDestination: 'employee_account',
      costCentreCode: null,
      rateTargetKey,
      unitRate: null,
      amount: null,
      rateStatus: 'pending',
      rateAppliedAt: null,
      reservationStatus: 'active',
      issueStatus: 'issued',
      feedbackStatus: 'pending',
      cutoffWaived: true,
      overrideReason: null,
      overrideByUid: null,
      proxyOverrideUsed: false,
      isSpecialMeal: true,
      allowAnyMenuItem: true,
      issuedAt: new Date(),
      issuedByUid: uid,
      issuedByRole: createdByRole,
      cancelledAt: null,
      cancelledByUid: null,
      cancelledByRole: null,
      cancellationReason: null,
      cancellationNote: null,
      feedbackSubmittedAt: null,
      menuSnapshot: {
        itemId: item.itemId,
        itemName: item.itemName,
        baseUnit: item.baseUnit || null,
        foodTypeCode: item.foodTypeCode || null,
      },
      isVisible: true,
      remarks: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await reservationRef.set(reservationDoc);

    createdReservations.push({
      reservationId,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity,
      rateTargetKey,
    });
  }

  // ── 9. Send one combined notification to target employee ──
  const dateLabel = formatDateForNotification(reservationDate);
  const itemCount = items.length;

  const targetUserSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('tenantId', '==', tenantId)
    .where('officialEmployeeNumber', '==', targetEmployeeNumber)
    .limit(1)
    .get();

  if (!targetUserSnap.empty) {
    const targetUid = targetUserSnap.docs[0].data().uid;
    const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

    createNotification({
      tenantId,
      createdByUid: uid,
      createdByName: null,
      notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
      notificationType: 'booking_confirmed',
      triggerSource: 'special_meal_walk_in',
      title: 'Special Meal Booked',
      body: itemCount === 1
        ? `A customised ${mealLabel} (${items[0].itemName}) has been booked for you as per your request for ${dateLabel}.`
        : `A customised ${mealLabel} — ${itemCount} items — has been booked for you as per your request for ${dateLabel}.`,
      targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
      targetUserUids: [targetUid],
      contextType: 'reservation',
      contextId: createdReservations[0].reservationId,
    }).catch(err => console.error('[Notification] special_meal_walk_in failed:', err));
  }

  return {
    bookingGroupId,
    reservationDate,
    mealType,
    diningMode,
    bookingSource: 'walk_in',
    bookedFor: targetEmployeeNumber,
    itemCount: createdReservations.length,
    reservations: createdReservations,
  };
}

// ── createOfficialGuestWalkIn ──
// Supervisor walk-in for an official guest (no system account).
// Handles all meal types:
//   breakfast → combo + ala carte items from dailyMenus
//   lunch/dinner → any active menuItems (full catalogue)
// issueStatus: 'issued' immediately. approvalStatus: 'pending_approval'.
// Admin receives notification. No notification to sponsoring employee.
async function createOfficialGuestWalkIn({
  uid,
  createdByRole,
  createdByEmployeeNumber,
  tenantId,
  guestName,
  sponsoringEmployeeNumber,
  reservationDate,
  mealType,
  diningMode,
  // For breakfast combo — single item
  comboItem,       // { menuItemId, menuOptionKey, optionLabel, itemName, selectionMode } | null
  // For breakfast ala carte + lunch/dinner full catalogue — array of items
  items,           // [{ itemId, itemName, baseUnit, foodTypeCode, quantity }] | []
}) {

  // ── 1. Validate date — walk-in is today only ──
  const todayStr = pktDateStr(new Date());
  if (reservationDate !== todayStr) {
    throw new Error('Walk-in bookings can only be made for today.');
  }

  // ── 2. Validate meal type ──
  if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
    throw new Error('Invalid mealType.');
  }

  // ── 3. Must have at least one selection ──
  const hasCombo = !!comboItem;
  const hasItems = items && items.length > 0;
  if (!hasCombo && !hasItems) {
    throw new Error('At least one meal item must be selected.');
  }

  // ── 4. Validate meal type config ──
  const mealTypeDoc = await db.collection(COLLECTIONS.MEAL_TYPES).doc(mealType).get();
  if (!mealTypeDoc.exists) throw new Error(`Meal type not found: ${mealType}`);
  const mealTypeData = mealTypeDoc.data();
  if (!mealTypeData.isActive || !mealTypeData.isBookable) {
    throw new Error(`Meal type ${mealType} is not available for booking.`);
  }

  // ── 5. Validate sponsoring employee exists ──
  const sponsorDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(sponsoringEmployeeNumber).get();
  if (!sponsorDoc.exists) {
    throw new Error(`Sponsoring employee not found: ${sponsoringEmployeeNumber}`);
  }
  const sponsorData = sponsorDoc.data();
  if (sponsorData.tenantId !== tenantId) {
    throw new Error('Sponsoring employee does not belong to this tenant.');
  }
  if (!sponsorData.isActive) {
    throw new Error(`Sponsoring employee ${sponsoringEmployeeNumber} is inactive.`);
  }
  const sponsoringEmployeeName = sponsorData.fullName;

  // ── 6. For breakfast combo — validate against dailyMenus ──
  let comboMenuSnapshot = null;
  if (hasCombo && mealType === 'breakfast') {
    const dailyMenuDocId = `${tenantId}_${reservationDate}_${mealType}`;
    const dailyMenuDoc = await db.collection(COLLECTIONS.DAILY_MENUS).doc(dailyMenuDocId).get();
    if (!dailyMenuDoc.exists) {
      throw new Error(`No breakfast menu available for ${reservationDate}.`);
    }
    const dailyMenu = dailyMenuDoc.data();
    const selectedCombo = dailyMenu.combos?.find(c => c.menuOptionKey === comboItem.menuOptionKey);
    if (!selectedCombo) {
      throw new Error(`Selected combo ${comboItem.menuOptionKey} not found in today's menu.`);
    }
    comboMenuSnapshot = {
      comboId:      selectedCombo.comboId,
      comboName:    selectedCombo.comboName,
      displayLabel: selectedCombo.displayLabel,
      menuOptionKey: selectedCombo.menuOptionKey,
    };
  }

  // ── 7. For lunch/dinner full catalogue items — validate each item is active ──
  if (hasItems && mealType !== 'breakfast') {
    for (const item of items) {
      const itemDoc = await db.collection(COLLECTIONS.MENU_ITEMS).doc(item.itemId).get();
      if (!itemDoc.exists) throw new Error(`Menu item not found: ${item.itemName} (${item.itemId})`);
      const itemData = itemDoc.data();
      if (itemData.tenantId !== tenantId) throw new Error(`Item ${item.itemName} does not belong to this tenant.`);
      if (!itemData.isActive) throw new Error(`Item ${item.itemName} is not currently active.`);
    }
  }

  // ── 8. For breakfast ala carte items — validate against dailyMenus.alaCarte ──
  let alaCarteMap = {};
  if (hasItems && mealType === 'breakfast') {
    const dailyMenuDocId = `${tenantId}_${reservationDate}_${mealType}`;
    const dailyMenuDoc = await db.collection(COLLECTIONS.DAILY_MENUS).doc(dailyMenuDocId).get();
    if (!dailyMenuDoc.exists) throw new Error(`No breakfast menu available for ${reservationDate}.`);
    const dailyMenu = dailyMenuDoc.data();
    for (const mi of (dailyMenu.alaCarte || [])) {
      alaCarteMap[mi.itemId] = mi;
    }
    for (const item of items) {
      if (!alaCarteMap[item.itemId]) {
        throw new Error(`Item "${item.itemName}" is not available in today's breakfast ala carte menu.`);
      }
    }
  }

  // ── 9. Find admin uid for notification ──
  const adminSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('tenantId', '==', tenantId)
    .where('role', 'in', ['admin', 'super_admin'])
    .limit(1)
    .get();
  const adminUid = adminSnap.empty ? null : adminSnap.docs[0].data().uid;

  // ── 10. Generate shared bookingGroupId ──
  const bookingGroupId = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc().id;
  const createdReservations = [];

  // ── 11a. Write combo reservation (breakfast only) ──
  if (hasCombo) {
    const rateTargetKey = `${reservationDate}_${mealType}_${comboItem.menuItemId}`;
    const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
    const reservationId = reservationRef.id;

    await reservationRef.set({
      reservationId,
      bookingGroupId,
      tenantId,
      createdByUid: uid,
      createdByRole,
      createdByEmployeeNumber,
      bookingSource: 'official_guest_walkin',
      subjectType: 'official_guest',
      employeeNumber: sponsoringEmployeeNumber,
      employeeName: sponsoringEmployeeName,
      guestName,
      sponsoringEmployeeNumber,
      sponsoringEmployeeName,
      quantity: 1,
      reservationDate,
      mealType,
      menuItemId: comboItem.menuItemId,
      itemName: comboItem.itemName,
      menuOptionKey: comboItem.menuOptionKey,
      optionLabel: comboItem.optionLabel,
      diningMode,
      selectionMode: comboItem.selectionMode || 'combo',
      billingDestination: 'official_account',
      costCentreCode: null,
      rateTargetKey,
      unitRate: null,
      amount: null,
      rateStatus: 'pending',
      rateAppliedAt: null,
      reservationStatus: 'active',
      issueStatus: 'issued',
      feedbackStatus: 'not_applicable',
      cutoffWaived: true,
      overrideReason: null,
      overrideByUid: null,
      proxyOverrideUsed: false,
      isSpecialMeal: false,
      allowAnyMenuItem: false,
      approvalStatus: 'pending_approval',
      approvedByUid: null,
      approvedAt: null,
      rejectedByUid: null,
      rejectedAt: null,
      approvalNote: null,
      issuedAt: new Date(),
      issuedByUid: uid,
      issuedByRole: createdByRole,
      cancelledAt: null,
      cancelledByUid: null,
      cancelledByRole: null,
      cancellationReason: null,
      cancellationNote: null,
      feedbackSubmittedAt: null,
      menuSnapshot: comboMenuSnapshot,
      isVisible: true,
      remarks: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    createdReservations.push({ reservationId, itemName: comboItem.itemName, rateTargetKey });
  }

  // ── 11b. Write per-item reservations (ala carte BF or full catalogue lunch/dinner) ──
  if (hasItems) {
    for (const item of items) {
      const quantity = item.quantity || 1;
      const rateTargetKey = `${reservationDate}_${mealType}_${item.itemId}`;
      const reservationRef = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc();
      const reservationId = reservationRef.id;

      const isAlacarte = mealType === 'breakfast';

      await reservationRef.set({
        reservationId,
        bookingGroupId,
        tenantId,
        createdByUid: uid,
        createdByRole,
        createdByEmployeeNumber,
        bookingSource: 'official_guest_walkin',
        subjectType: 'official_guest',
        employeeNumber: sponsoringEmployeeNumber,
        employeeName: sponsoringEmployeeName,
        guestName,
        sponsoringEmployeeNumber,
        sponsoringEmployeeName,
        quantity,
        reservationDate,
        mealType,
        menuItemId: item.itemId,
        itemName: item.itemName,
        menuOptionKey: isAlacarte ? 'alacarte' : 'special',
        optionLabel: isAlacarte ? 'Ala Carte' : 'Special Meal',
        diningMode,
        selectionMode: isAlacarte ? 'alacarte' : 'special',
        billingDestination: 'official_account',
        costCentreCode: null,
        rateTargetKey,
        unitRate: null,
        amount: null,
        rateStatus: 'pending',
        rateAppliedAt: null,
        reservationStatus: 'active',
        issueStatus: 'issued',
        feedbackStatus: 'not_applicable',
        cutoffWaived: true,
        overrideReason: null,
        overrideByUid: null,
        proxyOverrideUsed: false,
        isSpecialMeal: mealType !== 'breakfast',
        allowAnyMenuItem: mealType !== 'breakfast',
        approvalStatus: 'pending_approval',
        approvedByUid: null,
        approvedAt: null,
        rejectedByUid: null,
        rejectedAt: null,
        approvalNote: null,
        issuedAt: new Date(),
        issuedByUid: uid,
        issuedByRole: createdByRole,
        cancelledAt: null,
        cancelledByUid: null,
        cancelledByRole: null,
        cancellationReason: null,
        cancellationNote: null,
        feedbackSubmittedAt: null,
        menuSnapshot: {
          itemId: item.itemId,
          itemName: item.itemName,
          baseUnit: item.baseUnit || null,
          foodTypeCode: item.foodTypeCode || null,
        },
        isVisible: true,
        remarks: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      createdReservations.push({ reservationId, itemName: item.itemName, quantity, rateTargetKey });
    }
  }

  // ── 12. Notify admin ──
  if (adminUid) {
    const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    createNotification({
      tenantId,
      createdByUid: uid,
      createdByName: null,
      notificationLayer: NOTIFICATION_LAYERS.ALERT,
      notificationType: 'official_guest_meal_pending_approval',
      triggerSource: 'official_guest_walkin',
      title: 'Official Guest Meal — Approval Required',
      body: `${mealLabel} booked for guest "${guestName}" sponsored by ${sponsoringEmployeeNumber}. Booked by supervisor. Billing approval required.`,
      targetType: NOTIFICATION_TARGET_TYPES.SINGLE_USER,
      targetUserUids: [adminUid],
      contextType: 'reservation',
      contextId: createdReservations[0].reservationId,
    }).catch(err => console.error('[Notification] official_guest_meal_pending_approval failed:', err));
  }

  return {
    bookingGroupId,
    reservationDate,
    mealType,
    diningMode,
    bookingSource: 'official_guest_walkin',
    guestName,
    sponsoringEmployeeNumber,
    itemCount: createdReservations.length,
    reservations: createdReservations,
  };
}

// ── approveOfficialGuestMeal ──
// Admin approves billing for an official guest reservation.
async function approveOfficialGuestMeal({ reservationId, tenantId, approvedByUid }) {
  const ref = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Reservation not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Tenant mismatch.');
  if (data.subjectType !== 'official_guest') throw new Error('This reservation is not an official guest record.');
  if (data.approvalStatus !== 'pending_approval') throw new Error(`Cannot approve — current status is ${data.approvalStatus}.`);

  await ref.update({
    approvalStatus: 'approved',
    approvedByUid,
    approvedAt: new Date(),
    updatedAt: new Date(),
  });

  return { reservationId, approvalStatus: 'approved' };
}

// ── rejectOfficialGuestMeal ──
// Admin rejects billing for an official guest reservation.
async function rejectOfficialGuestMeal({ reservationId, tenantId, rejectedByUid, approvalNote }) {
  const ref = db.collection(COLLECTIONS.MESS_RESERVATIONS).doc(reservationId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Reservation not found.');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Tenant mismatch.');
  if (data.subjectType !== 'official_guest') throw new Error('This reservation is not an official guest record.');
  if (data.approvalStatus !== 'pending_approval') throw new Error(`Cannot reject — current status is ${data.approvalStatus}.`);

  await ref.update({
    approvalStatus: 'rejected',
    rejectedByUid,
    rejectedAt: new Date(),
    approvalNote: approvalNote || null,
    updatedAt: new Date(),
  });

  return { reservationId, approvalStatus: 'rejected' };
}

module.exports = { createSelfBooking, createProxyBooking, createWalkInBooking, cancelReservation, getIssuanceList, issueReservation, markNoShow, createAlaCarteBooking, createSpecialMealWalkIn, createOfficialGuestWalkIn, approveOfficialGuestMeal, rejectOfficialGuestMeal };