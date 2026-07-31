// web/src/pages/admin/BbqKitchenPage.jsx
// Screen #6 — BBQ Kitchen Dashboard (order cards)
// Role: bbq_supervisor | manager | admin | super_admin
// Path: /bbq-kitchen
//
// Scope deliberately limited to design doc §3's exact wording for this
// screen: "accept / prepared actions, per order." No cancel button here —
// order management (cancel/edit/request-cancellation) is Screen #3's job
// (My BBQ Orders), same boundary already confirmed for Screen #2 in the
// command board. Keep this screen's job narrow.
//
// One BBQ order = one Firestore doc with an items[] array already inside
// it (unlike café's one-item-per-doc model) — so no client-side grouping
// step is needed. Each doc from the backend is already one full card.
//
// Event selection: auto-detects the current published BBQ event via
// getCurrentBbqEvent (same as Screens #1 and #2), then loads that event's
// kitchen orders. If more than one event is published at once, this will
// follow whichever one getCurrentBbqEvent picks (most recent by date) —
// same known behavior as the other employee-facing BBQ screens.

import { useState, useEffect, useCallback } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import {
  getBbqKitchenOrders,
  acceptBbqOrder,
  markBbqOrderPrepared,
} from '../../services/bbqKitchenService';
import styles from './BbqKitchenPage.module.css';

const REFRESH_MS = 30000;

const DINING_LABELS = { dine_in: 'Dine-in', takeaway: 'Takeaway' };
const dilabel = (mode) => DINING_LABELS[mode] || mode || '';

const TYPE_LABELS = { preorder: 'Preorder', live: 'Live' };
const typelabel = (t) => TYPE_LABELS[t] || t || '';

export default function BbqKitchenPage({ token }) {
  const [event, setEvent] = useState(null);       // current published bbqEvent
  const [eventLoading, setEventLoading] = useState(true);
  const [board, setBoard] = useState(null);        // { eventDate, orders, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [preparingId, setPreparingId] = useState(null);

  // Load the current published event once (doesn't need to re-poll)
  const loadEvent = useCallback(async () => {
    setEventLoading(true);
    setError('');
    try {
      const ev = await getCurrentBbqEvent(token);
      setEvent(ev);
    } catch (err) {
      setError(err.message);
    } finally {
      setEventLoading(false);
    }
  }, [token]);

  // Load kitchen orders for that event's date
  const loadOrders = useCallback(async (eventDate) => {
    setError('');
    try {
      const data = await getBbqKitchenOrders(token, eventDate);
      setBoard(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  useEffect(() => {
    if (event?.eventDate) {
      setLoading(true);
      loadOrders(event.eventDate);
    } else if (!eventLoading) {
      setLoading(false);
    }
  }, [event, eventLoading, loadOrders]);

  // 30s auto-refresh
  useEffect(() => {
    if (!autoRefresh || !event?.eventDate) return;
    const id = setInterval(() => loadOrders(event.eventDate), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, event, loadOrders]);

  const manualRefresh = () => {
    if (event?.eventDate) {
      setLoading(true);
      loadOrders(event.eventDate);
    }
  };

  const onAccept = async (orderId) => {
    setAcceptingId(orderId);
    setError('');
    try {
      await acceptBbqOrder(token, orderId);
      await loadOrders(event.eventDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const onPrepare = async (orderId) => {
    setPreparingId(orderId);
    setError('');
    try {
      await markBbqOrderPrepared(token, orderId);
      await loadOrders(event.eventDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparingId(null);
    }
  };

  const orders = board?.orders || [];
  // Placed cards float above accepted cards, same convention as café
  const placed = orders.filter((o) => o.orderStatus === 'placed');
  const accepted = orders.filter((o) => o.orderStatus === 'accepted');
  const sorted = [...placed, ...accepted];

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>BBQ Kitchen Dashboard</h1>
          <p className={styles.subtitle}>
            {eventLoading
              ? 'Loading event…'
              : event
                ? `${event.eventDate}${orders.length > 0 ? ` · ${orders.length} order${orders.length === 1 ? '' : 's'}` : ''}`
                : 'No published BBQ event currently.'}
            {board && board.unacknowledgedCount > 0 && (
              <span className={styles.unackInline}> · {board.unacknowledgedCount} to accept</span>
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
          <button className={styles.refreshBtn} onClick={manualRefresh} disabled={loading || !event}>
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

      {eventLoading || (loading && !board) ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : !event ? (
        <div className={styles.emptyState}>
          <i className="ti ti-calendar-off" />
          <p>No published BBQ event right now. Check back closer to Friday.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-meat-off" />
          <p>No orders yet for {event.eventDate}.</p>
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {sorted.map((o) => {
            const isPlaced = o.orderStatus === 'placed';
            const forSomeoneElse = o.consumerType === 'family_member' && o.consumerMemberName;
            const isOfficial = o.billingDestination === 'official_account';
            const orderedAt = o.createdAt?._seconds
              ? new Date(o.createdAt._seconds * 1000)
              : o.createdAt ? new Date(o.createdAt) : null;

            return (
              <div
                key={o.orderId}
                className={`${styles.orderCard} ${isPlaced ? styles.orderCardPlaced : styles.orderCardAccepted}`}
              >
                <div className={styles.cardTop}>
                  <span className={`${styles.typeBadge} ${o.orderType === 'live' ? styles.typeBadgeLive : styles.typeBadgePreorder}`}>
                    {typelabel(o.orderType)}
                  </span>
                  <div className={styles.cardTopRight}>
                    {o.isLateRequest && o.lateRequestApprovalStatus === 'approved' && (
                      <span className={styles.lateBadge}>
                        <i className="ti ti-clock-exclamation" /> Late (approved)
                      </span>
                    )}
                    <span className={styles.diningBadge}>{dilabel(o.diningMode)}</span>
                  </div>
                </div>

                {orderedAt && (
                  <div className={styles.orderedAt}>
                    <i className="ti ti-clock" /> Ordered {orderedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {(o.items || []).map((it, idx) => (
                  <div className={styles.itemLine} key={`${o.orderId}_${idx}`}>
                    <span className={styles.itemName}>{it.itemName}</span>
                    <span className={styles.qty}>×{it.quantity}</span>
                  </div>
                ))}

                <div className={styles.consumerLine}>
                  {forSomeoneElse ? (
                    <><i className="ti ti-user" /> For {o.consumerMemberName} <span className={styles.viaEmp}>({o.employeeName} · {o.employeeNumber})</span></>
                  ) : isOfficial && o.guestName ? (
                    <><i className="ti ti-user" /> Guest: {o.guestName} <span className={styles.viaEmp}>(booked by {o.employeeName})</span></>
                  ) : (
                    <><i className="ti ti-user" /> {o.employeeName} <span className={styles.viaEmp}>· {o.employeeNumber}</span></>
                  )}
                </div>

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