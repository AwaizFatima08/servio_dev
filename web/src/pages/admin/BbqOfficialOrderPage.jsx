// web/src/pages/admin/BbqOfficialOrderPage.jsx
// BBQ — Official Order — Screen #5
// Role: bbq_supervisor | manager | admin | super_admin
// Path: /bbq-official-order
//
// A supervisor places a BBQ order billed to an official account, anchored
// to a SPONSORING employee (design doc §8.2). Admin approves the billing
// separately (Screen — new 14th, BbqOfficialPendingPage) — the order is
// served regardless of that outcome, same as café.
//
// CONFIRMED with Homi 03-Aug-2026 (M11 closed): official orders are
// live-only, same as proxy — an official/guest order is always for
// someone physically present that night, no preorder path needed.
// orderType hardcoded 'live' below, by design, not by assumption.
//
// Differences from CafeOfficialPage.jsx (the template this was built from):
//   1. NO takeaway/advance-date machinery. Café's official screen carries
//      pickup-date/pickup-time fields because café supports future-dated
//      takeaway orders. BBQ is a single Friday night, no advance ordering —
//      all of that is simply absent here, not hidden behind a flag.
//   2. NO consumer picker — same as café's own official page (an official
//      order is always 'self' in the billing sense, sponsor is the billing
//      anchor, not a family-member consumer).
//   3. Cost centre is FREE TEXT, not a dropdown — confirmed against café's
//      actual code, not assumed. "As communicated" — for the accounts
//      audit, never a lookup key.
//   4. Dining mode restricted to dine_in/takeaway (no "outdoor" — the whole
//      BBQ event is already outdoor).
//
// Styling: zero new CSS, same reuse-only approach as Screen #4:
//   - TeabarSelfOrderPage.module.css (cart/menu/modal/empty-state/success)
//   - BbqLiveOrderPage.module.css (formRow/fieldLabel/selectInput/toggle/
//     groupBlock/groupHeader/countdown)
//   - CafeProxyOrderPage.module.css (search-step card, generic)
//
// Token: Pattern B — `token` prop from <WithToken>.

import { useState, useEffect } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import { createOfficialBbqOrder } from '../../services/bbqOrderService';
import { getFamilyForEmployee } from '../../services/familyService';
import teabar from '../employee/TeabarSelfOrderPage.module.css';
import styles from '../employee/BbqLiveOrderPage.module.css';
import search from './CafeProxyOrderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
];

