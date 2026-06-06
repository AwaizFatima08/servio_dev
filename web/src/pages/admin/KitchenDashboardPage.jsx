// web/src/pages/admin/KitchenDashboardPage.jsx
// Screen 4 — Kitchen Dashboard (Mess Supervisor)
// Flow 15: headcount + issuance progress

import { useState, useEffect, useCallback } from 'react';
import { getDaySummary, getHeadcount, getIssuanceProgress } from '../../services/kitchenService';
import styles from './KitchenDashboardPage.module.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_WINDOWS = { breakfast: '06:00 – 09:00', lunch: '13:00 – 15:00', dinner: '19:00 – 22:00' };

function formatOptionKey(key) {
  if (!key) return '';
  if (key === 'alacarte') return 'Ala Carte';
  return key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const todayStr = () => new Date().toISOString().split('T')[0];
const maxDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};
const formatDate = (str) => {
  const d = new Date(str + 'T00:00:00Z');
  return d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function KitchenDashboardPage() {
  const [date, setDate] = useState(todayStr());
  const [activeMeal, setActiveMeal] = useState('lunch');
  const [summary, setSummary] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load day summary (all 3 meals) on date change
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const data = await getDaySummary(date);
      setSummary(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }, [date]);

  // Load detailed headcount + issuance progress for active meal
  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setError('');
    try {
      const [headcount, progress] = await Promise.all([
        getHeadcount(date, activeMeal),
        getIssuanceProgress(date, activeMeal),
      ]);
      setDetail({ headcount, progress });
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, [date, activeMeal]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const activeSummary = summary?.meals?.find(m => m.mealType === activeMeal);

  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Kitchen Dashboard</h1>
          <p className={styles.subtitle}>{formatDate(date)}</p>
        </div>
        <div className={styles.headerRight}>
          <input
            type="date"
            value={date}
            max={maxDateStr()}
            onChange={e => setDate(e.target.value)}
            className={styles.datePicker}
          />
          <button
            className={styles.refreshBtn}
            onClick={() => { loadSummary(); loadDetail(); }}
            disabled={loadingSummary || loadingDetail}
          >
            <i className="ti ti-refresh" />
            {loadingSummary || loadingDetail ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* Day summary cards — all 3 meals at a glance */}
      <div className={styles.summaryRow}>
        {MEAL_TYPES.map(meal => {
          const m = summary?.meals?.find(x => x.mealType === meal);
          const isActive = meal === activeMeal;
          return (
            <button
              key={meal}
              className={`${styles.summaryCard} ${isActive ? styles.summaryCardActive : ''} ${m?.cutoffPassed ? styles.summaryCardCutoff : ''}`}
              onClick={() => setActiveMeal(meal)}
            >
              <div className={styles.summaryCardTop}>
                <span className={styles.mealLabel}>{MEAL_LABELS[meal]}</span>
                <span className={styles.mealWindow}>{MEAL_WINDOWS[meal]}</span>
              </div>
              {loadingSummary ? (
                <div className={styles.skeletonLine} />
              ) : m ? (
                <>
                  <div className={styles.summaryBigNum}>{m.headcount ?? 0}</div>
                  <div className={styles.summarySubLine}>
                    booked &nbsp;·&nbsp;
                    <span className={styles.issued}>{m.issued ?? 0} issued</span>
                    {m.pending > 0 && <span className={styles.pending}> · {m.pending} pending</span>}
                  </div>
                  {m.cutoffPassed && (
                    <div className={styles.cutoffBadge}>
                      <i className="ti ti-lock" /> Cutoff passed
                    </div>
                  )}
                  {m.issuanceComplete && (
                    <div className={styles.completeBadge}>
                      <i className="ti ti-circle-check" /> Complete
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.summaryBigNum}>—</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Meal tabs */}
      <div className={styles.mealTabs}>
        {MEAL_TYPES.map(meal => (
          <button
            key={meal}
            className={`${styles.mealTab} ${activeMeal === meal ? styles.mealTabActive : ''}`}
            onClick={() => setActiveMeal(meal)}
          >
            {MEAL_LABELS[meal]}
          </button>
        ))}
      </div>

      {/* Detail section */}
      {loadingDetail ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading {MEAL_LABELS[activeMeal]} data…</span>
        </div>
      ) : detail ? (
        <div className={styles.detailSection}>

          {/* Overall progress bar */}
          <div className={styles.progressBlock}>
            <div className={styles.progressHeader}>
              <span className={styles.progressTitle}>Issuance Progress</span>
              <span className={styles.progressPercent}>
                {detail.progress.overallIssuancePercent ?? 0}%
              </span>
            </div>
            <div className={styles.progressBarOuter}>
              <div
                className={styles.progressBarInner}
                style={{ width: `${detail.progress.overallIssuancePercent ?? 0}%` }}
              />
            </div>
            <div className={styles.progressStats}>
              <span className={styles.statIssued}>
                <i className="ti ti-circle-check" />
                {detail.progress.grandTotalIssued ?? 0} issued
              </span>
              <span className={styles.statPending}>
                <i className="ti ti-clock" />
                {detail.progress.grandTotalPending ?? 0} pending
              </span>
              <span className={styles.statNoShow}>
                <i className="ti ti-user-off" />
                {detail.progress.grandTotalNoShow ?? 0} no-show
              </span>
              <span className={styles.statTotal}>
                <i className="ti ti-users" />
                {detail.progress.grandTotalBooked ?? 0} total
              </span>
            </div>
          </div>

          {/* Combo breakdown table */}
          {detail.headcount.combos?.length > 0 ? (
            <div className={styles.tableWrapper}>
              <div className={styles.tableHeader}>
                <span>Menu Option</span>
                <span>Booked</span>
                <span>Self</span>
                <span>Guest</span>
                <span>Official</span>
                <span>Dine-in</span>
                <span>Takeaway</span>
                <span>Issued</span>
                <span>Pending</span>
                <span>No-show</span>
                <span>%</span>
              </div>
              {detail.headcount.combos.map(combo => {
                // Match progress data for this combo
                const prog = detail.progress.combos?.find(
                  c => c.menuOptionKey === combo.menuOptionKey
                );
                return (
                  <div key={combo.menuOptionKey} className={styles.tableRow}>
                    <span className={styles.comboName}>
                      <strong>{combo.itemName || combo.menuOptionKey}</strong>
                      <small>{combo.optionLabel || formatOptionKey(combo.menuOptionKey)}</small>
                    </span>
                    <span className={styles.cellBooked}>{combo.totalBooked}</span>
                    <span>{combo.selfCount}</span>
                    <span>{combo.guestCount}</span>
                    <span>{combo.officialCount}</span>
                    <span>{combo.dineInCount}</span>
                    <span>{combo.takeawayCount}</span>
                    <span className={styles.cellIssued}>{prog?.totalIssued ?? 0}</span>
                    <span className={styles.cellPending}>{prog?.totalPending ?? 0}</span>
                    <span className={styles.cellNoShow}>{prog?.totalNoShow ?? 0}</span>
                    <span className={styles.cellPercent}>
                      {prog?.issuancePercent ?? 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <i className="ti ti-clipboard-off" />
              <p>No bookings for {MEAL_LABELS[activeMeal]} on this date.</p>
            </div>
          )}

        </div>
      ) : null}

      {lastRefresh && (
        <div className={styles.refreshNote}>
          Last updated: {lastRefresh.toLocaleTimeString('en-PK')}
        </div>
      )}

    </div>
  );
}
