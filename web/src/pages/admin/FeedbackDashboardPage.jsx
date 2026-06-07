// web/src/pages/admin/FeedbackDashboardPage.jsx
// F8 — Individual Feedback Review for Admin
// HomiLabs | Servio | Web
// Admin views individual feedback submissions and marks them reviewed/resolved.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminFeedback, reviewFeedback } from '../../services/feedbackAdminService';
import styles from './FeedbackDashboardPage.module.css';

const MEAL_LABELS     = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const AREA_LABELS     = { quality: 'Quality', quantity: 'Quantity', ambience: 'Ambience', rate: 'Rate', service: 'Service', overall: 'Overall' };
const STATUS_LABELS   = { open: 'Open', reviewed: 'Reviewed', resolved: 'Resolved' };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function StarRating({ rating }) {
  return (
    <span className={styles.stars}>
      {[1,2,3,4,5].map(n => (
        <i
          key={n}
          className={`ti ${n <= rating ? 'ti-star-filled' : 'ti-star'}`}
          style={{ color: n <= rating ? '#D4960A' : '#C6F0E5', fontSize: 13 }}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const cls = { open: styles.badgeOpen, reviewed: styles.badgeReviewed, resolved: styles.badgeResolved };
  return <span className={`${styles.badge} ${cls[status] || ''}`}>{STATUS_LABELS[status] || status}</span>;
}

export default function FeedbackDashboardPage() {
  const { getToken } = useAuth();

  // Filters
  const [date, setDate]             = useState(todayStr());
  const [mealType, setMealType]     = useState('');
  const [status, setStatus]         = useState('open');
  const [feedbackArea, setArea]     = useState('');

  // Data
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Per-row action
  const [rowLoading, setRowLoading] = useState({});
  const [rowError, setRowError]     = useState({});

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const data = await getAdminFeedback({ date, mealType, status, feedbackArea }, token);
      setItems(data);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, date, mealType, status, feedbackArea]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  async function handleReview(feedbackId, newStatus) {
    setRowLoading(r => ({ ...r, [feedbackId]: newStatus }));
    setRowError(r => ({ ...r, [feedbackId]: '' }));
    try {
      const token = await getToken();
      await reviewFeedback(feedbackId, newStatus, token);
      setItems(prev => prev.map(f =>
        f.feedbackId === feedbackId ? { ...f, status: newStatus } : f
      ));
    } catch (e) {
      setRowError(r => ({ ...r, [feedbackId]: e.message }));
    } finally {
      setRowLoading(r => ({ ...r, [feedbackId]: null }));
    }
  }

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Feedback Review</h1>
          <p className={styles.pageSubtitle}>Review individual meal feedback submissions</p>
        </div>
        <button className={styles.btnRefresh} onClick={loadFeedback} disabled={loading}>
          <i className={`ti ti-refresh ${loading ? styles.spinning : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Meal</label>
          <select value={mealType} onChange={e => setMealType(e.target.value)} className={styles.filterInput}>
            <option value="">All meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={styles.filterInput}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Area</label>
          <select value={feedbackArea} onChange={e => setArea(e.target.value)} className={styles.filterInput}>
            <option value="">All areas</option>
            <option value="quality">Quality</option>
            <option value="quantity">Quantity</option>
            <option value="ambience">Ambience</option>
            <option value="rate">Rate</option>
            <option value="service">Service</option>
            <option value="overall">Overall</option>
          </select>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading && (
        <div className={styles.loadingState}>
          <i className="ti ti-loader-2" />
          <p>Loading feedback…</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className={styles.emptyState}>
          <i className="ti ti-message-off" />
          <p>No feedback found for selected filters.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Employee</span>
            <span>Meal / Item</span>
            <span>Area</span>
            <span>Rating</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {items.map(f => {
            const actionState = rowLoading[f.feedbackId];
            return (
              <div key={f.feedbackId} className={`${styles.row} ${f.status !== 'open' ? styles.rowDone : ''}`}>
                <div className={styles.colEmp}>
                  <span className={styles.empName}>
                    {f.isAnonymous ? 'Anonymous' : (f.employeeName || f.employeeNumber)}
                  </span>
                  {!f.isAnonymous && f.employeeNumber && (
                    <span className={styles.empNum}>{f.employeeNumber}</span>
                  )}
                </div>
                <div className={styles.colMeal}>
                  <span className={styles.mealLabel}>{MEAL_LABELS[f.mealType] || f.mealType}</span>
                  <span className={styles.itemName}>{f.itemName}</span>
                </div>
                <div className={styles.colArea}>
                  <span className={styles.areaChip}>{AREA_LABELS[f.feedbackArea] || f.feedbackArea}</span>
                </div>
                <div className={styles.colRating}>
                  <StarRating rating={f.rating} />
                  <span className={styles.ratingNum}>{f.rating}/5</span>
                </div>
                <div className={styles.colStatus}>
                  <StatusBadge status={f.status} />
                </div>
                <div className={styles.colActions}>
                  {rowError[f.feedbackId] && (
                    <span className={styles.rowError} title={rowError[f.feedbackId]}>
                      <i className="ti ti-alert-circle" />
                    </span>
                  )}
                  {f.status === 'open' && (
                    <button
                      className={styles.btnReview}
                      onClick={() => handleReview(f.feedbackId, 'reviewed')}
                      disabled={!!actionState}
                    >
                      {actionState === 'reviewed'
                        ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                        : <><i className="ti ti-check" /> Review</>
                      }
                    </button>
                  )}
                  {f.status === 'reviewed' && (
                    <button
                      className={styles.btnResolve}
                      onClick={() => handleReview(f.feedbackId, 'resolved')}
                      disabled={!!actionState}
                    >
                      {actionState === 'resolved'
                        ? <i className={`ti ti-loader-2 ${styles.spinning}`} />
                        : <><i className="ti ti-circle-check" /> Resolve</>
                      }
                    </button>
                  )}
                  {f.status === 'resolved' && (
                    <span className={styles.resolvedMark}><i className="ti ti-circle-check" /></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
