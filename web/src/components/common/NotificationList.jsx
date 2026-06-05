// web/src/components/common/NotificationList.jsx
// Shared component — used by Screen 14 (Admin) and Screen 18 (Employee)
// Props:
//   notifications  — array of delivery objects
//   onMarkRead     — fn(deliveryId)
//   onMarkAllRead  — fn()
//   loading        — bool
//   unreadCount    — number

import styles from './NotificationList.module.css';
import { timeAgo } from '../../utils/dateUtils';

const LAYER_COLORS = {
  transactional: '#0F6E56',
  informational: '#3DBFA0',
  alert:         '#D4960A',
};

const TYPE_ICONS = {
  booking_confirmed:        'ti-calendar-check',
  booking_cancelled_self:   'ti-calendar-x',
  booking_cancelled_proxy:  'ti-calendar-x',
  booking_issued:           'ti-circle-check',
  cutoff_reminder:          'ti-clock',
  event_published:          'ti-calendar-event',
  event_response_reminder:  'ti-bell',
  event_cancelled:          'ti-calendar-off',
  event_feedback_prompt:    'ti-star',
  account_activated:        'ti-user-check',
  role_changed:             'ti-user-cog',
  new_signup:               'ti-user-plus',
  pending_rate_entry:       'ti-coin',
  monthly_bill_available:   'ti-file-invoice',
  default:                  'ti-bell',
};

export default function NotificationList({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  loading,
  unreadCount = 0,
}) {
  const icon = (type) => TYPE_ICONS[type] || TYPE_ICONS.default;
  const color = (layer) => LAYER_COLORS[layer] || LAYER_COLORS.informational;

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>
          Notifications
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </span>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={onMarkAllRead}>
            <i className="ti ti-checks" /> Mark all read
          </button>
        )}
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <div className={styles.spinner} />
          <span>Loading notifications…</span>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className={styles.emptyState}>
          <i className="ti ti-bell-off" />
          <p>No notifications yet.</p>
        </div>
      )}

      {!loading && notifications.map(n => (
        <div
          key={n.deliveryId}
          className={`${styles.notifRow} ${!n.isRead ? styles.unread : ''}`}
          onClick={() => !n.isRead && onMarkRead(n.deliveryId)}
        >
          {/* Icon */}
          <div
            className={styles.iconBox}
            style={{ background: color(n.notificationLayer) + '18', color: color(n.notificationLayer) }}
          >
            <i className={`ti ${icon(n.notificationType)}`} />
          </div>

          {/* Body */}
          <div className={styles.notifBody}>
            <div className={styles.notifTitle}>{n.titleSnapshot}</div>
            <div className={styles.notifMsg}>{n.bodySnapshot}</div>
            <div className={styles.notifMeta}>
              {timeAgo(n.inAppVisibleAt || n.createdAt)}
              {!n.isRead && <span className={styles.unreadDot} />}
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}
