// core/functions/src/mess/messReservationService.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../constants');

// ─────────────────────────────────────────
// createSelfBooking
// Called when an employee books a meal for themselves
// ─────────────────────────────────────────
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
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (reservationDate < todayStr) {
    throw new Error('Cannot book for a past date.');
  }

  // Booking window: today + bookingWindowDays forward
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  if (reservationDate > maxDateStr) {
    throw new Error(`Booking window is ${settings.bookingWindowDays} days. Cannot book this far ahead.`);
  }

  // --- 3. Check cutoff ---
  // Get meal service start time from mealTypes collection
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

  // Cutoff check: only applies if booking is for today
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

  // Confirm the selected combo/item exists in the daily menu
  const comboExists = dailyMenu.combos.some(c => c.menuOptionKey === menuOptionKey);
  if (selectionMode === 'combo' && !comboExists) {
    throw new Error(`Selected option ${menuOptionKey} does not exist in today's menu.`);
  }

  // --- 5. Check for duplicate booking ---
  // One booking per employee per meal per date
  const duplicateCheck = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('employeeNumber', '==', officialEmployeeNumber)
    .where('reservationDate', '==', reservationDate)
    .where('mealType', '==', mealType)
    .where('reservationStatus', '==', 'active')
    .where('subjectType', '==', 'self')
    .limit(1)
    .get();

  if (!duplicateCheck.empty) {
    throw new Error(`You already have an active booking for ${mealType} on ${reservationDate}.`);
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
  // Preserve what the combo contained at time of booking
  const selectedCombo = dailyMenu.combos.find(c => c.menuOptionKey === menuOptionKey) || null;
  const menuSnapshot = selectedCombo ? {
    comboId: selectedCombo.comboId,
    comboName: selectedCombo.comboName,
    displayLabel: selectedCombo.displayLabel,
    menuOptionKey: selectedCombo.menuOptionKey,
  } : null;

  // --- 8. Build rateTargetKey ---
  // Format: "2026-05-23_lunch_combo_1"
  const rateTargetKey = `${reservationDate}_${mealType}_${menuOptionKey}`;

  // --- 9. Build bookingGroupId ---
  // Single booking = its own group. Week-wide bookings share one group ID.
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
    quantity: 1,
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

  return {
    reservationId,
    bookingGroupId,
    rateTargetKey,
    reservationDate,
    mealType,
    itemName,
    menuOptionKey,
    diningMode,
  };
}

// ─────────────────────────────────────────
// isCutoffBreached
// Checks if current time is past the cutoff for a meal
// serviceWindowStart: "06:00", cutoffHours: 3
// Cutoff = 06:00 - 3hrs = 03:00
// ─────────────────────────────────────────
function isCutoffBreached(serviceWindowStart, cutoffHours) {
  const now = new Date();
  const [startHour, startMinute] = serviceWindowStart.split(':').map(Number);

  // Build cutoff time for today
  const cutoff = new Date();
  cutoff.setHours(startHour - cutoffHours, startMinute, 0, 0);

  return now >= cutoff;
}

// ─────────────────────────────────────────
// getIssuanceList
// Returns all active/pending reservations for a given date and mealType
// Used by mess supervisor at kitchen counter
// ─────────────────────────────────────────
async function getIssuanceList({ tenantId, reservationDate, mealType }) {
  const snapshot = await db
    .collection(COLLECTIONS.MESS_RESERVATIONS)
    .where('tenantId', '==', tenantId)
    .where('reservationDate', '==', reservationDate)
    .where('mealType', '==', mealType)
    .where('reservationStatus', '==', 'active')
    .where('issueStatus', '==', 'pending')
    .get();

  const reservations = snapshot.docs.map(doc => doc.data());
  return reservations;
}

// ─────────────────────────────────────────
// issueReservation
// Marks a reservation as issued — meal has been served
// ─────────────────────────────────────────
async function issueReservation({ reservationId, tenantId, issuedByUid, issuedByRole }) {
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
    throw new Error('Cannot issue a cancelled reservation.');
  }
  if (data.issueStatus !== 'pending') {
    throw new Error(`Reservation is already ${data.issueStatus}.`);
  }

  await ref.update({
    issueStatus: 'issued',
    issuedAt: FieldValue.serverTimestamp(),
    issuedByUid,
    issuedByRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reservationId, issueStatus: 'issued' };
}

// ─────────────────────────────────────────
// markNoShow
// Marks a reservation as no_show — employee did not collect meal
// ─────────────────────────────────────────
async function markNoShow({ reservationId, tenantId, issuedByUid, issuedByRole }) {
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
    throw new Error('Cannot update a cancelled reservation.');
  }
  if (data.issueStatus !== 'pending') {
    throw new Error(`Reservation is already ${data.issueStatus}.`);
  }

  await ref.update({
    issueStatus: 'no_show',
    issuedAt: FieldValue.serverTimestamp(),
    issuedByUid,
    issuedByRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reservationId, issueStatus: 'no_show' };
}

module.exports = { createSelfBooking, getIssuanceList, issueReservation, markNoShow };
