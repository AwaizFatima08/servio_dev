// web/src/pages/admin/CafeKitchenPage.jsx
// Café Kitchen Board — V1.2 Web Slice 3
// Role: cafe_supervisor | cafe_waiter | manager | admin | super_admin
// Path: /cafe-kitchen
//
// A live, today-only working board for the café kitchen. Distinct from the
// mess KitchenDashboardPage (combos/headcount/issuance) — café is a flat list
// of individual orders, each acknowledged with "Accept".
//
// Data: GET /cafe/kitchen/orders returns today's placed+accepted orders, keyed
// off requestedPickupDate (pickup day), already sorted soonest-pickup-first by
// the backend. We additionally float still-unaccepted ('placed') orders above
// accepted ones, preserving pickup order within each group (Q3 design lock).
//
// Refresh: 30s fixed-interval auto-refresh (toggle) + manual button. REST only
// — no real-time listener in this slice (a later enhancement if needed).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getKitchenOrders, acceptOrder, markPrepared } from '../../services/cafeKitchenService';
import { cancelOrder } from '../../services/cafeService';
import { useAuth } from '../../context/AuthContext';
import styles from './CafeKitchenPage.module.css';

const REFRESH_MS = 30000;

const DINING_LABELS = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  outdoor_seating: 'Outdoor',
};

function dilabel(mode) {
  return DINING_LABELS[mode] || mode || '';
}

