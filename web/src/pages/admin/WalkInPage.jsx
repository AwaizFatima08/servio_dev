// ─────────────────────────────────────────────────────────────────────────────
// WalkInPage.jsx — Feature B (Walk-in Booking)
// HomiLabs | Servio | Web
// Role: mess_supervisor
// Records walk-in: booking + issuance in one step. No cutoff check.
// Subject: employee self OR personal_guest (guest name entered free-text)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDailyMenu, createReservation, getEmployees } from '../../services/messService';
import styles from './WalkInPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pktDateStr(date) {
  const pkt = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const y = pkt.getFullYear();
  const m = String(pkt.getMonth() + 1).padStart(2, '0');
  const d = String(pkt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayPkt() {
  return pktDateStr(new Date());
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
  if (dateStr === todayPkt()) return 'Today';
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function defaultMeal() {
  const h = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
  ).getHours();
  if (h < 10) return 'breakfast';
  if (h < 16) return 'lunch';
  return 'dinner';
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WalkInPage() {
  const { getToken } = useAuth();

  // Date + meal (default today + current meal)
  const [selectedDate, setSelectedDate] = useState(todayPkt());
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal());

  // Subject type toggle
  const [subjectType, setSubjectType] = useState('self'); // 'self' | 'personal_guest'

  // Employee search (for self)
  const [empSearch, setEmpSearch]       = useState('');
  const [empResults, setEmpResults]     = useState([]);
  const [empLoading, setEmpLoading]     = useState(false);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Guest name (for personal_guest)
  const [guestName, setGuestName] = useState('');

  // Menu
  const [menu, setMenu]               = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError]     = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Dining mode
  const [diningMode, setDiningMode] = useState('dine_in');

  // Submit
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // ── Employee search ───────────────────────────────────────────────────────

  useEffect(() => {
    if (subjectType !== 'self') return;
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
  }, [empSearch, getToken, subjectType]);

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

  // ── Load menu ─────────────────────────────────────────────────────────────

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

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // ── Subject type switch ───────────────────────────────────────────────────

  function switchSubject(type) {
    setSubjectType(type);
    setSelectedEmp(null);
    setEmpSearch('');
    setGuestName('');
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function canSubmit() {
    if (!selectedItem) return false;
    if (subjectType === 'self' && !selectedEmp) return false;
    if (subjectType === 'personal_guest' && !guestName.trim()) return false;
    return true;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canSubmit()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const token = await getToken();

      const payload = {
        reservationDate:  selectedDate,
        mealType:         selectedMeal,
        menuItemId:       selectedItem.menuItemId,
        menuOptionKey:    selectedItem.menuOptionKey,
        optionLabel:      selectedItem.optionLabel,
        itemName:         selectedItem.name,
        selectionMode:    selectedItem.selectionMode,
        diningMode,
        subjectType,
        quantity:         1,
        bookingSource:    'walk_in',
        issueStatus:      'issued',
        cutoffWaived:     true,
        ...(subjectType === 'self'
          ? { targetEmployeeNumber: selectedEmp.officialEmployeeNumber }
          : { guestName: guestName.trim() }
        ),
      };

      const result = await createReservation(payload, token);

      setSubmitSuccess({
        subjectType,
        name:         subjectType === 'self'
          ? (selectedEmp.fullName || selectedEmp.officialEmployeeNumber)
          : guestName.trim(),
        mealType:     selectedMeal,
        date:         selectedDate,
        item:         selectedItem.name,
        reservationId: result?.reservationId,
      });
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setSelectedDate(todayPkt());
    setSelectedMeal(defaultMeal());
    setSubjectType('self');
    setSelectedEmp(null);
    setEmpSearch('');
    setGuestName('');
    setSelectedItem(null);
    setDiningMode('dine_in');
    setSubmitSuccess(null);
    setSubmitError('');
  }

  // ── Build items from menu ─────────────────────────────────────────────────

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

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Walk-in</h1>
            <p className={styles.subtitle}>Booking recorded and issued immediately.</p>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.successBody}>
            <div className={styles.successIcon}><i className="ti ti-circle-check" /></div>
            <h2 className={styles.successTitle}>Walk-in Issued</h2>
            <p className={styles.successNote}>Booking created and marked as issued in one step.</p>
            <div className={styles.successDetails}>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>
                  {submitSuccess.subjectType === 'self' ? 'Employee' : 'Guest'}
                </span>
                <span className={styles.successValue}>{submitSuccess.name}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Date</span>
                <span className={styles.successValue}>{formatDateLabel(submitSuccess.date)}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Meal</span>
                <span className={styles.successValue}>{MEAL_TABS.find(m => m.key === submitSuccess.mealType)?.label}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Item</span>
                <span className={styles.successValue}>{submitSuccess.item}</span>
              </div>
              {submitSuccess.reservationId && (
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>Ref</span>
                  <span className={styles.successId}>{submitSuccess.reservationId.slice(-8).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className={styles.successActions}>
              <button className={styles.btnPrimary} onClick={resetAll}>
                Record Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Walk-in</h1>
          <p className={styles.subtitle}>Record a walk-in. Booking and issuance happen in one step.</p>
        </div>
        <div className={styles.issuedBadge}>
          <i className="ti ti-bolt" /> Issued immediately
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.formBody}>

          {/* Date */}
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

          {/* Meal */}
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

          {/* Subject */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>For</label>
            <div className={styles.subjectToggle}>
              <button
                className={`${styles.subjectBtn} ${subjectType === 'self' ? styles.subjectBtnActive : ''}`}
                onClick={() => switchSubject('self')}
              >
                <i className="ti ti-user" /> Employee
              </button>
              <button
                className={`${styles.subjectBtn} ${subjectType === 'personal_guest' ? styles.subjectBtnActive : ''}`}
                onClick={() => switchSubject('personal_guest')}
              >
                <i className="ti ti-user-plus" /> Guest
              </button>
            </div>
          </div>

          {/* Employee search */}
          {subjectType === 'self' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Employee</label>
              <div className={styles.searchWrap} ref={searchRef}>
                <div className={styles.searchBox}>
                  <i className="ti ti-search" />
                  <input
                    type="text"
                    placeholder="Name or employee number…"
                    value={empSearch}
                    onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }}
                    onFocus={() => empResults.length > 0 && setShowDropdown(true)}
                  />
                  {empLoading && <div className={styles.spinnerSm} />}
                  {empSearch && !empLoading && (
                    <button className={styles.clearBtn}
                      onClick={() => { setEmpSearch(''); setSelectedEmp(null); setEmpResults([]); }}>
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
                    <div className={styles.selectedEmpMeta}>
                      {selectedEmp.officialEmployeeNumber}
                      {selectedEmp.designation ? ` · ${selectedEmp.designation}` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guest name */}
          {subjectType === 'personal_guest' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Guest Name</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Enter guest's full name…"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Menu */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Menu Item</label>

            {menuLoading && (
              <div className={styles.menuLoading}>
                <div className={styles.spinner} />
                <span>Loading menu…</span>
              </div>
            )}

            {!menuLoading && menuError === 'not_generated' && (
              <div className={styles.menuNotReady}>
                <i className="ti ti-clock-hour-4" />
                Menu not generated yet for this date.
              </div>
            )}

            {!menuLoading && menuError && menuError !== 'not_generated' && (
              <div className={styles.errorBanner}>{menuError}</div>
            )}

            {!menuLoading && !menuError && menu && (
              <div className={styles.menuList}>
                {buildItems(menu).map(item => (
                  <button
                    key={item.id}
                    className={`${styles.menuItem} ${selectedItem?.id === item.id ? styles.menuItemActive : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className={styles.menuItemLeft}>
                      <span className={styles.menuItemName}>{item.name}</span>
                      {item.detail && <span className={styles.menuItemDetail}>{item.detail}</span>}
                    </div>
                    <span className={styles.menuBadge}>{item.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dining mode */}
          <div className={styles.fieldGroup}>
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

          {/* Submit */}
          <div className={styles.submitRow}>
            <button
              className={styles.btnSubmit}
              disabled={!canSubmit() || submitting}
              onClick={handleSubmit}
            >
              {submitting
                ? 'Recording…'
                : <><i className="ti ti-bolt" /> Record Walk-in & Issue</>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
