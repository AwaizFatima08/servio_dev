// web/src/services/notificationService.js
// Flow 09 — Notifications (both Admin Centre and Employee view)

import { auth } from '../config/firebase';

import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /notifications/my?unreadOnly=false ────────────────────────────────
// Returns current user's notifications
// ?unreadOnly=true to get only unread
export const getMyNotifications = async (unreadOnly = false) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/notifications/my?unreadOnly=${unreadOnly}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load notifications');
  return data.notifications ?? [];
};

// ── GET /notifications/unread-count ───────────────────────────────────────
// Returns count for bell badge
export const getUnreadCount = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to get unread count');
  return data.unreadCount ?? 0;
};

// ── PATCH /notifications/:deliveryId/read ─────────────────────────────────
// Mark a single delivery as read
export const markAsRead = async (deliveryId) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/notifications/${deliveryId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark as read');
  return data;
};

// ── PATCH /notifications/mark-all-read ────────────────────────────────────
// Mark all unread deliveries as read
export const markAllAsRead = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/notifications/mark-all-read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark all as read');
  return data;
};

// ── POST /notifications ───────────────────────────────────────────────────
// Admin only — create and dispatch a notification
// body: { title, body, targetType, targetRole?, targetUserUids?,
//         notificationType, shortMessage, contextType, contextId? }
export const sendNotification = async (payload) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send notification');
  return data;
};
