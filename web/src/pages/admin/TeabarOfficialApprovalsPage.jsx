// web/src/pages/admin/TeabarOfficialApprovalsPage.jsx
// Tea Bar — Official Order Billing Approvals — Screen 7
// Role: admin | super_admin ONLY (confirmed from the backend route's role
// gate — no attendant, no manager).
// Path: /teabar-official-approvals
//
// Structural close copy of CafeOfficialPendingPage.jsx, with the
// differences confirmed against the backend during design:
//   - listOfficialPendingGroups already groups by bookingGroupId
//     server-side — no client-side groupByOrder() needed, unlike café.
//   - Adds a Location row — café has no location concept, Tea Bar orders
//     come from different physical counters, so the admin needs to know
//     which one placed this.
//   - No dining-mode badge — no diningMode field exists on a Tea Bar order.
//   - Reject-modal wording carries over almost unchanged: the order was
//     served regardless of approval outcome (same as café's official
//     meals), so "the order was served regardless" is factually accurate
//     here too, not just borrowed styling.

import { useState, useEffect, useCallback } from 'react';
import {
  listPendingOfficialTeabarOrders,
  approveOfficialTeabarOrder,
  rejectOfficialTeabarOrder,
} from '../../services/teabarOrderService';
import styles from './TeabarOfficialApprovalsPage.module.css';

export default function TeabarOfficialApprovalsPage({ token }) {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [busyKey, setBusyKey]       = useState(null);
  const [rowError, setRowError]     = useState({});
  const [rejectKey, setRejectKey]   = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectErr, setRejectErr]   = useState('');
  const [rejecting, setRejecting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPendingOfficialTeabarOrders(token);
      setGroups(Array.isArray(data?.groups) ? data.groups : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onApprove = async (groupKey) => {
    setBusyKey(groupKey);
    setRowError((r) => ({ ...r, [groupKey]: '' }));
    try {
      await approveOfficialTeabarOrder(token, groupKey);
      setGroups((gs) => gs.filter((g) => g.bookingGroupId !== groupKey));
    } catch (e) {
      setRowError((r) => ({ ...r, [groupKey]: e.message }));
    } finally {
      setBusyKey(null);
    }
  };

  const openReject = (groupKey) => {
    setRejectKey(groupKey);
    setRejectNote('');
    setRejectErr('');
  };

  const onReject = async () => {
    if (!rejectKey) return;
    setRejecting(true);
    setRejectErr('');
    try {
      await rejectOfficialTeabarOrder(token, rejectKey, rejectNote.trim() || null);
      setGroups((gs) => gs.filter((g) => g.bookingGroupId !== rejectKey));
      setRejectKey(null);
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
          <h1 className={styles.title}>Tea Bar Approvals</h1>
          <p className={styles.subtitle}>
            Official Tea Bar orders awaiting billing approval
            {groups.length > 0 && ` · ${groups.length} order${groups.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <i className="ti ti-refresh" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading && groups.length === 0 ? (
        <div className={styles.loading}>Loading approvals…</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyCard}>
          <i className={`ti ti-circle-check ${styles.emptyIcon}`} />
          <p>No official Tea Bar orders pending approval.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {groups.map((g) => {
            const busy = busyKey === g.bookingGroupId;
            const totalUnits = g.items.reduce((s, l) => s + (l.quantity || 0), 0);
            return (
              <div key={g.bookingGroupId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.sponsorName}>
                    <i className="ti ti-user" /> {g.sponsoringEmployeeName}
                    <span className={styles.sponsorNum}> · {g.sponsoringEmployeeNumber}</span>
                  </span>
                </div>

                <div className={styles.lines}>
                  {g.items.map((l) => (
                    <div key={l.orderId} className={styles.line}>
                      <span className={styles.lineName}>{l.itemName}</span>
                      <span className={styles.lineQty}>×{l.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Location</span>
                    <span className={styles.metaValue}>{g.locationName || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Cost centre</span>
                    <span className={styles.metaValue}>{g.costCentreCode || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Guest / occasion</span>
                    <span className={styles.metaValue}>{g.officialGuestName || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Placed by</span>
                    <span className={styles.metaValue}>{g.createdByEmployeeNumber || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Order</span>
                    <span className={styles.metaValue}>
                      {g.items.length} item{g.items.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {rowError[g.bookingGroupId] && (
                  <div className={styles.rowError}><i className="ti ti-alert-circle" /> {rowError[g.bookingGroupId]}</div>
                )}

                <div className={styles.actions}>
                  <button className={styles.approveBtn} onClick={() => onApprove(g.bookingGroupId)} disabled={busy}>
                    {busy ? 'Approving…' : <><i className="ti ti-check" /> Approve</>}
                  </button>
                  <button className={styles.rejectBtn} onClick={() => openReject(g.bookingGroupId)} disabled={busy}>
                    <i className="ti ti-x" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectKey && (
        <div className={styles.overlay} onClick={() => !rejecting && setRejectKey(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Reject billing</span>
              <button className={styles.iconBtn} onClick={() => setRejectKey(null)} disabled={rejecting}>
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
              <button className={styles.ghostBtn} onClick={() => setRejectKey(null)} disabled={rejecting}>
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