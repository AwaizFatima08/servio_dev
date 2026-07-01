// web/src/pages/admin/CafeHistoryPage.jsx
// Café Order History — V1.2 Web Slice 6 (+ filters sub-slice)
// Role (nav): cafe_supervisor | manager.  Backend also admits cafe_waiter,
// legacy, admin, super_admin — they can reach this via URL; the API is the
// access authority. Path: /cafe-history
//
// READ-ONLY. The supervisor's "what happened?" tool — a paginated, newest-first
// list of PAST café orders for dispute-lookup and audit. Deliberately distinct
// from CafeKitchenPage (the live board): NO auto-refresh, NO 30s interval, NO
// accept/prepare actions, NO pickup-sort, NO overrun flag.
//
// FILTERS (Apply-button model): a single-day date pick, an employeeNumber
// free-text filter, and an include-cancelled toggle. Filters are read from the
// controls only when "Apply" is pressed — no live/on-change reload (a free-text
// employeeNumber must not fire per keystroke). buildOpts() is the SINGLE source
// of request params, read by BOTH loadFirst (page 1) and loadMore (cursor page)
// so paged results stay filtered. The employeeNumber filter is server-side
// (backend where() + composite index) — NOT a client .filter() on the page.
//
// Paging: cursor-based "Load more". Each page of 25 is APPENDED. "Apply" /
// "Clear" / "Refresh" reset to page 1.

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
  // Filter controls (drafts). Read into a request only on Apply / Refresh.
  const [filters, setFilters] = useState({
    day: '',              // 'YYYY-MM-DD' from the date input; '' = 7-day default
    employeeNumber: '',   // free text; '' = no employee filter
    includeCancelled: false,
    officialOnly: false,  // Slice 9: show only official orders
  });

  const [orders, setOrders] = useState([]);       // accumulated across pages
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);    // first-page / refresh load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // The SINGLE source of request params, from the current filters. Both
  // loadFirst and loadMore read this so a paged result stays filtered.
  // day set → send day (backend ignores days when day present). day empty →
  // send nothing for date (backend's 7-day default). employeeNumber trimmed,
  // sent only when non-empty. includeCancelled sent only when true.
  const buildOpts = useCallback(() => {
    const opts = {};
    if (filters.day) opts.day = filters.day;
    const emp = filters.employeeNumber.trim();
    if (emp) opts.employeeNumber = emp;
    if (filters.includeCancelled) opts.includeCancelled = true;
    if (filters.officialOnly) opts.officialOnly = true;
    return opts;
  }, [filters]);

  // Load page 1 (no cursor). Replaces the list. Used on mount, Apply, Refresh.
  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCafeOrderHistory(token, buildOpts());
      setOrders(data.orders || []);
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, buildOpts]);

  // Load the next page using the held cursor + the SAME filters. APPENDS.
  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError('');
    try {
      const data = await getCafeOrderHistory(token, { ...buildOpts(), cursor: nextCursor });
      setOrders((prev) => [...prev, ...(data.orders || [])]);
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial load only. Apply/Clear drive subsequent loads explicitly (we do
  // NOT auto-reload on every filter keystroke — Apply is the trigger).
  useEffect(() => { loadFirst(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onApply = () => {
    setOrders([]);        // clear stale rows so they don't flash under the spinner
    loadFirst();
  };

  const onClear = () => {
    setFilters({ day: '', employeeNumber: '', includeCancelled: false, officialOnly: false });
    setOrders([]);
    // loadFirst reads buildOpts() which reads filters; setState is async, so
    // defer the reload to the next tick after filters reset.
    setTimeout(loadFirst, 0);
  };

  // Subtitle reflects the active (applied-on-last-load) window. We derive it
  // from the live filters — accurate immediately after a load.
  const windowLabel = filters.day ? filters.day : 'last 7 days';
  const empLabel = filters.employeeNumber.trim()
    ? ` · for ${filters.employeeNumber.trim()}`
    : '';

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Café History</h1>
          <p className={styles.subtitle}>
            Past orders · {windowLabel}{empLabel}
            {filters.includeCancelled ? ' · incl. cancelled' : ''}
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

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Day</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.day}
            onChange={(e) => setFilters((f) => ({ ...f, day: e.target.value }))}
          />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Employee number</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="e.g. FFL00002"
            value={filters.employeeNumber}
            onChange={(e) => setFilters((f) => ({ ...f, employeeNumber: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') onApply(); }}
          />
        </div>

        <label className={styles.cancelledToggle}>
          <input
            type="checkbox"
            checked={filters.includeCancelled}
            onChange={(e) => setFilters((f) => ({ ...f, includeCancelled: e.target.checked }))}
          />
          Include cancelled
        </label>

        <label className={styles.cancelledToggle}>
          <input
            type="checkbox"
            checked={filters.officialOnly}
            onChange={(e) => setFilters((f) => ({ ...f, officialOnly: e.target.checked }))}
          />
          Official only
        </label>

        <div className={styles.filterActions}>
          <button className={styles.applyBtn} onClick={onApply} disabled={loading}>
            <i className="ti ti-filter" /> Apply
          </button>
          <button className={styles.clearBtn} onClick={onClear} disabled={loading}>
            Clear
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
          <p>No café orders for this filter.</p>
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
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const forSomeoneElse =
                    o.consumerType === 'family_member' && o.consumerName;
                  const isOfficial = o.bookingSource === 'official';
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
                            {isOfficial && <span className={styles.officialBadge}>Official</span>}
                            {isOfficial && o.costCentreCode && (
                              <span className={styles.costCentre}>Cost centre: {o.costCentreCode}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td>{dilabel(o.diningMode)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`status_${o.orderStatus}`] || ''}`}>
                          {statusLabel(o.orderStatus)}
                        </span>
                      </td>
                      <td>
                        {isOfficial ? (
                          <span className={`${styles.approvalPill} ${styles[`approval_${o.approvalStatus}`] || ''}`}>
                            {(o.approvalStatus || '').replace(/_/g, ' ') || '—'}
                          </span>
                        ) : (
                          <span className={styles.viaEmp}>—</span>
                        )}
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
