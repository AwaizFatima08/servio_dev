// web/src/pages/admin/BbqTableApprovalPage.jsx
// Screen #10 — BBQ Table Booking Approval (Admin)
// Path: /bbq-table-approval
//
// Event-scoped via dropdown (confirmed with Homi 02-Aug) — unlike the
// kitchen-floor screens (#6/#7/#8), table requests may be reviewed on any
// day for an upcoming Friday, so "today's event" isn't necessarily the
// relevant one. Defaults to the earliest published event (soonest-first
// sort already done by getPublishedBbqEvents), as a proxy for "nearest
// upcoming" — good enough while at most 1-2 events are ever published at
// once; revisit if that assumption changes.
//
// Two tabs: Pending (action queue — approve/return/reject) and History
// (read-only — returned + rejected). Confirmed 02-Aug: history tab
// included, not deferred. The single GET /bbq/table-requests?eventDate=...
// call fetches everything for the chosen event; pending vs. history is
// split client-side, since the backend's ?status= filter only accepts one
// value and history needs two (returned + rejected).
//
// Approve = single click, no confirm. Return/Reject = require a typed
// reason, button disabled until non-empty — same pattern as Screen #8's
// Exception Queue, confirmed to reuse here too.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPublishedBbqEvents } from '../../services/bbqEventService';
import {
  getTableRequestsForEvent,
  approveTableRequest,
  returnTableRequest,
  rejectTableRequest,
} from '../../services/bbqTableRequestService';
import styles from './BbqTableApprovalPage.module.css';

const HISTORY_BADGE = {
  approved: { label: 'Approved',   cls: 'status_approved' },
  returned: { label: 'Returned',   cls: 'status_returned' },
  rejected: { label: 'Rejected',   cls: 'status_rejected' },
};

