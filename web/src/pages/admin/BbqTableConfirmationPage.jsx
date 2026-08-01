// web/src/pages/admin/BbqTableConfirmationPage.jsx
// Screen #11 — BBQ Table Booking Confirmation (Manager)
// Path: /bbq-table-confirmation
//
// Confirm + Cancel both live here (confirmed with Homi 01-Aug) — the
// backend allows manager+ to cancel an approved request same as the
// owner can, and there's no other screen this action would naturally
// belong to.
//
// Single list: approved requests awaiting confirmation. No separate
// "already confirmed" history view — the design doc calls this a
// confirmation screen, not a review screen like #10. (Default taken,
// not explicitly locked — flag if a history view turns out to be
// wanted too.)
//
// Event-scoped via dropdown, same pattern as Screen #10 — table
// requests may be reviewed for an upcoming Friday on any day, not just
// "today's" event.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPublishedBbqEvents } from '../../services/bbqEventService';
import {
  getTableRequestsForEvent,
  confirmTableRequest,
  cancelTableRequest,
} from '../../services/bbqTableRequestService';
import styles from './BbqTableConfirmationPage.module.css';

export default function BbqTableConfirmationPage({ token }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

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

  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);

  const onConfirm = async (requestId) => {
    setConfirmingId(requestId);
    setError('');
    try {
      await confirmTableRequest(token, requestId);
      await loadRequests(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const onCancel = async (requestId) => {
    setCancellingId(requestId);
    setError('');
    try {
      await cancelTableRequest(token, requestId);
      await loadRequests(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>BBQ Table Booking Confirmation</h1>
          <p className={styles.subtitle}>
            {approved.length > 0 ? `${approved.length} awaiting confirmation` : 'Nothing awaiting confirmation'}
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

      {eventsLoading || requestsLoading ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : events.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-calendar-off" />
          <p>No published BBQ events to confirm requests for.</p>
        </div>
      ) : approved.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-armchair-off" />
          <p>No approved requests awaiting confirmation.</p>
        </div>
      ) : (
        <div className={styles.requestGrid}>
          {approved.map((req) => (
            <div key={req.requestId} className={styles.requestCard}>
              <div className={styles.cardTop}>
                <span className={styles.employeeName}>{req.employeeName}</span>
                <span className={styles.empNum}>{req.employeeNumber}</span>
              </div>

              <div className={styles.guestCountLine}>
                <i className="ti ti-users" /> {req.expectedGuestCount} guests
              </div>

              {req.requestNote && <div className={styles.noteLine}>"{req.requestNote}"</div>}

              <div className={styles.cardActionsRow}>
                <button
                  className={styles.confirmBtn}
                  onClick={() => onConfirm(req.requestId)}
                  disabled={confirmingId === req.requestId || cancellingId === req.requestId}
                >
                  {confirmingId === req.requestId ? 'Confirming…' : 'Confirm'}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => onCancel(req.requestId)}
                  disabled={confirmingId === req.requestId || cancellingId === req.requestId}
                >
                  {cancellingId === req.requestId ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}