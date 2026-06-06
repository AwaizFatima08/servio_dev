// web/src/pages/admin/ReportingDashboardPage.jsx
// Screen 12 — Reporting Dashboard (Manager / Admin)
// Flow 11: live headcount + admin alerts + weekly booking summary + feedback trends

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getDailyHeadcount,
  getAdminAlerts,
  getSnapshot,
  listSnapshots,
  triggerManualSnapshot,
} from '../../services/reportingService';
import styles from './ReportingDashboardPage.module.css';
import { formatTs } from '../../utils/dateUtils';

const todayStr  = () => new Date().toISOString().split('T')[0];
const currentMonth = () => new Date().toISOString().slice(0, 7);

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

const formatDate = (str) =>
  new Date(str + 'T00:00:00Z').toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

const formatMonth = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
};

const fmt = (n) => (n ?? 0).toLocaleString();

const TABS = [
  { key: 'live',     label: 'Live Today',        icon: 'ti-activity' },
  { key: 'weekly',   label: 'Weekly Bookings',   icon: 'ti-calendar-week' },
  { key: 'feedback', label: 'Feedback Trends',   icon: 'ti-star' },
  { key: 'alerts',   label: 'Admin Alerts',      icon: 'ti-bell' },
];

export default function ReportingDashboardPage() {
  const { userProfile } = useAuth();
  const userRole = userProfile?.role;
  const [activeTab, setActiveTab]       = useState('live');
  const [date, setDate]                 = useState(todayStr());

  // Live tab
  const [headcount, setHeadcount]       = useState(null);
  const [alerts, setAlerts]             = useState(null);

  // Weekly tab
  const [weeklyList, setWeeklyList]     = useState([]);
  const [weeklyPeriod, setWeeklyPeriod] = useState('');
  const [weeklySnap, setWeeklySnap]     = useState(null);

  // Feedback tab
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackPeriod, setFeedbackPeriod] = useState('');
  const [feedbackSnap, setFeedbackSnap] = useState(null);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [triggering, setTriggering]     = useState(false);
  const [triggerMsg, setTriggerMsg]     = useState('');

  // ── Live tab loader ──
  const loadLive = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hc = await getDailyHeadcount(date);
      setHeadcount(hc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    try {
      const al = await getAdminAlerts();
      setAlerts(al);
    } catch {
      // Not an admin role — alerts not available for this role
    }
  }, [date]);

  // ── Weekly tab: load list of available snapshots ──
  const loadWeeklyList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listSnapshots('weekly_booking_summary', 12);
      setWeeklyList(list || []);
      if (list?.length > 0 && !weeklyPeriod) {
        setWeeklyPeriod(list[0].periodStart);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  // ── Weekly snapshot loader ──
  const loadWeeklySnap = useCallback(async () => {
    if (!weeklyPeriod) return;
    setLoading(true);
    setError('');
    try {
      const snap = await getSnapshot('weekly_booking_summary', weeklyPeriod);
      setWeeklySnap(snap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weeklyPeriod]);

  // ── Feedback tab: load list ──
  const loadFeedbackList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listSnapshots('feedback_trends', 12);
      setFeedbackList(list || []);
      if (list?.length > 0 && !feedbackPeriod) {
        setFeedbackPeriod(list[0].periodStart.slice(0, 7));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  // ── Feedback snapshot loader ──
  const loadFeedbackSnap = useCallback(async () => {
    if (!feedbackPeriod) return;
    setLoading(true);
    setError('');
    try {
      const snap = await getSnapshot('feedback_trends', feedbackPeriod);
      setFeedbackSnap(snap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [feedbackPeriod]);

  // ── Tab-based auto-load ──
  useEffect(() => {
    if (activeTab === 'live' || activeTab === 'alerts') loadLive();
  }, [activeTab, date, loadLive]);

  useEffect(() => {
    if (activeTab === 'weekly') loadWeeklyList();
  }, [activeTab, loadWeeklyList]);

  useEffect(() => {
    if (activeTab === 'weekly' && weeklyPeriod) loadWeeklySnap();
  }, [weeklyPeriod, loadWeeklySnap]);

  useEffect(() => {
    if (activeTab === 'feedback') loadFeedbackList();
  }, [activeTab, loadFeedbackList]);

  useEffect(() => {
    if (activeTab === 'feedback' && feedbackPeriod) loadFeedbackSnap();
  }, [feedbackPeriod, loadFeedbackSnap]);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg('');
    try {
      const res = await triggerManualSnapshot();
      setTriggerMsg(`Snapshot engine ran. Success: ${res?.success?.length ?? 0}, Failed: ${res?.failed?.length ?? 0}`);
    } catch (err) {
      setTriggerMsg(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  // Derive alert counts for badge
  const alertCount = alerts
    ? (alerts.alerts?.reduce((s, a) => s + (a.count ?? 0), 0) ?? 0)
    : 0;

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reporting Dashboard</h1>
          <p className={styles.subtitle}>Live operations + historical analytics</p>
        </div>
        <div className={styles.headerActions}>
          {activeTab === 'live' && (
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
              className={styles.datePicker}
            />
          )}
          <button
            className={styles.triggerBtn}
            onClick={handleTrigger}
            disabled={triggering}
            title="Run snapshot engine manually (for testing)"
          >
            {triggering ? (
              <><div className={styles.spinnerSm} /> Running…</>
            ) : (
              <><i className="ti ti-player-play" /> Run Snapshot</>
            )}
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className={styles.triggerResult}>
          <i className="ti ti-info-circle" /> {triggerMsg}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.filter(tab => {
          if (tab.key === 'alerts') return userRole === 'admin' || userRole === 'super_admin';
          return true;
        }).map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab.key); setError(''); }}
          >
            <i className={tab.icon} />
            {tab.label}
            {tab.key === 'alerts' && alertCount > 0 && (
              <span className={styles.alertBadge}>{alertCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {loading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      )}

      {/* ── LIVE TODAY TAB ── */}
      {!loading && activeTab === 'live' && headcount && (
        <div className={styles.content}>
          <div className={styles.sectionLabel}>
            Daily Headcount — {formatDate(date)}
          </div>

          {/* Meal cards */}
          <div className={styles.mealCardRow}>
            {Object.entries(headcount.byMeal || {}).map(([mealType, meal]) => (
              <div key={mealType} className={styles.mealCard}>
                <div className={styles.mealCardTop}>
                  <span className={styles.mealCardLabel}>{MEAL_LABELS[mealType]}</span>
                </div>
                <div className={styles.mealCardNum}>{fmt(meal.totalBooked)}</div>
                <div className={styles.mealCardBreakdown}>
                  <span>Self: {meal.selfCount ?? 0}</span>
                  <span>Guest: {meal.personalGuestCount ?? 0}</span>
                  <span>Official: {meal.officialGuestCount ?? 0}</span>
                </div>
                <div className={styles.mealCardDining}>
                  <span className={styles.dineIn}>Dine-in: {meal.dineIn ?? 0}</span>
                  <span className={styles.takeaway}>Takeaway: {meal.takeaway ?? 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grand total */}
          <div className={styles.grandTotal}>
            <span className={styles.grandLabel}>Total Meals Today</span>
            <span className={styles.grandNum}>{fmt(headcount.totals?.totalBooked)}</span>
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {!loading && activeTab === 'alerts' && alerts && (
        <div className={styles.content}>
          <div className={styles.sectionLabel}>Admin Alerts</div>

          <div className={styles.alertGrid}>

            {(() => {
              const pendingReg    = alerts.alerts?.find(a => a.alertType === 'pending_registrations')?.count ?? 0;
              const pendingRates  = alerts.alerts?.find(a => a.alertType === 'pending_rate_entry')?.count ?? 0;
              const pendingEvents = alerts.alerts?.find(a => a.alertType === 'events_pending_review')?.count ?? 0;
              const throttled     = alerts.alerts?.find(a => a.alertType === 'throttled_accounts')?.count ?? 0;
              return (<>
                <div className={`${styles.alertCard} ${pendingReg > 0 ? styles.alertCardActive : ''}`}>
                  <i className="ti ti-user-check" />
                  <div className={styles.alertBody}>
                    <div className={styles.alertNum}>{fmt(pendingReg)}</div>
                    <div className={styles.alertDesc}>Pending registrations awaiting approval</div>
                  </div>
                </div>
                <div className={`${styles.alertCard} ${pendingRates > 0 ? styles.alertCardActive : ''}`}>
                  <i className="ti ti-coin" />
                  <div className={styles.alertBody}>
                    <div className={styles.alertNum}>{fmt(pendingRates)}</div>
                    <div className={styles.alertDesc}>Days with missing rate entries</div>
                  </div>
                </div>
                <div className={`${styles.alertCard} ${pendingEvents > 0 ? styles.alertCardActive : ''}`}>
                  <i className="ti ti-calendar-event" />
                  <div className={styles.alertBody}>
                    <div className={styles.alertNum}>{fmt(pendingEvents)}</div>
                    <div className={styles.alertDesc}>Events pending review</div>
                  </div>
                </div>
                <div className={`${styles.alertCard} ${throttled > 0 ? styles.alertCardActive : ''}`}>
                  <i className="ti ti-user-x" />
                  <div className={styles.alertBody}>
                    <div className={styles.alertNum}>{fmt(throttled)}</div>
                    <div className={styles.alertDesc}>Throttled employee accounts</div>
                  </div>
                </div>
              </>);
            })()}

          </div>
        </div>
      )}

      {/* ── WEEKLY BOOKINGS TAB ── */}
      {!loading && activeTab === 'weekly' && (
        <div className={styles.content}>
          <div className={styles.snapshotControls}>
            <div className={styles.sectionLabel}>Weekly Booking Summary</div>
            {weeklyList.length > 0 && (
              <select
                value={weeklyPeriod}
                onChange={e => setWeeklyPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                {weeklyList.map(s => (
                  <option key={s.periodStart} value={s.periodStart}>
                    {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {weeklySnap ? (
            <div className={styles.snapContent}>
              {/* Summary cards */}
              <div className={styles.snapStatRow}>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Total Bookings</span>
                  <span className={styles.snapStatVal}>{fmt(weeklySnap.data?.totalBookings ?? weeklySnap.totalBookings)}</span>
                </div>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Total Issued</span>
                  <span className={styles.snapStatVal}>{fmt(weeklySnap.data?.totalIssued ?? weeklySnap.totalIssued)}</span>
                </div>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>No-shows</span>
                  <span className={styles.snapStatVal}>{fmt(weeklySnap.data?.totalNoShow ?? weeklySnap.totalNoShow)}</span>
                </div>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Cancellations</span>
                  <span className={styles.snapStatVal}>{fmt(weeklySnap.data?.totalCancelled ?? weeklySnap.totalCancelled)}</span>
                </div>
              </div>

              {/* Daily breakdown */}
              {(weeklySnap.data?.dailyBreakdown ?? weeklySnap.dailyBreakdown)?.length > 0 && (
                <div className={styles.tableWrapper}>
                  <div className={`${styles.tableHeader} ${styles.weeklyHeader}`}>
                    <span>Date</span>
                    <span>Breakfast</span>
                    <span>Lunch</span>
                    <span>Dinner</span>
                    <span>Total</span>
                    <span>Issued</span>
                    <span>No-show</span>
                  </div>
                  {(weeklySnap.data?.dailyBreakdown ?? weeklySnap.dailyBreakdown).map((day, i) => (
                    <div key={i} className={`${styles.tableRow} ${styles.weeklyRow}`}>
                      <span>{formatDate(day.date)}</span>
                      <span>{fmt(day.breakfast)}</span>
                      <span>{fmt(day.lunch)}</span>
                      <span>{fmt(day.dinner)}</span>
                      <span className={styles.boldCell}>{fmt(day.total)}</span>
                      <span className={styles.greenCell}>{fmt(day.issued)}</span>
                      <span className={styles.mutedCell}>{fmt(day.noShow)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.snapNote}>
                <i className="ti ti-info-circle" />
                Snapshot generated at {formatTs(weeklySnap.generatedAt)}
              </div>
            </div>
          ) : !loading && weeklyList.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="ti ti-chart-off" />
              <p>No weekly snapshots available yet.</p>
              <small>Snapshots are generated nightly. Use "Run Snapshot" above to generate one manually.</small>
            </div>
          ) : null}
        </div>
      )}

      {/* ── FEEDBACK TRENDS TAB ── */}
      {!loading && activeTab === 'feedback' && (
        <div className={styles.content}>
          <div className={styles.snapshotControls}>
            <div className={styles.sectionLabel}>Feedback Trends</div>
            {feedbackList.length > 0 && (
              <select
                value={feedbackPeriod}
                onChange={e => setFeedbackPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                {feedbackList.map(s => (
                  <option key={s.periodStart} value={s.periodStart.slice(0, 7)}>
                    {formatMonth(s.periodStart.slice(0, 7))}
                  </option>
                ))}
              </select>
            )}
          </div>

          {feedbackSnap ? (
            <div className={styles.snapContent}>
              {/* Summary */}
              <div className={styles.snapStatRow}>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Total Submissions</span>
                  <span className={styles.snapStatVal}>{fmt(feedbackSnap.data?.totalSubmissions ?? feedbackSnap.totalSubmissions)}</span>
                </div>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Average Rating</span>
                  <span className={styles.snapStatVal}>
                    {((feedbackSnap.data?.overallAverage ?? feedbackSnap.overallAverage) || 0).toFixed(1)} / 5
                  </span>
                </div>
                <div className={styles.snapStat}>
                  <span className={styles.snapStatLabel}>Issues Flagged</span>
                  <span className={styles.snapStatVal}>{fmt(feedbackSnap.data?.issueCount ?? feedbackSnap.issueCount)}</span>
                </div>
              </div>

              {/* By area */}
              {(feedbackSnap.data?.areaAverages ?? feedbackSnap.areaAverages) && (
                <div className={styles.feedbackAreaBlock}>
                  <div className={styles.feedbackAreaTitle}>Ratings by Area</div>
                  {Object.entries(feedbackSnap.data?.areaAverages ?? feedbackSnap.areaAverages ?? {}).map(([area, stats]) => (
                    <div key={area} className={styles.feedbackAreaRow}>
                      <span className={styles.areaLabel}>{area}</span>
                      <div className={styles.ratingBar}>
                        <div
                          className={styles.ratingBarFill}
                          style={{ width: `${((stats.average || 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className={styles.areaRating}>{(stats.average || 0).toFixed(1)}</span>
                      <span className={styles.areaCount}>({fmt(stats.count)} ratings)</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.snapNote}>
                <i className="ti ti-info-circle" />
                Snapshot for {formatMonth(feedbackPeriod)}
              </div>
            </div>
          ) : !loading && feedbackList.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="ti ti-star-off" />
              <p>No feedback snapshots available yet.</p>
              <small>Snapshots are generated nightly. Use "Run Snapshot" above to generate one manually.</small>
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
