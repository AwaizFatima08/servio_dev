// core/functions/src/notifications/notificationRoutes.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('./notificationService');

const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.ACCOUNTS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

const adminOnly = [verifyToken, verifyRole(
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

/**
 * POST /notifications
 * Admin creates a notification
 * Admin / super_admin only
 */
router.post('/', adminOnly, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const createdByName = req.officialEmployeeNumber;

    const {
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
    } = req.body;

    const missing = ['notificationType', 'title', 'body', 'targetType']
      .filter(f => !req.body[f]);
    if (missing.length > 0) {
      return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    const validTargetTypes = ['single_user', 'role', 'all_employees', 'admin_only'];
    if (!validTargetTypes.includes(targetType)) {
      return errorResponse(res, `Invalid targetType. Valid: ${validTargetTypes.join(', ')}`, 400);
    }

    if (targetType === 'single_user' && (!targetUserUids || targetUserUids.length === 0)) {
      return errorResponse(res, 'targetUserUids required for single_user targetType.', 400);
    }
    if (targetType === 'role' && !targetRole) {
      return errorResponse(res, 'targetRole required for role targetType.', 400);
    }

    const result = await createNotification({
      tenantId,
      createdByUid: uid,
      createdByName,
      notificationLayer,
      notificationType: notificationType || 'system',
      triggerSource: triggerSource || 'admin_manual',
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
      requiresReview: false,
    });

    return res.status(201).json({
      message: 'Notification created and dispatched.',
      result,
    });

  } catch (error) {
    console.error('Create notification error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * GET /notifications/my
 * Get current user's notifications
 * Any authenticated user
 * Query: ?unreadOnly=true
 */
router.get('/my', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await getMyNotifications({ tenantId, uid, unreadOnly });

    return res.status(200).json({
      count: notifications.length,
      notifications,
    });

  } catch (error) {
    console.error('Get notifications error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * GET /notifications/unread-count
 * Get unread count for bell badge
 * Any authenticated user
 */
router.get('/unread-count', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;

    const count = await getUnreadCount({ tenantId, uid });

    return res.status(200).json({ unreadCount: count });

  } catch (error) {
    console.error('Get unread count error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * PATCH /notifications/:deliveryId/read
 * Mark a notification as read
 * Any authenticated user
 */
router.patch('/:deliveryId/read', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { deliveryId } = req.params;

    const result = await markAsRead({ tenantId, uid, deliveryId });

    return res.status(200).json({
      message: 'Notification marked as read.',
      result,
    });

  } catch (error) {
    console.error('Mark read error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * PATCH /notifications/mark-all-read
 * Mark all notifications as read
 * Any authenticated user
 */
router.patch('/mark-all-read', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;

    const result = await markAllAsRead({ tenantId, uid });

    return res.status(200).json({
      message: 'All notifications marked as read.',
      result,
    });

  } catch (error) {
    console.error('Mark all read error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;