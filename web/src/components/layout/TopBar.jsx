// ─────────────────────────────────────────
// TopBar.jsx — Persistent Top Navigation
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './TopBar.module.css';

// ── Meal status logic ──
// Returns which meal is currently open, or the next one, or null if all done today
function getMealStatus() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;

  // Breakfast: 06:00–09:00, booking cutoff is 03:00 (i.e. window was overnight)
  // We show "open" if we're inside the service window
  const meals = [
    { label: 'Breakfast', start: 360, end: 540 },   // 06:00–09:00
    { label: 'Lunch',     start: 780, end: 900 },    // 13:00–15:00
    { label: 'Dinner',    start: 1140, end: 1320 },  // 19:00–22:00
  ];

  for (const meal of meals) {
    if (total >= meal.start && total < meal.end) {
      return { label: meal.label, open: true };
    }
  }

  // Find next upcoming meal
  for (const meal of meals) {
    if (total < meal.start) {
      const diffMins = meal.start - total;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const timeStr = hrs > 0 ? `in ${hrs}h ${mins}m` : `in ${mins}m`;
      return { label: `${meal.label} ${timeStr}`, open: false };
    }
  }

  return { label: 'All meals done today', open: false };
}

// ── Notifications dropdown ──
function NotificationsPanel({ onClose, unreadCount }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className={styles.notifPanel} ref={panelRef}>
      <div className={styles.notifHeader}>
        <span>Notifications {unreadCount > 0 && `(${unreadCount} unread)`}</span>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn}>Mark all read</button>
        )}
      </div>
      <div className={styles.notifEmpty}>
        <i className="ti ti-bell-off" style={{ fontSize: 24, color: '#3DBFA0' }} />
        <p>No new notifications</p>
      </div>
      <div className={styles.notifFooter}>
        Servio v1.0 · FFL Management Club
      </div>
    </div>
  );
}

export default function TopBar({ onMenuToggle }) {
  const { logout } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [mealStatus, setMealStatus] = useState(getMealStatus());
  const unreadCount = 0; // will be wired to real data in Phase B

  // Refresh meal status every minute
  useEffect(() => {
    const id = setInterval(() => setMealStatus(getMealStatus()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className={styles.topBar}>
      {/* ── Left: menu toggle + brand ── */}
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} title="Toggle sidebar">
          <i className="ti ti-menu-2" />
        </button>
        <span className={styles.brandName}>Servio</span>
      </div>

      {/* ── Centre: meal status pill ── */}
      <div className={styles.centre}>
        <div className={`${styles.mealPill} ${mealStatus.open ? styles.mealOpen : styles.mealClosed}`}>
          <span className={`${styles.dot} ${mealStatus.open ? styles.dotOpen : styles.dotClosed}`} />
          {mealStatus.label}
        </div>
      </div>

      {/* ── Right: icons ── */}
      <div className={styles.right}>
        {/* Bell */}
        <div className={styles.iconWrap}>
          <button
            className={styles.iconBtn}
            title="Notifications"
            onClick={() => setShowNotif(p => !p)}
          >
            <i className="ti ti-bell" />
            {unreadCount > 0 && <span className={styles.goldDot} />}
          </button>
          {showNotif && (
            <NotificationsPanel
              onClose={() => setShowNotif(false)}
              unreadCount={unreadCount}
            />
          )}
        </div>

        {/* Help */}
        <button className={styles.iconBtn} title="Help">
          <i className="ti ti-help-circle" />
        </button>

        {/* Logout */}
        <button
          className={`${styles.iconBtn} ${styles.logoutBtn}`}
          title="Logout"
          onClick={logout}
        >
          <i className="ti ti-logout" />
        </button>
      </div>
    </header>
  );
}
