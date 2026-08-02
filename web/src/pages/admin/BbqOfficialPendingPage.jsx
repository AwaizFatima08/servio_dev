// web/src/pages/admin/BbqOfficialPendingPage.jsx
// BBQ — Official Order Billing Approvals — Screen #14 (new, added 01-Aug-2026)
// Role: admin | super_admin
// Path: /bbq-official-pending
//
// Fills a real gap: the design doc's 13-screen count (§3) never listed an
// admin-facing screen for this, even though bbqOrders.approvalStatus and
// the approve/reject actions were already in the locked schema and backend
// (PATCH /bbq/orders/:orderId/official/approve|reject). This screen is
// what makes those buttons reachable.
//
// DELIBERATELY SIMPLER than CafeOfficialPendingPage.jsx, not a shortcut —
// a correct simplification. Café stores one document PER ITEM LINE, so its
// page has to re-group a flat list of rows back into order-cards by
// bookingGroupId, and its approve/reject act on a whole group of documents.
// bbqOrders stores one document PER ORDER (items[] array inside a single
// doc, per design doc §2.3) — there is no group to reassemble. One query
// result row IS one order card, and approve/reject act directly on
// orderId. Copying café's grouping logic here would add complexity BBQ's
// data model doesn't have.
//
// Pending-only scope, same as café's version — approved/rejected history
// is out of scope for this slice. No event-date filter/dropdown offered;
// mirrors café's own official-pending page, which also shows all pending
// regardless of date rather than requiring a filter first.
//
// Styling: zero new CSS — reuses CafeOfficialPendingPage.module.css
// directly. Its classes (card grid, sponsor name, lines, meta, actions,
// reject modal) are generic layout, not café-specific content.
//
// Token: Pattern B — `token` prop from <WithToken>.

import { useState, useEffect, useCallback } from 'react';
import {
  listBbqOfficialPending,
  approveBbqOfficialOrder,
  rejectBbqOfficialOrder,
} from '../../services/bbqOrderService';
import styles from './CafeOfficialPendingPage.module.css';

const DINING_LABELS = { dine_in: 'Dine In', takeaway: 'Takeaway' };

export default function BbqOfficialPendingPage({ token }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [busyId, setBusyId]         = useState(null);   // orderId mid-approve/reject
  const [rowError, setRowError]     = useState({});     // orderId -> message
  const [rejectId, setRejectId]     = useState(null);   // orderId whose reject modal is open
  const [rejectNote, setRejectNote] = useState('');
  const [rejectErr, setRejectErr]   = useState('');
  const [rejecting, setRejecting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listBbqOfficialPending(token);
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onApprove = async (orderId) => {
    setBusyId(orderId);
    setRowError((r) => ({ ...r, [orderId]: '' }));
    try {
      await approveBbqOfficialOrder(token, orderId);
      setOrders((os) => os.filter((o) => o.orderId !== orderId));
    } catch (e) {
      setRowError((r) => ({ ...r, [orderId]: e.message }));
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (orderId) => {
    setRejectId(orderId);
    setRejectNote('');
    setRejectErr('');
  };

  const onReject = async () => {
    if (!rejectId) return;
    setRejecting(true);
    setRejectErr('');
    try {
      await rejectBbqOfficialOrder(token, rejectId, rejectNote.trim() || null);
      setOrders((os) => os.filter((o) => o.orderId !== rejectId));
      setRejectId(null);
    } catch (e) {
      setRejectErr(e.message);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>BBQ Approvals</h1>
          <p className={styles.subtitle}>
            Official BBQ orders awaiting billing approval
            {orders.length > 0 && ` · ${orders.length} order${orders.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <i className="ti ti-refresh" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading && orders.length === 0 ? (
        <div className={styles.loading}>Loading approvals…</div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyCard}>
          <i className={`ti ti-circle-check ${styles.emptyIcon}`} />
          <p>No official BBQ orders pending approval.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {orders.map((o) => {
            const busy = busyId === o.orderId;
            const lines = Array.isArray(o.items) ? o.items : [];
            const totalUnits = lines.reduce((s, l) => s + (l.quantity || 0), 0);
            return (
              <div key={o.orderId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.sponsorName}>
                    <i className="ti ti-user" /> {o.employeeName}
                    <span className={styles.sponsorNum}> · {o.employeeNumber}</span>
                  </span>
                  <span className={styles.diningBadge}>{DINING_LABELS[o.diningMode] || o.diningMode}</span>
                </div>

                <div className={styles.lines}>
                  {lines.map((l) => (
                    <div key={l.itemId} className={styles.line}>
                      <span className={styles.lineName}>{l.itemName}</span>
                      <span className={styles.lineQty}>×{l.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Event</span>
                    <span className={styles.metaValue}>{o.eventDate}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Cost centre</span>
                    <span className={styles.metaValue}>{o.costCentreCode || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Guest / occasion</span>
                    <span className={styles.metaValue}>{o.guestName || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Placed by</span>
                    <span className={styles.metaValue}>{o.createdByEmployeeNumber || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Order</span>
                    <span className={styles.metaValue}>
                      {lines.length} item{lines.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {rowError[o.orderId] && (
                  <div className={styles.rowError}><i className="ti ti-alert-circle" /> {rowError[o.orderId]}</div>
                )}

                <div className={styles.actions}>
                  <button className={styles.approveBtn} onClick={() => onApprove(o.orderId)} disabled={busy}>
                    {busy ? 'Approving…' : <><i className="ti ti-check" /> Approve</>}
                  </button>
                  <button className={styles.rejectBtn} onClick={() => openReject(o.orderId)} disabled={busy}>
                    <i className="ti ti-x" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectId && (
        <div className={styles.overlay} onClick={() => !rejecting && setRejectId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Reject billing</span>
              <button className={styles.iconBtn} onClick={() => setRejectId(null)} disabled={rejecting}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalNote}>
                The order was served regardless — rejecting only flips the billing tag.
                Accounts will resolve the charge manually. Reason is recorded for audit.
              </p>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Reason for rejection (optional)…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              {rejectErr && <div className={styles.rowError}>{rejectErr}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.ghostBtn} onClick={() => setRejectId(null)} disabled={rejecting}>
                Cancel
              </button>
              <button className={styles.rejectConfirmBtn} onClick={onReject} disabled={rejecting}>
                {rejecting ? 'Rejecting…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
