// web/src/pages/admin/TeabarDashboardPage.jsx
// Tea Bar — Live Dashboard — Screen 3
// Role: teabar_attendant ONLY (enforced by the backend on both routes this
// page calls — no role branching needed inside this component at all).
// Path: /teabar-dashboard
//
// The attendant's live "what's waiting at my counter right now" view.
// Unlike café's kitchen board, Tea Bar has only ONE working state
// (placed + pending) — there is no accept/prepare stage, confirmed directly
// from teabarOrderService.js on the backend (TEABAR_ORDER_STATUS has only
// PLACED and CANCELLED). So every card here gets exactly one action button:
// "Handed over". The backend's own query already excludes anything already
// issued, so nothing here needs a two-tone card or an "accepted" state.
//
// Backend note: getTeabarDashboard NEVER accepts a locationId from the
// client — it is always resolved from the caller's own current assignment.
// This page only ever displays that resolved location; it never lets the
// attendant pick one.

import { useState, useEffect, useCallback } from 'react';
import {
  getTeabarDashboard,
  issueTeabarOrderGroup,
  cancelTeabarOrder,
} from '../../services/teabarOrderService';
import styles from './TeabarDashboardPage.module.css';

const REFRESH_MS = 30000;

const SOURCE_LABELS = {
  self: 'Self',
  proxy: 'Proxy',
  official: 'Official',
};

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || '';
}

// Backend throws this exact string when the caller has no current location
// assignment — confirmed directly from getTeabarDashboard's own code. We
// match on it to show a calm, specific message instead of a generic error.
const NOT_ASSIGNED_MSG = 'You are not currently assigned to a Tea Bar location.';

export default function TeabarDashboardPage({ token }) {
  const [board, setBoard] = useState(null);       // full response: { locationId, locationName, orderDate, groups, count }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [issuingKey, setIssuingKey] = useState(null);       // group being marked issued (spinner)
  const [cancelTarget, setCancelTarget] = useState(null);   // groupKey pending cancel-confirm
  const [cancellingKey, setCancellingKey] = useState(null); // group being cancelled (spinner)

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getTeabarDashboard(token);
      setBoard(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // 30s auto-refresh — paused entirely while the "not assigned" state is
  // showing, since refreshing can't fix a missing assignment and would only
  // add pointless network calls until a Manager acts on Screen 8.
  useEffect(() => {
    if (!autoRefresh || error === NOT_ASSIGNED_MSG) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load, error]);

  const onIssue = async (groupKey) => {
    setIssuingKey(groupKey);
    setError('');
    try {
      await issueTeabarOrderGroup(token, groupKey);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIssuingKey(null);
    }
  };

  const onCancel = async (groupKey) => {
    setCancellingKey(groupKey);
    setError('');
    try {
      await cancelTeabarOrder(token, groupKey);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingKey(null);
    }
  };

  const groups = board?.groups || [];

  // ── "Not assigned" — its own calm state, not a red error banner ──
  if (!loading && error === NOT_ASSIGNED_MSG) {
    return (
      <div className={styles.page}>
        <div className={styles.notAssignedCard}>
          <i className="ti ti-map-pin-off" />
          <h2>No location assigned yet</h2>
          <p>You're not currently covering a Tea Bar location. Ask a Manager or Admin to assign you one on the Locations screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Tea Bar Dashboard</h1>
          <p className={styles.subtitle}>
            {board?.locationName ? board.locationName : 'Loading location…'}
            {groups.length > 0 && <> · {groups.length} order{groups.length === 1 ? '' : 's'} waiting</>}
          </p>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.autoLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>
            <i className="ti ti-refresh" />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && error !== NOT_ASSIGNED_MSG && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* Orders */}
      {loading && !board ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading orders…</span>
        </div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-cup-off" />
          <p>No orders waiting right now.</p>
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {groups.map((g) => (
            <div key={g.bookingGroupId} className={styles.orderCard}>
              <div className={styles.cardTop}>
                <span className={styles.sourceBadge}>{sourceLabel(g.bookingSource)}</span>
              </div>

              <div className={styles.consumerLine}>
                <i className="ti ti-user" /> {g.employeeName} <span className={styles.viaEmp}>· {g.employeeNumber}</span>
              </div>

              {g.items.map((it) => (
                <div className={styles.itemLine} key={it.orderId}>
                  <span className={styles.itemName}>{it.itemName}</span>
                  <span className={styles.qty}>×{it.quantity}</span>
                </div>
              ))}

              <div className={styles.cardActions}>
                <button
                  className={styles.issueBtn}
                  onClick={() => onIssue(g.bookingGroupId)}
                  disabled={issuingKey === g.bookingGroupId}
                >
                  {issuingKey === g.bookingGroupId ? 'Marking…' : 'Handed over'}
                </button>

                {cancelTarget === g.bookingGroupId ? (
                  <div className={styles.cancelConfirm}>
                    <span className={styles.cancelConfirmText}>Cancel this order?</span>
                    <div className={styles.cancelConfirmBtns}>
                      <button
                        className={styles.cancelConfirmYes}
                        onClick={() => onCancel(g.bookingGroupId)}
                        disabled={cancellingKey === g.bookingGroupId}
                      >
                        {cancellingKey === g.bookingGroupId ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        className={styles.cancelConfirmNo}
                        onClick={() => setCancelTarget(null)}
                        disabled={cancellingKey === g.bookingGroupId}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.cancelLink}
                    onClick={() => setCancelTarget(g.bookingGroupId)}
                  >
                    <i className="ti ti-x" /> Cancel order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lastRefresh && (
        <div className={styles.refreshNote}>
          Last updated: {lastRefresh.toLocaleTimeString('en-PK')}
        </div>
      )}

    </div>
  );
}