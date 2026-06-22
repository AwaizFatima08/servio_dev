// web/src/pages/employee/MyCafeOrdersPage.jsx
// V1.2 Web Slice 2.4 — My Café Orders (consolidated, collapsible, cancellable)
// HomiLabs | Servio
//
// Replaces the 2.2 one-tile-per-document layout. Orders are now grouped by
// bookingGroupId into ONE collapsible row per order:
//
//   Collapsed line: Order No. · date/time · "Order placed by - <consumer>"
//                   (+ "through proxy booking" when a supervisor booked) ·
//                   status · item count · chevron · Cancel (anytime_takeaway only).
//   Expanded:       each item line (name × qty, amount or "Rate pending") with a
//                   per-line Cancel where the rules permit.
//
// Cancellation rules (match the deployed backend — no edit feature exists):
//   - cafe_hours (dine-in / live takeaway): 30-min serving window, kitchen
//     commits immediately → NEVER employee-cancellable. No cancel button shown.
//   - anytime_takeaway: cancellable while now < cancellationWindowExpiresAt.
//   To change a cafe_hours order, the employee cancels (if anytime) or places a
//   new top-up order — there is no edit.
//
// Grouping: orders sharing a bookingGroupId form one order. Orders with a null/
// absent bookingGroupId (legacy single-item path) are standalone one-item orders.
//
// Token: Pattern B — `token` prop from <WithToken>.

import { useState, useEffect, useCallback } from 'react';
import { listMyOrders, cancelOrder } from '../../services/cafeService';
import styles from './MyCafeOrdersPage.module.css';

const ORDER_TYPE_LABELS = {
  cafe_hours:       'Café Hours',
  anytime_takeaway: 'Anytime Takeaway',
};
const DINING_MODE_LABELS = {
  dine_in: 'Dine-in', takeaway: 'Takeaway', outdoor_seating: 'Outdoor',
};
const STATUS_CONFIG = {
  placed:    { label: 'Placed',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  accepted:  { label: 'Accepted',  color: '#0F6E56', bg: '#EBF9F4', border: '#C6F0E5' },
  cancelled: { label: 'Cancelled', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};
const CANCEL_REASONS = [
  { value: 'employee_request', label: 'Changed my mind' },
  { value: 'data_correction',  label: 'Ordered by mistake' },
  { value: 'other',            label: 'Other' },
];

const FETCH_DAYS = 90;

// ── Timestamp coercion (Firestore {_seconds,_nanoseconds} | ISO | ms | null) ──
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

const pktToday   = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const pktDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }); };
const pktDayOf   = (ts) => { const d = toDate(ts); return d ? d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : '—'; };
const formatGroupDate = (ymd) => {
  if (!ymd || ymd === '—') return 'Unknown date';
  return new Date(ymd + 'T00:00:00+05:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
};
const formatTime = (ts) => {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true });
};

// Is an anytime_takeaway order still within its cancellation window?
const isCancellable = (order) => {
  if (order.orderType !== 'anytime_takeaway') return false; // cafe_hours never employee-cancellable
  if (order.orderStatus === 'cancelled') return false;
  const exp = toDate(order.cancellationWindowExpiresAt);
  if (!exp) return false;
  return Date.now() < exp.getTime();
};

// Short, human-ish order reference from the (long) Firestore id.
const shortRef = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : '#——————');

