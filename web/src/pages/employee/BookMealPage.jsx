// ─────────────────────────────────────────
// BookMealPage.jsx — Book a Meal (v4)
// Added: cancel existing booking inline on duplicate error
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getDailyMenu,
  getReservationsForDate,
  createReservation,
  createWeeklyReservations,
  cancelReservation,
  getBookableWeek,
} from '../../services/messService';
import styles from './BookMealPage.module.css';

const MEAL_TYPES = [
  { code: 'breakfast', label: 'Breakfast', time: '06:00–09:00', icon: 'ti-sunrise' },
  { code: 'lunch',     label: 'Lunch',     time: '13:00–15:00', icon: 'ti-sun'     },
  { code: 'dinner',    label: 'Dinner',    time: '19:00–22:00', icon: 'ti-moon'    },
];

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0];
}

function DatePicker({ dates, selected, onSelect }) {
  return (
    <div className={styles.datePicker}>
      {dates.map(dateStr => {
        const d = new Date(dateStr + 'T00:00:00');
        const today = isToday(dateStr);
        const sel = selected === dateStr;
        return (
          <button key={dateStr} className={`${styles.dateCell} ${sel ? styles.dateCellSelected : ''} ${today ? styles.dateCellToday : ''}`} onClick={() => onSelect(dateStr)}>
            <span className={styles.dateDayName}>{DAY_NAMES[d.getDay()]}</span>
            <span className={styles.dateDayNum}>{d.getDate()}</span>
            <span className={styles.dateMonth}>{MONTH_NAMES[d.getMonth()]}</span>
            {today && <span className={styles.todayDot} />}
          </button>
        );
      })}
    </div>
  );
}

