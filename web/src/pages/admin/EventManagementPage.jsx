// EventManagementPage.jsx — v2
// Changes from v1:
// 1. Expanded guest age brackets in employee response form
// 2. Fixed attendance summary panel — reloads event after submit to refresh counts
// 3. Added employee-wise attendance report with CSV download in admin/manager view

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getEvents, getEvent, createEvent, submitEvent,
  publishEvent, returnEvent, cancelEvent,
  getAttendanceSummary, getAttendanceResponses,
  getMyAttendanceResponse, submitAttendanceResponse,
  getNoteTemplates, createNoteTemplate, toggleNoteTemplate,
} from '../../services/eventService';
import styles from './EventManagementPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function isCutoffPassed(responseCutoffAt) {
  if (!responseCutoffAt) return false;
  const cutoff = responseCutoffAt.toDate ? responseCutoffAt.toDate() : new Date(responseCutoffAt);
  return new Date() > cutoff;
}

const STATUS_META = {
  draft:            { label: 'Draft',           cls: 'tagDraft' },
  pending_review:   { label: 'Pending Review',  cls: 'tagPending' },
  pending_approval: { label: 'Pending Approval',cls: 'tagPending' },
  returned:         { label: 'Returned',        cls: 'tagReturned' },
  published:        { label: 'Published',       cls: 'tagPublished' },
  approved:         { label: 'Approved',        cls: 'tagPublished' },
  confirmed:        { label: 'Confirmed',       cls: 'tagPublished' },
  closed:           { label: 'Closed',          cls: 'tagClosed' },
  cancelled:        { label: 'Cancelled',       cls: 'tagCancelled' },
};
const OFFICIAL_CATEGORIES = [
  { value: 'annual_dinner', label: 'Annual Dinner' },
  { value: 'national_day',  label: 'National Day' },
  { value: 'sports_day',    label: 'Sports Day' },
  { value: 'farewell',      label: 'Farewell' },
  { value: 'welcome',       label: 'Welcome' },
  { value: 'company_function', label: 'Company Function' },
  { value: 'other_official',   label: 'Other Official' },
];
const PERSONAL_CATEGORIES = [
  { value: 'birthday',      label: 'Birthday' },
  { value: 'wedding',       label: 'Wedding' },
  { value: 'engagement',    label: 'Engagement' },
  { value: 'gathering',     label: 'Gathering' },
  { value: 'other_personal',label: 'Other Personal' },
];
const todayStr = new Date().toISOString().slice(0, 10);

const EMPTY_COUNTS = {
  selfAttending: true, spouseAttending: false,
  adults: 0, children_12_17: 0, children_under_12: 0,
  permanentGuests_adults: 0, permanentGuests_12_17: 0, permanentGuests_under_12: 0,
  visitingGuests_adults: 0, visitingGuests_12_17: 0, visitingGuests_under_12: 0,
};

function StatusTag({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: 'tagDraft' };
  return <span className={`${styles.tag} ${styles[meta.cls]}`}>{meta.label}</span>;
}
function EmptyState({ icon, text }) {
  return (
    <div className={styles.emptyState}>
      <i className={`ti ${icon}`} />
      <p>{text}</p>
    </div>
  );
}

