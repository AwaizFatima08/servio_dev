// web/src/pages/accounts/AccountsDashboard.jsx
// F6 — Accounts Supervisor Home Dashboard
// HomiLabs | Servio | Web
// Operational summary: pending billing, monthly totals, quick navigation

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMonthlySummary, getPendingBilling } from '../../services/billingService';
import styles from './AccountsDashboard.module.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const formatMonth = (m) => {
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
};

const fmt = (n) => (n ?? 0).toLocaleString();

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function SummaryCard({ label, value, sub, icon, variant = 'default', loading }) {
  return (
    <div className={`${styles.card} ${styles[`card_${variant}`]}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardLabel}>{label}</span>
        <i className={`ti ${icon} ${styles.cardIcon}`} />
      </div>
      <span className={styles.cardValue}>
        {loading ? '…' : value}
      </span>
      {sub && <span className={styles.cardSub}>{sub}</span>}
    </div>
  );
}

export default function AccountsDashboard() {
  const [month] = useState(currentMonth());
  const [summary, setSummary]   = useState(null);
  const [pending, setPending]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, pend] = await Promise.allSettled([
        getMonthlySummary(month),
        getPendingBilling(yesterdayStr()),
      ]);
      if (sum.status === 'fulfilled')  setSummary(sum.value);
      if (pend.status === 'fulfilled') setPending(pend.value);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const pendingCount = pending?.items?.length ?? pending?.count ?? 0;
  const totalAmount  = summary?.totalAmount ?? summary?.grandTotal ?? 0;
  const pendingRates = summary?.pendingRateCount ?? summary?.pendingItems ?? 0;

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}</h1>
          <p className={styles.dateText}>{todayFormatted()}</p>
        </div>
        <span className={styles.rolePill}>Accounts Supervisor</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Month label */}
      <div className={styles.monthLabel}>
        <i className="ti ti-calendar-month" />
        {formatMonth(month)}
      </div>

      {/* Summary cards */}
      <div className={styles.cardsRow}>
        <SummaryCard
          label="Total Amount This Month"
          value={`Rs. ${fmt(totalAmount)}`}
          sub="All issued meals billed"
          icon="ti-cash"
          variant="dark"
          loading={loading}
        />
        <SummaryCard
          label="Pending Rate Entries"
          value={pendingRates}
          sub={pendingRates > 0 ? 'Rates not yet entered' : 'All rates entered'}
          icon="ti-clock"
          variant={pendingRates > 0 ? 'gold' : 'default'}
          loading={loading}
        />
        <SummaryCard
          label="Pending Billing Items"
          value={pendingCount}
          sub={pendingCount > 0 ? 'Issued but not rated' : 'Nothing pending'}
          icon="ti-receipt"
          variant={pendingCount > 0 ? 'gold' : 'default'}
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <div className={styles.actionsSection}>
        <h2 className={styles.actionsTitle}>Quick Actions</h2>
        <div className={styles.actionsRow}>
          <Link to="/rate-entry" className={styles.actionBtn}>
            <i className="ti ti-pencil" />
            <span>Rate Entry</span>
            <span className={styles.actionSub}>Enter previous day rates</span>
          </Link>
          <Link to="/billing" className={styles.actionBtn}>
            <i className="ti ti-chart-bar" />
            <span>Billing Dashboard</span>
            <span className={styles.actionSub}>Monthly summary and statements</span>
          </Link>
          <Link to="/billing" className={styles.actionBtn}>
            <i className="ti ti-building-bank" />
            <span>Official Accounts</span>
            <span className={styles.actionSub}>Cost centre charges</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
