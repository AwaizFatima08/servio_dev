// core/functions/src/notifications/notificationService.js

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { FieldValue } = require('firebase-admin/firestore');
const {
  COLLECTIONS,
  NOTIFICATION_LAYERS,
  NOTIFICATION_TARGET_TYPES,
  NOTIFICATION_STATUS,
  DELIVERY_STATUS,
  IN_APP_STATUS,
} = require('../constants');

// ─────────────────────────────────────────
// createNotification
// Creates a notification and dispatches deliveries to target users
// ─────────────────────────────────────────
async function createNotification({
  tenantId,
  createdByUid,
  createdByName,
  notificationLayer,
  notificationType,
  triggerSource,
  title,
  body,
  shortMessage,
  targetType,
  targetUserUids,
  targetRole,
  contextType,
  contextId,
  referenceType,
  referenceId,
  requiresReview,
  expiresAt,
}) {
  // --- 1. Write notifications document ---
  const notifRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
  const notificationId = notifRef.id;

  const notifDoc = {
    notificationId,
    tenantId,
    notificationLayer: notificationLayer || NOTIFICATION_LAYERS.INFORMATIONAL,
    notificationType,
    triggerSource,
    title,
    body,
    shortMessage: shortMessage || body.substring(0, 60),
    showPopupOnPublish: false,
    targetType,
    targetUserUids: targetUserUids || null,
    targetRole: targetRole || null,
    contextType: contextType || 'system',
    contextId: contextId || null,
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    status: NOTIFICATION_STATUS.PENDING,
    publishAt: FieldValue.serverTimestamp(),
    publishedAt: null,
    deliveryCountTotal: 0,
    deliveryCountInApp: 0,
    deliveryCountFailed: 0,
    createdByUid: createdByUid || null,
    createdByName: createdByName || null,
    requiresReview: requiresReview || false,
    reviewStatus: 'not_required',
    reviewedByUid: null,
    reviewedAt: null,
    expiresAt: expiresAt || null,
    isActive: true,
    isVisible: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await notifRef.set(notifDoc);

  // --- 2. Resolve target UIDs ---
  const targetUids = await resolveTargetUids({
    tenantId,
    targetType,
    targetUserUids,
    targetRole,
  });

  if (targetUids.length === 0) {
    await notifRef.update({
      status: NOTIFICATION_STATUS.PUBLISHED,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { notificationId, deliveriesCreated: 0 };
  }

  // --- 3. Create delivery documents (batch) ---
  const batch = db.batch();

  for (const uid of targetUids) {
    const deliveryRef = db.collection(COLLECTIONS.NOTIFICATION_DELIVERIES).doc();
    batch.set(deliveryRef, {
      deliveryId: deliveryRef.id,
      notificationId,
      tenantId,
      userUid: uid,
      employeeNumber: null, // populated below if available
      employeeName: null,
      notificationLayer: notifDoc.notificationLayer,
      notificationType,
      contextType: notifDoc.contextType,
      contextId: notifDoc.contextId,
      titleSnapshot: title,
      bodySnapshot: body,
      inAppEnabled: true,
      inAppStatus: IN_APP_STATUS.DELIVERED,
      inAppVisibleAt: FieldValue.serverTimestamp(),
      isRead: false,
      readAt: null,
      popupAcknowledgedAt: null,
      pushEnabled: false,
      pushStatus: 'not_applicable',
      emailEnabled: false,
      emailStatus: 'not_applicable',
      deliveryStatus: DELIVERY_STATUS.DELIVERED,
      archivedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // --- 4. Update notification status ---
  await notifRef.update({
    status: NOTIFICATION_STATUS.PUBLISHED,
    publishedAt: FieldValue.serverTimestamp(),
    deliveryCountTotal: targetUids.length,
    deliveryCountInApp: targetUids.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { notificationId, deliveriesCreated: targetUids.length };
}

// ─────────────────────────────────────────
// resolveTargetUids
// Resolves target UIDs based on targetType
// ─────────────────────────────────────────
async function resolveTargetUids({ tenantId, targetType, targetUserUids, targetRole }) {
  if (targetType === NOTIFICATION_TARGET_TYPES.SINGLE_USER) {
    return targetUserUids || [];
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.ALL_EMPLOYEES) {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();
    return snap.docs.map(doc => doc.data().uid);
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.ROLE) {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', tenantId)
      .where('role', '==', targetRole)
      .where('status', '==', 'active')
      .get();
    return snap.docs.map(doc => doc.data().uid);
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.ADMIN_ONLY) {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', tenantId)
      .where('role', 'in', ['admin', 'super_admin'])
      .where('status', '==', 'active')
      .get();
    return snap.docs.map(doc => doc.data().uid);
  }

  return [];
}

// ─────────────────────────────────────────
// getMyNotifications
// Returns unread + recent deliveries for the current user
// ─────────────────────────────────────────
async function getMyNotifications({ tenantId, uid, unreadOnly }) {
  let query = db
    .collection(COLLECTIONS.NOTIFICATION_DELIVERIES)
    .where('tenantId', '==', tenantId)
    .where('userUid', '==', uid)
    .where('archivedAt', '==', null);

  if (unreadOnly) {
    query = query.where('isRead', '==', false);
  }

  const snap = await query.get();
  return snap.docs.map(doc => doc.data());
}

// ─────────────────────────────────────────
// getUnreadCount
// Returns count of unread deliveries for bell badge
// ─────────────────────────────────────────
async function getUnreadCount({ tenantId, uid }) {
  const snap = await db
    .collection(COLLECTIONS.NOTIFICATION_DELIVERIES)
    .where('tenantId', '==', tenantId)
    .where('userUid', '==', uid)
    .where('isRead', '==', false)
    .where('archivedAt', '==', null)
    .get();

  return snap.size;
}

// ─────────────────────────────────────────
// markAsRead
// Marks a delivery as read
// ─────────────────────────────────────────
async function markAsRead({ tenantId, uid, deliveryId }) {
  const ref = db.collection(COLLECTIONS.NOTIFICATION_DELIVERIES).doc(deliveryId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error('Notification not found.');
  }

  const data = doc.data();

  if (data.tenantId !== tenantId) {
    throw new Error('Access denied.');
  }
  if (data.userUid !== uid) {
    throw new Error('You can only mark your own notifications as read.');
  }

  await ref.update({
    isRead: true,
    readAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { deliveryId, isRead: true };
}

// ─────────────────────────────────────────
// markAllAsRead
// Marks all unread deliveries as read for a user
// ─────────────────────────────────────────
async function markAllAsRead({ tenantId, uid }) {
  const snap = await db
    .collection(COLLECTIONS.NOTIFICATION_DELIVERIES)
    .where('tenantId', '==', tenantId)
    .where('userUid', '==', uid)
    .where('isRead', '==', false)
    .get();

  if (snap.empty) return { updated: 0 };

  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, {
      isRead: true,
      readAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { updated: snap.size };
}

module.exports = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};