// ─────────────────────────────────────────────────────────────────────────────
// WalkInPage.jsx — Feature B (Walk-in Booking)
// HomiLabs | Servio | Web
// Role: mess_supervisor
// Records walk-in: booking + issuance in one step. No cutoff check.
// Subject: employee self OR personal_guest (guest name entered free-text)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDailyMenu, createWalkInReservation, createAlaCarteBooking, getEmployees, getActiveMenuItems, createSpecialMealWalkIn, createOfficialGuestWalkIn } from '../../services/messService';
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
 
  // Employee search
  const [empSearch, setEmpSearch]       = useState('');
  const [empResults, setEmpResults]     = useState([]);
  const [empLoading, setEmpLoading]     = useState(false);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
 
  // Menu — combo selection (single select)
  const [menu, setMenu]               = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError]     = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
 
  // Ala carte selections — breakfast only
  // Map of { itemId: quantity }. quantity 0 = not selected.
  const [alaCarteSelections, setAlaCarteSelections] = useState({});
  const [alaCarteNames, setAlaCarteNames]           = useState({});

  // Special meal — lunch/dinner only, supervisor toggle
  const [isSpecialMeal, setIsSpecialMeal]             = useState(false);
  const [allMenuItems, setAllMenuItems]               = useState([]);
  const [menuItemsLoading, setMenuItemsLoading]       = useState(false);
  const [menuItemsLoaded, setMenuItemsLoaded]         = useState(false);
  const [specialSearch, setSpecialSearch]             = useState('');
  const [specialSelected, setSpecialSelected]         = useState([]); // [{ itemId, itemName, baseUnit, foodTypeCode, quantity }]
 
  // Derived
  const isBreakfast          = selectedMeal === 'breakfast';
  const isLunchOrDinner      = selectedMeal === 'lunch' || selectedMeal === 'dinner';
  const alaCarteItemCount    = Object.values(alaCarteSelections).filter(q => q > 0).length;
  const hasAlaCarteSelection = alaCarteItemCount > 0;
  const hasSpecialSelection  = specialSelected.length > 0;
  const hasAnySelection      = !!selectedItem || hasAlaCarteSelection || hasSpecialSelection;
 
  // Dining mode
  const [diningMode, setDiningMode] = useState('dine_in');

  // Subject tab — 'employee' | 'official_guest'
  const [subjectTab, setSubjectTab] = useState('employee');

  // Official guest fields
  const [guestName, setGuestName]                         = useState('');
  const [sponsoringEmpNumber, setSponsoringEmpNumber]     = useState('');
  const [sponsoringEmpError, setSponsoringEmpError]       = useState('');

  // Sponsoring employee search
  const [sponsorSearch, setSponsorSearch]         = useState('');
  const [sponsorResults, setSponsorResults]       = useState([]);
  const [sponsorLoading, setSponsorLoading]       = useState(false);
  const [sponsorSelected, setSponsorSelected]     = useState(null);
  const [showSponsorDrop, setShowSponsorDrop]     = useState(false);
  const sponsorRef = useRef(null);
 
  // Submit
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState('');
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

  useEffect(() => {
    function handle(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (sponsorRef.current && !sponsorRef.current.contains(e.target)) {
        setShowSponsorDrop(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Sponsor employee search effect
  useEffect(() => {
    if (sponsorSearch.length < 2) { setSponsorResults([]); return; }
    const timer = setTimeout(async () => {
      setSponsorLoading(true);
      try {
        const token = await getToken();
        const results = await getEmployees(sponsorSearch, token);
        setSponsorResults(results.slice(0, 10));
        setShowSponsorDrop(true);
      } catch {
        setSponsorResults([]);
      } finally {
        setSponsorLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sponsorSearch, getToken]);

  function selectSponsor(emp) {
    setSponsorSelected(emp);
    setSponsoringEmpNumber(emp.officialEmployeeNumber);
    setSponsorSearch(emp.fullName || emp.officialEmployeeNumber);
    setShowSponsorDrop(false);
    setSponsorResults([]);
    setSponsoringEmpError('');
  }

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

  // Reset special meal state when meal type changes
  useEffect(() => {
    setIsSpecialMeal(false);
    setSpecialSearch('');
    setSpecialSelected([]);
  }, [selectedMeal]);

  // Load full menu item catalogue when special meal toggle is turned on
  const [menuItemsError, setMenuItemsError] = useState('');

  useEffect(() => {
    if (!isSpecialMeal || menuItemsLoaded) return;
    async function loadItems() {
      setMenuItemsLoading(true);
      setMenuItemsError('');
      try {
        const token = await getToken();
        const items = await getActiveMenuItems(token);
        setAllMenuItems(items);
        setMenuItemsLoaded(true);
      } catch (e) {
        setMenuItemsError('Could not load catalogue. Please refresh and try again.');
        console.error('Failed to load menu items:', e.message);
      } finally {
        setMenuItemsLoading(false);
      }
    }
    loadItems();
  }, [isSpecialMeal, menuItemsLoaded, getToken]);

// ── Ala carte helpers ─────────────────────────────────────────────────────
 
  function handleUpdateAlaCarteItem(itemId, itemName, newQty) {
    setAlaCarteSelections(prev => ({ ...prev, [itemId]: newQty }));
    setAlaCarteNames(prev => ({ ...prev, [itemId]: itemName }));
  }

  // ── Special meal helpers ───────────────────────────────────────────────────

  // Filtered results from catalogue based on search text
  const specialSearchResults = specialSearch.length >= 1
    ? allMenuItems.filter(item =>
        item.itemName.toLowerCase().includes(specialSearch.toLowerCase()) &&
        !specialSelected.some(s => s.itemId === item.itemId)
      ).slice(0, 10)
    : [];

  function addSpecialItem(item) {
    setSpecialSelected(prev => [...prev, { ...item, quantity: 1 }]);
    setSpecialSearch('');
  }

  function removeSpecialItem(itemId) {
    setSpecialSelected(prev => prev.filter(s => s.itemId !== itemId));
  }

  function updateSpecialItemQty(itemId, newQty) {
    setSpecialSelected(prev =>
      prev.map(s => s.itemId === itemId ? { ...s, quantity: newQty } : s)
    );
  }
 
  // ── Validation ────────────────────────────────────────────────────────────
 
  function canSubmit() {
    if (subjectTab === 'employee') {
      if (!selectedEmp) return false;
      if (!hasAnySelection) return false;
    } else {
      // official_guest tab
      if (!guestName.trim()) return false;
      if (!sponsoringEmpNumber.trim()) return false;
      if (!hasAnySelection) return false;
    }
    return true;
  }
 
  // ── Submit ────────────────────────────────────────────────────────────────
 
  async function handleSubmit() {
    if (!canSubmit()) return;
    setSubmitting(true);
    setSubmitError('');
    setSponsoringEmpError('');

    const token = await getToken();

    // ── Official Guest path ──
    if (subjectTab === 'official_guest') {
      try {
        // Build comboItem if selected
        const comboPayload = selectedItem ? {
          menuItemId:    selectedItem.menuItemId,
          menuOptionKey: selectedItem.menuOptionKey,
          optionLabel:   selectedItem.optionLabel,
          itemName:      selectedItem.name,
          selectionMode: selectedItem.selectionMode,
        } : null;

        // Build items array — ala carte (BF) or special catalogue (lunch/dinner)
        let itemsPayload = [];
        if (hasAlaCarteSelection) {
          itemsPayload = Object.entries(alaCarteSelections)
            .filter(([, qty]) => qty > 0)
            .map(([itemId, qty]) => ({
              itemId,
              itemName: alaCarteNames[itemId] || itemId,
              quantity: qty,
            }));
        } else if (hasSpecialSelection) {
          itemsPayload = specialSelected;
        }

        const result = await createOfficialGuestWalkIn({
          guestName:               guestName.trim(),
          sponsoringEmployeeNumber: sponsoringEmpNumber.trim(),
          reservationDate:         selectedDate,
          mealType:                selectedMeal,
          diningMode,
          comboItem:               comboPayload,
          items:                   itemsPayload,
        }, token);

        setSubmitting(false);
        setSubmitSuccess({
          isOfficialGuest:  true,
          guestName:        guestName.trim(),
          sponsoringEmpNum: sponsoringEmpNumber.trim(),
          mealType:         selectedMeal,
          date:             selectedDate,
          itemCount:        result.itemCount,
          errors:           [],
        });
      } catch (e) {
        setSubmitting(false);
        if (e.message.includes('Sponsoring employee')) {
          setSponsoringEmpError(e.message);
        } else {
          setSubmitError(e.message);
        }
      }
      return;
    }

    // ── Employee path ──
    let comboResult = null;
    let alaCarteResult = null;
    let specialResult = null;
    const errors = [];

    // Submit combo walk-in if selected
    if (selectedItem) {
      try {
        comboResult = await createWalkInReservation({
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

    // Submit ala carte walk-in if any items selected (breakfast only)
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
          reservationDate:       selectedDate,
          diningMode,
          items,
          bookingSource:         'walk_in',
          targetEmployeeNumber:  selectedEmp.officialEmployeeNumber,
        }, token);
      } catch (e) {
        errors.push(`Ala Carte: ${e.message}`);
      }
    }

    // Submit special meal walk-in if items selected (lunch/dinner only)
    if (hasSpecialSelection) {
      try {
        specialResult = await createSpecialMealWalkIn({
          targetEmployeeNumber: selectedEmp.officialEmployeeNumber,
          reservationDate:      selectedDate,
          mealType:             selectedMeal,
          diningMode,
          items:                specialSelected,
        }, token);
      } catch (e) {
        errors.push(`Special Meal: ${e.message}`);
      }
    }

    setSubmitting(false);

    if (errors.length > 0 && !comboResult && !alaCarteResult && !specialResult) {
      setSubmitError(errors.join(' | '));
      return;
    }

    setSubmitSuccess({
      isOfficialGuest:  false,
      employeeName:     selectedEmp.fullName || selectedEmp.officialEmployeeNumber,
      mealType:         selectedMeal,
      date:             selectedDate,
      comboItem:        selectedItem?.name || null,
      alaCarteItems:    alaCarteResult?.reservations || [],
      specialItems:     specialResult?.reservations || [],
      errors,
    });
  }
 
  function resetAll() {
    setSelectedDate(todayPkt());
    setSelectedMeal(defaultMeal());
    setSubjectTab('employee');
    setSelectedEmp(null);
    setEmpSearch('');
    setSelectedItem(null);
    setAlaCarteSelections({});
    setAlaCarteNames({});
    setIsSpecialMeal(false);
    setSpecialSearch('');
    setSpecialSelected([]);
    setGuestName('');
    setSponsoringEmpNumber('');
    setSponsoringEmpError('');
    setSponsorSearch('');
    setSponsorSelected(null);
    setSponsorResults([]);
    setShowSponsorDrop(false);
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
              {submitSuccess.isOfficialGuest ? (
                <>
                  <div className={styles.successRow}>
                    <span className={styles.successLabel}>Guest</span>
                    <span className={styles.successValue}>{submitSuccess.guestName}</span>
                  </div>
                  <div className={styles.successRow}>
                    <span className={styles.successLabel}>Sponsored by</span>
                    <span className={styles.successValue}>{submitSuccess.sponsoringEmpNum}</span>
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
                  <div className={styles.successRow}>
                    <span className={styles.successLabel}>Items</span>
                    <span className={styles.successValue}>{submitSuccess.itemCount}</span>
                  </div>
                  <div className={styles.successRow}>
                    <span className={styles.successLabel}>Billing</span>
                    <span className={`${styles.successValue} ${styles.successPending}`}>
                      Pending admin approval
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                  {submitSuccess.specialItems?.length > 0 && (
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>Special Meal</span>
                      <span className={styles.successValue}>
                        {submitSuccess.specialItems.length} item{submitSuccess.specialItems.length > 1 ? 's' : ''}
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
                </>
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

          {/* Subject tab — Employee / Official Guest */}
          <div className={styles.fieldGroup}>
            <div className={styles.subjectTabRow}>
              <button
                className={`${styles.subjectTab} ${subjectTab === 'employee' ? styles.subjectTabActive : ''}`}
                onClick={() => {
                  setSubjectTab('employee');
                  setGuestName('');
                  setSponsoringEmpNumber('');
                  setSponsoringEmpError('');
                }}
              >
                <i className="ti ti-user" /> Employee
              </button>
              <button
                className={`${styles.subjectTab} ${subjectTab === 'official_guest' ? styles.subjectTabActive : ''}`}
                onClick={() => {
                  setSubjectTab('official_guest');
                  setSelectedEmp(null);
                  setEmpSearch('');
                  setSponsorSearch('');
                  setSponsorSelected(null);
                  setSponsoringEmpNumber('');
                  setSponsorResults([]);
                }}
              >
                <i className="ti ti-briefcase" /> Official Guest
              </button>
            </div>
          </div>

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

          {/* Employee search — employee tab only */}
          {subjectTab === 'employee' && (
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

          {/* Official Guest fields — official_guest tab only */}
          {subjectTab === 'official_guest' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Guest Name</label>
            <input
              type="text"
              className={styles.ogTextField}
              placeholder="Full name of guest…"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
            />
            <label className={styles.fieldLabel} style={{ marginTop: 12 }}>
              Sponsoring Employee
            </label>
            <div className={styles.searchWrap} ref={sponsorRef}>
              <div className={`${styles.searchBox} ${sponsoringEmpError ? styles.ogTextFieldError : ''}`}>
                <i className="ti ti-search" />
                <input
                  type="text"
                  placeholder="Name or employee number…"
                  value={sponsorSearch}
                  onChange={e => {
                    setSponsorSearch(e.target.value);
                    setSponsorSelected(null);
                    setSponsoringEmpNumber('');
                    setSponsoringEmpError('');
                  }}
                  onFocus={() => sponsorResults.length > 0 && setShowSponsorDrop(true)}
                />
                {sponsorLoading && <div className={styles.spinnerSm} />}
                {sponsorSearch && !sponsorLoading && (
                  <button className={styles.clearBtn} onClick={() => {
                    setSponsorSearch('');
                    setSponsorSelected(null);
                    setSponsoringEmpNumber('');
                    setSponsorResults([]);
                  }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
              {showSponsorDrop && sponsorResults.length > 0 && (
                <div className={styles.dropdown}>
                  {sponsorResults.map(emp => (
                    <button
                      key={emp.officialEmployeeNumber}
                      className={styles.dropdownItem}
                      onClick={() => selectSponsor(emp)}
                    >
                      <span className={styles.empName}>{emp.fullName}</span>
                      <span className={styles.empNum}>{emp.officialEmployeeNumber}</span>
                    </button>
                  ))}
                </div>
              )}
              {showSponsorDrop && sponsorSearch.length >= 2 && !sponsorLoading && sponsorResults.length === 0 && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownEmpty}>No employees found</div>
                </div>
              )}
            </div>
            {sponsorSelected && (
              <div className={styles.selectedEmpCard}>
                <div className={styles.selectedEmpAvatar}>
                  {(sponsorSelected.fullName || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className={styles.selectedEmpName}>{sponsorSelected.fullName}</div>
                  <div className={styles.selectedEmpMeta}>
                    {sponsorSelected.officialEmployeeNumber}
                    {sponsorSelected.designation ? ` · ${sponsorSelected.designation}` : ''}
                  </div>
                </div>
              </div>
            )}
            {sponsoringEmpError && (
              <div className={styles.ogFieldError}>{sponsoringEmpError}</div>
            )}
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
          </div>

          {/* Special Meal toggle — lunch/dinner only */}
          {isLunchOrDinner && (
            <div className={styles.fieldGroup}>
              <div className={styles.specialToggleRow}>
                <label className={styles.specialToggleLabel}>
                  <input
                    type="checkbox"
                    checked={isSpecialMeal}
                    onChange={e => {
                      setIsSpecialMeal(e.target.checked);
                      if (!e.target.checked) {
                        setSpecialSearch('');
                        setSpecialSelected([]);
                      }
                    }}
                    className={styles.specialToggleCheckbox}
                  />
                  <span className={styles.specialToggleText}>
                    <strong>Special Meal</strong>
                    <span className={styles.specialToggleHint}>
                      Tick if employee has a requirement not covered by today's menu
                    </span>
                  </span>
                </label>
              </div>

              {isSpecialMeal && (
                <div className={styles.specialSection}>
                  <div className={styles.menuSectionLabel}>
                    <i className="ti ti-tool-kitchen-2" /> Select Items from Catalogue
                  </div>

                  {menuItemsLoading && (
                    <div className={styles.menuLoading}>
                      <div className={styles.spinnerSm} />
                      <span>Loading catalogue…</span>
                    </div>
                  )}

                  {!menuItemsLoading && menuItemsError && (
                    <div className={styles.errorBanner}>{menuItemsError}</div>
                  )}

                  {!menuItemsLoading && menuItemsLoaded && !menuItemsError && (
                    <div className={styles.ogFieldHint}>
                      Type an item name to search the catalogue.
                    </div>
                  )}

                  {!menuItemsLoading && menuItemsLoaded && (
                    <>
                      <div className={styles.specialSearchWrap}>
                        <i className="ti ti-search" />
                        <input
                          type="text"
                          className={styles.specialSearchInput}
                          placeholder="Type item name to search…"
                          value={specialSearch}
                          onChange={e => setSpecialSearch(e.target.value)}
                        />
                        {specialSearch && (
                          <button className={styles.clearBtn} onClick={() => setSpecialSearch('')}>
                            <i className="ti ti-x" />
                          </button>
                        )}
                      </div>

                      {specialSearchResults.length > 0 && (
                        <div className={styles.specialDropdown}>
                          {specialSearchResults.map(item => (
                            <button
                              key={item.itemId}
                              className={styles.specialDropdownItem}
                              onClick={() => addSpecialItem(item)}
                            >
                              <span className={styles.specialDropdownName}>{item.itemName}</span>
                              <span className={styles.specialDropdownUnit}>{item.baseUnit}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {specialSelected.length > 0 && (
                        <div className={styles.specialSelectedList}>
                          {specialSelected.map(item => (
                            <div key={item.itemId} className={styles.specialSelectedItem}>
                              <div className={styles.specialSelectedLeft}>
                                <span className={styles.specialSelectedName}>{item.itemName}</span>
                                <span className={styles.specialSelectedUnit}>{item.baseUnit}</span>
                              </div>
                              <div className={styles.specialSelectedRight}>
                                <div className={styles.acQtyRow}>
                                  <button
                                    type="button"
                                    className={styles.qtyBtn}
                                    disabled={item.quantity <= 1}
                                    onClick={() => updateSpecialItemQty(item.itemId, item.quantity - 1)}
                                  >
                                    <i className="ti ti-minus" />
                                  </button>
                                  <span className={styles.qtyValue}>{item.quantity}</span>
                                  <button
                                    type="button"
                                    className={styles.qtyBtn}
                                    disabled={item.quantity >= 10}
                                    onClick={() => updateSpecialItemQty(item.itemId, item.quantity + 1)}
                                  >
                                    <i className="ti ti-plus" />
                                  </button>
                                </div>
                                <button
                                  className={styles.specialRemoveBtn}
                                  onClick={() => removeSpecialItem(item.itemId)}
                                >
                                  <i className="ti ti-trash" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

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
