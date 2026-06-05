// web/src/pages/employee/FeedbackPage.jsx
// Screen 17 — Feedback (Employee) — Flow 08

import { useState, useEffect, useCallback } from 'react';
import {
  getEligibleReservations,
  getMyFeedback,
  submitFeedback,
} from '../../services/feedbackService';
import styles from './FeedbackPage.module.css';

const FEEDBACK_AREAS = [
  { key: 'quality',  label: 'Food Quality' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'ambience', label: 'Ambience' },
  { key: 'rate',     label: 'Value for Money' },
  { key: 'service',  label: 'Service' },
  { key: 'overall',  label: 'Overall' },
];

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackPage() {
  const [tab, setTab]               = useState('pending');
  const [eligible, setEligible]     = useState([]);
  const [submitted, setSubmitted]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active form state
  const [activeResId, setActiveResId] = useState(null);
  const [area, setArea]               = useState('overall');
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eligData, subData] = await Promise.all([
        getEligibleReservations(),
        getMyFeedback(),
      ]);
      setEligible(eligData);
      setSubmitted(subData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openForm(reservationId) {
    setActiveResId(reservationId);
    setArea('overall');
    setRating(0);
    setHoverRating(0);
    setIsAnonymous(false);
    setError('');
  }

  async function handleSubmit(reservation) {
    if (rating === 0) { setError('Please select a rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitFeedback({
        reservationId:   reservation.reservationId,
        reservationDate: reservation.reservationDate,
        mealType:        reservation.mealType,
        menuItemId:      reservation.menuItemId,
        itemName:        reservation.itemName,
        menuOptionKey:   reservation.menuOptionKey,
        feedbackArea:    area,
        rating,
        isAnonymous,
      });
      setSuccessMsg('Feedback submitted. Thank you.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setActiveResId(null);
      fetchAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Feedback</h1>
        <p className={styles.subtitle}>Rate your meal experience</p>
      </div>

      {error      && <div className={styles.errorBanner}>{error}</div>}
      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        {[['pending', `Pending (${eligible.length})`], ['submitted', 'Submitted']].map(([k, l]) => (
          <button
            key={k}
            className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`}
            onClick={() => { setTab(k); setActiveResId(null); setError(''); }}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <>
          {/* ── Pending tab ── */}
          {tab === 'pending' && (
            eligible.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✓</div>
                <p>No pending feedback</p>
              </div>
            ) : (
              <div className={styles.list}>
                {eligible.map(r => (
                  <div key={r.reservationId} className={styles.eligibleCard}>
                    <div className={styles.eligibleInfo}>
                      <div className={styles.eligibleMeal}>
                        {MEAL_LABELS[r.mealType] ?? r.mealType} · {r.reservationDate}
                      </div>
                      <div className={styles.eligibleItem}>{r.itemName}</div>
                      <div className={styles.eligibleOption}>{r.optionLabel ?? r.menuOptionKey}</div>
                    </div>

                    {activeResId === r.reservationId ? (
                      <div className={styles.feedbackForm}>
                        {/* Area buttons */}
                        <div className={styles.areaRow}>
                          {FEEDBACK_AREAS.map(fa => (
                            <button
                              key={fa.key}
                              className={`${styles.areaBtn} ${area === fa.key ? styles.areaBtnActive : ''}`}
                              onClick={() => setArea(fa.key)}
                            >
                              {fa.label}
                            </button>
                          ))}
                        </div>

                        {/* Star rating */}
                        <div className={styles.starRow}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              className={`${styles.star} ${(hoverRating || rating) >= s ? styles.starFilled : ''}`}
                              onMouseEnter={() => setHoverRating(s)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(s)}
                            >
                              ★
                            </button>
                          ))}
                          <span className={styles.ratingLabel}>
                            {rating > 0 ? RATING_LABELS[rating] : 'Select rating'}
                          </span>
                        </div>

                        {/* Anonymous toggle */}
                        <label className={styles.anonLabel}>
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={e => setIsAnonymous(e.target.checked)}
                          />
                          Submit anonymously (your number is still recorded for audit)
                        </label>

                        <div className={styles.formActions}>
                          <button
                            className={styles.submitBtn}
                            onClick={() => handleSubmit(r)}
                            disabled={submitting}
                          >
                            {submitting ? 'Submitting…' : 'Submit Feedback'}
                          </button>
                          <button
                            className={styles.cancelFormBtn}
                            onClick={() => setActiveResId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.rateBtn}
                        onClick={() => openForm(r.reservationId)}
                      >
                        Rate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Submitted tab ── */}
          {tab === 'submitted' && (
            submitted.length === 0 ? (
              <div className={styles.emptyState}>No submitted feedback yet</div>
            ) : (
              <div className={styles.list}>
                {submitted.map(f => (
                  <div key={f.feedbackId} className={styles.submittedCard}>
                    <div className={styles.submittedInfo}>
                      <div className={styles.eligibleMeal}>
                        {MEAL_LABELS[f.mealType] ?? f.mealType} · {f.reservationDate}
                      </div>
                      <div className={styles.eligibleItem}>{f.itemName}</div>
                      <div className={styles.areaTag}>{f.feedbackArea}</div>
                    </div>
                    <div className={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          className={f.rating >= s ? styles.starFilledStatic : styles.starEmpty}
                        >
                          ★
                        </span>
                      ))}
                      <span className={styles.submittedStatus}>{f.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
