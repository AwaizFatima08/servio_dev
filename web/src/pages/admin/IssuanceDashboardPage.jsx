// ─────────────────────────────────────────────────────────────────────────────
// IssuanceDashboardPage.jsx — Screen 3
// HomiLabs | Servio | Web
// Supervisor: view reservations for a meal slot, mark issued or no-show
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIssuanceList, issueReservation, markNoShow, getPendingOfficialGuestApprovals, approveOfficialGuestMeal, rejectOfficialGuestMeal } from '../../services/messService';
import { formatTsTime } from '../../utils/dateUtils';
import styles from './IssuanceDashboardPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Determine which meal slot to default to based on current time (PKT = UTC+5)
function defaultMealType() {
  const pktHour = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
  ).getHours();
  if (pktHour < 10) return 'breakfast';
  if (pktHour < 16) return 'lunch';
  return 'dinner';
}

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

const SUBJECT_LABELS = {
  self:           'Self',
  personal_guest: 'Guest',
  official_guest: 'Official Guest',
  official_meal:  'Official Meal',
  special_meal:   'Special Meal',
};

const DINING_LABELS = {
  dine_in:  'Dine-in',
  takeaway: 'Takeaway',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, highlight }) {
  return (
    <div className={`${styles.summaryCard} ${highlight ? styles.summaryHighlight : ''}`}>
      <span className={styles.summaryVal}>{value}</span>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}

function StatusBadge({ issueStatus }) {
  if (issueStatus === 'issued')   return <span className={`${styles.badge} ${styles.badgeIssued}`}>Issued</span>;
  if (issueStatus === 'no_show')  return <span className={`${styles.badge} ${styles.badgeNoShow}`}>No Show</span>;
  return <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function IssuanceDashboardPage() {
  const { getToken } = useAuth();

  // Page mode — 'issuance' | 'approvals'
  const [pageMode, setPageMode] = useState('issuance');

  // Controls
  const [date, setDate]           = useState(todayStr());
  const [mealType, setMealType]   = useState(defaultMealType());
  const [search, setSearch]       = useState('');

  // Issuance data
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  // Per-row action state: { [reservationId]: 'issuing' | 'marking' | null }
  const [rowLoading, setRowLoading] = useState({});
  const [rowError, setRowError]     = useState({});

  // Approvals data
  const [approvals, setApprovals]         = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError]     = useState('');
  const [approvalRowLoading, setApprovalRowLoading] = useState({});
  const [approvalRowError, setApprovalRowError]     = useState({});
  // Reject modal state
  const [rejectTarget, setRejectTarget]   = useState(null); // reservationId
  const [rejectNote, setRejectNote]       = useState('');

  // ── Load list ─────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    setRowError({});
    try {
      const token = await getToken();
      const data = await getIssuanceList(date, mealType, token);
      setReservations(data.reservations || []);
    } catch (e) {
      setError(e.message);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, date, mealType]);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleIssue(reservationId) {
    setRowLoading(r => ({ ...r, [reservationId]: 'issuing' }));
    setRowError(r => ({ ...r, [reservationId]: '' }));
    try {
      const token = await getToken();
      await issueReservation(reservationId, token);
      // Update row in-place — no full reload needed
      setReservations(rs => rs.map(r =>
        r.reservationId === reservationId
          ? { ...r, issueStatus: 'issued', issuedAt: new Date().toISOString() }
          : r
      ));
    } catch (e) {
      setRowError(r => ({ ...r, [reservationId]: e.message }));
    } finally {
      setRowLoading(r => ({ ...r, [reservationId]: null }));
    }
  }

  async function handleNoShow(reservationId) {
    setRowLoading(r => ({ ...r, [reservationId]: 'marking' }));
    setRowError(r => ({ ...r, [reservationId]: '' }));
    try {
      const token = await getToken();
      await markNoShow(reservationId, token);
      setReservations(rs => rs.map(r =>
        r.reservationId === reservationId
          ? { ...r, issueStatus: 'no_show' }
          : r
      ));
    } catch (e) {
      setRowError(r => ({ ...r, [reservationId]: e.message }));
    } finally {
      setRowLoading(r => ({ ...r, [reservationId]: null }));
    }
  }

  // ── Approvals ─────────────────────────────────────────────────────────────

  const loadApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    setApprovalsError('');
    setApprovalRowError({});
    try {
      const token = await getToken();
      const data = await getPendingOfficialGuestApprovals(token);
      setApprovals(data);
    } catch (e) {
      setApprovalsError(e.message);
      setApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (pageMode === 'approvals') loadApprovals();
  }, [pageMode, loadApprovals]);

  async function handleApprove(reservationId) {
    setApprovalRowLoading(r => ({ ...r, [reservationId]: 'approving' }));
    setApprovalRowError(r => ({ ...r, [reservationId]: '' }));
    try {
      const token = await getToken();
      await approveOfficialGuestMeal(reservationId, token);
      setApprovals(rs => rs.filter(r => r.reservationId !== reservationId));
    } catch (e) {
      setApprovalRowError(r => ({ ...r, [reservationId]: e.message }));
    } finally {
      setApprovalRowLoading(r => ({ ...r, [reservationId]: null }));
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const reservationId = rejectTarget;
    setApprovalRowLoading(r => ({ ...r, [reservationId]: 'rejecting' }));
    setApprovalRowError(r => ({ ...r, [reservationId]: '' }));
    setRejectTarget(null);
    setRejectNote('');
    try {
      const token = await getToken();
      await rejectOfficialGuestMeal(reservationId, rejectNote, token);
      setApprovals(rs => rs.filter(r => r.reservationId !== reservationId));
    } catch (e) {
      setApprovalRowError(r => ({ ...r, [reservationId]: e.message }));
    } finally {
      setApprovalRowLoading(r => ({ ...r, [reservationId]: null }));
    }
  }

  // ── Derived counts ────────────────────────────────────────────────────────
  const total    = reservations.length;
  const pending  = reservations.filter(r => r.issueStatus === 'pending').length;
  const issued   = reservations.filter(r => r.issueStatus === 'issued').length;
  const noShow   = reservations.filter(r => r.issueStatus === 'no_show').length;
  const cancelled = reservations.filter(r => r.reservationStatus === 'cancelled').length;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = reservations.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeNumber?.toLowerCase().includes(q) ||
      r.guestName?.toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Issuance Dashboard</h1>
          <p className={styles.pageSubtitle}>Mark meal reservations as issued or no-show</p>
        </div>
        <button className={styles.btnRefresh} onClick={pageMode === 'issuance' ? loadList : loadApprovals} disabled={loading || approvalsLoading}>
          <i className={`ti ti-refresh ${(loading || approvalsLoading) ? styles.spinning : ''}`} />
          Refresh
        </button>
      </div>

      {/* Page mode toggle */}
      <div className={styles.pageModeRow}>
        <button
          className={`${styles.pageModeBtn} ${pageMode === 'issuance' ? styles.pageModeBtnActive : ''}`}
          onClick={() => setPageMode('issuance')}
        >
          <i className="ti ti-clipboard-list" /> Issuance
        </button>
        <button
          className={`${styles.pageModeBtn} ${pageMode === 'approvals' ? styles.pageModeBtnActive : ''}`}
          onClick={() => setPageMode('approvals')}
        >
          <i className="ti ti-user-check" /> Official Guest Approvals
          {approvals.length > 0 && (
            <span className={styles.approvalBadge}>{approvals.length}</span>
          )}
        </button>
      </div>

      {/* ── ISSUANCE MODE ── */}
      {pageMode === 'issuance' && (<>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        <div className={styles.mealTabs}>
          {['breakfast', 'lunch', 'dinner'].map(m => (
            <button
              key={m}
              className={`${styles.mealTab} ${mealType === m ? styles.mealTabActive : ''}`}
              onClick={() => setMealType(m)}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <SummaryCard label="Total"     value={total}     />
        <SummaryCard label="Pending"   value={pending}   highlight={pending > 0} />
        <SummaryCard label="Issued"    value={issued}    />
        <SummaryCard label="No Show"   value={noShow}    />
        <SummaryCard label="Cancelled" value={cancelled} />
      </div>

      {/* Error */}
      {error && <p className={styles.errorText}>{error}</p>}

      {/* Search */}
      {!loading && reservations.length > 0 && (
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Search by employee name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          <span className={styles.countLabel}>
            {filtered.length} of {total} reservations
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingState}>
          <i className="ti ti-loader-2" />
          <p>Loading reservations…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reservations.length === 0 && (
        <div className={styles.emptyState}>
          <i className="ti ti-clipboard-off" />
          <p>No reservations found for {MEAL_LABELS[mealType]} on {date}.</p>
        </div>
      )}

      {/* Reservation list */}
      {!loading && filtered.length > 0 && (
        <div className={styles.list}>

          {/* Column headers */}
          <div className={styles.listHeader}>
            <span className={styles.colEmployee}>Employee</span>
            <span className={styles.colItem}>Item</span>
            <span className={styles.colType}>Type</span>
            <span className={styles.colMode}>Mode</span>
            <span className={styles.colStatus}>Status</span>
            <span className={styles.colActions}>Actions</span>
          </div>

          {filtered.map(r => {
            const isCancelled  = r.reservationStatus === 'cancelled';
            const isIssued     = r.issueStatus === 'issued';
            const isNoShow     = r.issueStatus === 'no_show';
            const isPending    = r.issueStatus === 'pending';
            const actionState  = rowLoading[r.reservationId];

            return (
              <div
                key={r.reservationId}
                className={`${styles.row} ${isCancelled ? styles.rowCancelled : ''} ${isIssued ? styles.rowIssued : ''}`}
              >
                {/* Employee */}
                <div className={styles.colEmployee}>
                  <span className={styles.empName}>
                    {r.subjectType === 'personal_guest' || r.subjectType === 'official_guest'
                      ? r.guestName || 'Guest'
                      : r.employeeName || r.employeeNumber}
                  </span>
                  <span className={styles.empMeta}>
                    {r.employeeNumber}
                    {(r.subjectType === 'personal_guest' || r.subjectType === 'official_guest') && (
                      <span className={styles.guestBadge}> · guest of {r.employeeName}</span>
                    )}
                  </span>
                </div>

                {/* Item */}
                <div className={styles.colItem}>
                  <span className={styles.itemName}>{r.itemName}</span>
                  <span className={styles.optionLabel}>{r.optionLabel}</span>
                </div>

                {/* Subject type */}
                <div className={styles.colType}>
                  <span className={`${styles.subjectChip} ${styles[`subject_${r.subjectType}`]}`}>
                    {SUBJECT_LABELS[r.subjectType] || r.subjectType}
                  </span>
                </div>

                {/* Dining mode */}
                <div className={styles.colMode}>
                  <span className={`${styles.modeChip} ${r.diningMode === 'takeaway' ? styles.modeTakeaway : styles.modeDineIn}`}>
                    <i className={`ti ${r.diningMode === 'takeaway' ? 'ti-package' : 'ti-armchair'}`} />
                    {DINING_LABELS[r.diningMode] || r.diningMode}
                  </span>
                </div>

                {/* Status */}
                <div className={styles.colStatus}>
                  <StatusBadge issueStatus={isCancelled ? 'cancelled' : r.issueStatus} />
                  {isIssued && r.issuedAt && (
                    <span className={styles.timeStamp}>{formatTsTime(r.issuedAt)}</span>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.colActions}>
                  {rowError[r.reservationId] && (
                    <span className={styles.rowError} title={rowError[r.reservationId]}>
                      <i className="ti ti-alert-circle" />
                    </span>
                  )}
                  {!isCancelled && isPending && (
                    <>
                      <button
                        className={styles.btnIssue}
                        onClick={() => handleIssue(r.reservationId)}
                        disabled={!!actionState}
                        title="Mark as issued"
                      >
                        {actionState === 'issuing'
                          ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                          : <><i className="ti ti-check" /> Issue</>
                        }
                      </button>
                      <button
                        className={styles.btnNoShow}
                        onClick={() => handleNoShow(r.reservationId)}
                        disabled={!!actionState}
                        title="Mark as no-show"
                      >
                        {actionState === 'marking'
                          ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                          : <i className="ti ti-user-off" />
                        }
                      </button>
                    </>
                  )}
                  {!isCancelled && isIssued && (
                    <span className={styles.issuedTick}><i className="ti ti-circle-check" /></span>
                  )}
                  {!isCancelled && isNoShow && (
                    <span className={styles.noShowMark}><i className="ti ti-user-off" /></span>
                  )}
                  {isCancelled && (
                    <span className={styles.cancelledMark}><i className="ti ti-ban" /></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No search results */}
      {!loading && reservations.length > 0 && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <i className="ti ti-search-off" />
          <p>No results for "{search}"</p>
        </div>
      )}
      </>)}

      {/* ── APPROVALS MODE ── */}
      {pageMode === 'approvals' && (
        <>
          {approvalsLoading && (
            <div className={styles.loadingState}>
              <i className="ti ti-loader-2" />
              <p>Loading pending approvals…</p>
            </div>
          )}

          {approvalsError && <p className={styles.errorText}>{approvalsError}</p>}

          {!approvalsLoading && !approvalsError && approvals.length === 0 && (
            <div className={styles.emptyState}>
              <i className="ti ti-circle-check" />
              <p>No pending official guest meal approvals.</p>
            </div>
          )}

          {!approvalsLoading && approvals.length > 0 && (
            <div className={styles.list}>
              <div className={styles.listHeader}>
                <span className={styles.colEmployee}>Guest</span>
                <span className={styles.colItem}>Item</span>
                <span className={styles.colType}>Meal</span>
                <span className={styles.colMode}>Date</span>
                <span className={styles.colActions}>Actions</span>
              </div>

              {approvals.map(r => {
                const actionState = approvalRowLoading[r.reservationId];
                return (
                  <div key={r.reservationId} className={styles.row}>
                    <div className={styles.colEmployee}>
                      <span className={styles.empName}>{r.guestName || 'Guest'}</span>
                      <span className={styles.empMeta}>
                        Sponsored by {r.sponsoringEmployeeNumber}
                      </span>
                    </div>
                    <div className={styles.colItem}>
                      <span className={styles.itemName}>{r.itemName}</span>
                      <span className={styles.optionLabel}>{r.optionLabel}</span>
                    </div>
                    <div className={styles.colType}>
                      <span className={styles.subjectChip}>
                        {MEAL_LABELS[r.mealType] || r.mealType}
                      </span>
                    </div>
                    <div className={styles.colMode}>
                      <span>{r.reservationDate}</span>
                    </div>
                    <div className={styles.colActions}>
                      {approvalRowError[r.reservationId] && (
                        <span className={styles.rowError} title={approvalRowError[r.reservationId]}>
                          <i className="ti ti-alert-circle" />
                        </span>
                      )}
                      <button
                        className={styles.btnIssue}
                        onClick={() => handleApprove(r.reservationId)}
                        disabled={!!actionState}
                        title="Approve billing"
                      >
                        {actionState === 'approving'
                          ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                          : <><i className="ti ti-check" /> Approve</>
                        }
                      </button>
                      <button
                        className={styles.btnNoShow}
                        onClick={() => { setRejectTarget(r.reservationId); setRejectNote(''); }}
                        disabled={!!actionState}
                        title="Reject billing"
                      >
                        {actionState === 'rejecting'
                          ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                          : <i className="ti ti-x" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reject confirmation modal */}
          {rejectTarget && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Reject Official Guest Meal</h3>
                <p className={styles.modalBody}>
                  Accounts Supervisor will follow up with the sponsoring employee manually.
                </p>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Note (optional) — reason for rejection…"
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  rows={3}
                />
                <div className={styles.modalActions}>
                  <button
                    className={styles.btnNoShow}
                    onClick={handleReject}
                  >
                    Confirm Reject
                  </button>
                  <button
                    className={styles.btnRefresh}
                    onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
