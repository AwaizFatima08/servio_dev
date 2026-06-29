// web/src/pages/admin/CafeOfficialPendingPage.jsx
// Café — Official Meal Billing Approvals — V1.2 Slice 7 (web) — ADMIN
// Role: admin | super_admin
// Path: /cafe-official-pending
//
// The admin's billing-approval queue for official café meals. listOfficialPending
// returns a FLAT list (one row per order line); we group it in memory by
// bookingGroupId into ONE CARD PER ORDER (the kitchen-board pattern), each card
// listing the order's item lines. Approve / Reject act on the WHOLE order
// (bookingGroupId), atomically — mirroring how the meal was placed and how the
// kitchen treats it.
//
// Approval is billing-only and independent of the kitchen: every order here was
// (or will be) served regardless. Approving/rejecting only flips the billing tag.
// Rejection routes to accounts for manual resolution — it does NOT cancel the
// order. Pending-only scope: approved/rejected history is out of scope this slice.
//
// Token: Pattern B — `token` prop from <WithToken>. (NOT the mess getToken()
// pattern — café web stays consistent with token-passed-in.)

import { useState, useEffect, useCallback } from 'react';
import {
  listOfficialPending,
  approveOfficialGroup,
  rejectOfficialGroup,
} from '../../services/cafeOfficialApprovalService';
import styles from './CafeOfficialPendingPage.module.css';

const DINING_LABELS = { dine_in: 'Dine-in', takeaway: 'Takeaway', outdoor_seating: 'Outdoor' };

// Group the flat order-line array into one entry per bookingGroupId.
// groupKey = bookingGroupId || orderId (single orders carry null bookingGroupId
// on disk, so their groupKey is their orderId — same derivation the kitchen
// board uses). Each group: { groupKey, lines[], head }.
function groupByOrder(orders) {
  const map = new Map();
  for (const o of orders) {
    const groupKey = o.bookingGroupId || o.orderId;
    if (!map.has(groupKey)) map.set(groupKey, { groupKey, lines: [o], head: o });
    else map.get(groupKey).lines.push(o);
  }
  return [...map.values()];
}

export default function CafeOfficialPendingPage({ token }) {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Per-group action state
  const [busyKey, setBusyKey]       = useState(null);   // groupKey mid-approve/reject
  const [rowError, setRowError]     = useState({});     // groupKey -> message
  const [rejectKey, setRejectKey]   = useState(null);   // groupKey whose reject modal is open
  const [rejectNote, setRejectNote] = useState('');
  const [rejectErr, setRejectErr]   = useState('');
  const [rejecting, setRejecting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listOfficialPending(token);
      const orders = Array.isArray(data?.orders) ? data.orders : [];
      setGroups(groupByOrder(orders));
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
      await approveOfficialGroup(token, groupKey);
      setGroups((gs) => gs.filter((g) => g.groupKey !== groupKey));
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
      await rejectOfficialGroup(token, rejectKey, rejectNote.trim() || null);
      setGroups((gs) => gs.filter((g) => g.groupKey !== rejectKey));
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
          <h1 className={styles.title}>Café Approvals</h1>
          <p className={styles.subtitle}>
            Official café meals awaiting billing approval
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
          <p>No official meals pending approval.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {groups.map((g) => {
            const o = g.head;
            const busy = busyKey === g.groupKey;
            const totalUnits = g.lines.reduce((s, l) => s + (l.quantity || 0), 0);
            return (
              <div key={g.groupKey} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.sponsorName}>
                    <i className="ti ti-user" /> {o.sponsoringEmployeeName || o.employeeName}
                    <span className={styles.sponsorNum}> · {o.sponsoringEmployeeNumber || o.employeeNumber}</span>
                  </span>
                  <span className={styles.diningBadge}>{DINING_LABELS[o.diningMode] || o.diningMode}</span>
                </div>

                <div className={styles.lines}>
                  {g.lines.map((l) => (
                    <div key={l.orderId} className={styles.line}>
                      <span className={styles.lineName}>{l.itemName}</span>
                      <span className={styles.lineQty}>×{l.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Cost centre</span>
                    <span className={styles.metaValue}>{o.costCentreCode || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Guest / occasion</span>
                    <span className={styles.metaValue}>{o.officialGuestName || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Placed by</span>
                    <span className={styles.metaValue}>{o.createdByEmployeeNumber || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Order</span>
                    <span className={styles.metaValue}>
                      {g.lines.length} item{g.lines.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {rowError[g.groupKey] && (
                  <div className={styles.rowError}><i className="ti ti-alert-circle" /> {rowError[g.groupKey]}</div>
                )}

                <div className={styles.actions}>
                  <button className={styles.approveBtn} onClick={() => onApprove(g.groupKey)} disabled={busy}>
                    {busy ? 'Approving…' : <><i className="ti ti-check" /> Approve</>}
                  </button>
                  <button className={styles.rejectBtn} onClick={() => openReject(g.groupKey)} disabled={busy}>
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
                The meal was served regardless — rejecting only flips the billing tag.
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
