// web/src/pages/employee/MyBillPage.jsx
// Screen 16 — My Bill (Employee) — Flow 14

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyStatement } from '../../services/billingService';
import styles from './MyBillPage.module.css';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export default function MyBillPage() {
  const { userProfile } = useAuth();
  const empNumber = userProfile?.user?.officialEmployeeNumber;

  const [month, setMonth]     = useState(currentMonth());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchBill = useCallback(async () => {
    if (!empNumber) return;
    setLoading(true);
    setError('');
    try {
      const result = await getMyStatement(month);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [empNumber, month]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  const lineItems    = data?.reservations ?? [];
  const total        = data?.totalAmount ?? 0;
  const confirmed    = data?.totalAmount ?? 0;
  const pendingCount = data?.pendingRateCount ?? 0;
  const issuedCount  = data?.issuedCount ?? 0;

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Bill</h1>
          <p className={styles.subtitle}>Monthly meal consumption charges</p>
        </div>
        <input
          type="month"
          className={styles.monthInput}
          value={month}
          max={currentMonth()}
          onChange={e => setMonth(e.target.value)}
        />
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : !data ? (
        <div className={styles.emptyState}>No billing data for {month}</div>
      ) : (
        <>
          {/* Total card */}
          <div className={styles.totalCard}>
            <div className={styles.totalLeft}>
              <div className={styles.totalLabel}>Total for {month}</div>
              <div className={styles.totalValue}>Rs. {confirmed.toLocaleString()}</div>
              {pendingCount > 0 && (
                <div className={styles.pendingNote}>
                  {pendingCount} item{pendingCount > 1 ? 's' : ''} pending rate — final amount may change
                </div>
              )}
            </div>
            <div className={styles.totalStats}>
              <div className={styles.totalStat}>
                <span>{issuedCount}</span>
                <small>Issued meals</small>
              </div>
              <div className={styles.totalStat}>
                <span>Rs. {total.toLocaleString()}</span>
                <small>Gross total</small>
              </div>
            </div>
          </div>

          {/* Line items table */}
          {lineItems.length === 0 ? (
            <div className={styles.emptyState}>No charged meals this month</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meal</th>
                  <th>Item</th>
                  <th>Option</th>
                  <th>Mode</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((r, i) => (
                  <tr key={r.reservationId || i}>
                    <td>{r.reservationDate}</td>
                    <td>{MEAL_LABELS[r.mealType] ?? r.mealType}</td>
                    <td className={styles.itemName}>{r.itemName}</td>
                    <td>{r.optionLabel || r.menuOptionKey || '—'}</td>
                    <td>{r.diningMode === 'dine_in' ? 'Dine-in' : 'Takeaway'}</td>
                    <td>{r.quantity ?? 1}</td>
                    <td>
                      {r.unitRate != null
                        ? `Rs. ${r.unitRate}`
                        : <span className={styles.pending}>—</span>}
                    </td>
                    <td className={styles.amount}>
                      {r.amount != null
                        ? `Rs. ${r.amount.toLocaleString()}`
                        : <span className={styles.pending}>Pending</span>}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${r.rateStatus === 'applied' ? styles.badge_applied : styles.badge_pending}`}>
                        {r.rateStatus ?? 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
