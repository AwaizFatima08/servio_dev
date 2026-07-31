// web/src/pages/admin/BbqExceptionQueuePage.jsx
// Screen #8 — Exception Review Queue
// Role: manager | admin | super_admin
// Path: /bbq-exceptions
//
// Two independent lists, deliberately not merged (see bbqKitchenService.js
// backend comment): late-preorder requests (should this late order be
// honored at all) and cancellation requests (should an already-accepted
// order be cancelled). Different meaning, different endpoints.
//
// Approve = immediate click, no confirm step (confirmed 01-Aug-2026).
// Reject = requires a typed reason first — backend enforces this for late
// requests; this app's UI additionally enforces it for cancellation
// requests too, for a consistent audit trail, even though the backend
// itself allows a blank reason there.

import { useState, useEffect, useCallback } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import {
  getBbqExceptionQueue,
  approveLateRequest,
  rejectLateRequest,
  approveCancellationRequestAction,
  rejectCancellationRequestAction,
} from '../../services/bbqKitchenService';
import styles from './BbqExceptionQueuePage.module.css';

const REFRESH_MS = 30000;

function OrderSummary({ o }) {
  const forSomeoneElse = o.consumerType === 'family_member' && o.consumerMemberName;
  return (
    <>
      {(o.items || []).map((it, idx) => (
        <div className={styles.itemLine} key={`${o.orderId}_${idx}`}>
          <span className={styles.itemName}>{it.itemName}</span>
          <span className={styles.qty}>×{it.quantity}</span>
        </div>
      ))}
      <div className={styles.consumerLine}>
        {forSomeoneElse ? (
          <><i className="ti ti-user" /> For {o.consumerMemberName} <span className={styles.viaEmp}>({o.employeeName} · {o.employeeNumber})</span></>
        ) : (
          <><i className="ti ti-user" /> {o.employeeName} <span className={styles.viaEmp}>· {o.employeeNumber}</span></>
        )}
      </div>
    </>
  );
}

// Shared reject-with-reason control: a link that expands into a required
// textarea + confirm/keep pair, so a reject can never be fired with an
// empty reason.
function RejectControl({ onReject, busy }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <button className={styles.rejectLink} onClick={() => setOpen(true)}>
        <i className="ti ti-x" /> Reject
      </button>
    );
  }

  return (
    <div className={styles.rejectBox}>
      <textarea
        className={styles.rejectTextarea}
        placeholder="Reason for rejecting (required)…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
      />
      <div className={styles.rejectBoxBtns}>
        <button
          className={styles.rejectConfirmBtn}
          disabled={!reason.trim() || busy}
          onClick={() => onReject(reason.trim())}
        >
          {busy ? 'Rejecting…' : 'Confirm reject'}
        </button>
        <button
          className={styles.rejectCancelBtn}
          disabled={busy}
          onClick={() => { setOpen(false); setReason(''); }}
        >
          Keep
        </button>
      </div>
    </div>
  );
}

export default function BbqExceptionQueuePage({ token }) {
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busyId, setBusyId] = useState(null); // orderId currently mid-action

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

  const loadQueue = useCallback(async (eventDate) => {
    setError('');
    try {
      const data = await getBbqExceptionQueue(token, eventDate);
      setQueue(data);
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
      loadQueue(event.eventDate);
    } else if (!eventLoading) {
      setLoading(false);
    }
  }, [event, eventLoading, loadQueue]);

  useEffect(() => {
    if (!autoRefresh || !event?.eventDate) return;
    const id = setInterval(() => loadQueue(event.eventDate), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, event, loadQueue]);

  const manualRefresh = () => {
    if (event?.eventDate) {
      setLoading(true);
      loadQueue(event.eventDate);
    }
  };

  const runAction = async (orderId, fn) => {
    setBusyId(orderId);
    setError('');
    try {
      await fn();
      await loadQueue(event.eventDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const lateRequests = queue?.lateRequests || [];
  const cancellationRequests = queue?.cancellationRequests || [];

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Exception Review Queue</h1>
          <p className={styles.subtitle}>
            {eventLoading
              ? 'Loading event…'
              : event
                ? `${event.eventDate} · ${queue?.totalCount ?? 0} pending`
                : 'No published BBQ event currently.'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.autoLabel}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
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

      {eventLoading || (loading && !queue) ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : !event ? (
        <div className={styles.emptyState}>
          <i className="ti ti-calendar-off" />
          <p>No published BBQ event right now.</p>
        </div>
      ) : (
        <>
          {/* ── Late Preorder Requests ── */}
          <section className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              Late Preorder Requests {lateRequests.length > 0 && <span className={styles.sectionCount}>{lateRequests.length}</span>}
            </h2>
            {lateRequests.length === 0 ? (
              <div className={styles.emptyStateSmall}>Nothing pending.</div>
            ) : (
              <div className={styles.cardGrid}>
                {lateRequests.map((o) => (
                  <div key={o.orderId} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.typeBadge}>{o.orderType === 'preorder' ? 'Preorder' : o.orderType}</span>
                    </div>
                    <OrderSummary o={o} />
                    <div className={styles.cardActions}>
                      <button
                        className={styles.approveBtn}
                        disabled={busyId === o.orderId}
                        onClick={() => runAction(o.orderId, () => approveLateRequest(token, o.orderId))}
                      >
                        {busyId === o.orderId ? 'Approving…' : 'Approve'}
                      </button>
                      <RejectControl
                        busy={busyId === o.orderId}
                        onReject={(reason) => runAction(o.orderId, () => rejectLateRequest(token, o.orderId, reason))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Cancellation Requests ── */}
          <section className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              Cancellation Requests {cancellationRequests.length > 0 && <span className={styles.sectionCount}>{cancellationRequests.length}</span>}
            </h2>
            {cancellationRequests.length === 0 ? (
              <div className={styles.emptyStateSmall}>Nothing pending.</div>
            ) : (
              <div className={styles.cardGrid}>
                {cancellationRequests.map((o) => (
                  <div key={o.orderId} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.typeBadge}>{o.orderType === 'live' ? 'Live' : o.orderType}</span>
                    </div>
                    <OrderSummary o={o} />
                    <div className={styles.cardActions}>
                      <button
                        className={styles.approveBtn}
                        disabled={busyId === o.orderId}
                        onClick={() => runAction(o.orderId, () => approveCancellationRequestAction(token, o.orderId))}
                      >
                        {busyId === o.orderId ? 'Approving…' : 'Approve cancellation'}
                      </button>
                      <RejectControl
                        busy={busyId === o.orderId}
                        onReject={(reason) => runAction(o.orderId, () => rejectCancellationRequestAction(token, o.orderId, reason))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {lastRefresh && (
        <div className={styles.refreshNote}>
          Last updated: {lastRefresh.toLocaleTimeString('en-PK')}
        </div>
      )}

    </div>
  );
}