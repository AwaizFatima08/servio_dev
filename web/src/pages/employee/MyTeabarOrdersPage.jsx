// ─────────────────────────────────────────
// MyTeabarOrdersPage.jsx — Tea Bar My Order History (Screen 2)
// HomiLabs | Servio | Web
// FILE LOCATION: web/src/pages/employee/MyTeabarOrdersPage.jsx
//
// Reads GET /teabar/orders/history/mine (backend, confirmed by direct read
// 08-Jul-2026) — always the caller's own last-30-days history, self and
// proxy only (official orders are excluded server-side; nothing to filter
// here for that).
//
// Simplifications versus MyCafeOrdersPage.jsx (deliberate, not oversights):
//   - No per-line cancel. cancelTeabarOrderGroup cancels every line in a
//     bookingGroupId atomically, all-or-nothing (confirmed by reading the
//     function's write step) — so there is exactly one Cancel button per
//     card, never one per item.
//   - No cancel-reason picker. The backend route takes no reason/note
//     field at all — a plain window.confirm() is used instead, matching
//     the existing pattern already in TeabarLocationsPage.jsx's unassign
//     action, rather than inventing a modal around data the backend
//     doesn't accept.
//   - No amount / "Rate pending" per line. getEmployeeTeabarHistory's
//     item objects only carry { orderId, itemId, itemName, quantity,
//     baseUnit } — no unitRate or amount field exists in this response.
//     Not shown here because the data genuinely isn't there yet, not
//     because it was forgotten.
//   - No date-range picker — the backend always returns a fixed last-30-
//     days window with no parameter to widen it.
//   - No collapse/expand — Tea Bar orders carry far less session detail
//     than café's (no order type, dining mode, or pickup time), so every
//     card is shown fully open.
//
// Tab split (my own default, not explicitly locked on paper — confirm or
// correct): "Active" = orderStatus 'placed' AND issueStatus not 'issued'.
// "History" = everything else (cancelled, or already handed over).
// ─────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getMyTeabarHistory, cancelTeabarOrder } from '../../services/teabarOrderService';
import styles from './MyTeabarOrdersPage.module.css';

const STATUS_CONFIG = {
  placed:    { label: 'Placed',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  cancelled: { label: 'Cancelled', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};
const ISSUE_CONFIG = {
  pending: { label: 'Pending pickup', color: '#D4960A', bg: '#fff8ea', border: '#f3d489' },
  issued:  { label: 'Handed over',    color: '#0F6E56', bg: '#EBF9F4', border: '#C6F0E5' },
};

// ── Timestamp coercion — identical to MyCafeOrdersPage.jsx's toDate() ──
// Same Firestore Timestamp shape crosses the wire either way (via the same
// successResponse() JSON serialization), so the same helper applies as-is.
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === 'string') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'number') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  const secs = v._seconds ?? v.seconds;
  if (typeof secs === 'number') {
    const nanos = v._nanoseconds ?? v.nanoseconds ?? 0;
    return new Date(secs * 1000 + Math.floor(nanos / 1e6));
  }
  return null;
};

const formatGroupDate = (ymd) => {
  if (!ymd || ymd === '—') return 'Unknown date';
  return new Date(ymd + 'T00:00:00+05:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
};
const formatTime = (ts) => {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true });
};

const shortRef = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : '#——————');

// A group qualifies for cancellation exactly when the backend's own hard
// gate would allow it — mirrored here only to decide whether to SHOW the
// button, never trusted instead of the backend's real check.
const isCancellable = (g) => g.orderStatus === 'placed' && g.issueStatus !== 'issued';