function MenuPicker({ menu, menuLoading, menuError, selected, onSelect }) {
  if (menuLoading) return <div className={styles.menuLoadingRow}><div className={styles.spinner} /><span>Loading menu&#8266;</span></div>;
  if (menuError) {
    if (menuError === 'not_generated') return <div className={styles.menuNotReady}><i className="ti ti-clock-hour-4" style={{ fontSize: 18, color: '#D4960A' }} />Menu not available yet for this date</div>;
    return <div className={styles.menuNotReady} style={{ color: '#c0392b' }}><i className="ti ti-alert-circle" />{menuError}</div>;
  }
  if (!menu) return null;

  const allItems = [
    ...(menu.combos || []).map((c, i) => ({
      id: `combo_${i + 1}`, name: c.comboName || c.displayLabel,
      detail: c.constituents?.map(x => x.itemName).join(' · '),
      badge: `Combo ${i + 1}`, type: 'combo', menuItemId: c.comboId,
      menuOptionKey: `combo_${i + 1}`, optionLabel: c.displayLabel || `Combo ${i + 1}`, selectionMode: 'combo',
    })),
    // Ala carte removed: employees book combos only (decision locked 1 Jun 2026)
  ];

  if (!allItems.length) return <div className={styles.menuNotReady}><i className="ti ti-mood-empty" />No menu items for this meal</div>;

  return (
    <div className={styles.menuList}>
      {allItems.map(item => {
        const isSel = selected?.menuOptionKey === item.menuOptionKey && selected?.menuItemId === item.menuItemId;
        return (
          <button key={item.id} className={`${styles.menuRow} ${isSel ? styles.menuRowSelected : ''}`}
            onClick={() => onSelect({ menuItemId: item.menuItemId, menuOptionKey: item.menuOptionKey, optionLabel: item.optionLabel, itemName: item.name, selectionMode: item.selectionMode })}>
            <div className={styles.menuRowLeft}>
              <span className={styles.menuRowName}>{item.name}</span>
              {item.detail && <span className={styles.menuRowDetail}>{item.detail}</span>}
            </div>
            <div className={styles.menuRowRight}>
              <span className={`${styles.menuBadge} ${item.type === 'alacarte' ? styles.menuBadgeAC : ''}`}>{item.badge}</span>
              {isSel && <i className="ti ti-check" style={{ color: '#0F6E56', fontSize: 16 }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function QuantitySelector({ value, onChange }) {
  return (
    <div className={styles.qtyWrap}>
      <span className={styles.qtyLabel}>Quantity<span className={styles.qtyHint}>(e.g. takeaway for family)</span></span>
      <div className={styles.qtyControl}>
        <button className={styles.qtyBtn} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} type="button"><i className="ti ti-minus" /></button>
        <span className={styles.qtyValue}>{value}</span>
        <button className={styles.qtyBtn} onClick={() => onChange(Math.min(10, value + 1))} disabled={value >= 10} type="button"><i className="ti ti-plus" /></button>
      </div>
    </div>
  );
}

function SingleBookingFlow({ bookableWeek, onSwitchToWeekly }) {
  const { getToken } = useAuth();
  const [step, setStep]                         = useState(1);
  const [selectedDate, setSelectedDate]         = useState(bookableWeek[0]);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [menu, setMenu]                         = useState(null);
  const [menuLoading, setMenuLoading]           = useState(false);
  const [menuError, setMenuError]               = useState(null);
  const [selectedItem, setSelectedItem]         = useState(null);
  const [diningMode, setDiningMode]             = useState(null);
  const [quantity, setQuantity]                 = useState(1);
  const [submitting, setSubmitting]             = useState(false);
  const [submitError, setSubmitError]           = useState(null);
  const [existingReservationId, setExistingReservationId] = useState(null);
  const [cancelling, setCancelling]             = useState(false);

  useEffect(() => {
    if (!selectedMealType || step !== 3) return;
    setMenuLoading(true); setMenuError(null); setMenu(null);
    getToken().then(token =>
      getDailyMenu(selectedDate, selectedMealType, token)
        .then(data => { if (data === null) setMenuError('not_generated'); else setMenu(data); })
        .catch(err => setMenuError(err.message))
        .finally(() => setMenuLoading(false))
    );
  }, [selectedMealType, selectedDate, step, getToken]);

  const handleDateSelect = (date) => {
    setSelectedDate(date); setSelectedMealType(null); setMenu(null);
    setSelectedItem(null); setDiningMode(null); setQuantity(1);
    setSubmitError(null); setExistingReservationId(null);
  };

  const buildPayload = () => ({
    reservationDate: selectedDate, mealType: selectedMealType,
    menuItemId: selectedItem.menuItemId, menuOptionKey: selectedItem.menuOptionKey,
    optionLabel: selectedItem.optionLabel, itemName: selectedItem.itemName,
    selectionMode: selectedItem.selectionMode, diningMode, subjectType: 'self', quantity,
  });

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError(null); setExistingReservationId(null);
    try {
      const token = await getToken();
      await createReservation(buildPayload(), token);
      setStep(5);
    } catch (err) {
      setSubmitError(err.message);
      if (err.existingReservationId) setExistingReservationId(err.existingReservationId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExisting = async () => {
    if (!existingReservationId) return;
    setCancelling(true); setSubmitError(null);
    try {
      const token = await getToken();
      await cancelReservation(existingReservationId, 'employee_request', token);
      setExistingReservationId(null);
      setSubmitting(true);
      try {
        await createReservation(buildPayload(), token);
        setStep(5);
      } catch (err2) {
        setSubmitError(err2.message);
        if (err2.existingReservationId) setExistingReservationId(err2.existingReservationId);
      } finally {
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const STEPS = ['Date', 'Meal', 'Menu', 'Mode', 'Done'];

  return (
    <div className={styles.flowWrap}>
      {step < 5 && (
        <div className={styles.stepBar}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <div key={label} className={styles.stepBarItem}>
                <div className={`${styles.stepBarDot} ${step > n ? styles.dotDone : ''} ${step === n ? styles.dotActive : ''}`}>
                  {step > n ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : n}
                </div>
                <span className={`${styles.stepBarLabel} ${step === n ? styles.stepBarLabelActive : ''}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`${styles.stepBarLine} ${step > n ? styles.lineDone : ''}`} />}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.card}>
        {step === 1 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}><h2 className={styles.stepTitle}>Which day?</h2><p className={styles.stepSub}>Choose a date within the 7-day booking window.</p></div>
            <DatePicker dates={bookableWeek} selected={selectedDate} onSelect={handleDateSelect} />
            <div className={styles.stepActions}>
              <button className={styles.weeklyModeLink} onClick={onSwitchToWeekly}><i className="ti ti-calendar-week" /> Switch to Weekly Booking</button>
              <button className={styles.continueBtn} onClick={() => setStep(2)}>Continue <i className="ti ti-arrow-right" /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}><h2 className={styles.stepTitle}>{formatDateDisplay(selectedDate)} — Which meal?</h2><p className={styles.stepSub}>Select the meal you want to book.</p></div>
            <div className={styles.mealGrid}>
              {MEAL_TYPES.map(meal => (
                <button key={meal.code} className={styles.mealCard} onClick={() => { setSelectedMealType(meal.code); setStep(3); }}>
                  <i className={`ti ${meal.icon} ${styles.mealIcon}`} />
                  <div className={styles.mealCardBody}><span className={styles.mealLabel}>{meal.label}</span><span className={styles.mealTime}>{meal.time}</span></div>
                </button>
              ))}
            </div>
            <div className={styles.stepActions}><button className={styles.backBtn} onClick={() => setStep(1)}><i className="ti ti-arrow-left" /> Back</button></div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>{MEAL_TYPES.find(m => m.code === selectedMealType)?.label} — Choose item</h2>
              <p className={styles.stepSub}>{formatDateDisplay(selectedDate)}</p>
            </div>
            <MenuPicker menu={menu} menuLoading={menuLoading} menuError={menuError} selected={selectedItem} onSelect={setSelectedItem} />
            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => { setStep(2); setSelectedItem(null); }}><i className="ti ti-arrow-left" /> Back</button>
              <button className={styles.continueBtn} disabled={!selectedItem || menuError === 'not_generated'} onClick={() => setStep(4)}>Continue <i className="ti ti-arrow-right" /></button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>How will you dine?</h2>
              <p className={styles.stepSub}>{formatDateDisplay(selectedDate)} · {MEAL_TYPES.find(m => m.code === selectedMealType)?.label} · <strong>{selectedItem?.itemName}</strong></p>
            </div>
            <div className={styles.diningGrid}>
              {[
                { code: 'dine_in',  label: 'Dine In',   note: 'Eat at the mess',  icon: 'ti-armchair'     },
                { code: 'takeaway', label: 'Takeaway',  note: 'Take it with you', icon: 'ti-shopping-bag' },
              ].map(opt => (
                <button key={opt.code} className={`${styles.diningCard} ${diningMode === opt.code ? styles.diningSelected : ''}`} onClick={() => setDiningMode(opt.code)}>
                  <i className={`ti ${opt.icon}`} style={{ fontSize: 32, color: diningMode === opt.code ? '#0F6E56' : '#bbb' }} />
                  <span className={styles.diningLabel}>{opt.label}</span>
                  <span className={styles.diningNote}>{opt.note}</span>
                </button>
              ))}
            </div>
            <QuantitySelector value={quantity} onChange={setQuantity} />
            {submitError && (
              <div className={styles.errorBox}>
                <i className="ti ti-alert-circle" /> {submitError}
                {existingReservationId && (
                  <button className={styles.cancelExistingBtn} onClick={handleCancelExisting} disabled={cancelling || submitting}>
                    {cancelling ? 'Cancelling…' : 'Cancel existing & book this instead'}
                  </button>
                )}
              </div>
            )}
            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => { setStep(3); setDiningMode(null); setSubmitError(null); setExistingReservationId(null); }} disabled={submitting || cancelling}>
                <i className="ti ti-arrow-left" /> Back
              </button>
              <button className={styles.confirmBtn} disabled={!diningMode || submitting || cancelling} onClick={handleSubmit}>
                {submitting ? <><div className={styles.spinnerSmall} /> Confirming&#8262;</> : <><i className="ti ti-check" /> Confirm Booking</>}
              </button>
            </div>
          </div>
        )}

        {step === 5 && <SingleSuccess date={selectedDate} mealType={selectedMealType} item={selectedItem} diningMode={diningMode} quantity={quantity} />}
      </div>
    </div>
  );
}

function SingleSuccess({ date, mealType, item, diningMode, quantity }) {
  const navigate = useNavigate();
  const mealLabel = MEAL_TYPES.find(m => m.code === mealType)?.label || '';
  return (
    <div className={styles.stepPane}>
      <div className={styles.successBox}>
        <div className={styles.successIcon}><i className="ti ti-circle-check" /></div>
        <h2 className={styles.successTitle}>Booking Confirmed</h2>
        <p className={styles.successIntro}>Your reservation has been saved.</p>
        <div className={styles.summaryCard}>
          {[
            { label: 'Date', value: formatDateDisplay(date) },
            { label: 'Meal', value: mealLabel },
            { label: 'Item', value: item?.itemName },
            { label: 'Mode', value: diningMode === 'dine_in' ? 'Dine In' : 'Takeaway' },
            { label: 'Quantity', value: quantity },
          ].map(({ label, value }) => (
            <div key={label} className={styles.summaryRow}>
              <span className={styles.summaryKey}>{label}</span>
              <span className={styles.summaryVal}>{value}</span>
            </div>
          ))}
        </div>
        <p className={styles.billingNote}><i className="ti ti-info-circle" style={{ color: '#D4960A' }} />Rate applied next day. Billed monthly to your account.</p>
        <button className={styles.doneBtn} onClick={() => navigate('/dashboard')}>Back to Home</button>
      </div>
    </div>
  );
}

function WeekSlot({ date, meal, slot, onToggle, onItemSelect, onDiningSelect }) {
  const [menuData, setMenuData] = useState(null);
  const [menuState, setMenuState] = useState('idle');
  const { getToken } = useAuth();

  useEffect(() => {
    if (slot.status !== 'selected' || menuData) return;
    setMenuState('loading');
    getToken().then(token =>
      getDailyMenu(date, meal.code, token)
        .then(data => { if (data === null) setMenuState('unavailable'); else { setMenuData(data); setMenuState('ready'); } })
        .catch(() => setMenuState('error'))
    );
  }, [slot.status, date, meal.code, getToken, menuData]);

  const isBooked = slot.status === 'booked';
  const isSelected = slot.status === 'selected';
  const hasItem = !!slot.item;

  return (
    <div className={`${styles.weekSlot} ${isSelected ? styles.weekSlotSelected : ''} ${isBooked ? styles.weekSlotBooked : ''}`}>
      <div className={styles.weekSlotHeader} onClick={() => !isBooked && onToggle()}>
        <i className={`ti ${meal.icon}`} style={{ fontSize: 14, color: isSelected ? '#0F6E56' : '#bbb' }} />
        <span className={styles.weekSlotLabel}>{meal.label}</span>
        {isBooked && <span className={styles.weekSlotBadge}>Booked</span>}
        {isSelected && !isBooked && <div className={`${styles.weekCheckbox} ${hasItem ? styles.weekCheckboxDone : ''}`}>{hasItem ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : ''}</div>}
        {!isSelected && !isBooked && <div className={styles.weekCheckboxEmpty} />}
      </div>
      {isSelected && (
        <div className={styles.weekSlotBody}>
          {menuState === 'loading'     && <div className={styles.menuLoadingRow}><div className={styles.spinnerTiny} /> Loading…</div>}
          {menuState === 'unavailable' && <div className={styles.slotUnavailable}><i className="ti ti-clock-hour-4" /> Menu not ready yet</div>}
          {menuState === 'error'       && <div className={styles.slotUnavailable}>Error loading menu</div>}
          {menuState === 'ready' && menuData && (
            <>
              <MenuPicker menu={menuData} menuLoading={false} menuError={null} selected={slot.item} onSelect={onItemSelect} />
              <div className={styles.slotDiningRow}>
                {[{ code: 'dine_in', label: 'Dine In' }, { code: 'takeaway', label: 'Takeaway' }].map(opt => (
                  <button key={opt.code} className={`${styles.slotDiningBtn} ${slot.diningMode === opt.code ? styles.slotDiningBtnActive : ''}`} onClick={() => onDiningSelect(opt.code)}>{opt.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklyBookingFlow({ bookableWeek, onSwitchToSingle }) {
  const { getToken } = useAuth();
  const [submitting, setSubmitting]       = useState(false);
  const [result, setResult]               = useState(null);
  const [defaultDining, setDefaultDining] = useState('dine_in');

  const initSlots = () => {
    const s = {};
    for (const date of bookableWeek) { s[date] = {}; for (const meal of MEAL_TYPES) s[date][meal.code] = { status: 'idle', item: null, diningMode: 'dine_in' }; }
    return s;
  };
  const [slots, setSlots] = useState(initSlots);

  const toggleSlot    = (date, mealCode) => setSlots(prev => { const cur = prev[date][mealCode]; if (cur.status === 'booked') return prev; return { ...prev, [date]: { ...prev[date], [mealCode]: { ...cur, status: cur.status === 'selected' ? 'idle' : 'selected', diningMode: defaultDining } } }; });
  const setSlotItem   = (date, mealCode, item) => setSlots(prev => ({ ...prev, [date]: { ...prev[date], [mealCode]: { ...prev[date][mealCode], item } } }));
  const setSlotDining = (date, mealCode, mode) => setSlots(prev => ({ ...prev, [date]: { ...prev[date], [mealCode]: { ...prev[date][mealCode], diningMode: mode } } }));

  const readySlots = []; const selectedCount = { total: 0, ready: 0 };
  for (const date of bookableWeek) { for (const meal of MEAL_TYPES) { const s = slots[date][meal.code]; if (s.status === 'selected') { selectedCount.total++; if (s.item) { selectedCount.ready++; readySlots.push({ reservationDate: date, mealType: meal.code, ...s.item, diningMode: s.diningMode, quantity: 1 }); } } } }

  const handleSubmitWeekly = async () => {
    if (!readySlots.length) return;
    setSubmitting(true);
    try { const token = await getToken(); const res = await createWeeklyReservations(readySlots, token); setResult(res); }
    catch (err) { setResult({ succeeded: [], failed: readySlots.map(s => ({ ...s, error: err.message })) }); }
    finally { setSubmitting(false); }
  };

  if (result) return <WeeklyResult result={result} />;

  return (
    <div className={styles.flowWrap}>
      <div className={styles.weeklyHeader}>
        <div><h2 className={styles.weeklyTitle}>Weekly Booking</h2><p className={styles.weeklySub}>Tick the meals you want. Pick your item for each. Submit all at once.</p></div>
        <button className={styles.singleModeLink} onClick={onSwitchToSingle}>Single booking instead</button>
      </div>
      <div className={styles.defaultDiningBar}>
        <span className={styles.defaultDiningLabel}>Default dining mode for all meals:</span>
        <div className={styles.defaultDiningToggle}>
          {[{ code: 'dine_in', label: 'Dine In' }, { code: 'takeaway', label: 'Takeaway' }].map(opt => (
            <button key={opt.code} className={`${styles.defaultDiningBtn} ${defaultDining === opt.code ? styles.defaultDiningBtnActive : ''}`} onClick={() => setDefaultDining(opt.code)}>{opt.label}</button>
          ))}
        </div>
        <span className={styles.defaultDiningNote}>Override per meal by expanding it below.</span>
      </div>
      <div className={styles.weekGrid}>
        {bookableWeek.map(date => (
          <div key={date} className={styles.weekDayCol}>
            <div className={styles.weekDayHeader}>
              <span className={styles.weekDayName}>{DAY_NAMES[new Date(date + 'T00:00:00').getDay()]}</span>
              <span className={styles.weekDayNum}>{new Date(date + 'T00:00:00').getDate()}</span>
              {isToday(date) && <span className={styles.weekTodayTag}>Today</span>}
            </div>
            {MEAL_TYPES.map(meal => (
              <WeekSlot key={meal.code} date={date} meal={meal} slot={slots[date][meal.code]}
                onToggle={() => toggleSlot(date, meal.code)}
                onItemSelect={(item) => setSlotItem(date, meal.code, item)}
                onDiningSelect={(mode) => setSlotDining(date, meal.code, mode)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.weekSubmitBar}>
        <span className={styles.weekSubmitCount}>
          {selectedCount.ready} of {selectedCount.total} slots ready
          {selectedCount.total > selectedCount.ready && <span className={styles.weekSubmitHint}> — select an item for each ticked meal</span>}
        </span>
        <button className={styles.confirmBtn} disabled={!readySlots.length || submitting} onClick={handleSubmitWeekly}>
          {submitting ? <><div className={styles.spinnerSmall} /> Submitting {readySlots.length} bookings…</> : <><i className="ti ti-calendar-check" /> Book {readySlots.length} meals</>}
        </button>
      </div>
    </div>
  );
}

function WeeklyResult({ result }) {
  const navigate = useNavigate();
  const { succeeded, failed } = result;
  const allOk = !failed.length; const noneOk = !succeeded.length;
  return (
    <div className={styles.flowWrap}>
      <div className={styles.card}>
        <div className={styles.stepPane}>
          <div className={styles.successBox}>
            <div className={`${styles.successIcon} ${noneOk ? styles.successIconFail : ''}`}>
              <i className={`ti ${allOk ? 'ti-circle-check' : noneOk ? 'ti-circle-x' : 'ti-circle-half'}`} />
            </div>
            <h2 className={styles.successTitle}>{allOk ? 'All Bookings Confirmed' : noneOk ? 'Bookings Failed' : 'Partial Success'}</h2>
            {!allOk && !noneOk && <p className={styles.successIntro}>{succeeded.length} succeeded, {failed.length} failed.</p>}
          </div>
          {succeeded.length > 0 && (
            <div className={styles.resultSection}>
              <span className={styles.resultSectionLabel}><i className="ti ti-check" style={{ color: '#0F6E56' }} /> Confirmed ({succeeded.length})</span>
              {succeeded.map((s, i) => (
                <div key={i} className={styles.resultRow}>
                  <span className={styles.resultDate}>{formatDateDisplay(s.reservationDate)}</span>
                  <span className={styles.resultMeal}>{MEAL_TYPES.find(m => m.code === s.mealType)?.label}</span>
                  <span className={styles.resultItem}>{s.itemName}</span>
                </div>
              ))}
            </div>
          )}
          {failed.length > 0 && (
            <div className={styles.resultSection}>
              <span className={styles.resultSectionLabel}><i className="ti ti-x" style={{ color: '#c0392b' }} /> Failed ({failed.length})</span>
              {failed.map((f, i) => (
                <div key={i} className={`${styles.resultRow} ${styles.resultRowFail}`}>
                  <span className={styles.resultDate}>{formatDateDisplay(f.reservationDate)}</span>
                  <span className={styles.resultMeal}>{MEAL_TYPES.find(m => m.code === f.mealType)?.label}</span>
                  <span className={styles.resultError}>{f.error}</span>
                </div>
              ))}
            </div>
          )}
          <p className={styles.billingNote} style={{ marginTop: 12 }}><i className="ti ti-info-circle" style={{ color: '#D4960A' }} />Rates applied next day. Billed monthly to your account.</p>
          <button className={styles.doneBtn} onClick={() => navigate('/dashboard')}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export default function BookMealPage() {
  const bookableWeek = getBookableWeek();
  const [mode, setMode] = useState('single');
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Book a Meal</h1>
          <p className={styles.pageSub}>Booking window: today to {formatDateDisplay(bookableWeek[6])} · 7 days ahead</p>
        </div>
        <div className={styles.modeToggle}>
          <button className={`${styles.modeBtn} ${mode === 'single' ? styles.modeBtnActive : ''}`} onClick={() => setMode('single')}><i className="ti ti-calendar-day" /> Single Day</button>
          <button className={`${styles.modeBtn} ${mode === 'weekly' ? styles.modeBtnActive : ''}`} onClick={() => setMode('weekly')}><i className="ti ti-calendar-week" /> Weekly</button>
        </div>
      </div>
      {mode === 'single'
        ? <SingleBookingFlow bookableWeek={bookableWeek} onSwitchToWeekly={() => setMode('weekly')} />
        : <WeeklyBookingFlow bookableWeek={bookableWeek} onSwitchToSingle={() => setMode('single')} />
      }
    </div>
  );
}
