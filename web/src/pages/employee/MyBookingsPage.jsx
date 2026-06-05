// web/src/pages/employee/MyBookingsPage.jsx
// Screen 15 — My Bookings + History (Employee)
// Flow 06: view own active bookings + history, cancel active bookings

import { useState, useEffect, useCallback } from 'react';
import { getMyReservations, cancelReservation } from '../../services/myBookingsService';
import styles from './MyBookingsPage.module.css';

const MEAL_LABELS   = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ICONS    = { breakfast: 'ti-coffee', lunch: 'ti-bowl', dinner: 'ti-moon' };
const STATUS_CONFIG = {
  active:    { label: 'Active',    color: '#0F6E56', bg: '#EBF9F4', border: '#C6F0E5' },
  cancelled: { label: 'Cancelled', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};
const ISSUE_CONFIG = {
  pending:   { label: 'Pending issuance', color: '#d97706', bg: '#fffbeb' },
  issued:    { label: 'Issued',           color: '#0F6E56', bg: '#EBF9F4' },
  no_show:   { label: 'No-show',          color: '#9ca3af', bg: '#f9fafb' },
};

const CANCEL_REASONS = [
  { value: 'employee_request', label: 'My request' },
  { value: 'official_duty',    label: 'Official duty' },
  { value: 'medical',          label: 'Medical' },
  { value: 'other',            label: 'Other' },
];

// Date helpers
const todayStr = () => new Date().toISOString().split('T')[0];
const monthAgoStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};
const formatDate = (str) =>
  new Date(str + 'T00:00:00Z').toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

export default function MyBookingsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');

  // Filters
  const [tab, setTab]         = useState('active'); // 'active' | 'history'
  const [fromDate, setFromDate] = useState(monthAgoStr());
  const [toDate, setToDate]     = useState(todayStr());

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null); // reservation object
  const [cancelReason, setCancelReason] = useState('employee_request');
  const [cancelNote, setCancelNote]     = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyReservations({
        from:   fromDate,
        to:     toDate,
        status: tab === 'active' ? 'active' : undefined,
      });
      // Sort newest first
      const sorted = (data || []).sort((a, b) =>
        b.reservationDate.localeCompare(a.reservationDate)
      );
      setReservations(tab === 'history'
        ? sorted.filter(r => r.reservationStatus === 'cancelled' || r.issueStatus === 'issued' || r.issueStatus === 'no_show')
        : sorted.filter(r => r.reservationStatus === 'active')
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError('');
    setSuccessMsg('');
    try {
      await cancelReservation(
        cancelTarget.reservationId,
        cancelReason,
        cancelNote
      );
      setSuccessMsg('Booking cancelled successfully.');
      setCancelTarget(null);
      setCancelReason('employee_request');
      setCancelNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Group by date for display
  const grouped = reservations.reduce((acc, r) => {
    if (!acc[r.reservationDate]) acc[r.reservationDate] = [];
    acc[r.reservationDate].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Bookings</h1>
          <p className={styles.subtitle}>Your meal reservations and history</p>
        </div>
        <div className={styles.dateRange}>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={e => setFromDate(e.target.value)}
            className={styles.datePicker}
          />
          <span className={styles.dateSep}>to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={todayStr()}
            onChange={e => setToDate(e.target.value)}
            className={styles.datePicker}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
          onClick={() => setTab('active')}
        >
          <i className="ti ti-calendar-check" /> Active Bookings
        </button>
        <button
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          <i className="ti ti-history" /> History
        </button>
      </div>

      {/* Banners */}
      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {successMsg && (
        <div className={styles.successBanner}>
          <i className="ti ti-circle-check" /> {successMsg}
        </div>
      )}

      {loading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && reservations.length === 0 && !error && (
        <div className={styles.emptyState}>
          <i className={tab === 'active' ? 'ti ti-calendar-off' : 'ti ti-history'} />
          <p>{tab === 'active' ? 'No active bookings in this date range.' : 'No history found in this date range.'}</p>
        </div>
      )}

      {/* Grouped booking cards */}
      {!loading && sortedDates.map(date => (
        <div key={date} className={styles.dateGroup}>
          <div className={styles.dateGroupLabel}>{formatDate(date)}</div>
          <div className={styles.cardRow}>
            {grouped[date].map(r => {
              const statusCfg = STATUS_CONFIG[r.reservationStatus] || STATUS_CONFIG.active;
              const issueCfg  = ISSUE_CONFIG[r.issueStatus] || ISSUE_CONFIG.pending;
              const canCancel = r.reservationStatus === 'active' && r.issueStatus === 'pending';

              return (
                <div key={r.reservationId} className={styles.bookingCard}>
                  {/* Meal type header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.mealTag}>
                      <i className={`ti ${MEAL_ICONS[r.mealType] || 'ti-bowl'}`} />
                      {MEAL_LABELS[r.mealType] || r.mealType}
                    </div>
                    <span
                      className={styles.statusPill}
                      style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Item name */}
                  <div className={styles.itemName}>{r.itemName}</div>
                  <div className={styles.optionLabel}>{r.optionLabel}</div>

                  {/* Details row */}
                  <div className={styles.detailRow}>
                    <span>
                      <i className="ti ti-users" />
                      {r.diningMode === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                    </span>
                    {r.quantity > 1 && (
                      <span><i className="ti ti-number" /> Qty: {r.quantity}</span>
                    )}
                    {r.subjectType !== 'self' && (
                      <span>
                        <i className="ti ti-user" />
                        {r.guestName || r.subjectType?.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Issue status + amount */}
                  <div className={styles.cardFooter}>
                    <span
                      className={styles.issuePill}
                      style={{ color: issueCfg.color, background: issueCfg.bg }}
                    >
                      {issueCfg.label}
                    </span>
                    <div className={styles.amountArea}>
                      {r.amount ? (
                        <span className={styles.amount}>Rs. {r.amount.toLocaleString()}</span>
                      ) : (
                        <span className={styles.amountPending}>Rate pending</span>
                      )}
                    </div>
                  </div>

                  {/* Cancel button */}
                  {canCancel && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => { setCancelTarget(r); setSuccessMsg(''); }}
                    >
                      <i className="ti ti-x" /> Cancel booking
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className={styles.modalOverlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Cancel Booking</div>
            <p className={styles.modalDesc}>
              Cancel <strong>{cancelTarget.itemName}</strong> ({MEAL_LABELS[cancelTarget.mealType]}) on{' '}
              {formatDate(cancelTarget.reservationDate)}?
            </p>

            <div className={styles.formRow}>
              <label className={styles.label}>Reason</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className={styles.select}
              >
                {CANCEL_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {cancelReason === 'other' && (
              <div className={styles.formRow}>
                <label className={styles.label}>Note (optional)</label>
                <input
                  type="text"
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  className={styles.input}
                  placeholder="Brief reason…"
                  maxLength={100}
                />
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep booking
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleCancelConfirm}
                disabled={cancelling}
              >
                {cancelling ? (
                  <><div className={styles.spinnerSm} /> Cancelling…</>
                ) : (
                  <><i className="ti ti-x" /> Yes, cancel</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
