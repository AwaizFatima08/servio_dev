// web/src/pages/accounts/BillingDashboardPage.jsx
// Screen 6 — Billing Dashboard (Accounts Supervisor)
// Flow 14: monthly summary + employee statement + official charges + pending billing

import { useState, useEffect, useCallback } from 'react';
import {
  getMonthlySummary,
  getEmployeeStatement,
  getOfficialCharges,
  getPendingBilling,
} from '../../services/billingService';
import styles from './BillingDashboardPage.module.css';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

// Current month as YYYY-MM
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

const formatDate = (str) =>
  new Date(str + 'T00:00:00Z').toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

const fmt = (n) => (n ?? 0).toLocaleString();

// Tabs
const TABS = [
  { key: 'summary',  label: 'Monthly Summary',     icon: 'ti-chart-bar' },
  { key: 'employee', label: 'Employee Statement',   icon: 'ti-user' },
  { key: 'official', label: 'Official Accounts',    icon: 'ti-building-bank' },
  { key: 'pending',  label: 'Pending Billing',      icon: 'ti-clock' },
];

export default function BillingDashboardPage({ defaultTab }) {
  const [activeTab, setActiveTab]     = useState(defaultTab || 'summary');
  const [month, setMonth]             = useState(currentMonth());
  const [empNumber, setEmpNumber]     = useState('');
  const [empSearch, setEmpSearch]     = useState('');
  const [pendingDate, setPendingDate] = useState(yesterdayStr());

  // Data states
  const [summary, setSummary]         = useState(null);
  const [statement, setStatement]     = useState(null);
  const [official, setOfficial]       = useState(null);
  const [pending, setPending]         = useState(null);

  // UI states
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Expanded official account rows
  const [expandedAccounts, setExpandedAccounts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'summary') {
        const data = await getMonthlySummary(month);
        setSummary(data);
      } else if (activeTab === 'employee' && empNumber.trim()) {
        const data = await getEmployeeStatement(empNumber.trim().toUpperCase(), month);
        setStatement(data);
      } else if (activeTab === 'official') {
        const data = await getOfficialCharges(month);
        setOfficial(data);
      } else if (activeTab === 'pending') {
        const data = await getPendingBilling(pendingDate);
        setPending(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, month, empNumber, pendingDate]);

  // Auto-load on tab/month change (except employee which needs a number)
  useEffect(() => {
    if (activeTab !== 'employee') {
      load();
    }
  }, [activeTab, month, pendingDate]); // eslint-disable-line

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
  };

  const toggleAccount = (code) =>
    setExpandedAccounts(prev => ({ ...prev, [code]: !prev[code] }));

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Billing Dashboard</h1>
          <p className={styles.subtitle}>Monthly billing and charge management</p>
        </div>
        {activeTab !== 'pending' && (
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={e => setMonth(e.target.value)}
            className={styles.monthPicker}
          />
        )}
        {activeTab === 'pending' && (
          <input
            type="date"
            value={pendingDate}
            max={yesterdayStr()}
            onChange={e => setPendingDate(e.target.value)}
            className={styles.monthPicker}
          />
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <i className={tab.icon} />
            {tab.label}
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

      {/* ── Tab: Monthly Summary ── */}
      {!loading && activeTab === 'summary' && summary && (
        <div className={styles.content}>
          <div className={styles.sectionLabel}>
            {formatMonth(month)} — Overview
          </div>

          {/* Stat cards */}
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Issued Meals</span>
              <span className={styles.statValue}>{fmt(summary.summary?.totalIssuedMeals)}</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGreen}`}>
              <span className={styles.statLabel}>Total Amount</span>
              <span className={styles.statValue}>Rs. {fmt(summary.summary?.totalAmount)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Employees Billed</span>
              <span className={styles.statValue}>{fmt(summary.summary?.uniqueEmployeesBilled)}</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGold}`}>
              <span className={styles.statLabel}>Pending Rate Entry</span>
              <span className={styles.statValue}>{fmt(summary.summary?.pendingRateCount)}</span>
            </div>
          </div>

          {/* Billing split */}
          <div className={styles.splitRow}>
            <div className={styles.splitCard}>
              <div className={styles.splitLabel}>Employee Accounts</div>
              <div className={styles.splitAmount}>Rs. {fmt(summary.summary?.employeeAmount)}</div>
              <div className={styles.splitNote}>Salary deduction</div>
            </div>
            <div className={styles.splitCard}>
              <div className={styles.splitLabel}>Official Accounts</div>
              <div className={styles.splitAmount}>Rs. {fmt(summary.summary?.officialAmount)}</div>
              <div className={styles.splitNote}>Cost centre charges</div>
            </div>
          </div>

          {/* Meal type breakdown */}
          <div className={styles.breakdownBlock}>
            <div className={styles.breakdownTitle}>Amount by Meal Type</div>
            <div className={styles.breakdownRow}>
              {Object.entries(summary.summary?.byMealType || {}).map(([meal, amt]) => (
                <div key={meal} className={styles.breakdownItem}>
                  <span className={styles.breakdownMeal}>{MEAL_LABELS[meal] || meal}</span>
                  <span className={styles.breakdownAmt}>Rs. {fmt(amt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rate completion */}
          <div className={styles.progressBlock}>
            <div className={styles.progressHeader}>
              <span className={styles.progressTitle}>Rate Entry Completion</span>
              <span className={styles.progressPercent}>{summary.summary?.rateCompletionPct ?? 0}%</span>
            </div>
            <div className={styles.progressBarOuter}>
              <div
                className={styles.progressBarInner}
                style={{ width: `${summary.summary?.rateCompletionPct ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Employee Statement ── */}
      {activeTab === 'employee' && (
        <div className={styles.content}>
          <div className={styles.empSearchRow}>
            <input
              type="text"
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter' && empSearch.trim()) {
                  setEmpNumber(empSearch.trim());
                  setTimeout(() => load(), 50);
                }
              }}
              placeholder="Enter employee number e.g. FFL00001"
              className={styles.empInput}
            />
            <button
              className={styles.searchBtn}
              onClick={() => {
                setEmpNumber(empSearch.trim());
                setTimeout(() => load(), 50);
              }}
              disabled={!empSearch.trim() || loading}
            >
              <i className="ti ti-search" /> Load Statement
            </button>
          </div>

          {!loading && statement && (
            <>
              {/* Employee summary */}
              <div className={styles.empSummaryCard}>
                <div className={styles.empSummaryLeft}>
                  <div className={styles.empName}>{statement.employeeName || statement.employeeNumber}</div>
                  <div className={styles.empNum}>{statement.employeeNumber} · {formatMonth(statement.month)}</div>
                </div>
                <div className={styles.empSummaryRight}>
                  <div className={styles.empTotal}>Rs. {fmt(statement.summary?.confirmedAmount)}</div>
                  <div className={styles.empTotalLabel}>
                    confirmed
                    {statement.summary?.pendingRateCount > 0 && (
                      <span className={styles.pendingNote}> · {statement.summary.pendingRateCount} pending rate</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Line items table */}
              {statement.lineItems?.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <div className={`${styles.tableHeader} ${styles.statementHeader}`}>
                    <span>Date</span>
                    <span>Meal</span>
                    <span>Item</span>
                    <span>Option</span>
                    <span>Mode</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>
                  {statement.lineItems.map((item, i) => (
                    <div key={i} className={`${styles.tableRow} ${styles.statementRow}`}>
                      <span>{formatDate(item.reservationDate)}</span>
                      <span>{MEAL_LABELS[item.mealType] || item.mealType}</span>
                      <span className={styles.itemNameCell}>{item.itemName}</span>
                      <span className={styles.optKeyCell}>{item.optionLabel || item.menuOptionKey}</span>
                      <span>{item.diningMode === 'dine_in' ? 'Dine-in' : 'Takeaway'}</span>
                      <span>{item.quantity}</span>
                      <span>{item.unitRate ? `Rs. ${item.unitRate}` : '—'}</span>
                      <span className={styles.amtCell}>
                        {item.amount ? `Rs. ${fmt(item.amount)}` : '—'}
                      </span>
                      <span>
                        {item.rateStatus === 'applied'
                          ? <span className={styles.badgeApplied}>Applied</span>
                          : <span className={styles.badgePending}>Pending</span>}
                      </span>
                    </div>
                  ))}
                  <div className={styles.tableFooter}>
                    <span>Total</span>
                    <span className={styles.footerTotal}>
                      Rs. {fmt(statement.summary?.totalAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="ti ti-receipt-off" />
                  <p>No issued meals found for this employee in {formatMonth(month)}.</p>
                </div>
              )}
            </>
          )}

          {!loading && !statement && !error && (
            <div className={styles.emptyState}>
              <i className="ti ti-user-search" />
              <p>Enter an employee number above to load their billing statement.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Official Accounts ── */}
      {!loading && activeTab === 'official' && official && (
        <div className={styles.content}>
          <div className={styles.sectionLabel}>
            {formatMonth(month)} — Official Account Charges
          </div>

          {/* Summary strip */}
          <div className={styles.officialSummary}>
            <span><strong>{fmt(official.summary?.totalAccounts)}</strong> cost centres</span>
            <span><strong>{fmt(official.summary?.totalCharges)}</strong> charges</span>
            <span>Rs. <strong>{fmt(official.summary?.totalAmount)}</strong> total</span>
            {official.summary?.pendingRateCount > 0 && (
              <span className={styles.pendingNote}>
                {official.summary.pendingRateCount} pending rate
              </span>
            )}
          </div>

          {official.accounts?.length > 0 ? (
            official.accounts.map(account => (
              <div key={account.costCentreCode} className={styles.accountBlock}>
                <button
                  className={styles.accountHeader}
                  onClick={() => toggleAccount(account.costCentreCode)}
                >
                  <div className={styles.accountLeft}>
                    <span className={styles.accountCode}>{account.costCentreCode}</span>
                    <span className={styles.accountMeals}>{account.mealCount} meals</span>
                    {account.pendingRateCount > 0 && (
                      <span className={styles.badgePending}>{account.pendingRateCount} pending</span>
                    )}
                  </div>
                  <div className={styles.accountRight}>
                    <span className={styles.accountTotal}>Rs. {fmt(account.totalAmount)}</span>
                    <i className={`ti ${expandedAccounts[account.costCentreCode] ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                  </div>
                </button>

                {expandedAccounts[account.costCentreCode] && (
                  <div className={styles.accountDetail}>
                    <div className={`${styles.tableHeader} ${styles.officialHeader}`}>
                      <span>Date</span>
                      <span>Meal</span>
                      <span>Employee</span>
                      <span>Item</span>
                      <span>Type</span>
                      <span>Qty</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </div>
                    {account.lineItems.map((item, i) => (
                      <div key={i} className={`${styles.tableRow} ${styles.officialRow}`}>
                        <span>{formatDate(item.reservationDate)}</span>
                        <span>{MEAL_LABELS[item.mealType] || item.mealType}</span>
                        <span className={styles.itemNameCell}>{item.employeeName}</span>
                        <span>{item.itemName}</span>
                        <span>{item.subjectType?.replace(/_/g, ' ')}</span>
                        <span>{item.quantity}</span>
                        <span className={styles.amtCell}>
                          {item.amount ? `Rs. ${fmt(item.amount)}` : '—'}
                        </span>
                        <span>
                          {item.rateStatus === 'applied'
                            ? <span className={styles.badgeApplied}>Applied</span>
                            : <span className={styles.badgePending}>Pending</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <i className="ti ti-building-bank" />
              <p>No official account charges for {formatMonth(month)}.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Pending Billing ── */}
      {!loading && activeTab === 'pending' && pending && (
        <div className={styles.content}>
          <div className={styles.sectionLabel}>
            Pending Rate Entry — {formatDate(pending.date)}
          </div>

          {pending.totalPending > 0 ? (
            <>
              <div className={styles.pendingAlert}>
                <i className="ti ti-alert-triangle" />
                <span>
                  <strong>{pending.totalPending}</strong> issued reservation(s) are still waiting for rate entry.
                  Go to Rate Entry to resolve.
                </span>
              </div>

              {pending.byMealType?.map(group => (
                <div key={group.mealType} className={styles.mealSection}>
                  <div className={styles.mealHeader}>
                    <span className={styles.mealLabel}>{MEAL_LABELS[group.mealType] || group.mealType}</span>
                    <span className={styles.mealCount}>{group.count} item(s)</span>
                  </div>
                  <div className={styles.tableWrapper}>
                    <div className={`${styles.tableHeader} ${styles.pendingHeader}`}>
                      <span>Employee</span>
                      <span>Item</span>
                      <span>Option Key</span>
                      <span>Billing</span>
                      <span>Cost Centre</span>
                    </div>
                    {group.items.map((item, i) => (
                      <div key={i} className={`${styles.tableRow} ${styles.pendingRow}`}>
                        <span>{item.employeeName} <small>({item.employeeNumber})</small></span>
                        <span>{item.itemName}</span>
                        <span className={styles.optKeyCell}>{item.menuOptionKey}</span>
                        <span>{item.billingDestination === 'employee_account' ? 'Employee' : 'Official'}</span>
                        <span>{item.costCentreCode || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.emptyState}>
              <i className="ti ti-circle-check" />
              <p>All rates have been entered for this date.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
