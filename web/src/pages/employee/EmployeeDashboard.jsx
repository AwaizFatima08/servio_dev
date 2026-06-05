// âââââââââââââââââââââââââââââââââââââââââ
// EmployeeDashboard.jsx â Screen 2 (Home)
// HomiLabs | Servio | Web
// âââââââââââââââââââââââââââââââââââââââââ
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTodayReservations, cancelReservation, getDailyMenu } from '../../services/messService';
import styles from './EmployeeDashboard.module.css';

// ââ Helpers ââ
function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ââ Weekly menu helpers ââ
const MEAL_ORDER  = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
    days.push(d);
  }
  return days;
}
const WEEK = buildWeek();

// ââ Stat card ââ
function StatCard({ label, value, sub, variant = 'default', icon }) {
  return (
    <div className={`${styles.statCard} ${styles[`statCard_${variant}`]}`}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon}><i className={`ti ${icon}`} /></span>
      </div>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

// ââ Issue status display ââ
function IssueTag({ status }) {
  const map = {
    pending:  { text: 'Pending',  cls: styles.issueTag_pending },
    issued:   { text: 'Issued',   cls: styles.issueTag_issued },
    no_show:  { text: 'No-show', cls: styles.issueTag_noshow },
  };
  const { text, cls } = map[status] || { text: status, cls: '' };
  return <span className={`${styles.issueTag} ${cls}`}>{text}</span>;
}

const MEAL_ICONS = { breakfast: 'ti-sunrise', lunch: 'ti-sun', dinner: 'ti-moon' };

// ââ Today's bookings panel ââ
function TodayBookingsPanel({ reservations, loading, onCancel }) {
  if (loading) {
    return (
      <div className={styles.panelLoading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const active = reservations.filter(r => r.reservationStatus === 'active');

  if (!active.length) {
    return (
      <div className={styles.panelEmpty}>
        <i className="ti ti-calendar-x" style={{ fontSize: 28, color: '#C6F0E5' }} />
        <p>No bookings yet today</p>
        <Link to="/book-meal" className={styles.bookNowLink}>Book your first meal &#8594;</Link>
      </div>
    );
  }

  return (
    <div className={styles.reservationList}>
      {active.map(r => (
        <div key={r.reservationId} className={styles.reservationCard}>
          <div className={styles.resLeft}>
            <i
              className={`ti ${MEAL_ICONS[r.mealType] || 'ti-utensils'}`}
              style={{ fontSize: 20, color: '#0F6E56' }}
            />
            <div className={styles.resInfo}>
              <span className={styles.resMeal}>
                {r.mealType.charAt(0).toUpperCase() + r.mealType.slice(1)}
              </span>
              <span className={styles.resItem}>{r.itemName}</span>
              <span className={styles.resMode}>
                {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                {' . '}
                <IssueTag status={r.issueStatus} />
              </span>
            </div>
          </div>
          {r.issueStatus === 'pending' && (
            <button
              className={styles.cancelBtn}
              onClick={() => onCancel(r.reservationId)}
              title="Cancel booking"
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ââ Main component ââ
export default function EmployeeDashboard() {
  const { userProfile, getToken } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [weekMenus, setWeekMenus]       = useState({});
  const [weekMenuLoading, setWeekMenuLoading] = useState(false);
  const [weekMenuExpanded, setWeekMenuExpanded] = useState(false);

  // Bug 18b fix: prefer displayName; strip trailing dot (e.g. 'Dr.') to avoid double-dot in greeting
  const rawName   = userProfile?.displayName?.trim() || userProfile?.employee?.fullName?.trim() || 'there';
  const firstName = rawName.endsWith('.') ? rawName.slice(0, -1) : rawName;

  const loadReservations = useCallback(async () => {
    try {
      setLoadingRes(true);
      const token = await getToken();
      const data = await getTodayReservations(token);
      setReservations(data);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoadingRes(false);
    }
  }, [getToken]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const loadWeekMenus = useCallback(async () => {
    if (weekMenuLoading || Object.keys(weekMenus).length > 0) return;
    setWeekMenuLoading(true);
    const result = {};
    await Promise.all(
      WEEK.map(async (day) => {
        const date = pktDateStr(day);
        result[date] = {};
        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            try {
              const token = await getToken();
              const data  = await getDailyMenu(date, meal, token);
              result[date][meal] = data; // Bug 19 fix: getDailyMenu already returns data.menu, not the raw response
            } catch {
              result[date][meal] = null;
            }
          })
        );
      })
    );
    setWeekMenus(result);
    setWeekMenuLoading(false);
  }, [weekMenuLoading, weekMenus, getToken]);

  const toggleWeekMenu = () => {
    const next = !weekMenuExpanded;
    setWeekMenuExpanded(next);
    if (next) loadWeekMenus();
  };

  const handleCancel = async (reservationId) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      setCancelling(true);
      const token = await getToken();
      await cancelReservation(reservationId, 'employee_request', token);
      await loadReservations();
    } catch (err) {
      alert('Could not cancel: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const activeCount    = reservations.filter(r => r.reservationStatus === 'active').length;
  const issuedCount    = reservations.filter(r => r.issueStatus === 'issued').length;
  const cancelledCount = reservations.filter(r => r.reservationStatus === 'cancelled').length;
  const allBooked      = activeCount >= 3;

  return (
    <div className={styles.page}>

      {/* ââ Header ââ */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.greeting}>
            {getGreeting()}, <em>{firstName}</em>
          </h1>
          <p className={styles.dateText}>
            {todayFormatted()}
            <span className={styles.tenantPill}>FFL Management Club</span>
          </p>
        </div>
        <span className={styles.rolePill}>Employee</span>
      </div>

      {/* ââ Stat cards ââ */}
      <div className={styles.statsRow}>
        <StatCard
          label="Today's Bookings"
          value={loadingRes ? 'â' : activeCount}
          sub={activeCount > 0 ? `${issuedCount} already issued` : 'None booked yet'}
          variant="default"
          icon="ti-calendar-check"
        />
        <StatCard
          label="Meals Issued"
          value={loadingRes ? 'â' : issuedCount}
          sub="Served today"
          variant="dark"
          icon="ti-check"
        />
        <StatCard
          label="Cancelled"
          value={loadingRes ? 'â' : cancelledCount}
          sub={cancelledCount > 0 ? 'Not billed' : 'All good'}
          variant="gold"
          icon="ti-calendar-x"
        />
      </div>

      {/* ââ Order Now CTA ââ */}
      <div className={styles.ctaCard}>
        <div className={styles.ctaLeft}>
          <i className="ti ti-shopping-bag" style={{ fontSize: 28, color: '#0F6E56' }} />
          <div>
            <span className={styles.ctaTitle}>Book a Meal</span>
            <span className={styles.ctaSub}>
              {allBooked
                ? 'All 3 meals booked for today.'
                : 'Choose your meal and combo, then confirm.'}
            </span>
          </div>
        </div>
        {allBooked ? (
          <span className={styles.allBookedTag}>All Booked</span>
        ) : (
          <Link to="/book-meal" className={styles.orderNowBtn}>
            Order Now
          </Link>
        )}
      </div>

      {/* ââ Two-column section ââ */}
      <div className={styles.twoCol}>

        {/* Today's bookings */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <i className="ti ti-utensils" style={{ marginRight: 8 }} />
              Today&apos;s Bookings
            </span>
            <button
              className={styles.refreshBtn}
              onClick={loadReservations}
              disabled={loadingRes || cancelling}
              title="Refresh"
            >
              <i className={`ti ti-refresh ${(loadingRes || cancelling) ? styles.spinning : ''}`} />
            </button>
          </div>
          <TodayBookingsPanel
            reservations={reservations}
            loading={loadingRes || cancelling}
            onCancel={handleCancel}
          />
        </div>

        {/* Mess timings */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <i className="ti ti-clock" style={{ marginRight: 8 }} />
              Mess Timings
            </span>
          </div>
          <div className={styles.timingsGrid}>
            {[
              { meal: 'Breakfast', time: '06:00 - 09:00', cutoff: 'Book by 03:00', icon: 'ti-sunrise' },
              { meal: 'Lunch',     time: '13:00 - 15:00', cutoff: 'Book by 10:00', icon: 'ti-sun' },
              { meal: 'Dinner',    time: '19:00 - 22:00', cutoff: 'Book by 16:00', icon: 'ti-moon' },
            ].map(({ meal, time, cutoff, icon }) => (
              <div key={meal} className={styles.timingRow}>
                <i className={`ti ${icon}`} style={{ color: '#3DBFA0', fontSize: 18, flexShrink: 0, width: 20 }} />
                <div>
                  <span className={styles.timingMeal}>{meal}</span>
                  <span className={styles.timingTime}>{time}</span>
                  <span className={styles.timingCutoff}>{cutoff}</span>
                </div>
              </div>
            ))}
            <div className={styles.billingNote}>
              <i className="ti ti-info-circle" style={{ color: '#D4960A', fontSize: 14, flexShrink: 0 }} />
              Rates applied next day. Billed to your account monthly.
            </div>
          </div>
        </div>

      </div>

      {/* ââ Weekly Menu ââ */}
      <div className={styles.weekMenuSection}>
        <button className={styles.weekMenuToggle} onClick={toggleWeekMenu}>
          <i className={`ti ${weekMenuExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
          <span>{weekMenuExpanded ? "Hide week's menu" : "This week's menu"}</span>
        </button>

        {weekMenuExpanded && (
          weekMenuLoading ? (
            <div className={styles.weekMenuLoading}>
              <div className={styles.spinner} />
              <span>Loading week&apos;s menus...</span>
            </div>
          ) : (
            <div className={styles.weekGrid}>
              {WEEK.map((day, idx) => {
                const date    = pktDateStr(day);
                const dayMenu = weekMenus[date] || {};
                const label   = idx === 0 ? 'Today' : DAY_LABELS[day.getDay()];
                const dateStr = `${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`;
                return (
                  <div key={date} className={styles.weekDayCard}>
                    <div className={styles.weekDayHeader}>
                      <span className={styles.weekDayName}>{label}</span>
                      <span className={styles.weekDayDate}>{dateStr}</span>
                    </div>
                    {MEAL_ORDER.map((meal) => {
                      const menu   = dayMenu[meal];
                      const combos = menu?.combos || [];
                      return (
                        <div key={meal} className={styles.weekMealRow}>
                          <span className={styles.weekMealLabel}>{MEAL_LABELS[meal]}</span>
                          <span className={styles.weekMealItems}>
                            {combos.length > 0
                              ? combos.map(c => c.comboName || c.displayLabel).join(' / ')
                              : 'â'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}
