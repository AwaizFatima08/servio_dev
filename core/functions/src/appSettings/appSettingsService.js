// ─────────────────────────────────────────────────────────────────────────────
// appSettingsService.js — App Settings Logic
// HomiLabs | Servio
//
// FILE LOCATION: functions/src/appSettings/appSettingsService.js
//
// Two operations:
//   1. getAppSettings  — read the tenant's appSettings document
//   2. updateAppSettings — admin updates configurable values
// ─────────────────────────────────────────────────────────────────────────────

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { COLLECTIONS } = require('../constants');

// Fields that are allowed to be updated by admin.
// This whitelist prevents accidental corruption of the document.
const UPDATABLE_FIELDS = [
  'mealFeedbackWindowHours',
  'eventFeedbackWindowHours',
  'notificationExpiryDays',
  'cutoffReminderMinutes',
  'billingCycleDay',
  'billingCurrency',
  'billingCurrencySymbol',
  'snapshotGenerationTime',
  'reportRetentionMonths',
  'throttleAttemptLimit',
  'throttleWindowMinutes',
  'dateDisplayFormat',
  'timeDisplayFormat',
  'defaultLanguage',
  // Bug 14 fix: contact fields for Contact Us screen
  'managerName',
  'managerPhone',
  'supportEmail',
  'supportPhone',
];

// ─────────────────────────────────────────────────────────────────────────────
// getAppSettings
// Returns the full appSettings document for the tenant
// Used by: Screen 19 — App Settings (display current values)
// Also used internally by feedback, notification, and billing services
// ─────────────────────────────────────────────────────────────────────────────
async function getAppSettings({ tenantId }) {
  const doc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();

  if (!doc.exists) {
    throw new Error(`appSettings document not found for tenant: ${tenantId}`);
  }

  return doc.data();
}

// ─────────────────────────────────────────────────────────────────────────────
// updateAppSettings
// Admin updates one or more configurable fields in appSettings
// Only whitelisted fields are accepted — unknown fields are rejected
// Used by: Screen 19 — App Settings (edit form)
// ─────────────────────────────────────────────────────────────────────────────
async function updateAppSettings({ tenantId, updates, updatedByUid }) {
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No update fields provided');
  }

  // Reject unknown fields
  const unknownFields = Object.keys(updates).filter(k => !UPDATABLE_FIELDS.includes(k));
  if (unknownFields.length > 0) {
    throw new Error(`Unknown or protected fields: ${unknownFields.join(', ')}`);
  }

  const settingsDoc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();
  if (!settingsDoc.exists) {
    throw new Error(`appSettings document not found for tenant: ${tenantId}`);
  }

  const updateData = {
    ...updates,
    lastUpdatedBy: updatedByUid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).update(updateData);

  return {
    message: 'App settings updated successfully',
    updatedFields: Object.keys(updates),
  };
}

module.exports = { getAppSettings, updateAppSettings };