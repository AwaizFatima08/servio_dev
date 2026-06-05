import api from './api';

export const getUnreadCount = async () => {
  const res = await api.get('/notifications/unread-count');
  return res.data; // { unreadCount: N }
};

export const getMyNotifications = async (unreadOnly = false) => {
  const res = await api.get(`/notifications/my${unreadOnly ? '?unreadOnly=true' : ''}`);
  return res.data; // { count, notifications }
};

export const markAsRead = async (deliveryId) => {
  const res = await api.patch(`/notifications/${deliveryId}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await api.patch('/notifications/mark-all-read');
  return res.data;
};
