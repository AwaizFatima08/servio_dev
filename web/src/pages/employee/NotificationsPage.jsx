// web/src/pages/employee/NotificationsPage.jsx
// Screen 18 — Employee Notifications
// Flow 09: view and read own notifications

import { useState, useEffect, useCallback } from 'react';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';
import NotificationList from '../../components/common/NotificationList';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError]                 = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyNotifications(showUnreadOnly);
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.isRead).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (deliveryId) => {
    try {
      await markAsRead(deliveryId);
      setNotifications(prev =>
        prev.map(n => n.deliveryId === deliveryId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Your recent alerts and updates</p>
        </div>
        <button
          className={`${styles.filterBtn} ${showUnreadOnly ? styles.filterActive : ''}`}
          onClick={() => setShowUnreadOnly(v => !v)}
        >
          <i className="ti ti-filter" />
          {showUnreadOnly ? 'All' : 'Unread only'}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <NotificationList
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        loading={loading}
        unreadCount={unreadCount}
      />

    </div>
  );
}
