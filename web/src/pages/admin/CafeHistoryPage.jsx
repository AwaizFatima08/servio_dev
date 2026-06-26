// web/src/pages/admin/CafeHistoryPage.jsx
// Café Order History — V1.2 Web Slice 6
// Role (nav): cafe_supervisor | manager.  Backend also admits cafe_waiter,
// legacy, admin, super_admin — they can reach this via URL; the API is the
// access authority. Path: /cafe-history
//
// READ-ONLY. The supervisor's "what happened?" tool — a paginated, newest-first
// list of PAST café orders for dispute-lookup and audit. Deliberately distinct
// from CafeKitchenPage (the live board): NO auto-refresh, NO 30s interval, NO
// accept/prepare actions, NO pickup-sort, NO overrun flag. None of the live
// board's state machine leaks in here (Slice 6 design-lock).
//
// This sub-slice: DEFAULTS ONLY — 7-day window, cancelled excluded. The
// single-day picker and include-cancelled toggle are the next sub-slice.
//
// Paging: cursor-based "Load more". Each page of 25 is APPENDED to what we
// already show; nextCursor/hasMore come from the backend. "Refresh" resets to
// page 1. No infinite scroll — one explicit button, one page at a time.

import { useState, useEffect, useCallback } from 'react';
import { getCafeOrderHistory } from '../../services/cafeHistoryService';
import styles from './CafeHistoryPage.module.css';

const STATUS_LABELS = {
  placed: 'Placed',
  accepted: 'Accepted',
  prepared: 'Prepared',
  cancelled: 'Cancelled',
};

const DINING_LABELS = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  outdoor_seating: 'Outdoor',
};

function statusLabel(s) {
  return STATUS_LABELS[s] || s || '';
}

function dilabel(mode) {
  return DINING_LABELS[mode] || mode || '';
}

// createdAt may arrive as a Firestore-serialised value or an ISO string over
// the wire. Render defensively: show a readable PKT date-time, or '—' if absent.
function fmtCreatedAt(createdAt) {
  if (!createdAt) return '—';
  // Over REST, Firestore Timestamps usually serialise to ISO strings or
  // { _seconds, _nanoseconds }. Handle both, plus a plain Date/ISO.
  let d;
  if (typeof createdAt === 'string') {
    d = new Date(createdAt);
  } else if (createdAt._seconds != null) {
    d = new Date(createdAt._seconds * 1000);
  } else if (createdAt.seconds != null) {
    d = new Date(createdAt.seconds * 1000);
  } else {
    d = new Date(createdAt);
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CafeHistoryPage({ token }) {
  const [orders, setOrders] = useState([]);       // accumulated across pages
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);    // first-page / refresh load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Load page 1 (cursor = null). Replaces the list. Used on mount + Refresh.
  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCafeOrderHistory(token); // defaults: 7d, no cancelled
      setOrders(data.orders || []);
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load the next page using the held cursor. APPENDS to the list.
  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError('');
    try {
      const data = await getCafeOrderHistory(token, { cursor: nextCursor });
      setOrders((prev) => [...prev, ...(data.orders || [])]);
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { loadFirst(); }, [loadFirst]);

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Café History</h1>
          <p className={styles.subtitle}>
            Past orders · last 7 days
            {orders.length > 0 && <> · {orders.length} shown</>}
          </p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.refreshBtn} onClick={loadFirst} disabled={loading}>
            <i className="ti ti-refresh" />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* Body */}
      {loading && orders.length === 0 ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading history…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-history-off" />
          <p>No café orders in the last 7 days.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Placed</th>
                  <th>Item</th>
                  <th className={styles.qtyCol}>Qty</th>
                  <th>For</th>
                  <th>Dining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const forSomeoneElse =
                    o.consumerType === 'family_member' && o.consumerName;
                  return (
                    <tr key={o.orderId}>
                      <td className={styles.createdCell}>{fmtCreatedAt(o.createdAt)}</td>
                      <td className={styles.itemCell}>{o.itemName}</td>
                      <td className={styles.qtyCol}>×{o.quantity}</td>
                      <td className={styles.forCell}>
                        {forSomeoneElse ? (
                          <>
                            {o.consumerName}
                            <span className={styles.viaEmp}> · {o.employeeName} ({o.employeeNumber})</span>
                          </>
                        ) : (
                          <>
                            {o.employeeName}
                            <span className={styles.viaEmp}> · {o.employeeNumber}</span>
                          </>
                        )}
                      </td>
                      <td>{dilabel(o.diningMode)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`status_${o.orderStatus}`] || ''}`}>
                          {statusLabel(o.orderStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.footerRow}>
            {hasMore ? (
              <button
                className={styles.loadMoreBtn}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : (
              <span className={styles.endNote}>End of history for this window.</span>
            )}
          </div>
        </>
      )}

    </div>
  );
}