const MENU_GROUPS = [
  { key: 'liveCookItems', label: 'Live Cook', icon: 'flame' },
  { key: 'kidsItems',     label: 'Kids',       icon: 'users' },
  { key: 'beverages',     label: 'Beverages',  icon: 'cup' },
  { key: 'breadItems',    label: 'Bread',      icon: 'bowl' },
  { key: 'dessertItems',  label: 'Dessert',    icon: 'box' },
];

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDateTime(date) {
  return date.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function MenuList({ items, cart, onAdd, onInc, onDec }) {
  return (
    <div className={teabar.menuList}>
      {items.map((item) => {
        const qty = cart[item.itemId] || 0;
        const inCart = qty > 0;
        return (
          <div key={item.itemId} className={teabar.menuRow}>
            <div className={teabar.menuRowLeft}>
              <span className={teabar.menuRowName}>{item.itemName}</span>
              {item.baseUnit && <span className={teabar.menuRowDetail}>per {item.baseUnit}</span>}
            </div>
            <div className={teabar.menuRowRight}>
              {item.foodTypeName && <span className={teabar.menuBadge}>{item.foodTypeName}</span>}
              {inCart ? (
                <div className={teabar.qtyStepper}>
                  <button type="button" className={teabar.qtyBtn} onClick={() => onDec(item.itemId)}
                    title={qty === 1 ? 'Remove from order' : 'Decrease quantity'}>
                    <i className={qty === 1 ? 'ti ti-trash' : 'ti ti-minus'} />
                  </button>
                  <span className={teabar.qtyValue}>{qty}</span>
                  <button type="button" className={teabar.qtyBtn} onClick={() => onInc(item.itemId)} title="Increase quantity">
                    <i className="ti ti-plus" />
                  </button>
                </div>
              ) : (
                <button type="button" className={teabar.addBtn} onClick={() => onAdd(item)}>
                  <i className="ti ti-plus" /> Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OfficialOrderModal({ cart, itemsById, sponsorName, submitting, error, onClose, onPlace }) {
  const [diningMode, setDiningMode] = useState('dine_in');
  const [costCentreCode, setCostCentreCode] = useState('');
  const [guestName, setGuestName] = useState('');

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));
  const canPlace = lines.length > 0 && !submitting;

  const handlePlace = () => {
    onPlace({
      items: lines.map((l) => ({ itemId: l.itemId, quantity: l.qty })),
      diningMode,
      costCentreCode: costCentreCode.trim() || null,
      guestName: guestName.trim() || null,
    });
  };

  return (
    <div className={teabar.modalOverlay} onClick={onClose}>
      <div className={teabar.modal} onClick={(e) => e.stopPropagation()}>
        <div className={teabar.modalTitle}>Official order — sponsored by {sponsorName}</div>

        <div className={teabar.modalLines}>
          {lines.map((l) => (
            <div key={l.itemId} className={teabar.modalLine}>
              <span className={teabar.modalLineName}>{l.name}</span>
              <span className={teabar.qtyValue}>×{l.qty}</span>
            </div>
          ))}
        </div>

        <div className={styles.formRow}>
          <label className={styles.fieldLabel}>Dining mode</label>
          <div className={styles.toggleRow}>
            {DINING_MODES.map((dm) => (
              <button
                key={dm.value}
                type="button"
                className={`${styles.toggleBtn} ${diningMode === dm.value ? styles.toggleBtnActive : ''}`}
                onClick={() => setDiningMode(dm.value)}
              >
                {dm.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formRow}>
          <label className={styles.fieldLabel}>Guest / occasion (optional)</label>
          <input
            className={styles.selectInput}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Ahsan's guest, visiting delegation"
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.fieldLabel}>Cost centre (as communicated · optional)</label>
          <input
            className={styles.selectInput}
            value={costCentreCode}
            onChange={(e) => setCostCentreCode(e.target.value)}
            placeholder="e.g. 12345678"
          />
        </div>

        {error && <div className={teabar.modalError}><i className="ti ti-alert-circle" /> {error}</div>}

        <div className={teabar.modalActions}>
          <button type="button" className={teabar.modalCancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={teabar.modalConfirmBtn} onClick={handlePlace} disabled={!canPlace}>
            {submitting
              ? <><span className={teabar.spinnerSm} /> Placing…</>
              : <><i className="ti ti-check" /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BbqOfficialOrderPage({ token }) {
  const [event, setEvent] = useState(undefined);
  const [eventError, setEventError] = useState('');
  const [now, setNow] = useState(new Date());

  const [empNumInput, setEmpNumInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sponsor, setSponsor] = useState(null); // { employeeNumber, employeeName }

  const [cart, setCart] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const ev = await getCurrentBbqEvent(token);
        setEvent(ev);
      } catch (e) {
        setEventError(e.message);
        setEvent(null);
      }
    })();
  }, [token]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reuses getFamilyForEmployee purely to validate the sponsor exists and
  // get the display name — same choice café's own official screen made,
  // even though the family list itself is never shown here (no consumer
  // picker on this screen).
  const onSearch = async () => {
    const num = empNumInput.trim().toUpperCase();
    if (!num) { setSearchError('Enter an employee number.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      const data = await getFamilyForEmployee(token, num);
      setSponsor({ employeeNumber: num, employeeName: data.employeeName });
    } catch (e) {
      setSearchError(e.message);
      setSponsor(null);
    } finally {
      setSearching(false);
    }
  };

  const resetToSearch = () => {
    setSponsor(null);
    setCart({});
    setEmpNumInput('');
    setSearchError('');
    setSuccess(null);
  };

  const addItem = (item) => setCart((c) => ({ ...c, [item.itemId]: (c[item.itemId] || 0) + 1 }));
  const incItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decItem = (id) => setCart((c) => {
    const next = { ...c };
    const q = (next[id] || 0) - 1;
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });

  const placeOrder = async ({ items, diningMode, costCentreCode, guestName }) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createOfficialBbqOrder(token, {
        sponsoringEmployeeNumber: sponsor.employeeNumber,
        eventDate: event.eventDate,
        orderType: 'live',
        items, diningMode, costCentreCode, guestName,
      });
      setSuccess(result);
      setCart({});
      setShowModal(false);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (event === undefined) {
    return <div className={teabar.page}><div className={teabar.loading}>Loading…</div></div>;
  }

  if (event === null) {
    return (
      <div className={teabar.page}>
        <div className={teabar.emptyCard}>
          <i className={`ti ti-calendar-off ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>No BBQ night published yet</h2>
          <p className={teabar.emptyBody}>
            {eventError || 'Check back closer to Friday — the menu is usually published on Thursday.'}
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={teabar.page}>
        <div className={teabar.successBody}>
          <i className={`ti ti-circle-check ${teabar.successIcon}`} />
          <h2 className={teabar.successTitle}>Official order placed · sponsored by {sponsor.employeeName}</h2>
          <p className={teabar.successLocation}>For {event.eventDate}</p>
          <p className={teabar.successNote}>
            Billed to an official account · pending billing approval by admin.
          </p>
          <div className={teabar.successActions}>
            <button type="button" className={teabar.successAgainBtn} onClick={resetToSearch}>
              Place another official order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const windowStart = event.orderWindowStartAt ? new Date(event.orderWindowStartAt) : null;
  const windowEnd = event.orderWindowEndAt ? new Date(event.orderWindowEndAt) : null;

  if (windowStart && now < windowStart) {
    return (
      <div className={teabar.page}>
        <div className={teabar.emptyCard}>
          <i className={`ti ti-clock-hour-9 ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>Not Open Yet</h2>
          <p className={teabar.emptyBody}>Live ordering for {event.eventDate} opens at {formatDateTime(windowStart)}.</p>
          <div className={styles.countdownWrap}>
            <span className={styles.countdownLabel}>Opens in</span>
            <span className={styles.countdownValue}>{formatCountdown(windowStart - now)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (windowEnd && now > windowEnd) {
    return (
      <div className={teabar.page}>
        <div className={teabar.emptyCard}>
          <i className={`ti ti-door-off ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>Closed for Tonight</h2>
          <p className={teabar.emptyBody}>Live ordering for {event.eventDate} has ended.</p>
        </div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className={teabar.page}>
        <div className={teabar.pageHeader}><div>
          <h1 className={teabar.pageTitle}>BBQ Official Order</h1>
          <p className={teabar.pageSub}>Place a BBQ order billed to an official account · {event.eventDate}</p>
        </div></div>

        <div className={search.searchCard}>
          <label className={search.searchLabel}>Sponsoring employee number</label>
          <div className={search.searchRow}>
            <input
              className={search.searchInput}
              value={empNumInput}
              onChange={(e) => setEmpNumInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              placeholder="e.g. FFL00003"
              autoFocus
            />
            <button className={search.searchBtn} onClick={onSearch} disabled={searching}>
              {searching ? 'Searching…' : <><i className="ti ti-search" /> Search</>}
            </button>
          </div>
          {searchError && (
            <div className={search.searchError}><i className="ti ti-alert-circle" /> {searchError}</div>
          )}
        </div>
      </div>
    );
  }

  const menu = event.menu || {};
  const groupsWithItems = MENU_GROUPS
    .map((g) => ({ ...g, items: menu[g.key] || [] }))
    .filter((g) => g.items.length > 0);

  const itemsById = {};
  for (const g of groupsWithItems) {
    for (const it of g.items) itemsById[it.itemId] = it;
  }

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <div className={teabar.page}>
      <div className={teabar.pageHeader}>
        <div>
          <h1 className={teabar.pageTitle}>BBQ Official Order</h1>
          <p className={teabar.pageSub}>
            Sponsored by <strong>{sponsor.employeeName}</strong> · {sponsor.employeeNumber}
            {' · billed to an official account'}
          </p>
        </div>
        <button className={search.changeBtn} onClick={resetToSearch}>
          <i className="ti ti-switch-horizontal" /> Change sponsor
        </button>
      </div>

      {groupsWithItems.length === 0 ? (
        <div className={teabar.emptyCard}>
          <i className={`ti ti-meat-off ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>No live-order items on this week's menu</h2>
          <p className={teabar.emptyBody}>Please check back later.</p>
        </div>
      ) : (
        <>
          {groupsWithItems.map((g) => (
            <div key={g.key} className={styles.groupBlock}>
              <h2 className={styles.groupHeader}>
                <i className={`ti ti-${g.icon} ${styles.groupHeaderIcon}`} />
                {g.label}
              </h2>
              <MenuList items={g.items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
            </div>
          ))}

          {lineCount > 0 && (
            <div className={teabar.cartBar}>
              <div className={teabar.cartSummary}>
                <i className="ti ti-shopping-cart" />
                <span>{lineCount} item{lineCount === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}</span>
              </div>
              <button type="button" className={teabar.cartReviewBtn}
                onClick={() => { setSubmitError(''); setShowModal(true); }}>
                Review &amp; Place Order
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <OfficialOrderModal
          cart={cart}
          itemsById={itemsById}
          sponsorName={sponsor.employeeName}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}