// ─────────────────────────────────────────
// OrderCard — one bookingGroupId, fully expanded (no collapse).
// ─────────────────────────────────────────
function OrderCard({ group, onCancel, cancellingId }) {
  const statusCfg = STATUS_CONFIG[group.orderStatus] || STATUS_CONFIG.placed;
  const issueCfg  = ISSUE_CONFIG[group.issueStatus] || ISSUE_CONFIG.pending;
  const totalQty  = group.items.reduce((s, i) => s + (i.quantity || 0), 0);
  const eligible  = isCancellable(group);
  const isCancelling = cancellingId === group.bookingGroupId;

  return (
    <div className={styles.orderCard}>
      <div className={styles.orderHead}>
        <div className={styles.orderHeadLeft}>
          <div className={styles.orderTopRow}>
            <span className={styles.orderRef}>{shortRef(group.bookingGroupId)}</span>
            <span className={styles.orderTime}>{formatTime(group.createdAt)}</span>
          </div>
          <div className={styles.locationLine}>
            <i className="ti ti-map-pin" /> {group.locationName}
          </div>
          <div className={styles.orderMeta}>
            {group.items.length} item{group.items.length === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}
          </div>
        </div>
        <div className={styles.orderHeadRight}>
          <span className={styles.statusPill}
            style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
            {statusCfg.label}
          </span>
          {group.orderStatus !== 'cancelled' && (
            <span className={styles.statusPill}
              style={{ color: issueCfg.color, background: issueCfg.bg, border: `1px solid ${issueCfg.border}` }}>
              {issueCfg.label}
            </span>
          )}
        </div>
      </div>

      <div className={styles.orderLines}>
        {group.items.map((it) => (
          <div key={it.orderId} className={styles.lineRow}>
            <div className={styles.lineLeft}>
              <span className={styles.lineName}>{it.itemName}</span>
              <span className={styles.lineQty}>×{it.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {eligible && (
        <div className={styles.orderHeadActions}>
          <button
            type="button"
            className={styles.cancelOrderBtn}
            onClick={() => onCancel(group)}
            disabled={isCancelling}
          >
            {isCancelling
              ? <><span className={styles.spinnerSm} /> Cancelling…</>
              : <><i className="ti ti-x" /> Cancel order</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MyTeabarOrdersPage — main page component.
// ─────────────────────────────────────────
export default function MyTeabarOrdersPage({ token }) {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('active'); // 'active' | 'history'
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await getMyTeabarHistory(token);
      setGroups(Array.isArray(data?.groups) ? data.groups : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = groups.filter((g) => (tab === 'active' ? isCancellable(g) : !isCancellable(g)));

  // Group by orderDate (already a plain YYYY-MM-DD string — no coercion
  // needed, unlike createdAt), newest day first; within a day, newest first.
  const byDay = filtered.reduce((acc, g) => {
    const day = g.orderDate || '—';
    (acc[day] = acc[day] || []).push(g);
    return acc;
  }, {});
  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
  sortedDays.forEach((day) => {
    byDay[day].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  });

  const handleCancel = async (group) => {
    const confirmed = window.confirm(
      `Cancel this order (${group.items.length} item${group.items.length === 1 ? '' : 's'}) from ${group.locationName}?`
    );
    if (!confirmed) return;
    setCancellingId(group.bookingGroupId);
    setError('');
    try {
      await cancelTeabarOrder(token, group.bookingGroupId);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Tea Bar Orders</h1>
          <p className={styles.subtitle}>Your orders from the last 30 days</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`} onClick={() => setTab('active')}>
          <i className="ti ti-cup" /> Active Orders
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <i className="ti ti-history" /> History
        </button>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} /> <span>Loading…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className={styles.emptyState}>
          <i className={tab === 'active' ? 'ti ti-cup-off' : 'ti ti-history'} />
          <p>{tab === 'active' ? 'No active Tea Bar orders.' : 'No Tea Bar order history yet.'}</p>
        </div>
      )}

      {!loading && sortedDays.map((day) => (
        <div key={day} className={styles.dateGroup}>
          <div className={styles.dateGroupLabel}>{formatGroupDate(day)}</div>
          {byDay[day].map((g) => (
            <OrderCard key={g.bookingGroupId} group={g} onCancel={handleCancel} cancellingId={cancellingId} />
          ))}
        </div>
      ))}
    </div>
  );
}