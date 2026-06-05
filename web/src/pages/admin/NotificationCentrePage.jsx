// web/src/pages/admin/NotificationCentrePage.jsx
// Screen 14 — Admin Notification Centre
// Flow 09: view all notifications + send manual notification to all/role

import { useState, useEffect, useCallback } from 'react';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
} from '../../services/notificationService';
import NotificationList from '../../components/common/NotificationList';
import styles from './NotificationCentrePage.module.css';

const ROLES = [
  { value: 'employee',           label: 'All Employees' },
  { value: 'mess_supervisor',    label: 'Mess Supervisors' },
  { value: 'accounts_supervisor',label: 'Accounts Supervisors' },
  { value: 'manager',            label: 'Managers' },
  { value: 'admin',              label: 'Admins' },
];

export default function NotificationCentrePage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [successMsg, setSuccessMsg]       = useState('');

  // Compose form
  const [showCompose, setShowCompose]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [form, setForm] = useState({
    title:      '',
    body:       '',
    targetType: 'all_employees',
    targetRole: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyNotifications(false);
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.isRead).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message are required.');
      return;
    }
    setSending(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        title:            form.title.trim(),
        body:             form.body.trim(),
        targetType:       form.targetType,
        targetRole:       form.targetType === 'role' ? form.targetRole : undefined,
        notificationType: 'informational',
        notificationLayer:'informational',
        triggerSource:    'admin_manual',
      };
      const result = await sendNotification(payload);
      setSuccessMsg(`Notification sent to ${result?.deliveriesCreated ?? 0} user(s).`);
      setForm({ title: '', body: '', targetType: 'all_employees', targetRole: '' });
      setShowCompose(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notification Centre</h1>
          <p className={styles.subtitle}>View and send system notifications</p>
        </div>
        <button
          className={styles.composeBtn}
          onClick={() => setShowCompose(v => !v)}
        >
          <i className={`ti ${showCompose ? 'ti-x' : 'ti-send'}`} />
          {showCompose ? 'Cancel' : 'Send Notification'}
        </button>
      </div>

      {/* Banners */}
      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {successMsg && (
        <div className={styles.successBanner}>
          <i className="ti ti-circle-check" /> {successMsg}
        </div>
      )}

      {/* Compose panel */}
      {showCompose && (
        <div className={styles.composePanel}>
          <div className={styles.composeTitle}>Send Notification</div>

          <div className={styles.formRow}>
            <label className={styles.label}>Send to</label>
            <select
              value={form.targetType}
              onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))}
              className={styles.select}
            >
              <option value="all_employees">All employees</option>
              <option value="role">Specific role</option>
              <option value="admin_only">Admins only</option>
            </select>
          </div>

          {form.targetType === 'role' && (
            <div className={styles.formRow}>
              <label className={styles.label}>Role</label>
              <select
                value={form.targetRole}
                onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}
                className={styles.select}
              >
                <option value="">Select role…</option>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formRow}>
            <label className={styles.label}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={styles.input}
              placeholder="Short heading…"
              maxLength={80}
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Message</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className={styles.textarea}
              placeholder="Full message text…"
              rows={3}
              maxLength={400}
            />
          </div>

          <div className={styles.composeActions}>
            <span className={styles.charCount}>{form.body.length}/400</span>
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={sending || !form.title.trim() || !form.body.trim()}
            >
              {sending ? (
                <><div className={styles.spinnerSm} /> Sending…</>
              ) : (
                <><i className="ti ti-send" /> Send</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notification list */}
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
