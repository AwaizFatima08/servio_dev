// web/src/pages/admin/OfficialGuestApprovalsPage.jsx
// Official Guest Meal Billing Approvals — Admin only
// HomiLabs | Servio | Web

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getPendingOfficialGuestApprovals,
  approveOfficialGuestMeal,
  rejectOfficialGuestMeal,
} from '../../services/messService';
import styles from './OfficialGuestApprovalsPage.module.css';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    pending_approval: { label: 'Pending',  cls: styles.badgePending },
    approved:         { label: 'Approved', cls: styles.badgeApproved },
    rejected:         { label: 'Rejected', cls: styles.badgeRejected },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

export default function OfficialGuestApprovalsPage() {
  const { getToken } = useAuth();

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [dateFilter, setDate]     = useState('');

  // Per-row state
  const [rowLoading, setRowLoading]   = useState({});
  const [rowError, setRowError]       = useState({});
  const [rejectModal, setRejectModal] = useState(null); // reservationId or null
  const [rejectNote, setRejectNote]   = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const data = await getPendingOfficialGuestApprovals(token, dateFilter || undefined);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, dateFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(reservationId) {
    setRowLoading(r => ({ ...r, [reservationId]: 'approving' }));
    setRowError(r => ({ ...r, [reservationId]: '' }));
    try {
      const token = await getToken();
      await approveOfficialGuestMeal(reservationId, token);
      setItems(prev => prev.filter(i => i.reservationId !== reservationId));
    } catch (e) {
      setRowError(r => ({ ...r, [reservationId]: e.message }));
    } finally {
      setRowLoading(r => ({ ...r, [reservationId]: null }));
    }
  }

  function openReject(reservationId) {
    setRejectModal(reservationId);
    setRejectNote('');
    setRejectError('');
  }

  async function handleReject() {
    if (!rejectModal) return;
    setRejectSubmitting(true);
    setRejectError('');
    try {
      const token = await getToken();
      await rejectOfficialGuestMeal(rejectModal, rejectNote, token);
      setItems(prev => prev.filter(i => i.reservationId !== rejectModal));
      setRejectModal(null);
    } catch (e) {
      setRejectError(e.message);
    } finally {
      setRejectSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Official Guest Approvals</h1>
          <p className={styles.pageSubtitle}>Review and approve billing for official guest meals</p>
        </div>
        <button className={styles.btnRefresh} onClick={load} disabled={loading}>
          <i className={`ti ti-refresh ${loading ? styles.spinning : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Filter by Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDate(e.target.value)}
            className={styles.filterInput}
          />
        </div>
        {dateFilter && (
          <button className={styles.btnClearFilter} onClick={() => setDate('')}>
            <i className="ti ti-x" /> Clear
          </button>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading && (
        <div className={styles.loadingState}>
          <i className="ti ti-loader-2" />
          <p>Loading approvals…</p>
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className={styles.emptyState}>
          <i className="ti ti-circle-check" />
          <p>No pending approvals{dateFilter ? ' for selected date' : ''}.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Guest</span>
            <span>Sponsored By</span>
            <span>Date / Meal</span>
            <span>Items</span>
            <span>Booked By</span>
            <span>Actions</span>
          </div>

          {items.map(r => {
            const busy = rowLoading[r.reservationId];
            return (
              <div key={r.reservationId} className={styles.row}>

                <div className={styles.colGuest}>
                  <span className={styles.guestName}>{r.guestName || '—'}</span>
                  <StatusBadge status={r.approvalStatus || 'pending_approval'} />
                </div>

                <div className={styles.colSponsor}>
                  <span className={styles.sponsorName}>{r.employeeName || r.employeeNumber}</span>
                  <span className={styles.sponsorNum}>{r.employeeNumber}</span>
                </div>

                <div className={styles.colDate}>
                  <span className={styles.dateVal}>{formatDate(r.reservationDate)}</span>
                  <span className={styles.mealChip}>
                    {MEAL_LABELS[r.mealType] || r.mealType}
                  </span>
                </div>

                <div className={styles.colItems}>
                  <span className={styles.itemCount}>{r.quantity || 1}</span>
                  <span className={styles.itemName}>{r.itemName}</span>
                </div>

                <div className={styles.colBookedBy}>
                  <span className={styles.bookedByName}>
                    {r.createdByEmployeeNumber || '—'}
                  </span>
                </div>

                <div className={styles.colActions}>
                  {rowError[r.reservationId] && (
                    <span className={styles.rowError} title={rowError[r.reservationId]}>
                      <i className="ti ti-alert-circle" />
                    </span>
                  )}
                  <button
                    className={styles.btnApprove}
                    onClick={() => handleApprove(r.reservationId)}
                    disabled={!!busy}
                  >
                    {busy === 'approving'
                      ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                      : <><i className="ti ti-check" /> Approve</>
                    }
                  </button>
                  <button
                    className={styles.btnReject}
                    onClick={() => openReject(r.reservationId)}
                    disabled={!!busy}
                  >
                    <i className="ti ti-x" /> Reject
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Reject Billing</span>
              <button
                className={styles.iconBtn}
                onClick={() => setRejectModal(null)}
                disabled={rejectSubmitting}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalNote}>
                Provide a reason for rejection. This will be recorded for audit.
              </p>
              <textarea
                className={styles.rejectTextarea}
                rows={3}
                placeholder="Reason for rejection (optional)…"
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
              {rejectError && <p className={styles.errorText}>{rejectError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnGhost}
                onClick={() => setRejectModal(null)}
                disabled={rejectSubmitting}
              >
                Cancel
              </button>
              <button
                className={styles.btnRejectConfirm}
                onClick={handleReject}
                disabled={rejectSubmitting}
              >
                {rejectSubmitting
                  ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                  : 'Confirm Rejection'
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
