// web/src/pages/employee/BbqTableRequestPage.jsx
// Screen #9 — BBQ Table Request (Employee)
// Path: /bbq-table-request
//
// Combined screen (confirmed with Homi 01-Aug): submission form AND the
// employee's own request history/resubmit/cancel, in one page — unlike
// orders, which split creation (#1/#2) from history (#3). The design doc
// only lists one employee-facing screen for table requests, so both jobs
// live here.
//
// Multiple concurrent active requests are allowed (confirmed 01-Aug) —
// the backend never enforced one-active-request-per-employee, and the UI
// deliberately does not add that restriction either.
//
// Uses the current published event (getCurrentBbqEvent), same convention
// as Screens #1/#2/#3 — NOT the event-dropdown pattern Screens #10/#11
// will use, since this is a same-day-relevant submission, not a
// cross-event review queue.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import {
  createTableRequest,
  getMyTableRequests,
  resubmitTableRequest,
  cancelTableRequest,
} from '../../services/bbqTableRequestService';
import styles from './BbqTableRequestPage.module.css';

const STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Approved — awaiting confirmation',
  returned: 'Returned — needs changes',
  rejected: 'Rejected',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const CANCELLABLE = ['pending', 'approved', 'returned'];

export default function BbqTableRequestPage({ token }) {
  const { userProfile } = useAuth();
  const employeeName = userProfile?.employee?.fullName || userProfile?.user?.officialEmployeeNumber || '';

  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');

  // Submit form state
  const [guestCount, setGuestCount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Resubmit inline-edit state
  const [resubmittingId, setResubmittingId] = useState(null);
  const [resubmitGuestCount, setResubmitGuestCount] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');
  const [resubmitSaving, setResubmitSaving] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);

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

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const data = await getMyTableRequests(token);
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEvent(); loadRequests(); }, [loadEvent, loadRequests]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const n = parseInt(guestCount, 10);
    if (!Number.isInteger(n) || n < 1) {
      setSubmitError('Expected guest count must be a positive number.');
      return;
    }
    if (!event) {
      setSubmitError('No published BBQ event to request a table for.');
      return;
    }
    setSubmitting(true);
    try {
      await createTableRequest(token, {
        eventDate: event.eventDate,
        expectedGuestCount: n,
        requestNote: requestNote || null,
        employeeName,
      });
      setGuestCount('');
      setRequestNote('');
      await loadRequests();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startResubmit = (req) => {
    setResubmittingId(req.requestId);
    setResubmitGuestCount(String(req.expectedGuestCount));
    setResubmitNote(req.requestNote || '');
  };

  const cancelResubmitEdit = () => {
    setResubmittingId(null);
    setResubmitGuestCount('');
    setResubmitNote('');
  };

  const saveResubmit = async (requestId) => {
    const n = parseInt(resubmitGuestCount, 10);
    if (!Number.isInteger(n) || n < 1) {
      setError('Expected guest count must be a positive number.');
      return;
    }
    setResubmitSaving(true);
    setError('');
    try {
      await resubmitTableRequest(token, requestId, {
        expectedGuestCount: n,
        requestNote: resubmitNote || null,
      });
      cancelResubmitEdit();
      await loadRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setResubmitSaving(false);
    }
  };

  const onCancel = async (requestId) => {
    setCancellingId(requestId);
    setError('');
    try {
      await cancelTableRequest(token, requestId);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <h1 className={styles.title}>BBQ Table Request</h1>
        <p className={styles.subtitle}>
          {eventLoading ? 'Loading event…' : event ? `For ${event.eventDate}` : 'No published BBQ event currently.'}
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* ── Submit form ── */}
      <div className={styles.formCard}>
        <h2 className={styles.sectionTitle}>Request a Table</h2>
        {!event && !eventLoading ? (
          <p className={styles.mutedNote}>No published BBQ event right now — check back closer to Friday.</p>
        ) : (
          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>Expected guest count</label>
              <input
                type="number"
                min="1"
                className={styles.input}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                disabled={submitting || eventLoading}
                required
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Special request (optional)</label>
              <textarea
                className={styles.textarea}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                disabled={submitting || eventLoading}
                rows={2}
                placeholder="e.g. large family group, near the play area…"
              />
            </div>
            {submitError && <div className={styles.formError}>{submitError}</div>}
            <button type="submit" className={styles.submitBtn} disabled={submitting || eventLoading || !event}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>

      {/* ── Own request history ── */}
      <div className={styles.historySection}>
        <h2 className={styles.sectionTitle}>My Table Requests</h2>
        {requestsLoading ? (
          <div className={styles.detailLoading}>
            <div className={styles.spinner} />
            <span>Loading…</span>
          </div>
        ) : requests.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="ti ti-armchair-off" />
            <p>No table requests yet.</p>
          </div>
        ) : (
          <div className={styles.requestGrid}>
            {requests.map((req) => (
              <div key={req.requestId} className={styles.requestCard}>
                <div className={styles.cardTop}>
                  <span className={`${styles.statusBadge} ${styles[`status_${req.status}`]}`}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                  <span className={styles.eventDateLabel}>{req.eventDate}</span>
                </div>

                <div className={styles.guestCountLine}>
                  <i className="ti ti-users" /> {req.expectedGuestCount} guests
                </div>

                {req.requestNote && (
                  <div className={styles.noteLine}>"{req.requestNote}"</div>
                )}

                {req.status === 'returned' && req.returnComments && (
                  <div className={styles.rowError}>
                    <strong>Admin note:</strong> {req.returnComments}
                  </div>
                )}
                {req.status === 'rejected' && req.rejectionReason && (
                  <div className={styles.rowError}>
                    <strong>Rejected:</strong> {req.rejectionReason}
                  </div>
                )}

                {resubmittingId === req.requestId ? (
                  <div className={styles.resubmitForm}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      value={resubmitGuestCount}
                      onChange={(e) => setResubmitGuestCount(e.target.value)}
                      disabled={resubmitSaving}
                    />
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      value={resubmitNote}
                      onChange={(e) => setResubmitNote(e.target.value)}
                      disabled={resubmitSaving}
                    />
                    <div className={styles.cardActionsRow}>
                      <button
                        className={styles.submitBtn}
                        onClick={() => saveResubmit(req.requestId)}
                        disabled={resubmitSaving}
                      >
                        {resubmitSaving ? 'Saving…' : 'Save & Resubmit'}
                      </button>
                      <button
                        className={styles.cancelLinkBtn}
                        onClick={cancelResubmitEdit}
                        disabled={resubmitSaving}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActionsRow}>
                    {req.status === 'returned' && (
                      <button className={styles.resubmitBtn} onClick={() => startResubmit(req)}>
                        Resubmit
                      </button>
                    )}
                    {CANCELLABLE.includes(req.status) && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => onCancel(req.requestId)}
                        disabled={cancellingId === req.requestId}
                      >
                        {cancellingId === req.requestId ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}