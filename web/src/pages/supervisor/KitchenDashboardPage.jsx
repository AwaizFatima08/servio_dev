// Screen 4 — Kitchen Dashboard (Mess Supervisor)
// Backend: Flow 15 — GET /kitchen/headcounts, GET /kitchen/issuance-progress, GET /kitchen/day-summary
// Role: mess_supervisor
// Path: /kitchen-dashboard

import { useState, useEffect, useCallback } from 'react';
import styles from './KitchenDashboardPage.module.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const MEAL_TABS = [
  { key: 'breakfast', label: 'Breakfast', window: '06:00 – 09:00' },
  { key: 'lunch',     label: 'Lunch',     window: '13:00 – 15:00' },
  { key: 'dinner',    label: 'Dinner',    window: '19:00 – 22:00' },
];

function formatOptionKey(key) {
  if (!key) return '';
  if (key === 'alacarte') return 'Ala Carte';
  return key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function maxDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function todayLabel(dateStr) {
  const today = formatDate(new Date());
  return dateStr === today ? 'Today' : dateStr;
}

export default function KitchenDashboardPage({ token }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [activeMeal, setActiveMeal]     = useState('breakfast');
  const [headcounts, setHeadcounts]     = useState(null);
  const [progress, setProgress]         = useState(null);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [autoRefresh, setAutoRefresh]   = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [hcRes, progRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/kitchen/headcounts?date=${selectedDate}&mealType=${activeMeal}`, { headers }),
        fetch(`${API_BASE}/kitchen/issuance-progress?date=${selectedDate}&mealType=${activeMeal}`, { headers }),
        fetch(`${API_BASE}/kitchen/day-summary?date=${selectedDate}`, { headers }),
      ]);
      if (!hcRes.ok || !progRes.ok || !sumRes.ok) throw new Error('Failed to load kitchen data');
      const [hc, prog, sum] = await Promise.all([hcRes.json(), progRes.json(), sumRes.json()]);
      setHeadcounts(hc.data || hc);
      setProgress(prog.data || prog);
      setSummary(sum.data || sum);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeMeal, token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const issuedCount  = progress?.issued  ?? 0;
  const pendingCount = progress?.pending ?? 0;
  const noShowCount  = progress?.noShow  ?? 0;
  const totalBooked  = (issuedCount + pendingCount + noShowCount) || 1;
  const issuedPct    = Math.round((issuedCount / totalBooked) * 100);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kitchen Dashboard</h1>
          <p className={styles.subtitle}>
            Real-time headcounts and issuance progress
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.autoLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button className={styles.refreshBtn} onClick={fetchAll} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
          {lastRefresh && (
            <span className={styles.refreshTime}>
              Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        <div className={styles.dateBlock}>
          <label className={styles.controlLabel}>Date</label>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            max={maxDateStr()}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className={styles.mealTabs}>
          {MEAL_TABS.map(m => (
            <button
              key={m.key}
              className={`${styles.mealTab} ${activeMeal === m.key ? styles.mealTabActive : ''}`}
              onClick={() => setActiveMeal(m.key)}
            >
              <span className={styles.mealTabLabel}>{m.label}</span>
              <span className={styles.mealTabWindow}>{m.window}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Headcount Cards */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Headcounts — {MEAL_TABS.find(m => m.key === activeMeal)?.label} · {todayLabel(selectedDate)}
        </h2>
        <div className={styles.cardRow}>
          <HeadcountCard
            label="Total Booked"
            value={headcounts?.totalBooked ?? '—'}
            sub="All active reservations"
            variant="dark"
          />
          <HeadcountCard
            label="Employees"
            value={headcounts?.employees ?? '—'}
            sub="Self bookings"
            variant="green"
          />
          <HeadcountCard
            label="Personal Guests"
            value={headcounts?.personalGuests ?? '—'}
            sub="Employee-hosted guests"
            variant="neutral"
          />
          <HeadcountCard
            label="Official Guests"
            value={headcounts?.officialGuests ?? '—'}
            sub="Billed to cost centre"
            variant="neutral"
          />
          <HeadcountCard
            label="Special Meals"
            value={headcounts?.specialMeals ?? '—'}
            sub="Staff-punched only"
            variant="gold"
          />
          <HeadcountCard
            label="Official Meals"
            value={headcounts?.officialMeals ?? '—'}
            sub="Plant site / cost centre"
            variant="neutral"
          />
        </div>
      </section>

      {/* Issuance Progress */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Issuance Progress</h2>
        <div className={styles.progressCard}>
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${issuedPct}%` }}
              />
            </div>
            <span className={styles.progressPct}>{issuedPct}% issued</span>
          </div>
          <div className={styles.progressStats}>
            <ProgressStat label="Issued" value={issuedCount} color="#0F6E56" />
            <ProgressStat label="Pending" value={pendingCount} color="#D4960A" />
            <ProgressStat label="No-Show" value={noShowCount} color="#9ca3af" />
          </div>
        </div>

        {/* Combo breakdown */}
        {progress?.comboBreakdown && progress.comboBreakdown.length > 0 && (
          <div className={styles.comboTable}>
            <h3 className={styles.comboTableTitle}>Combo Breakdown</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Issued</th>
                  <th>Pending</th>
                  <th>No-Show</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {progress.comboBreakdown.map((row, i) => (
                  <tr key={i}>
                    <td className={styles.comboName}>{row.optionLabel || formatOptionKey(row.menuOptionKey)}</td>
                    <td className={styles.issued}>{row.issued}</td>
                    <td className={styles.pending}>{row.pending}</td>
                    <td className={styles.noshow}>{row.noShow}</td>
                    <td><strong>{(row.issued + row.pending + row.noShow)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Day Summary — all 3 meals */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Day Summary — {todayLabel(selectedDate)}</h2>
        <div className={styles.daySummaryGrid}>
          {MEAL_TABS.map(m => {
            const ms = summary?.meals?.[m.key] ?? {};
            return (
              <div key={m.key} className={styles.daySummaryCard}>
                <div className={styles.daySummaryMeal}>{m.label}</div>
                <div className={styles.daySummaryWindow}>{m.window}</div>
                <div className={styles.daySummaryStats}>
                  <div className={styles.dayStat}>
                    <span className={styles.dayStatValue}>{ms.totalBooked ?? '—'}</span>
                    <span className={styles.dayStatLabel}>Booked</span>
                  </div>
                  <div className={styles.dayStat}>
                    <span className={`${styles.dayStatValue} ${styles.issuedValue}`}>{ms.issued ?? '—'}</span>
                    <span className={styles.dayStatLabel}>Issued</span>
                  </div>
                  <div className={styles.dayStat}>
                    <span className={`${styles.dayStatValue} ${styles.pendingValue}`}>{ms.pending ?? '—'}</span>
                    <span className={styles.dayStatLabel}>Pending</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {summary?.grandTotal != null && (
          <div className={styles.grandTotal}>
            Grand Total for the day: <strong>{summary.grandTotal} meals</strong>
          </div>
        )}
      </section>
    </div>
  );
}

function HeadcountCard({ label, value, sub, variant }) {
  return (
    <div className={`${styles.hcCard} ${styles['hcCard_' + variant]}`}>
      <div className={styles.hcValue}>{value}</div>
      <div className={styles.hcLabel}>{label}</div>
      <div className={styles.hcSub}>{sub}</div>
    </div>
  );
}

function ProgressStat({ label, value, color }) {
  return (
    <div className={styles.progressStatItem}>
      <span className={styles.progressStatDot} style={{ background: color }} />
      <span className={styles.progressStatValue}>{value}</span>
      <span className={styles.progressStatLabel}>{label}</span>
    </div>
  );
}
