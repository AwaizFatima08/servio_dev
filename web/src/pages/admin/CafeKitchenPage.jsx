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
import { getKitchenOrders, acceptOrder } from '../../services/cafeKitchenService';
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
  const [board, setBoard] = useState(null);      // full response: { date, orders, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);  // order being accepted (button spinner)

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

  const unack = board?.unacknowledgedCount ?? 0;
  const total = board?.totalCount ?? 0;

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
            const forSomeoneElse =
              o.consumerType === 'family_member' && o.consumerName;
            return (
              <div
                key={o.orderId}
                className={`${styles.orderCard} ${isPlaced ? styles.orderCardPlaced : styles.orderCardAccepted}`}
              >
                {/* Top row: pickup time + dining mode */}
                <div className={styles.cardTop}>
                  <span className={styles.pickupTime}>
                    <i className="ti ti-clock" />
                    {o.requestedPickupTime || 'Dine-in'}
                  </span>
                  <span className={styles.diningBadge}>{dilabel(o.diningMode)}</span>
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
                    <span className={styles.acceptedTag}>
                      <i className="ti ti-circle-check" /> Accepted
                    </span>
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
