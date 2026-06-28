// web/src/pages/admin/CafeKitchenPage.jsx
// Café Kitchen Board — V1.2 whole-order model (28-Jun lock)
// Role: cafe_supervisor | cafe_waiter | manager | admin | super_admin
// Path: /cafe-kitchen
//
// A live, today-only working board for the café kitchen. ONE CARD PER ORDER,
// grouped by groupKey (= bookingGroupId for batch orders, or the orderId for
// single orders). Every item in the order is listed inside its one card, and
// Accept / Mark Prepared / Cancel act on the WHOLE order atomically via the
// backend group routes. Nothing is per-item (28-Jun whole-order lock).
//
// Data: GET /cafe/kitchen/orders returns today's placed+accepted order DOCS
// (one per line), already sorted soonest-pickup-first by the backend. We group
// them in memory by groupKey, inheriting that sort (a group takes the position
// of its first-seen line), then float still-unaccepted ('placed') groups above
// accepted ones.
//
// Within one groupKey, consumer / employee / pickup time / dining mode are
// uniform by construction (the order modal picks one consumer + one
// order-type/dining/pickup for the whole batch; proxy batches likewise stamp
// one consumer per session). So we read those from the group's first doc.
//
// Group status is uniform too: every backend transition is atomic over the
// whole group, so all docs in a group share one orderStatus. Overrun is
// per-order (one shared acceptedAt clock) — one pill per card.
//
// Refresh: 30s fixed-interval auto-refresh (toggle) + manual button. REST only.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getKitchenOrders,
  acceptOrderGroup,
  markOrderGroupPrepared,
  cancelOrderGroup,
} from '../../services/cafeKitchenService';
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
  // Who may cancel a placed café order from the board. Mirrors the backend 1b
  // rule (cafe_supervisor + manager can cancel placed cafe_hours; admin
  // god-mode). cafe_waiter sees the board but NOT the cancel control. Backend
  // is the real authority — this only governs whether the button is offered.
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
  const [acceptingKey, setAcceptingKey] = useState(null);  // group being accepted (spinner)
  const [preparingKey, setPreparingKey] = useState(null);  // group being marked prepared (spinner)
  const [cancelTarget, setCancelTarget] = useState(null);  // groupKey pending cancel-confirm
  const [cancellingKey, setCancellingKey] = useState(null); // group being cancelled (spinner)

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

  // Group the flat order-doc array into one entry per groupKey, preserving the
  // backend's soonest-pickup-first order (a group takes the slot of its
  // first-seen line). Then float unaccepted ('placed') groups above accepted
  // ones. Each group: { groupKey, items[], head, status, isOverrun }.
  const groups = useMemo(() => {
    const list = board?.orders || [];
    const map = new Map();
    for (const o of list) {
      const groupKey = o.bookingGroupId || o.orderId;
      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, items: [o] });
      } else {
        map.get(groupKey).items.push(o);
      }
    }
    const built = [];
    for (const g of map.values()) {
      const head = g.items[0];
      built.push({
        groupKey: g.groupKey,
        items: g.items,
        head,
        status: head.orderStatus,                       // uniform across the group
        isOverrun: g.items.some((it) => it.isOverrun),  // one pill if any line overran
      });
    }
    const placed = built.filter((g) => g.status === 'placed');
    const accepted = built.filter((g) => g.status !== 'placed');
    return [...placed, ...accepted];
  }, [board]);

  const onAccept = async (groupKey) => {
    setAcceptingKey(groupKey);
    setError('');
    try {
      await acceptOrderGroup(token, groupKey);
      await load();           // refresh to reflect new status + re-sort
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingKey(null);
    }
  };

  // Mark an accepted order prepared (accepted -> prepared) for the whole group.
  // On success the order leaves the board (backend returns only placed+accepted),
  // so we reload to drop it. Mirrors onAccept.
  const onPrepare = async (groupKey) => {
    setPreparingKey(groupKey);
    setError('');
    try {
      await markOrderGroupPrepared(token, groupKey);
      await load();           // refresh — prepared order falls off the board
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparingKey(null);
    }
  };

  // Supervisor/manager cancels a PLACED order from the board. Always sends
  // 'employee_request' — cancellation only ever happens on an employee's verbal
  // request (locked: keep reason simple). Backend enforces the real rules
  // (placed-only for cafe_hours, the accepted/prepared walls) atomically over
  // the whole group. On success the order leaves the board, so we reload.
  // Two-step: click → confirm → cancel.
  const onCancel = async (groupKey) => {
    setCancellingKey(groupKey);
    setError('');
    try {
      await cancelOrderGroup(token, groupKey, 'employee_request', null);
      setCancelTarget(null);
      await load();           // refresh — cancelled order falls off the board
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingKey(null);
    }
  };

  // total = doc count (units of food). orderCount = card count (grouped orders).
  // toAccept = placed ORDERS (cards), derived here so every count on the
  // subtitle line counts orders, except the explicit "items" (doc count).
  const total = board?.totalCount ?? 0;
  const orderCount = groups.length;
  const toAccept = groups.filter((g) => g.status === 'placed').length;

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Café Kitchen</h1>
          <p className={styles.subtitle}>
            Today's orders{board?.date ? ` · ${board.date}` : ''}
            {total > 0 && (
              <> · {orderCount} order{orderCount === 1 ? '' : 's'} · {total} item{total === 1 ? '' : 's'}
                {toAccept > 0 && <span className={styles.unackInline}> · {toAccept} to accept</span>}
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
      ) : groups.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-coffee-off" />
          <p>No orders for pickup today yet.</p>
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {groups.map((g) => {
            const o = g.head;
            const isPlaced = g.status === 'placed';
            const isOverrun = !isPlaced && g.isOverrun === true; // backend guarantees false for placed
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
                key={g.groupKey}
                className={`${styles.orderCard} ${cardClass}`}
              >
                {/* Top row: pickup time + dining mode (uniform across the group) */}
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

                {/* Every item in the order, one line each */}
                {g.items.map((it) => (
                  <div className={styles.itemLine} key={it.orderId}>
                    <span className={styles.itemName}>{it.itemName}</span>
                    <span className={styles.qty}>×{it.quantity}</span>
                  </div>
                ))}

                {/* Who it's for (uniform across the group) */}
                <div className={styles.consumerLine}>
                  {forSomeoneElse ? (
                    <><i className="ti ti-user" /> For {o.consumerName} <span className={styles.viaEmp}>({o.employeeName} · {o.employeeNumber})</span></>
                  ) : (
                    <><i className="ti ti-user" /> {o.employeeName} <span className={styles.viaEmp}>· {o.employeeNumber}</span></>
                  )}
                </div>

                {/* Status / action — whole-order */}
                <div className={styles.cardActions}>
                  {isPlaced ? (
                    <button
                      className={styles.acceptBtn}
                      onClick={() => onAccept(g.groupKey)}
                      disabled={acceptingKey === g.groupKey}
                    >
                      {acceptingKey === g.groupKey ? 'Accepting…' : 'Accept'}
                    </button>
                  ) : (
                    <button
                      className={styles.prepareBtn}
                      onClick={() => onPrepare(g.groupKey)}
                      disabled={preparingKey === g.groupKey}
                    >
                      {preparingKey === g.groupKey ? 'Marking…' : 'Mark prepared'}
                    </button>
                  )}

                  {/* Supervisor/manager cancel — placed cards only, role-gated.
                      Subordinate to Accept (small link), with an inline confirm
                      to prevent mis-click. cafe_waiter never sees this. */}
                  {isPlaced && canCancel && (
                    cancelTarget === g.groupKey ? (
                      <div className={styles.cancelConfirm}>
                        <span className={styles.cancelConfirmText}>Cancel this order?</span>
                        <div className={styles.cancelConfirmBtns}>
                          <button
                            className={styles.cancelConfirmYes}
                            onClick={() => onCancel(g.groupKey)}
                            disabled={cancellingKey === g.groupKey}
                          >
                            {cancellingKey === g.groupKey ? 'Cancelling…' : 'Yes, cancel'}
                          </button>
                          <button
                            className={styles.cancelConfirmNo}
                            onClick={() => setCancelTarget(null)}
                            disabled={cancellingKey === g.groupKey}
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.cancelLink}
                        onClick={() => setCancelTarget(g.groupKey)}
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
