// web/src/pages/accounts/RateEntryPage.jsx
// Screen 5 — Rate Entry (Accounts Supervisor)
// Flow 07: get pending items → enter rates → submit → batch updates reservations

import { useState, useEffect, useCallback } from 'react';
import { getPendingRateEntries, submitRateEntries } from '../../services/ratesService';
import styles from './RateEntryPage.module.css';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ORDER  = ['breakfast', 'lunch', 'dinner'];

// Yesterday's date as default — rate entry is always for the previous day
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const todayStr = () => new Date().toISOString().split('T')[0];

const formatDate = (str) => {
  const d = new Date(str + 'T00:00:00Z');
  return d.toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

export default function RateEntryPage() {
  const [rateDate, setRateDate]       = useState(yesterdayStr());
  const [items, setItems]             = useState([]);     // pending items from backend
  const [rates, setRates]             = useState({});     // { rateTargetKey: inputValue }
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  // Load pending entries whenever date changes
  const loadPending = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setSubmitResult(null);
    setItems([]);
    setRates({});
    try {
      const data = await getPendingRateEntries(rateDate);
      setItems(data || []);
      // Pre-fill input with lastHistoricalRate if rate not yet entered
      const prefilled = {};
      (data || []).forEach(item => {
        prefilled[item.rateTargetKey] = item.rateAlreadyEntered
          ? String(item.existingRate ?? '')
          : String(item.lastHistoricalRate ?? '');
      });
      setRates(prefilled);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rateDate]);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Group items by meal type for display
  const grouped = MEAL_ORDER.reduce((acc, meal) => {
    const mealItems = items.filter(i => i.mealType === meal);
    if (mealItems.length > 0) acc[meal] = mealItems;
    return acc;
  }, {});

  const handleRateChange = (key, val) => {
    // Allow only positive numbers
    if (val === '' || /^\d+$/.test(val)) {
      setRates(prev => ({ ...prev, [key]: val }));
    }
  };

  // Fill all empty inputs with their lastHistoricalRate
  const handleFillAll = () => {
    const filled = { ...rates };
    items.forEach(item => {
      if (!filled[item.rateTargetKey] && item.lastHistoricalRate) {
        filled[item.rateTargetKey] = String(item.lastHistoricalRate);
      }
    });
    setRates(filled);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMsg('');
    setSubmitResult(null);

    // Validate all items have a rate
    const missing = items.filter(i => !rates[i.rateTargetKey] || rates[i.rateTargetKey] === '0');
    if (missing.length > 0) {
      setError(`Please enter a rate for all items. Missing: ${missing.map(m => m.comboName || m.menuOptionKey).join(', ')}`);
      return;
    }

    // Build entries array
    const entries = items.map(item => ({
      rateTargetKey:  item.rateTargetKey,
      menuItemId:     item.comboId || null,
      itemName:       item.comboName || item.displayLabel || item.menuOptionKey,
      mealType:       item.mealType,
      menuOptionKey:  item.menuOptionKey,
      selectionMode:  'combo',
      unitRate:       parseInt(rates[item.rateTargetKey], 10),
    }));

    setSubmitting(true);
    try {
      const result = await submitRateEntries(rateDate, todayStr(), entries);
      setSubmitResult(result);
      setSuccessMsg(
        `Rates saved for ${result.entriesProcessed} item(s). ` +
        `${result.reservationsUpdated} reservation(s) updated.`
      );
      // Reload to reflect updated state
      await loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Count items with and without rates entered
  const enteredCount  = items.filter(i => i.rateAlreadyEntered).length;
  const pendingCount  = items.filter(i => !i.rateAlreadyEntered).length;
  const allFilled     = items.length > 0 && items.every(i => rates[i.rateTargetKey] && rates[i.rateTargetKey] !== '0');

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Rate Entry</h1>
          <p className={styles.subtitle}>Enter actual meal costs for the selected date</p>
        </div>
        <div className={styles.headerRight}>
          <input
            type="date"
            value={rateDate}
            max={yesterdayStr()}
            onChange={e => setRateDate(e.target.value)}
            className={styles.datePicker}
          />
        </div>
      </div>

      {/* Date label */}
      <div className={styles.dateLabel}>
        <i className="ti ti-calendar" />
        Showing rates for: <strong>{formatDate(rateDate)}</strong>
      </div>

      {/* Status banners */}
      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {successMsg && (
        <div className={styles.successBanner}>
          <i className="ti ti-circle-check" /> {successMsg}
        </div>
      )}

      {/* Summary pills */}
      {!loading && items.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryPill}>
            <span className={styles.pillNum}>{items.length}</span>
            <span className={styles.pillLabel}>Total items</span>
          </div>
          <div className={`${styles.summaryPill} ${styles.pillEntered}`}>
            <span className={styles.pillNum}>{enteredCount}</span>
            <span className={styles.pillLabel}>Rates entered</span>
          </div>
          <div className={`${styles.summaryPill} ${styles.pillPending}`}>
            <span className={styles.pillNum}>{pendingCount}</span>
            <span className={styles.pillLabel}>Pending</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <span>Loading items for {formatDate(rateDate)}…</span>
        </div>
      )}

      {/* No items */}
      {!loading && items.length === 0 && !error && (
        <div className={styles.emptyState}>
          <i className="ti ti-clipboard-off" />
          <p>No menu items found for this date.</p>
          <small>Only dates with resolved menus will show items here.</small>
        </div>
      )}

      {/* Rate entry form — grouped by meal */}
      {!loading && items.length > 0 && (
        <>
          {Object.entries(grouped).map(([meal, mealItems]) => (
            <div key={meal} className={styles.mealSection}>
              <div className={styles.mealHeader}>
                <span className={styles.mealLabel}>{MEAL_LABELS[meal]}</span>
                <span className={styles.mealCount}>{mealItems.length} item(s)</span>
              </div>

              <div className={styles.itemsGrid}>
                {/* Column headers */}
                <div className={styles.gridHeader}>
                  <span>Item</span>
                  <span>Option Key</span>
                  <span>Issued</span>
                  <span>Last Rate (Rs.)</span>
                  <span>Enter Rate (Rs.)</span>
                  <span>Est. Total</span>
                  <span>Status</span>
                </div>

                {mealItems.map(item => {
                  const currentRate = parseInt(rates[item.rateTargetKey] || '0', 10);
                  const estTotal    = currentRate * (item.issuedCount || 0);
                  const isEntered   = item.rateAlreadyEntered;
                  const isModified  = isEntered && String(item.existingRate) !== rates[item.rateTargetKey];

                  return (
                    <div
                      key={item.rateTargetKey}
                      className={`${styles.gridRow} ${isEntered ? styles.rowEntered : ''}`}
                    >
                      {/* Item name */}
                      <span className={styles.itemName}>
                        {item.comboName || item.displayLabel || item.menuOptionKey}
                      </span>

                      {/* Option key */}
                      <span className={styles.optionKey}>{item.menuOptionKey}</span>

                      {/* Issued count */}
                      <span className={styles.issuedCount}>
                        <i className="ti ti-users" /> {item.issuedCount ?? 0}
                      </span>

                      {/* Last historical rate */}
                      <span className={styles.lastRate}>
                        {item.lastHistoricalRate ? `Rs. ${item.lastHistoricalRate}` : '—'}
                      </span>

                      {/* Rate input */}
                      <span className={styles.rateInputCell}>
                        <div className={styles.inputWrapper}>
                          <span className={styles.currencyPrefix}>Rs.</span>
                          <input
                            type="number"
                            min="1"
                            value={rates[item.rateTargetKey] || ''}
                            onChange={e => handleRateChange(item.rateTargetKey, e.target.value)}
                            className={`${styles.rateInput} ${isModified ? styles.rateInputModified : ''}`}
                            placeholder="0"
                          />
                        </div>
                      </span>

                      {/* Estimated total */}
                      <span className={styles.estTotal}>
                        {currentRate > 0 && item.issuedCount > 0
                          ? `Rs. ${estTotal.toLocaleString()}`
                          : '—'}
                      </span>

                      {/* Status badge */}
                      <span>
                        {isEntered ? (
                          isModified ? (
                            <span className={styles.badgeRevision}>Revision</span>
                          ) : (
                            <span className={styles.badgeEntered}>
                              <i className="ti ti-check" /> Entered
                            </span>
                          )
                        ) : (
                          <span className={styles.badgePending}>Pending</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.fillBtn}
              onClick={handleFillAll}
              disabled={submitting}
            >
              <i className="ti ti-wand" /> Fill from history
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || !allFilled}
            >
              {submitting ? (
                <><div className={styles.spinnerSm} /> Saving…</>
              ) : (
                <><i className="ti ti-device-floppy" /> Save All Rates</>
              )}
            </button>
          </div>

          <p className={styles.note}>
            <i className="ti ti-info-circle" />
            Saving rates will automatically update all matching reservations with the entered amounts.
            If a rate was already entered, saving again creates a revision and marks the old rate inactive.
          </p>
        </>
      )}

    </div>
  );
}