export default function BbqTableApprovalPage({ token }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending'); // 'pending' | 'history'

  const [approvingId, setApprovingId] = useState(null);
  const [returningId, setReturningId] = useState(null);   // which card has the return form open
  const [returnText, setReturnText] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);   // which card has the reject form open
  const [rejectText, setRejectText] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setError('');
    try {
      const evs = await getPublishedBbqEvents(token);
      setEvents(evs);
      if (evs.length > 0) setSelectedDate(evs[0].eventDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [token]);

  const loadRequests = useCallback(async (eventDate) => {
    setRequestsLoading(true);
    setError('');
    try {
      const data = await getTableRequestsForEvent(token, eventDate);
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { if (selectedDate) loadRequests(selectedDate); }, [selectedDate, loadRequests]);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  // Widened 02-Aug (was returned/rejected only) — an approved request
  // was otherwise invisible on this screen the moment it left Pending,
  // since it moves on to Screen #11 rather than staying here. Admin
  // reviewing "everything I decided today" needs to see it too.
  const history = useMemo(
    () => requests.filter((r) => ['returned', 'rejected', 'approved'].includes(r.status)),
    [requests]
  );

  const onApprove = async (requestId) => {
    setApprovingId(requestId);
    setError('');
    try {
      await approveTableRequest(token, requestId);
      await loadRequests(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const openReturn = (requestId) => { setReturningId(requestId); setReturnText(''); setRejectingId(null); };
  const openReject = (requestId) => { setRejectingId(requestId); setRejectText(''); setReturningId(null); };
  const closeForms = () => { setReturningId(null); setRejectingId(null); setReturnText(''); setRejectText(''); };

  const submitReturn = async (requestId) => {
    setReturnSaving(true);
    setError('');
    try {
      await returnTableRequest(token, requestId, returnText.trim());
      closeForms();
      await loadRequests(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setReturnSaving(false);
    }
  };

  const submitReject = async (requestId) => {
    setRejectSaving(true);
    setError('');
    try {
      await rejectTableRequest(token, requestId, rejectText.trim());
      closeForms();
      await loadRequests(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setRejectSaving(false);
    }
  };

  const list = tab === 'pending' ? pending : history;

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>BBQ Table Booking Approval</h1>
          <p className={styles.subtitle}>
            {pending.length > 0 ? `${pending.length} pending review` : 'No pending requests'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <select
            className={styles.eventSelect}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={eventsLoading || events.length === 0}
          >
            {events.length === 0 && <option value="">No published events</option>}
            {events.map((ev) => (
              <option key={ev.eventDate} value={ev.eventDate}>{ev.eventDate}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'pending' ? styles.tabActive : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending ({pending.length})
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {eventsLoading || requestsLoading ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : events.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-calendar-off" />
          <p>No published BBQ events to review requests for.</p>
        </div>
      ) : list.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-armchair-off" />
          <p>{tab === 'pending' ? 'No pending table requests.' : 'No decided requests yet.'}</p>
        </div>
      ) : (
        <div className={styles.requestGrid}>
          {list.map((req) => (
            <div key={req.requestId} className={styles.requestCard}>
              <div className={styles.cardTop}>
                <span className={styles.employeeName}>{req.employeeName}</span>
                {tab === 'history' ? (
                  <span className={`${styles.statusBadge} ${styles[HISTORY_BADGE[req.status]?.cls]}`}>
                    {HISTORY_BADGE[req.status]?.label || req.status}
                  </span>
                ) : (
                  <span className={styles.empNum}>{req.employeeNumber}</span>
                )}
              </div>
              {tab === 'history' && <span className={styles.empNum}>{req.employeeNumber}</span>}

              <div className={styles.guestCountLine}>
                <i className="ti ti-users" /> {req.expectedGuestCount} guests
              </div>

              {req.requestNote && <div className={styles.noteLine}>"{req.requestNote}"</div>}

              {/* approved history cards get no extra detail line — just the badge above */}
              {tab === 'history' && req.status === 'returned' && (
                <div className={styles.rowInfo}>
                  <strong>Returned:</strong> {req.returnComments}
                </div>
              )}
              {tab === 'history' && req.status === 'rejected' && (
                <div className={styles.rowError}>
                  <strong>Rejected:</strong> {req.rejectionReason}
                </div>
              )}

              {tab === 'pending' && (
                returningId === req.requestId ? (
                  <div className={styles.inlineForm}>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="Why is this being returned for changes?"
                      value={returnText}
                      onChange={(e) => setReturnText(e.target.value)}
                      disabled={returnSaving}
                    />
                    <div className={styles.cardActionsRow}>
                      <button
                        className={styles.returnConfirmBtn}
                        onClick={() => submitReturn(req.requestId)}
                        disabled={returnSaving || !returnText.trim()}
                      >
                        {returnSaving ? 'Returning…' : 'Confirm Return'}
                      </button>
                      <button className={styles.cancelLinkBtn} onClick={closeForms} disabled={returnSaving}>Discard</button>
                    </div>
                  </div>
                ) : rejectingId === req.requestId ? (
                  <div className={styles.inlineForm}>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="Why is this being rejected?"
                      value={rejectText}
                      onChange={(e) => setRejectText(e.target.value)}
                      disabled={rejectSaving}
                    />
                    <div className={styles.cardActionsRow}>
                      <button
                        className={styles.rejectConfirmBtn}
                        onClick={() => submitReject(req.requestId)}
                        disabled={rejectSaving || !rejectText.trim()}
                      >
                        {rejectSaving ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                      <button className={styles.cancelLinkBtn} onClick={closeForms} disabled={rejectSaving}>Discard</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActionsRow}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => onApprove(req.requestId)}
                      disabled={approvingId === req.requestId}
                    >
                      {approvingId === req.requestId ? 'Approving…' : 'Approve'}
                    </button>
                    <button className={styles.returnBtn} onClick={() => openReturn(req.requestId)}>Return</button>
                    <button className={styles.rejectBtn} onClick={() => openReject(req.requestId)}>Reject</button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}