export default function CafeKitchenPage({ token }) {
  const { userProfile } = useAuth();
  const role = userProfile?.user?.role || '';
  // Who may cancel a placed cafe order from the board. Mirrors the backend 1b
  // rule (cafe_supervisor + manager can cancel placed cafe_hours; admin god-mode).
  // cafe_waiter sees the board but NOT the cancel control. Backend is the real
  // authority — this only governs whether the button is offered.
  const canCancel =
    role === 'cafe_supervisor' ||
    role === 'manager' ||
    role === 'admin' ||
    role === 'super_admin';

  const [board, setBoard] = useState(null);      // full response: { date, orders, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);  // order being accepted (button spinner)
  const [preparingId, setPreparingId] = useState(null);  // order being marked prepared (button spinner)
  const [cancelTarget, setCancelTarget] = useState(null); // order pending cancel-confirm
  const [cancellingId, setCancellingId] = useState(null); // order being cancelled (spinner)

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getKitchenOrders(token);
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

  // 30s auto-refresh (only while toggle is on)
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // Float unaccepted ('placed') orders above accepted ones, keeping the
  // backend's soonest-pickup-first order within each group.
  const orders = useMemo(() => {
    const list = board?.orders || [];
    const placed = list.filter((o) => o.orderStatus === 'placed');
    const accepted = list.filter((o) => o.orderStatus !== 'placed');
    return [...placed, ...accepted];
  }, [board]);

  const onAccept = async (orderId) => {
    setAcceptingId(orderId);
    setError('');
    try {
      await acceptOrder(token, orderId);
      await load();           // refresh to reflect new status + re-sort
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  // Mark an accepted order prepared (accepted -> prepared). On success the
  // order leaves the board (backend returns only placed+accepted), so we
  // reload to drop it. Mirrors onAccept.
  const onPrepare = async (orderId) => {
    setPreparingId(orderId);
    setError('');
    try {
      await markPrepared(token, orderId);
      await load();           // refresh — prepared order falls off the board
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparingId(null);
    }
  };

  const unack = board?.unacknowledgedCount ?? 0;
  const total = board?.totalCount ?? 0;

  // Supervisor/manager cancels a PLACED order from the board (1b). Always sends
  // 'employee_request' — cancellation only ever happens on an employee's verbal
  // request (locked: keep reason simple). Backend enforces the real rules
  // (placed-only for cafe_hours, the accepted/prepared walls). On success the
  // order leaves the board, so we reload. Two-step: click → confirm → cancel.
  const onCancel = async (orderId) => {
    setCancellingId(orderId);
    setError('');
    try {
      await cancelOrder(token, orderId, 'employee_request', null);
      setCancelTarget(null);
      await load();           // refresh — cancelled order falls off the board
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Café Kitchen</h1>
          <p className={styles.subtitle}>
            Today's orders{board?.date ? ` · ${board.date}` : ''}
            {total > 0 && (
              <> · {total} order{total === 1 ? '' : 's'}
                {unack > 0 && <span className={styles.unackInline}> · {unack} to accept</span>}
              </>
            )}
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

      {error && (
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
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-coffee-off" />
          <p>No orders for pickup today yet.</p>
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {orders.map((o) => {
            const isPlaced = o.orderStatus === 'placed';
            const isOverrun = !isPlaced && o.isOverrun === true; // backend guarantees false for placed
            const forSomeoneElse =
              o.consumerType === 'family_member' && o.consumerName;
            // placed → amber; accepted+overrun → red (precedence); accepted → green
            const cardClass = isPlaced
              ? styles.orderCardPlaced
              : isOverrun
                ? styles.orderCardOverrun
                : styles.orderCardAccepted;
            return (
              <div
                key={o.orderId}
                className={`${styles.orderCard} ${cardClass}`}
              >
                {/* Top row: pickup time + dining mode */}
                <div className={styles.cardTop}>
                  <span className={styles.pickupTime}>
                    <i className="ti ti-clock" />
                    {o.requestedPickupTime || 'Dine-in'}
                  </span>
                  <div className={styles.cardTopRight}>
                    {isOverrun && (
                      <span className={styles.overrunPill}>
                        <i className="ti ti-alert-triangle" /> Overrun
                      </span>
                    )}
                    <span className={styles.diningBadge}>{dilabel(o.diningMode)}</span>
                  </div>
                </div>

                {/* Item + qty */}
                <div className={styles.itemLine}>
                  <span className={styles.itemName}>{o.itemName}</span>
                  <span className={styles.qty}>×{o.quantity}</span>
                </div>

                {/* Who it's for */}
                <div className={styles.consumerLine}>
                  {forSomeoneElse ? (
                    <><i className="ti ti-user" /> For {o.consumerName} <span className={styles.viaEmp}>({o.employeeName} · {o.employeeNumber})</span></>
                  ) : (
                    <><i className="ti ti-user" /> {o.employeeName} <span className={styles.viaEmp}>· {o.employeeNumber}</span></>
                  )}
                </div>

                {/* Status / action */}
                <div className={styles.cardActions}>
                  {isPlaced ? (
                    <button
                      className={styles.acceptBtn}
                      onClick={() => onAccept(o.orderId)}
                      disabled={acceptingId === o.orderId}
                    >
                      {acceptingId === o.orderId ? 'Accepting…' : 'Accept'}
                    </button>
                  ) : (
                    <button
                      className={styles.prepareBtn}
                      onClick={() => onPrepare(o.orderId)}
                      disabled={preparingId === o.orderId}
                    >
                      {preparingId === o.orderId ? 'Marking…' : 'Mark prepared'}
                    </button>
                  )}

                  {/* Supervisor/manager cancel — placed cards only, role-gated.
                      Subordinate to Accept (small link), with an inline confirm
                      to prevent mis-click. cafe_waiter never sees this. */}
                  {isPlaced && canCancel && (
                    cancelTarget === o.orderId ? (
                      <div className={styles.cancelConfirm}>
                        <span className={styles.cancelConfirmText}>Cancel this order?</span>
                        <div className={styles.cancelConfirmBtns}>
                          <button
                            className={styles.cancelConfirmYes}
                            onClick={() => onCancel(o.orderId)}
                            disabled={cancellingId === o.orderId}
                          >
                            {cancellingId === o.orderId ? 'Cancelling…' : 'Yes, cancel'}
                          </button>
                          <button
                            className={styles.cancelConfirmNo}
                            onClick={() => setCancelTarget(null)}
                            disabled={cancellingId === o.orderId}
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.cancelLink}
                        onClick={() => setCancelTarget(o.orderId)}
                      >
                        <i className="ti ti-x" /> Cancel order
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
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