// ── CSV Download helper ───────────────────────────────────────────────────────
function downloadCSV(responses, eventTitle) {
  const headers = [
    'Employee Number','Employee Name','Status',
    'Self','Spouse','Adults','Children 12-17','Children Under 12',
    'Perm Guests (Adults)','Perm Guests (12-17)','Perm Guests (U12)',
    'Visiting Guests (Adults)','Visiting Guests (12-17)','Visiting Guests (U12)',
    'Total','Version','Submitted At'
  ];
  const rows = responses.map(r => {
    const c = r.counts || {};
    const total = r.totalAttendees || 0;
    const submitted = r.submittedAt?.toDate
      ? r.submittedAt.toDate().toLocaleString('en-GB')
      : r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-GB') : '';
    return [
      r.employeeNumber, r.employeeName, r.attendanceStatus,
      c.selfAttending ? 1 : 0,
      c.spouseAttending ? 1 : 0,
      c.adults || 0, c.children_12_17 || 0, c.children_under_12 || 0,
      c.permanentGuests_adults || 0, c.permanentGuests_12_17 || 0, c.permanentGuests_under_12 || 0,
      c.visitingGuests_adults || 0, c.visitingGuests_12_17 || 0, c.visitingGuests_under_12 || 0,
      total, r.responseVersion || 1, submitted,
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_attendance.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Attendance Summary Panel ──────────────────────────────────────────────────
function AttendanceSummaryPanel({ eventId, eventTitle, onClose }) {
  const { getToken } = useAuth();
  const [summary, setSummary]       = useState(null);
  const [responses, setResponses]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      getToken().then(t => getAttendanceSummary(eventId, t)),
      getToken().then(t => getAttendanceResponses(eventId, t)),
    ])
      .then(([s, r]) => { setSummary(s); setResponses(r || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId, getToken]);

  function handleDownload() {
    setDownloading(true);
    try { downloadCSV(responses, eventTitle); }
    finally { setDownloading(false); }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Attendance Summary</span>
        <button className={styles.iconBtn} onClick={onClose}><i className="ti ti-x" /></button>
      </div>
      <div className={styles.panelBody}>
        {loading && <p className={styles.loadingText}>Loading…</p>}
        {error   && <p className={styles.errorText}>{error}</p>}
        {summary && (
          <>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryVal}>{summary.grandTotal ?? 0}</span>
                <span className={styles.summaryLabel}>Total Expected</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryVal}>{summary.householdsAttending ?? 0}</span>
                <span className={styles.summaryLabel}>Attending (H)</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryVal}>{summary.householdsNotAttending ?? 0}</span>
                <span className={styles.summaryLabel}>Not Attending (H)</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryVal}>{summary.householdsResponded ?? 0}</span>
                <span className={styles.summaryLabel}>Responded (H)</span>
              </div>
            </div>
            {summary.categoryTotals && (
              <table className={styles.summaryTable}>
                <thead><tr><th>Category</th><th>Count</th></tr></thead>
                <tbody>
                  <tr><td>Adults (self+spouse+others)</td><td>{summary.categoryTotals.adults ?? 0}</td></tr>
                  <tr><td>Children (all brackets)</td><td>{summary.categoryTotals.children ?? 0}</td></tr>
                  <tr><td>Permanent Resident Guests</td><td>{summary.categoryTotals.permanentGuests ?? 0}</td></tr>
                  <tr><td>Visiting Guests</td><td>{summary.categoryTotals.visitingGuests ?? 0}</td></tr>
                  <tr style={{fontWeight:600}}><td>Grand Total</td><td>{summary.categoryTotals.grandTotal ?? 0}</td></tr>
                </tbody>
              </table>
            )}
            <div className={styles.reportActions}>
              <button className={styles.btnSecondary} onClick={() => setShowDetail(v => !v)}>
                <i className="ti ti-list" /> {showDetail ? 'Hide' : 'View'} Employee List
              </button>
              <button className={styles.btnPrimary} onClick={handleDownload} disabled={downloading || responses.length === 0}>
                <i className="ti ti-download" /> Download CSV
              </button>
            </div>
          </>
        )}

        {showDetail && responses.length > 0 && (
          <div className={styles.responseTable}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Ver</th>
                </tr>
              </thead>
              <tbody>
                {responses.map(r => (
                  <tr key={r.responseId}>
                    <td>
                      <span className={styles.empName}>{r.employeeName}</span>
                      <span className={styles.empNum}>{r.employeeNumber}</span>
                    </td>
                    <td>
                      <span className={`${styles.responseChip} ${r.attendanceStatus === 'attending' ? styles.chipAttending : styles.chipNotAttending}`}>
                        {r.attendanceStatus === 'attending' ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>{r.totalAttendees ?? 0}</td>
                    <td>{r.responseVersion ?? 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showDetail && responses.length === 0 && !loading && (
          <p className={styles.loadingText}>No responses yet.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeEventsView() {
  const { getToken } = useAuth();
  const [events, setEvents]             = useState([]);
  const [listLoading, setListLoading]   = useState(true);
  const [listError, setListError]       = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myResponse, setMyResponse]     = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('attending');
  const [counts, setCounts]             = useState({ ...EMPTY_COUNTS });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadEvents = useCallback(async () => {
    setListLoading(true); setListError('');
    try {
      const token = await getToken();
      const data = await getEvents({ status: 'published', limit: 50 }, token);
      // Show only today and upcoming events on employee screen
      const pkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
      const todayStr = `${pkt.getFullYear()}-${String(pkt.getMonth() + 1).padStart(2, '0')}-${String(pkt.getDate()).padStart(2, '0')}`;
      const upcoming = (data || []).filter(e => e.eventDate >= todayStr);
      setEvents(upcoming);
    } catch (e) { setListError(e.message); }
    finally { setListLoading(false); }
  }, [getToken]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function openEvent(eventId) {
    setDetailLoading(true); setSelectedEvent(null); setMyResponse(null);
    setShowForm(false); setSubmitError(''); setSubmitSuccess('');
    try {
      const token = await getToken();
      const [ev, resp] = await Promise.all([
        getEvent(eventId, token),
        getMyAttendanceResponse(eventId, token),
      ]);
      setSelectedEvent(ev);
      setMyResponse(resp);
      if (resp) {
        setAttendanceStatus(resp.attendanceStatus);
        setCounts(resp.counts ? { ...EMPTY_COUNTS, ...resp.counts } : { ...EMPTY_COUNTS });
      } else {
        setAttendanceStatus('attending');
        setCounts({ ...EMPTY_COUNTS });
      }
    } catch (e) { setListError(e.message); }
    finally { setDetailLoading(false); }
  }

  function handleCountChange(field, value) { setCounts(c => ({ ...c, [field]: value })); }

  async function handleSubmitResponse() {
    setSubmitLoading(true); setSubmitError(''); setSubmitSuccess('');
    try {
      const token = await getToken();
      const payload = {
        attendanceStatus,
        counts: attendanceStatus === 'attending' ? counts : {},
        employeeName: '',
      };
      const result = await submitAttendanceResponse(selectedEvent.eventId, payload, token);
      const isEdit = !!myResponse;
      setMyResponse({ attendanceStatus, counts: attendanceStatus === 'attending' ? counts : {}, responseVersion: result.responseVersion, submittedAt: new Date() });
      setShowForm(false);
      setSubmitSuccess(isEdit ? `Response updated. Version ${result.responseVersion}.` : 'Response submitted successfully.');
    } catch (e) { setSubmitError(e.message); }
    finally { setSubmitLoading(false); }
  }

  const cutoffPassed = selectedEvent ? isCutoffPassed(selectedEvent.responseCutoffAt) : false;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Events</h1>
          <p className={styles.pageSubtitle}>Club events and your attendance responses</p>
        </div>
      </div>
      <div className={styles.layout}>
        <div className={styles.listPane}>
          {listLoading && <p className={styles.loadingText}>Loading events…</p>}
          {listError   && <p className={styles.errorText}>{listError}</p>}
          {!listLoading && !listError && events.length === 0 && <EmptyState icon="ti-calendar-off" text="No upcoming events." />}
          {!listLoading && events.map(ev => (
            <button key={ev.eventId}
              className={`${styles.eventCard} ${selectedEvent?.eventId === ev.eventId ? styles.eventCardActive : ''}`}
              onClick={() => openEvent(ev.eventId)}>
              <div className={styles.eventCardTop}>
                <span className={styles.eventCardTitle}>{ev.title}</span>
                <StatusTag status={ev.status} />
              </div>
              <div className={styles.eventCardMeta}>
                <span><i className="ti ti-calendar" /> {formatDate(ev.eventDate)}</span>
                <span className={`${styles.typeChip} ${ev.eventType === 'official' ? styles.official : styles.personal}`}>{ev.eventType}</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.detailPane}>
          {detailLoading && <p className={styles.loadingText} style={{ padding: 32 }}>Loading…</p>}
          {!detailLoading && !selectedEvent && <EmptyState icon="ti-calendar-event" text="Select an event to view details and respond." />}
          {!detailLoading && selectedEvent && (
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailTitle}>{selectedEvent.title}</h2>
                  {selectedEvent.subtitle && <p className={styles.detailSubtitle}>{selectedEvent.subtitle}</p>}
                </div>
                <StatusTag status={selectedEvent.status} />
              </div>
              <div className={styles.detailMeta}>
                <span><i className="ti ti-calendar" /> {formatDate(selectedEvent.eventDate)}</span>
                <span><i className="ti ti-clock" /> {selectedEvent.startAt?.slice(11,16)} – {selectedEvent.endAt?.slice(11,16)}</span>
                {selectedEvent.venue && <span><i className="ti ti-map-pin" /> {selectedEvent.venue}</span>}
                <span className={`${styles.typeChip} ${selectedEvent.eventType === 'official' ? styles.official : styles.personal}`}>{selectedEvent.eventType}</span>
              </div>
              {selectedEvent.description && <div className={styles.detailSection}><p className={styles.descText}>{selectedEvent.description}</p></div>}
              {selectedEvent.customNotice && (
                <div className={styles.noticeBox}><i className="ti ti-info-circle" /><p>{selectedEvent.customNotice}</p></div>
              )}
              {selectedEvent.notesSnapshot?.length > 0 && (
                <div className={styles.detailSection}>
                  <h3>Important Notes</h3>
                  {selectedEvent.notesSnapshot.map((n, i) => (
                    <div key={i} className={styles.noteSnap}><strong>{n.title}</strong><p>{n.body}</p></div>
                  ))}
                </div>
              )}
              {selectedEvent.requiresAttendance && (
                <div className={styles.cutoffBanner}>
                  <i className={`ti ${cutoffPassed ? 'ti-lock' : 'ti-clock'}`} />
                  <span>{cutoffPassed ? 'Response cutoff has passed. Your response is locked.' : `Respond by: ${formatDateTime(selectedEvent.responseCutoffAt)}`}</span>
                </div>
              )}

              {/* Current response card */}
              {myResponse && !showForm && (
                <div className={styles.myResponseCard}>
                  <div className={styles.myResponseHeader}>
                    <span className={styles.myResponseLabel}>Your Response</span>
                    <span className={`${styles.responseChip} ${myResponse.attendanceStatus === 'attending' ? styles.chipAttending : styles.chipNotAttending}`}>
                      {myResponse.attendanceStatus === 'attending' ? '✓ Attending' : '✗ Not Attending'}
                    </span>
                  </div>
                  {myResponse.attendanceStatus === 'attending' && myResponse.counts && (
                    <div className={styles.countsSummary}>
                      {myResponse.counts.selfAttending    && <span>Self</span>}
                      {myResponse.counts.spouseAttending  && <span>Spouse</span>}
                      {myResponse.counts.adults > 0       && <span>Adults: {myResponse.counts.adults}</span>}
                      {myResponse.counts.children_12_17 > 0 && <span>Children (12–17): {myResponse.counts.children_12_17}</span>}
                      {myResponse.counts.children_under_12 > 0 && <span>Young Children: {myResponse.counts.children_under_12}</span>}
                      {(myResponse.counts.permanentGuests_adults > 0 || myResponse.counts.permanentGuests_12_17 > 0 || myResponse.counts.permanentGuests_under_12 > 0) && (
                        <span>Perm. Guests: {(myResponse.counts.permanentGuests_adults||0)+(myResponse.counts.permanentGuests_12_17||0)+(myResponse.counts.permanentGuests_under_12||0)}</span>
                      )}
                      {(myResponse.counts.visitingGuests_adults > 0 || myResponse.counts.visitingGuests_12_17 > 0 || myResponse.counts.visitingGuests_under_12 > 0) && (
                        <span>Visiting Guests: {(myResponse.counts.visitingGuests_adults||0)+(myResponse.counts.visitingGuests_12_17||0)+(myResponse.counts.visitingGuests_under_12||0)}</span>
                      )}
                    </div>
                  )}
                  <p className={styles.responseVersion}>Version {myResponse.responseVersion} · Submitted {formatDateTime(myResponse.submittedAt)}</p>
                  {!cutoffPassed && selectedEvent.allowEditUntilCutoff && (
                    <button className={styles.btnSecondary} onClick={() => { setShowForm(true); setSubmitSuccess(''); }}>
                      <i className="ti ti-edit" /> Edit Response
                    </button>
                  )}
                </div>
              )}
              {submitSuccess && !showForm && (
                <p className={styles.successText}><i className="ti ti-circle-check" /> {submitSuccess}</p>
              )}

              {/* Response form */}
              {selectedEvent.requiresAttendance && !cutoffPassed && (showForm || !myResponse) && (
                <div className={styles.responseForm}>
                  <h3>{myResponse ? 'Edit Your Response' : 'Your Response'}</h3>
                  <div className={styles.attendanceToggle}>
                    <button className={`${styles.toggleBtn} ${attendanceStatus === 'attending' ? styles.toggleActive : ''}`} onClick={() => setAttendanceStatus('attending')}>
                      <i className="ti ti-check" /> Attending
                    </button>
                    <button className={`${styles.toggleBtn} ${attendanceStatus === 'not_attending' ? styles.toggleDecline : ''}`} onClick={() => setAttendanceStatus('not_attending')}>
                      <i className="ti ti-x" /> Not Attending
                    </button>
                  </div>

                  {attendanceStatus === 'attending' && (
                    <div className={styles.countsForm}>
                      <p className={styles.countsHint}>Fill in all household members attending accurately.</p>

                      {/* Self + Spouse */}
                      <div className={styles.countsRow}>
                        <label className={styles.checkLabel}>
                          <input type="checkbox" checked={counts.selfAttending} onChange={e => handleCountChange('selfAttending', e.target.checked)} /> Myself
                        </label>
                        <label className={styles.checkLabel}>
                          <input type="checkbox" checked={counts.spouseAttending} onChange={e => handleCountChange('spouseAttending', e.target.checked)} /> Spouse
                        </label>
                      </div>

                      {/* Own family numbers */}
                      <p className={styles.countsGroupLabel}>Your Household</p>
                      <div className={styles.countsGrid}>
                        <div className={styles.countField}>
                          <label>Additional Adults</label>
                          <input type="number" min="0" value={counts.adults} onChange={e => handleCountChange('adults', parseInt(e.target.value)||0)} />
                          <span className={styles.hint}>18+ excluding self and spouse</span>
                        </div>
                        <div className={styles.countField}>
                          <label>Children (12–17)</label>
                          <input type="number" min="0" value={counts.children_12_17} onChange={e => handleCountChange('children_12_17', parseInt(e.target.value)||0)} />
                        </div>
                        <div className={styles.countField}>
                          <label>Children (under 12)</label>
                          <input type="number" min="0" value={counts.children_under_12} onChange={e => handleCountChange('children_under_12', parseInt(e.target.value)||0)} />
                        </div>
                      </div>

                      {/* Permanent resident guests */}
                      <p className={styles.countsGroupLabel}>Permanent Resident Guests <span className={styles.hint}>(parents/in-laws living with you)</span></p>
                      <div className={styles.countsGrid}>
                        <div className={styles.countField}>
                          <label>Adults (18+)</label>
                          <input type="number" min="0" value={counts.permanentGuests_adults} onChange={e => handleCountChange('permanentGuests_adults', parseInt(e.target.value)||0)} />
                        </div>
                        <div className={styles.countField}>
                          <label>Children (12–17)</label>
                          <input type="number" min="0" value={counts.permanentGuests_12_17} onChange={e => handleCountChange('permanentGuests_12_17', parseInt(e.target.value)||0)} />
                        </div>
                        <div className={styles.countField}>
                          <label>Children (under 12)</label>
                          <input type="number" min="0" value={counts.permanentGuests_under_12} onChange={e => handleCountChange('permanentGuests_under_12', parseInt(e.target.value)||0)} />
                        </div>
                      </div>

                      {/* Visiting guests */}
                      <p className={styles.countsGroupLabel}>Visiting Guests <span className={styles.hint}>(temporary visitors staying with you)</span></p>
                      <div className={styles.countsGrid}>
                        <div className={styles.countField}>
                          <label>Adults (18+)</label>
                          <input type="number" min="0" value={counts.visitingGuests_adults} onChange={e => handleCountChange('visitingGuests_adults', parseInt(e.target.value)||0)} />
                        </div>
                        <div className={styles.countField}>
                          <label>Children (12–17)</label>
                          <input type="number" min="0" value={counts.visitingGuests_12_17} onChange={e => handleCountChange('visitingGuests_12_17', parseInt(e.target.value)||0)} />
                        </div>
                        <div className={styles.countField}>
                          <label>Children (under 12)</label>
                          <input type="number" min="0" value={counts.visitingGuests_under_12} onChange={e => handleCountChange('visitingGuests_under_12', parseInt(e.target.value)||0)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {submitError && <p className={styles.errorText}>{submitError}</p>}
                  <div className={styles.formActions}>
                    {myResponse && <button className={styles.btnGhost} onClick={() => { setShowForm(false); setSubmitError(''); }}>Cancel</button>}
                    <button className={styles.btnPrimary} onClick={handleSubmitResponse} disabled={submitLoading}>
                      {submitLoading ? 'Submitting…' : myResponse ? 'Update Response' : 'Submit Response'}
                    </button>
                  </div>
                </div>
              )}
              {selectedEvent.requiresAttendance && cutoffPassed && !myResponse && (
                <div className={styles.cutoffBanner} style={{ borderColor: '#F5B7B1', background: '#FEF0F0' }}>
                  <i className="ti ti-alert-triangle" /><span>You did not respond before the cutoff.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGEMENT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ManagementEventsView({ role }) {
  const { getToken } = useAuth();
  const isAdmin = ['admin', 'super_admin'].includes(role);

  const [events, setEvents]             = useState([]);
  const [listLoading, setListLoading]   = useState(true);
  const [listError, setListError]       = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [publishModal, setPublishModal] = useState(false);
  const [returnModal, setReturnModal]   = useState(false);
  const [publishVenue, setPublishVenue] = useState('');
  const [publishLocation, setPublishLocation] = useState('');
  const [returnComments, setReturnComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]   = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [noteTemplates, setNoteTemplates] = useState([]);
  const [form, setForm] = useState({
    eventType: 'official', eventCategory: '', title: '', subtitle: '',
    description: '', eventDate: '', startAt: '', endAt: '',
    targetScope: 'all_employees', requiresAttendance: true,
    responseCutoffAt: '', allowEditUntilCutoff: true,
    selectedNoteIds: [], customNotice: '', decorRequired: false,
    billingDestination: 'official_account', costCentreCode: '',
  });
  const [formLoading, setFormLoading]   = useState(false);
  const [formError, setFormError]       = useState('');
  const [activeTab, setActiveTab]       = useState('events');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody]   = useState('');
  const [noteFormError, setNoteFormError] = useState('');
  const [noteSaving, setNoteSaving]     = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [allNotes, setAllNotes]         = useState([]);

  const loadEvents = useCallback(async () => {
    setListLoading(true); setListError('');
    try {
      const token = await getToken();
      const data = await getEvents({ eventType: filterType||undefined, status: filterStatus||undefined, limit: 50 }, token);
      setEvents(data || []);
    } catch (e) { setListError(e.message); }
    finally { setListLoading(false); }
  }, [getToken, filterType, filterStatus]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const loadNoteTemplates = useCallback(async () => {
    try { const token = await getToken(); const d = await getNoteTemplates(token); setNoteTemplates(d||[]); }
    catch { /* non-critical */ }
  }, [getToken]);
  useEffect(() => { loadNoteTemplates(); }, [loadNoteTemplates]);

  const loadAllNotes = useCallback(async () => {
    setNotesLoading(true);
    try { const token = await getToken(); const d = await getNoteTemplates(token); setAllNotes(d||[]); }
    catch { /* silent */ }
    finally { setNotesLoading(false); }
  }, [getToken]);
  useEffect(() => { if (activeTab === 'notes') loadAllNotes(); }, [activeTab, loadAllNotes]);

  async function openDetail(eventId) {
    setDetailLoading(true); setSelectedEvent(null); setShowAttendance(false); setActionError('');
    try { const token = await getToken(); const ev = await getEvent(eventId, token); setSelectedEvent(ev); }
    catch (e) { setListError(e.message); }
    finally { setDetailLoading(false); }
  }

  async function handleSubmit(eventId) {
    setActionLoading(true); setActionError('');
    try { const token = await getToken(); await submitEvent(eventId, token); await openDetail(eventId); loadEvents(); }
    catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }
  async function handlePublish() {
    if (!publishVenue.trim()) { setActionError('Venue is required to publish.'); return; }
    setActionLoading(true); setActionError('');
    try {
      const token = await getToken();
      await publishEvent(selectedEvent.eventId, { venue: publishVenue, location: publishLocation }, token);
      setPublishModal(false); setPublishVenue(''); setPublishLocation('');
      await openDetail(selectedEvent.eventId); loadEvents();
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }
  async function handleReturn() {
    if (!returnComments.trim()) { setActionError('Comments are required when returning.'); return; }
    setActionLoading(true); setActionError('');
    try {
      const token = await getToken();
      await returnEvent(selectedEvent.eventId, { returnComments }, token);
      setReturnModal(false); setReturnComments('');
      await openDetail(selectedEvent.eventId); loadEvents();
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }
  async function handleCancel(eventId) {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return;
    setActionLoading(true); setActionError('');
    try { const token = await getToken(); await cancelEvent(eventId, token); setSelectedEvent(null); loadEvents(); }
    catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }
  function handleFormChange(field, value) { setForm(f => ({ ...f, [field]: value })); }
  function toggleNoteId(id) {
    setForm(f => ({ ...f, selectedNoteIds: f.selectedNoteIds.includes(id) ? f.selectedNoteIds.filter(x=>x!==id) : [...f.selectedNoteIds, id] }));
  }
  async function handleCreateSubmit(andSubmit = false) {
    setFormError('');
    if (!form.title.trim())     { setFormError('Title is required.'); return; }
    if (!form.eventCategory)    { setFormError('Category is required.'); return; }
    if (!form.eventDate)        { setFormError('Event date is required.'); return; }
    if (!form.startAt)          { setFormError('Start time is required.'); return; }
    if (!form.endAt)            { setFormError('End time is required.'); return; }
    if (!form.responseCutoffAt) { setFormError('Response cutoff is required.'); return; }
    if (form.billingDestination === 'official_account' && !form.costCentreCode.trim()) {
      setFormError('Cost centre code is required for official account billing.'); return;
    }
    const payload = {
      eventType: form.eventType, eventCategory: form.eventCategory,
      title: form.title.trim(), subtitle: form.subtitle.trim()||null,
      description: form.description.trim()||null, eventDate: form.eventDate,
      startAt: `${form.eventDate}T${form.startAt}:00`,
      endAt:   `${form.eventDate}T${form.endAt}:00`,
      targetScope: form.targetScope, requiresAttendance: form.requiresAttendance,
      responseCutoffAt: form.responseCutoffAt, allowEditUntilCutoff: form.allowEditUntilCutoff,
      selectedNoteIds: form.selectedNoteIds, customNotice: form.customNotice.trim()||null,
      decorRequired: form.decorRequired, billingDestination: form.billingDestination,
      costCentreCode: form.billingDestination==='official_account' ? form.costCentreCode.trim() : null,
    };
    setFormLoading(true);
    try {
      const token = await getToken();
      const created = await createEvent(payload, token);
      if (andSubmit && created?.eventId) await submitEvent(created.eventId, token);
      setShowCreate(false); resetForm(); loadEvents();
    } catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
  }
  function resetForm() {
    setForm({ eventType:'official', eventCategory:'', title:'', subtitle:'', description:'',
      eventDate:'', startAt:'', endAt:'', targetScope:'all_employees', requiresAttendance:true,
      responseCutoffAt:'', allowEditUntilCutoff:true, selectedNoteIds:[], customNotice:'',
      decorRequired:false, billingDestination:'official_account', costCentreCode:'' });
    setFormError('');
  }
  async function handleAddNote() {
    if (!newNoteTitle.trim()) { setNoteFormError('Title is required.'); return; }
    if (!newNoteBody.trim())  { setNoteFormError('Body text is required.'); return; }
    setNoteSaving(true); setNoteFormError('');
    try {
      const token = await getToken();
      await createNoteTemplate({ title: newNoteTitle.trim(), body: newNoteBody.trim() }, token);
      setNewNoteTitle(''); setNewNoteBody(''); loadAllNotes(); loadNoteTemplates();
    } catch (e) { setNoteFormError(e.message); }
    finally { setNoteSaving(false); }
  }
  async function handleToggleNote(templateId, isActive) {
    try { const token = await getToken(); await toggleNoteTemplate(templateId, isActive, token); loadAllNotes(); loadNoteTemplates(); }
    catch (e) { setNoteFormError(e.message); }
  }

  const categories = form.eventType === 'official' ? OFFICIAL_CATEGORIES : PERSONAL_CATEGORIES;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Event Management</h1>
          <p className={styles.pageSubtitle}>Create, review, and manage club events</p>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <button className={styles.tabToggle} onClick={() => setActiveTab(t => t==='events'?'notes':'events')}>
              <i className={`ti ${activeTab==='events'?'ti-notes':'ti-calendar-event'}`} />
              {activeTab==='events' ? 'Note Templates' : 'Events'}
            </button>
          )}
          <button className={styles.btnPrimary} onClick={() => { setShowCreate(true); setSelectedEvent(null); }}>
            <i className="ti ti-plus" /> New Event
          </button>
        </div>
      </div>

      {activeTab === 'events' && (
        <div className={styles.layout}>
          <div className={styles.listPane}>
            <div className={styles.filters}>
              <select className={styles.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option><option value="official">Official</option><option value="personal">Personal</option>
              </select>
              <select className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option><option value="pending_review">Pending Review</option>
                <option value="pending_approval">Pending Approval</option><option value="returned">Returned</option>
                <option value="published">Published</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            {listLoading && <p className={styles.loadingText}>Loading events…</p>}
            {listError   && <p className={styles.errorText}>{listError}</p>}
            {!listLoading && !listError && events.length === 0 && <EmptyState icon="ti-calendar-off" text="No events found." />}
            {!listLoading && events.map(ev => (
              <button key={ev.eventId}
                className={`${styles.eventCard} ${selectedEvent?.eventId===ev.eventId ? styles.eventCardActive : ''}`}
                onClick={() => openDetail(ev.eventId)}>
                <div className={styles.eventCardTop}>
                  <span className={styles.eventCardTitle}>{ev.title}</span>
                  <StatusTag status={ev.status} />
                </div>
                <div className={styles.eventCardMeta}>
                  <span><i className="ti ti-calendar" /> {formatDate(ev.eventDate)}</span>
                  <span className={`${styles.typeChip} ${ev.eventType==='official'?styles.official:styles.personal}`}>{ev.eventType}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.detailPane}>
            {showCreate && (
              <div className={styles.createForm}>
                <div className={styles.formHeader}>
                  <h2>New Event</h2>
                  <button className={styles.iconBtn} onClick={() => { setShowCreate(false); resetForm(); }}><i className="ti ti-x" /></button>
                </div>
                <div className={styles.formBody}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Event Type</label>
                      <select value={form.eventType} onChange={e => handleFormChange('eventType', e.target.value)}>
                        {isAdmin && <option value="official">Official</option>}
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Category <span className={styles.req}>*</span></label>
                      <select value={form.eventCategory} onChange={e => handleFormChange('eventCategory', e.target.value)}>
                        <option value="">Select…</option>
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}><label>Title <span className={styles.req}>*</span></label><input type="text" value={form.title} onChange={e => handleFormChange('title', e.target.value)} placeholder="Event title" /></div>
                  <div className={styles.formGroup}><label>Subtitle</label><input type="text" value={form.subtitle} onChange={e => handleFormChange('subtitle', e.target.value)} placeholder="Optional subtitle" /></div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}><label>Event Date <span className={styles.req}>*</span></label><input type="date" value={form.eventDate} min={todayStr} onChange={e => handleFormChange('eventDate', e.target.value)} /></div>
                    <div className={styles.formGroup}><label>Start Time <span className={styles.req}>*</span></label><input type="time" value={form.startAt} onChange={e => handleFormChange('startAt', e.target.value)} /></div>
                    <div className={styles.formGroup}><label>End Time <span className={styles.req}>*</span></label><input type="time" value={form.endAt} onChange={e => handleFormChange('endAt', e.target.value)} /></div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Response Cutoff <span className={styles.req}>*</span></label>
                    <input type="datetime-local" value={form.responseCutoffAt} onChange={e => handleFormChange('responseCutoffAt', e.target.value)} />
                    <span className={styles.hint}>Employees cannot respond after this date and time.</span>
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.checkLabel}><input type="checkbox" checked={form.requiresAttendance} onChange={e => handleFormChange('requiresAttendance', e.target.checked)} />Requires attendance response</label>
                    <label className={styles.checkLabel}><input type="checkbox" checked={form.allowEditUntilCutoff} onChange={e => handleFormChange('allowEditUntilCutoff', e.target.checked)} />Allow edit until cutoff</label>
                    <label className={styles.checkLabel}><input type="checkbox" checked={form.decorRequired} onChange={e => handleFormChange('decorRequired', e.target.checked)} />Décor required</label>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Billing</label>
                      <select value={form.billingDestination} onChange={e => handleFormChange('billingDestination', e.target.value)}>
                        <option value="official_account">Official Account</option>
                        <option value="employee_account">Employee Account</option>
                      </select>
                    </div>
                    {form.billingDestination === 'official_account' && (
                      <div className={styles.formGroup}><label>Cost Centre Code <span className={styles.req}>*</span></label><input type="text" value={form.costCentreCode} onChange={e => handleFormChange('costCentreCode', e.target.value)} placeholder="8-digit code" maxLength={8} /></div>
                    )}
                  </div>
                  <div className={styles.formGroup}><label>Description</label><textarea rows={3} value={form.description} onChange={e => handleFormChange('description', e.target.value)} placeholder="Optional event description" /></div>
                  {noteTemplates.length > 0 && (
                    <div className={styles.formGroup}>
                      <label>Attach Note Templates</label>
                      <div className={styles.noteCheckList}>
                        {noteTemplates.map(t => (
                          <label key={t.templateId} className={styles.noteCheckItem}>
                            <input type="checkbox" checked={form.selectedNoteIds.includes(t.templateId)} onChange={() => toggleNoteId(t.templateId)} />
                            <span className={styles.noteCheckTitle}>{t.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.formGroup}><label>Custom Notice</label><textarea rows={2} value={form.customNotice} onChange={e => handleFormChange('customNotice', e.target.value)} placeholder="Any additional notice for this event" /></div>
                  {formError && <p className={styles.errorText}>{formError}</p>}
                  <div className={styles.formActions}>
                    <button className={styles.btnGhost} onClick={() => { setShowCreate(false); resetForm(); }} disabled={formLoading}>Cancel</button>
                    <button className={styles.btnSecondary} onClick={() => handleCreateSubmit(false)} disabled={formLoading}>{formLoading?'Saving…':'Save as Draft'}</button>
                    <button className={styles.btnPrimary} onClick={() => handleCreateSubmit(true)} disabled={formLoading}>{formLoading?'Saving…':'Save & Submit'}</button>
                  </div>
                </div>
              </div>
            )}
            {!showCreate && detailLoading && <p className={styles.loadingText} style={{padding:32}}>Loading event…</p>}
            {!showCreate && !detailLoading && !selectedEvent && <EmptyState icon="ti-calendar-event" text="Select an event to view details." />}
            {!showCreate && selectedEvent && (
              <div className={styles.detail}>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.detailTitle}>{selectedEvent.title}</h2>
                    {selectedEvent.subtitle && <p className={styles.detailSubtitle}>{selectedEvent.subtitle}</p>}
                  </div>
                  <StatusTag status={selectedEvent.status} />
                </div>
                {actionError && <p className={styles.errorText}>{actionError}</p>}
                <div className={styles.detailMeta}>
                  <span><i className="ti ti-calendar" /> {formatDate(selectedEvent.eventDate)}</span>
                  <span><i className="ti ti-clock" /> {selectedEvent.startAt?.slice(11,16)} – {selectedEvent.endAt?.slice(11,16)}</span>
                  <span className={`${styles.typeChip} ${selectedEvent.eventType==='official'?styles.official:styles.personal}`}>{selectedEvent.eventType}</span>
                  <span>{selectedEvent.eventCategory?.replace(/_/g,' ')}</span>
                </div>
                <div className={styles.miniStats}>
                  <div className={styles.miniStat}><span className={styles.miniVal}>{selectedEvent.householdsResponded??0}</span><span className={styles.miniLabel}>Responded</span></div>
                  <div className={styles.miniStat}><span className={styles.miniVal}>{selectedEvent.householdsPending??0}</span><span className={styles.miniLabel}>Pending</span></div>
                  <div className={styles.miniStat}><span className={styles.miniVal}>{selectedEvent.grandTotalAttendees??0}</span><span className={styles.miniLabel}>Expected</span></div>
                </div>
                <div className={styles.detailSection}>
                  <h3>Details</h3>
                  <table className={styles.detailTable}>
                    <tbody>
                      <tr><td>Billing</td><td>{selectedEvent.billingDestination?.replace('_',' ')}</td></tr>
                      {selectedEvent.costCentreCode && <tr><td>Cost Centre</td><td>{selectedEvent.costCentreCode}</td></tr>}
                      {selectedEvent.venue          && <tr><td>Venue</td><td>{selectedEvent.venue}</td></tr>}
                      {selectedEvent.location       && <tr><td>Location</td><td>{selectedEvent.location}</td></tr>}
                      <tr><td>Response Cutoff</td><td>{formatDateTime(selectedEvent.responseCutoffAt)}</td></tr>
                      <tr><td>Created by</td><td>{selectedEvent.createdByName}</td></tr>
                      {selectedEvent.publishedAt    && <tr><td>Published</td><td>{formatDateTime(selectedEvent.publishedAt)}</td></tr>}
                    </tbody>
                  </table>
                </div>
                {selectedEvent.description && <div className={styles.detailSection}><h3>Description</h3><p className={styles.descText}>{selectedEvent.description}</p></div>}
                {selectedEvent.returnComments && (
                  <div className={`${styles.detailSection} ${styles.returnedBanner}`}>
                    <h3><i className="ti ti-alert-triangle" /> Return Note</h3>
                    <p>{selectedEvent.returnComments}</p>
                  </div>
                )}
                {selectedEvent.notesSnapshot?.length > 0 && (
                  <div className={styles.detailSection}>
                    <h3>Attached Notes</h3>
                    {selectedEvent.notesSnapshot.map((n,i) => <div key={i} className={styles.noteSnap}><strong>{n.title}</strong><p>{n.body}</p></div>)}
                  </div>
                )}
                {selectedEvent.customNotice && <div className={styles.detailSection}><h3>Custom Notice</h3><p className={styles.descText}>{selectedEvent.customNotice}</p></div>}
                <div className={styles.actionRow}>
                  {['published','closed'].includes(selectedEvent.status) && (
                    <button className={styles.btnSecondary} onClick={() => setShowAttendance(v => !v)}>
                      <i className="ti ti-users" /> Attendance
                    </button>
                  )}
                  {selectedEvent.status === 'draft' && (
                    <button className={styles.btnPrimary} onClick={() => handleSubmit(selectedEvent.eventId)} disabled={actionLoading}>
                      <i className="ti ti-send" /> {actionLoading?'Submitting…':'Submit for Review'}
                    </button>
                  )}
                  {isAdmin && selectedEvent.status === 'pending_review' && (
                    <>
                      <button className={styles.btnPrimary} onClick={() => { setPublishModal(true); setActionError(''); }} disabled={actionLoading}><i className="ti ti-check" /> Publish</button>
                      <button className={styles.btnDanger} onClick={() => { setReturnModal(true); setActionError(''); }} disabled={actionLoading}><i className="ti ti-arrow-back-up" /> Return</button>
                    </>
                  )}
                  {['draft','pending_review','pending_approval','published'].includes(selectedEvent.status) && (
                    <button className={styles.btnGhost} onClick={() => handleCancel(selectedEvent.eventId)} disabled={actionLoading}><i className="ti ti-x" /> Cancel Event</button>
                  )}
                </div>
                {showAttendance && (
                  <AttendanceSummaryPanel
                    eventId={selectedEvent.eventId}
                    eventTitle={selectedEvent.title}
                    onClose={() => setShowAttendance(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && isAdmin && (
        <div className={styles.notesTab}>
          <div className={styles.notesLayout}>
            <div className={styles.noteAddCard}>
              <h3>Add Note Template</h3>
              <div className={styles.formGroup}><label>Title <span className={styles.req}>*</span></label><input type="text" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder="e.g. Permanent Resident Guest Definition" /></div>
              <div className={styles.formGroup}><label>Body <span className={styles.req}>*</span></label><textarea rows={4} value={newNoteBody} onChange={e => setNewNoteBody(e.target.value)} placeholder="Full clause text to appear in event circulation" /></div>
              {noteFormError && <p className={styles.errorText}>{noteFormError}</p>}
              <button className={styles.btnPrimary} onClick={handleAddNote} disabled={noteSaving}>{noteSaving?'Saving…':'Add Template'}</button>
            </div>
            <div className={styles.noteList}>
              <h3>Existing Templates</h3>
              {notesLoading && <p className={styles.loadingText}>Loading…</p>}
              {!notesLoading && allNotes.length === 0 && <EmptyState icon="ti-notes-off" text="No note templates yet." />}
              {allNotes.map(n => (
                <div key={n.templateId} className={styles.noteRow}>
                  <div className={styles.noteRowContent}><strong>{n.title}</strong><p>{n.body}</p></div>
                  <button className={n.isActive ? styles.btnGhost : styles.btnSecondary} onClick={() => handleToggleNote(n.templateId, !n.isActive)}>
                    {n.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {publishModal && (
        <div className={styles.overlay}><div className={styles.modal}>
          <div className={styles.modalHeader}><span>Publish Event</span><button className={styles.iconBtn} onClick={() => { setPublishModal(false); setActionError(''); }}><i className="ti ti-x" /></button></div>
          <div className={styles.modalBody}>
            <p className={styles.modalNote}>Add venue details before publishing.</p>
            <div className={styles.formGroup}><label>Venue <span className={styles.req}>*</span></label><input type="text" value={publishVenue} onChange={e => setPublishVenue(e.target.value)} placeholder="e.g. FFL Clubhouse Main Hall" /></div>
            <div className={styles.formGroup}><label>Location Detail</label><input type="text" value={publishLocation} onChange={e => setPublishLocation(e.target.value)} placeholder="Additional location info" /></div>
            {actionError && <p className={styles.errorText}>{actionError}</p>}
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.btnGhost} onClick={() => { setPublishModal(false); setActionError(''); }} disabled={actionLoading}>Cancel</button>
            <button className={styles.btnPrimary} onClick={handlePublish} disabled={actionLoading}>{actionLoading?'Publishing…':'Publish'}</button>
          </div>
        </div></div>
      )}
      {returnModal && (
        <div className={styles.overlay}><div className={styles.modal}>
          <div className={styles.modalHeader}><span>Return Event</span><button className={styles.iconBtn} onClick={() => { setReturnModal(false); setActionError(''); }}><i className="ti ti-x" /></button></div>
          <div className={styles.modalBody}>
            <p className={styles.modalNote}>Explain what needs to be corrected.</p>
            <div className={styles.formGroup}><label>Comments <span className={styles.req}>*</span></label><textarea rows={4} value={returnComments} onChange={e => setReturnComments(e.target.value)} placeholder="What needs to be fixed?" /></div>
            {actionError && <p className={styles.errorText}>{actionError}</p>}
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.btnGhost} onClick={() => { setReturnModal(false); setActionError(''); }} disabled={actionLoading}>Cancel</button>
            <button className={styles.btnDanger} onClick={handleReturn} disabled={actionLoading}>{actionLoading?'Returning…':'Return to Manager'}</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function EventManagementPage() {
  const { userProfile } = useAuth();
  const role = userProfile?.user?.role || '';
  const isManagement = ['manager', 'admin', 'super_admin'].includes(role);
  if (isManagement) return <ManagementEventsView role={role} />;
  return <EmployeeEventsView />;
}
