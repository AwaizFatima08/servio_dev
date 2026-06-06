// ─────────────────────────────────────────────────────────────────────────────
// ProxyBookingPage.jsx — Feature A (Proxy Booking)
// HomiLabs | Servio | Web
// Role: mess_supervisor
// Supervisor books a meal on behalf of an employee.
// Cutoff waived. Employee self-booking is NOT affected.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDailyMenu, createProxyReservation, createAlaCarteBooking, getEmployees } from '../../services/messService';
import styles from './ProxyBookingPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
    .split(',')[0].split('/').reduce((a, v, i) => {
      const p = v.padStart(2, '0');
      return i === 2 ? `${v}-${a}` : i === 0 ? p : `${a}-${p}`;
    });
}

function pktDateStr(date) {
  const pkt = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const y = pkt.getFullYear();
  const m = String(pkt.getMonth() + 1).padStart(2, '0');
  const d = String(pkt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildWeek() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(pktDateStr(d));
  }
  return days;
}

const WEEK_DATES = buildWeek();

const MEAL_TABS = [
  { key: 'breakfast', label: 'Breakfast', window: '06:00 – 09:00' },
  { key: 'lunch',     label: 'Lunch',     window: '13:00 – 15:00' },
  { key: 'dinner',    label: 'Dinner',    window: '19:00 – 22:00' },
];

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = pktDateStr(new Date());
  if (dateStr === today) return 'Today';
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Step({ n, label, active, done }) {
  return (
    <div className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
      <div className={styles.stepCircle}>{done ? <i className="ti ti-check" /> : n}</div>
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProxyBookingPage() {
  const { getToken } = useAuth();

  // Step: 1=employee, 2=date+meal, 3=menu, 4=mode+confirm
  const [step, setStep] = useState(1);

  // Step 1 — employee search
  const [empSearch, setEmpSearch]       = useState('');
  const [empResults, setEmpResults]     = useState([]);
  const [empLoading, setEmpLoading]     = useState(false);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Step 2 — date + meal
  const [selectedDate, setSelectedDate] = useState(WEEK_DATES[0]);
  const [selectedMeal, setSelectedMeal] = useState('lunch');

  // Step 3 — menu
  const [menu, setMenu]               = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError]     = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
 
  // Ala carte selections — breakfast only
  // Map of { itemId: quantity }. quantity 0 = not selected.
  const [alaCarteSelections, setAlaCarteSelections] = useState({});
  const [alaCarteNames, setAlaCarteNames]           = useState({});
 
  // Derived
  const isBreakfast          = selectedMeal === 'breakfast';
  const alaCarteItemCount    = Object.values(alaCarteSelections).filter(q => q > 0).length;
  const hasAlaCarteSelection = alaCarteItemCount > 0;
  const hasAnySelection      = !!selectedItem || hasAlaCarteSelection;
 
  // Step 4 — dining mode + submit
  const [diningMode, setDiningMode]   = useState('dine_in');
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // ── Employee search ───────────────────────────────────────────────────────

  useEffect(() => {
    if (empSearch.length < 2) { setEmpResults([]); return; }
    const timer = setTimeout(async () => {
      setEmpLoading(true);
      try {
        const token = await getToken();
        const results = await getEmployees(empSearch, token);
        setEmpResults(results.slice(0, 10));
        setShowDropdown(true);
      } catch {
        setEmpResults([]);
      } finally {
        setEmpLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [empSearch, getToken]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function selectEmployee(emp) {
    setSelectedEmp(emp);
    setEmpSearch(emp.fullName || emp.officialEmployeeNumber);
    setShowDropdown(false);
    setEmpResults([]);
  }

  // ── Load menu when date/meal changes (step 3) ─────────────────────────────

  const loadMenu = useCallback(async () => {
    setMenuLoading(true);
    setMenuError('');
    setSelectedItem(null);
    try {
      const token = await getToken();
      const data = await getDailyMenu(selectedDate, selectedMeal, token);
      if (!data) { setMenuError('not_generated'); setMenu(null); }
      else { setMenu(data); }
    } catch (e) {
      setMenuError(e.message);
    } finally {
      setMenuLoading(false);
    }
  }, [selectedDate, selectedMeal, getToken]);

  useEffect(() => {
    if (step === 3) loadMenu();
  }, [step, loadMenu]);

  // ── Ala carte helpers ─────────────────────────────────────────────────────
 
  function handleUpdateAlaCarteItem(itemId, itemName, newQty) {
    setAlaCarteSelections(prev => ({ ...prev, [itemId]: newQty }));
    setAlaCarteNames(prev => ({ ...prev, [itemId]: itemName }));
  }
 
  // ── Submit ────────────────────────────────────────────────────────────────
 
  async function handleSubmit() {
    if (!selectedEmp || !hasAnySelection) return;
    setSubmitting(true);
    setSubmitError('');
 
    const token = await getToken();
    let comboResult = null;
    let alaCarteResult = null;
    const errors = [];
 
    // Submit combo proxy if selected
    if (selectedItem) {
      try {
        comboResult = await createProxyReservation({
          reservationDate:      selectedDate,
          mealType:             selectedMeal,
          menuItemId:           selectedItem.menuItemId,
          menuOptionKey:        selectedItem.menuOptionKey,
          optionLabel:          selectedItem.optionLabel,
          itemName:             selectedItem.name,
          selectionMode:        selectedItem.selectionMode,
          diningMode,
          quantity:             1,
          targetEmployeeNumber: selectedEmp.officialEmployeeNumber,
        }, token);
      } catch (e) {
        errors.push(`Combo: ${e.message}`);
      }
    }
 
    // Submit ala carte proxy if any items selected (breakfast only)
    if (hasAlaCarteSelection) {
      const items = Object.entries(alaCarteSelections)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({
          itemId,
          itemName: alaCarteNames[itemId] || itemId,
          quantity: qty,
        }));
      try {
        alaCarteResult = await createAlaCarteBooking({
          reservationDate:      selectedDate,
          diningMode,
          items,
          bookingSource:        'proxy',
          targetEmployeeNumber: selectedEmp.officialEmployeeNumber,
        }, token);
      } catch (e) {
        errors.push(`Ala Carte: ${e.message}`);
      }
    }
 
    setSubmitting(false);
 
    // If everything failed show inline error
    if (errors.length > 0 && !comboResult && !alaCarteResult) {
      setSubmitError(errors.join(' | '));
      return;
    }
 
    // At least one succeeded — move to success screen
    setSubmitSuccess({
      employeeName:  selectedEmp.fullName || selectedEmp.officialEmployeeNumber,
      mealType:      selectedMeal,
      date:          selectedDate,
      comboItem:     selectedItem?.name || null,
      alaCarteItems: alaCarteResult?.reservations || [],
      errors,
    });
    setStep(4);
  }
 
  function resetAll() {
    setStep(1);
    setSelectedEmp(null);
    setEmpSearch('');
    setSelectedDate(WEEK_DATES[0]);
    setSelectedMeal('lunch');
    setMenu(null);
    setSelectedItem(null);
    setAlaCarteSelections({});
    setAlaCarteNames({});
    setDiningMode('dine_in');
    setSubmitSuccess(null);
    setSubmitError('');
  }

  // ── Build allItems from menu (combos only — no ala carte for proxy) ───────

  function buildItems(menu) {
    if (!menu?.combos?.length) return [];
    return menu.combos.map((c, i) => ({
      id:            `combo_${i + 1}`,
      name:          c.comboName || c.displayLabel,
      detail:        c.constituents?.map(x => x.itemName).join(' / '),
      badge:         `Combo ${i + 1}`,
      menuItemId:    c.comboId,
      menuOptionKey: `combo_${i + 1}`,
      optionLabel:   c.displayLabel || `Combo ${i + 1}`,
      selectionMode: 'combo',
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Proxy Booking</h1>
          <p className={styles.subtitle}>Book a meal on behalf of an employee. Cutoff is waived.</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className={styles.steps}>
        <Step n={1} label="Employee"  active={step === 1} done={step > 1} />
        <div className={styles.stepConnector} />
        <Step n={2} label="Date & Meal" active={step === 2} done={step > 2} />
        <div className={styles.stepConnector} />
        <Step n={3} label="Menu"      active={step === 3} done={step > 3 && !!submitSuccess} />
        <div className={styles.stepConnector} />
        <Step n={4} label="Confirm"   active={step === 4} done={!!submitSuccess} />
      </div>

      <div className={styles.card}>

        {/* ── STEP 1: Select Employee ── */}
        {step === 1 && (
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Select Employee</h2>
            <p className={styles.stepHint}>Type a name or employee number to search.</p>

            <div className={styles.searchWrap} ref={searchRef}>
              <div className={styles.searchBox}>
                <i className="ti ti-search" />
                <input
                  type="text"
                  placeholder="Name or employee number…"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }}
                  onFocus={() => empResults.length > 0 && setShowDropdown(true)}
                  autoFocus
                />
                {empLoading && <div className={styles.spinnerSm} />}
                {empSearch && !empLoading && (
                  <button className={styles.clearBtn} onClick={() => { setEmpSearch(''); setSelectedEmp(null); setEmpResults([]); }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {showDropdown && empResults.length > 0 && (
                <div className={styles.dropdown}>
                  {empResults.map(emp => (
                    <button
                      key={emp.officialEmployeeNumber}
                      className={styles.dropdownItem}
                      onClick={() => selectEmployee(emp)}
                    >
                      <span className={styles.empName}>{emp.fullName}</span>
                      <span className={styles.empNum}>{emp.officialEmployeeNumber}</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && empSearch.length >= 2 && !empLoading && empResults.length === 0 && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownEmpty}>No employees found</div>
                </div>
              )}
            </div>

            {selectedEmp && (
              <div className={styles.selectedEmpCard}>
                <div className={styles.selectedEmpAvatar}>
                  {(selectedEmp.fullName || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className={styles.selectedEmpName}>{selectedEmp.fullName}</div>
                  <div className={styles.selectedEmpMeta}>{selectedEmp.officialEmployeeNumber}
                    {selectedEmp.designation ? ` · ${selectedEmp.designation}` : ''}</div>
                </div>
              </div>
            )}

            <div className={styles.stepActions}>
              <button
                className={styles.btnPrimary}
                disabled={!selectedEmp}
                onClick={() => setStep(2)}
              >
                Next: Date &amp; Meal
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Date + Meal ── */}
        {step === 2 && (
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Select Date &amp; Meal</h2>
            <p className={styles.stepHint}>
              Booking for: <strong>{selectedEmp?.fullName}</strong>
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Date</label>
              <div className={styles.dateRow}>
                {WEEK_DATES.map(d => (
                  <button
                    key={d}
                    className={`${styles.dateChip} ${selectedDate === d ? styles.dateChipActive : ''}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    {formatDateLabel(d)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Meal</label>
              <div className={styles.mealTabs}>
                {MEAL_TABS.map(m => (
                  <button
                    key={m.key}
                    className={`${styles.mealTab} ${selectedMeal === m.key ? styles.mealTabActive : ''}`}
                    onClick={() => setSelectedMeal(m.key)}
                  >
                    <span className={styles.mealTabLabel}>{m.label}</span>
                    <span className={styles.mealTabWindow}>{m.window}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.stepActions}>
              <button className={styles.btnSecondary} onClick={() => setStep(1)}>Back</button>
              <button className={styles.btnPrimary} onClick={() => setStep(3)}>
                Next: Choose Menu
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Menu ── */}
        {step === 3 && (
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Choose Menu Item</h2>
            <p className={styles.stepHint}>
              <strong>{selectedEmp?.fullName}</strong> &middot; {formatDateLabel(selectedDate)} &middot; {MEAL_TABS.find(m => m.key === selectedMeal)?.label}
            </p>

            {menuLoading && (
              <div className={styles.menuLoading}>
                <div className={styles.spinner} />
                <span>Loading menu…</span>
              </div>
            )}

            {!menuLoading && menuError === 'not_generated' && (
              <div className={styles.menuNotReady}>
                <i className="ti ti-clock-hour-4" />
                Menu not generated yet for this date. Try a different date or check back later.
              </div>
            )}

            {!menuLoading && menuError && menuError !== 'not_generated' && (
              <div className={styles.errorBanner}>{menuError}</div>
            )}

            {!menuLoading && !menuError && menu && (
              <>
                {/* Combo section */}
                <div className={styles.menuSectionLabel}>
                  <i className="ti ti-box" /> Combo
                </div>
                <div className={styles.menuList}>
                  {buildItems(menu).map(item => (
                    <button
                      key={item.id}
                      className={`${styles.menuItem} ${selectedItem?.id === item.id ? styles.menuItemActive : ''}`}
                      onClick={() => setSelectedItem(prev => prev?.id === item.id ? null : item)}
                    >
                      <div className={styles.menuItemLeft}>
                        <span className={styles.menuItemName}>{item.name}</span>
                        {item.detail && <span className={styles.menuItemDetail}>{item.detail}</span>}
                      </div>
                      <span className={styles.menuBadge}>{item.badge}</span>
                    </button>
                  ))}
                </div>
 
                {/* Ala Carte section — breakfast only */}
                {isBreakfast && (menu.alaCarte || []).length > 0 && (
                  <>
                    <div className={styles.menuSectionLabel} style={{ marginTop: 12 }}>
                      <i className="ti ti-salad" /> Ala Carte
                      <span className={styles.menuSectionHint}>Set quantity to 0 to deselect</span>
                    </div>
                    <div className={styles.menuList}>
                      {(menu.alaCarte || []).map(item => {
                        const current = alaCarteSelections[item.itemId] || 0;
                        return (
                          <div
                            key={item.itemId}
                            className={`${styles.menuItem} ${current > 0 ? styles.menuItemActive : ''}`}
                          >
                            <div className={styles.menuItemLeft}>
                              <span className={styles.menuItemName}>{item.itemName}</span>
                              <span className={styles.menuItemDetail}>{item.baseUnit}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className={`${styles.menuBadge} ${styles.menuBadgeAC}`}>Ala Carte</span>
                              <div className={styles.acQtyRow}>
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  disabled={current === 0}
                                  onClick={() => handleUpdateAlaCarteItem(item.itemId, item.itemName, Math.max(0, current - 1))}
                                >
                                  <i className="ti ti-minus" />
                                </button>
                                <span className={styles.qtyValue}>{current}</span>
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  disabled={current >= 10}
                                  onClick={() => handleUpdateAlaCarteItem(item.itemId, item.itemName, Math.min(10, current + 1))}
                                >
                                  <i className="ti ti-plus" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            <div className={styles.fieldGroup} style={{ marginTop: 24 }}>
              <label className={styles.fieldLabel}>Dining Mode</label>
              <div className={styles.modeRow}>
                <button
                  className={`${styles.modeBtn} ${diningMode === 'dine_in' ? styles.modeBtnActive : ''}`}
                  onClick={() => setDiningMode('dine_in')}
                >
                  <i className="ti ti-building-store" /> Dine-in
                </button>
                <button
                  className={`${styles.modeBtn} ${diningMode === 'takeaway' ? styles.modeBtnActive : ''}`}
                  onClick={() => setDiningMode('takeaway')}
                >
                  <i className="ti ti-package" /> Takeaway
                </button>
              </div>
            </div>

            {submitError && <div className={styles.errorBanner}>{submitError}</div>}

            <div className={styles.stepActions}>
              <button className={styles.btnSecondary} onClick={() => setStep(2)}>Back</button>
              <button
                className={styles.btnPrimary}
                disabled={!hasAnySelection || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Booking…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Success ── */}
        {step === 4 && submitSuccess && (
          <div className={styles.successBody}>
            <div className={styles.successIcon}><i className="ti ti-circle-check" /></div>
            <h2 className={styles.successTitle}>Booking Confirmed</h2>
            <div className={styles.successDetails}>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Employee</span>
                <span className={styles.successValue}>{submitSuccess.employeeName}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Date</span>
                <span className={styles.successValue}>{formatDateLabel(submitSuccess.date)}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Meal</span>
                <span className={styles.successValue}>
                  {MEAL_TABS.find(m => m.key === submitSuccess.mealType)?.label}
                </span>
              </div>
              {submitSuccess.comboItem && (
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>Combo</span>
                  <span className={styles.successValue}>{submitSuccess.comboItem}</span>
                </div>
              )}
              {submitSuccess.alaCarteItems.length > 0 && (
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>Ala Carte</span>
                  <span className={styles.successValue}>
                    {submitSuccess.alaCarteItems.length} item{submitSuccess.alaCarteItems.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {submitSuccess.errors?.length > 0 && (
                <div className={styles.successRow}>
                  <span className={styles.successLabel} style={{ color: '#c0392b' }}>Partial</span>
                  <span className={styles.successValue} style={{ color: '#c0392b' }}>
                    {submitSuccess.errors.join(', ')}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.successActions}>
              <button className={styles.btnPrimary} onClick={resetAll}>
                Book Another
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