// ── Group flat order docs into orders-by-bookingGroupId ──
// Returns array of { groupId, lines[], createdAt, orderType, diningMode,
//   requestedPickupTime, consumerType, consumerName, createdByRole, status }
function groupOrders(flat) {
  const groups = new Map();
  for (const o of flat) {
    // null/absent bookingGroupId → standalone; key on orderId so it stands alone.
    const key = o.bookingGroupId || `solo:${o.orderId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        groupId: o.bookingGroupId || o.orderId,
        isSolo: !o.bookingGroupId,
        lines: [],
        createdAt: o.createdAt,
        orderType: o.orderType,
        diningMode: o.diningMode,
        requestedPickupTime: o.requestedPickupTime,
        requestedPickupDate: o.requestedPickupDate,
        consumerType: o.consumerType,
        consumerName: o.consumerName,
        createdByRole: o.createdByRole,
      });
    }
    groups.get(key).lines.push(o);
  }
  // Derive a single status per group: cancelled only if ALL lines cancelled;
  // accepted if any accepted; else placed.
  for (const g of groups.values()) {
    const statuses = g.lines.map((l) => l.orderStatus);
    if (statuses.every((s) => s === 'cancelled')) g.status = 'cancelled';
    else if (statuses.some((s) => s === 'accepted')) g.status = 'accepted';
    else g.status = 'placed';
  }
  return Array.from(groups.values());
}

// Is this booker a supervisor (→ "through proxy booking")?
const isProxyRole = (role) =>
  !!role && role !== 'employee'; // employee self-order vs any supervisor/admin proxy

export default function MyCafeOrdersPage({ token }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [tab, setTab] = useState('active'); // 'active' | 'history'
  const [fromDate, setFromDate] = useState(pktDaysAgo(30));
  const [toDateStr, setToDateStr] = useState(pktToday());

  const [expanded, setExpanded] = useState({}); // { [groupId]: bool }

  // Cancel modal: { mode:'order'|'line', group, order? }
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('employee_request');
  const [cancelNote, setCancelNote]     = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await listMyOrders(token, FETCH_DAYS);
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Filter by tab status + visible date range, then group.
  const visibleFlat = orders.filter((o) => {
    const day = pktDayOf(o.createdAt);
    const inRange = day === '—' ? true : (day >= fromDate && day <= toDateStr);
    return inRange;
  });

  const groupsAll = groupOrders(visibleFlat);
  const groups = groupsAll.filter((g) =>
    tab === 'active' ? g.status !== 'cancelled' : g.status === 'cancelled'
  );

  // Group by PKT creation day, newest first.
  const byDay = groups.reduce((acc, g) => {
    const day = pktDayOf(g.createdAt);
    (acc[day] = acc[day] || []).push(g);
    return acc;
  }, {});
  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ── Cancel handlers ──
  const openCancelOrder = (group) => { setCancelTarget({ mode: 'order', group }); setCancelReason('employee_request'); setCancelNote(''); setSuccessMsg(''); };
  const openCancelLine  = (group, order) => { setCancelTarget({ mode: 'line', group, order }); setCancelReason('employee_request'); setCancelNote(''); setSuccessMsg(''); };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError('');
    try {
      if (cancelTarget.mode === 'line') {
        await cancelOrder(token, cancelTarget.order.orderId, cancelReason, cancelNote);
        setSuccessMsg('Item cancelled.');
      } else {
        // Whole order: cancel every still-cancellable line in the group.
        const targets = cancelTarget.group.lines.filter(isCancellable);
        for (const line of targets) {
          await cancelOrder(token, line.orderId, cancelReason, cancelNote);
        }
        setSuccessMsg(`Order cancelled (${targets.length} item${targets.length === 1 ? '' : 's'}).`);
      }
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Café Orders</h1>
          <p className={styles.subtitle}>Your café orders and history</p>
        </div>
        <div className={styles.dateRange}>
          <input type="date" value={fromDate} max={toDateStr}
            onChange={(e) => setFromDate(e.target.value)} className={styles.datePicker} />
          <span className={styles.dateSep}>to</span>
          <input type="date" value={toDateStr} min={fromDate} max={pktToday()}
            onChange={(e) => setToDateStr(e.target.value)} className={styles.datePicker} />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`} onClick={() => setTab('active')}>
          <i className="ti ti-coffee" /> Active Orders
        </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <i className="ti ti-history" /> History
        </button>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}
      {successMsg && <div className={styles.successBanner}><i className="ti ti-circle-check" /> {successMsg}</div>}

      {loading && <div className={styles.loadingBlock}><div className={styles.spinner} /> <span>Loading…</span></div>}

      {!loading && groups.length === 0 && !error && (
        <div className={styles.emptyState}>
          <i className={tab === 'active' ? 'ti ti-coffee-off' : 'ti ti-history'} />
          <p>{tab === 'active' ? 'No active café orders in this date range.' : 'No café order history in this date range.'}</p>
        </div>
      )}

      {/* Grouped, collapsible orders */}
      {!loading && sortedDays.map((day) => (
        <div key={day} className={styles.dateGroup}>
          <div className={styles.dateGroupLabel}>{formatGroupDate(day)}</div>

          {byDay[day].map((g) => {
            const statusCfg = STATUS_CONFIG[g.status] || STATUS_CONFIG.placed;
            const typeLabel = ORDER_TYPE_LABELS[g.orderType] || g.orderType;
            const modeLabel = DINING_MODE_LABELS[g.diningMode] || g.diningMode;
            const isOpen    = !!expanded[g.groupId];
            const totalQty  = g.lines.reduce((s, l) => s + (l.quantity || 0), 0);
            const proxy     = isProxyRole(g.createdByRole);
            const orderCancellable = g.lines.some(isCancellable);

            // Consumer label: only show when NOT a plain self order (the case the
            // label was designed to surface). Self orders stay clean.
            const showPlacedBy = g.consumerType === 'family_member' || proxy;

            return (
              <div key={g.groupId} className={styles.orderCard}>
                {/* Collapsed line (click to expand) */}
                <button type="button" className={styles.orderHead} onClick={() => toggle(g.groupId)}>
                  <div className={styles.orderHeadLeft}>
                    <div className={styles.orderTopRow}>
                      <span className={styles.orderRef}>{shortRef(g.groupId)}</span>
                      <span className={styles.orderTime}>{formatTime(g.createdAt)}</span>
                      <span className={styles.orderTypeTag}><i className="ti ti-coffee" /> {typeLabel}</span>
                    </div>
                    {showPlacedBy && (
                      <div className={styles.placedBy}>
                        Order placed by - {g.consumerName}
                        {proxy && <span className={styles.proxyTag}> · through proxy booking</span>}
                      </div>
                    )}
                    <div className={styles.orderMeta}>
                      {modeLabel} · {g.lines.length} item{g.lines.length === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className={styles.orderHeadRight}>
                    <span className={styles.statusPill}
                      style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
                      {statusCfg.label}
                    </span>
                    <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'} ${styles.chevron}`} />
                  </div>
                </button>

                {/* Collapsed-line Cancel (whole order) — anytime_takeaway in window only */}
                {orderCancellable && (
                  <div className={styles.orderHeadActions}>
                    <button type="button" className={styles.cancelOrderBtn}
                      onClick={(e) => { e.stopPropagation(); openCancelOrder(g); }}>
                      <i className="ti ti-x" /> Cancel order
                    </button>
                  </div>
                )}

                {/* Expanded detail */}
                {isOpen && (
                  <div className={styles.orderLines}>
                    {g.lines.map((line) => {
                      const lineCancellable = isCancellable(line);
                      const lineCancelled = line.orderStatus === 'cancelled';
                      return (
                        <div key={line.orderId} className={`${styles.lineRow} ${lineCancelled ? styles.lineCancelled : ''}`}>
                          <div className={styles.lineLeft}>
                            <span className={styles.lineName}>{line.itemName}</span>
                            <span className={styles.lineQty}>×{line.quantity}</span>
                          </div>
                          <div className={styles.lineRight}>
                            {lineCancelled ? (
                              <span className={styles.lineCancelledTag}>Cancelled</span>
                            ) : line.amount != null ? (
                              <span className={styles.lineAmount}>Rs. {line.amount.toLocaleString()}</span>
                            ) : (
                              <span className={styles.lineRatePending}>Rate pending</span>
                            )}
                            {lineCancellable && (
                              <button type="button" className={styles.lineCancelBtn}
                                onClick={() => openCancelLine(g, line)} title="Cancel this item">
                                <i className="ti ti-x" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {g.requestedPickupTime && (
                      <div className={styles.pickupRow}>
                        <i className="ti ti-clock" /> Pickup{' '}
                        {g.requestedPickupDate && g.requestedPickupDate !== pktDayOf(g.createdAt)
                          ? `${formatGroupDate(g.requestedPickupDate)}, ${g.requestedPickupTime}`
                          : g.requestedPickupTime}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className={styles.modalOverlay} onClick={() => !cancelling && setCancelTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              {cancelTarget.mode === 'line' ? 'Cancel item' : 'Cancel order'}
            </div>
            <p className={styles.modalDesc}>
              {cancelTarget.mode === 'line'
                ? <>Cancel <strong>{cancelTarget.order.itemName}</strong> (×{cancelTarget.order.quantity})?</>
                : <>Cancel this whole order? Only items still within their cancellation window will be cancelled.</>}
            </p>

            <div className={styles.formRow}>
              <label className={styles.label}>Reason</label>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={styles.select}>
                {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {cancelReason === 'other' && (
              <div className={styles.formRow}>
                <label className={styles.label}>Note (optional)</label>
                <input type="text" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)}
                  className={styles.input} placeholder="Brief reason…" maxLength={100} />
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setCancelTarget(null)} disabled={cancelling}>
                Keep order
              </button>
              <button className={styles.modalConfirmBtn} onClick={confirmCancel} disabled={cancelling}>
                {cancelling ? <><div className={styles.spinnerSm} /> Cancelling…</> : <><i className="ti ti-x" /> Yes, cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
