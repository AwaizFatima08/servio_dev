// web/src/pages/admin/BbqProxyOrderPage.jsx
// BBQ — Proxy Order — Screen #4
// Role: bbq_supervisor | manager | admin | super_admin
// Path: /bbq-proxy-order
//
// A supervisor places a LIVE-type BBQ order on behalf of an employee who
// can't order for themselves (no phone, forgot) — design doc §3's
// "no-phone / floor-relay scenario". CONFIRMED 01-Aug-2026 with Homi:
// proxy is live-only, no preorder toggle. orderType is hardcoded 'live'
// below — never sent by the user, never offered as a choice.
//
// Three sequential states, same shape as CafeProxyOrderPage.jsx:
//   1. SEARCH   — resolve the target employee + their family (for the
//                 consumer picker), via getFamilyForEmployee — the same
//                 shared service café's own proxy page uses.
//   2. ORDERING — the live-window-gated 5-group menu (Live Cook, Kids,
//                 Beverages, Bread, Dessert), copied from BbqLiveOrderPage's
//                 gating logic (Not-Open-Yet countdown / Live / Closed) —
//                 a proxy order is subject to the exact same live window as
//                 an employee's own live order (createProxyBbqOrder calls
//                 the same _validateOrderWindow as createBbqOrder), so it
//                 needs the identical client-side gate.
//   3. SUCCESS  — confirmation, "order for another employee".
//
// Dining mode restricted to dine_in/takeaway only — unlike café's 3-option
// list, BBQ has no separate "outdoor" toggle since the whole event is
// already outdoor.
//
// ASSUMPTION FLAGGED, NOT YET VERIFIED: getFamilyForEmployee()'s return
// shape is written here as { employeeName, members: [...] } — copied from
// how CafeProxyOrderPage.jsx consumes it. Grep-verify against the real
// service file before trusting this, same discipline as Screen #1's
// getMyFamily() flag.
//
// Styling: zero new CSS. Reuses three existing modules directly, all
// already carrying every class this page needs:
//   - TeabarSelfOrderPage.module.css (cart/menu/modal/empty-state/success)
//   - BbqLiveOrderPage.module.css (formRow/fieldLabel/selectInput/toggle/
//     groupBlock/groupHeader/countdown — identical shape needed here)
//   - CafeProxyOrderPage.module.css (search-step card — generic per that
//     file's own header comment, not café-specific)
//
// Token: Pattern B — `token` prop from <WithToken>.

import { useState, useEffect } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import { createProxyBbqOrder } from '../../services/bbqOrderService';
import { getFamilyForEmployee } from '../../services/familyService';
import teabar from '../employee/TeabarSelfOrderPage.module.css';
import styles from '../employee/BbqLiveOrderPage.module.css';
import lateStyles from '../employee/BbqPreorderPage.module.css';
import search from './CafeProxyOrderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
];

// ── The 5 live-side groups, same set/order as Screen #2. ──
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

function ReviewModal({
  cart, itemsById, employeeName, familyMembers, orderType, isLate,
  submitting, error, onClose, onPlace,
}) {
  const [consumerType, setConsumerType] = useState('self');
  const [consumerFamilyMemberId, setConsumerFamilyMemberId] = useState('');
  const [diningMode, setDiningMode] = useState('dine_in');

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));
  const needsFamilyPick = consumerType === 'family_member';
  const canPlace = lines.length > 0 && !submitting && (!needsFamilyPick || consumerFamilyMemberId);

  const handlePlace = () => {
    onPlace({
      items: lines.map((l) => ({ itemId: l.itemId, quantity: l.qty })),
      diningMode,
      consumerType,
      consumerFamilyMemberId: needsFamilyPick ? consumerFamilyMemberId : null,
    });
  };

  return (
    <div className={teabar.modalOverlay} onClick={onClose}>
      <div className={teabar.modal} onClick={(e) => e.stopPropagation()}>
        <div className={teabar.modalTitle}>
          Review {orderType === 'preorder' ? 'preorder' : 'order'} — for {employeeName}
        </div>

        {orderType === 'preorder' && isLate && (
          <div className={lateStyles.lateBanner}>
            <i className="ti ti-clock-exclamation" />
            Preorder cutoff has passed — this will be submitted as a late
            request, pending Manager approval.
          </div>
        )}

        <div className={teabar.modalLines}>
          {lines.map((l) => (
            <div key={l.itemId} className={teabar.modalLine}>
              <span className={teabar.modalLineName}>{l.name}</span>
              <span className={teabar.qtyValue}>×{l.qty}</span>
            </div>
          ))}
        </div>

        <div className={styles.formRow}>
          <label className={styles.fieldLabel}>Who is this for?</label>
          <select
            className={styles.selectInput}
            value={consumerType}
            onChange={(e) => { setConsumerType(e.target.value); setConsumerFamilyMemberId(''); }}
          >
            <option value="self">Self ({employeeName})</option>
            {familyMembers.length > 0 && <option value="family_member">Family member</option>}
          </select>
        </div>

        {needsFamilyPick && (
          <div className={styles.formRow}>
            <label className={styles.fieldLabel}>Family member</label>
            <select
              className={styles.selectInput}
              value={consumerFamilyMemberId}
              onChange={(e) => setConsumerFamilyMemberId(e.target.value)}
            >
              <option value="">Select…</option>
              {familyMembers.map((m) => (
                <option key={m.familyMemberId} value={m.familyMemberId}>
                  {m.fullName} ({m.relation})
                </option>
              ))}
            </select>
          </div>
        )}

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

        {error && <div className={teabar.modalError}><i className="ti ti-alert-circle" /> {error}</div>}

        <div className={teabar.modalActions}>
          <button type="button" className={teabar.modalCancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={teabar.modalConfirmBtn} onClick={handlePlace} disabled={!canPlace}>
            {submitting
              ? <><span className={teabar.spinnerSm} /> Placing…</>
              : <><i className="ti ti-check" /> Place {orderType === 'preorder' ? 'Preorder' : 'Order'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BbqProxyOrderPage({ token }) {
  const [event, setEvent] = useState(undefined); // undefined = loading, null = none published
  const [eventError, setEventError] = useState('');
  const [now, setNow] = useState(new Date());

  // ── Order type toggle. Reversal of M11 (03-Aug-2026) — confirmed
  //    08-Aug-2026 after real-time testing surfaced the gap. Default 'live'
  //    keeps all prior behavior unchanged unless the supervisor explicitly
  //    switches to Preorder. ──
  const [orderType, setOrderType] = useState('live');

  // Search state
  const [empNumInput, setEmpNumInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [target, setTarget] = useState(null); // { employeeNumber, employeeName, family[] }

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

  // ── Tick every second — same live gating pattern as Screen #2. ──
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onSearch = async () => {
    const num = empNumInput.trim().toUpperCase();
    if (!num) { setSearchError('Enter an employee number.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      const data = await getFamilyForEmployee(token, num);
      const family = (Array.isArray(data.members) ? data.members : [])
        .filter((m) => m.isActive && !m.deletionRequested);
      setTarget({ employeeNumber: num, employeeName: data.employeeName, family });
    } catch (e) {
      // Backend 404 -> "Employee not found: <num>". Surface verbatim.
      setSearchError(e.message);
      setTarget(null);
    } finally {
      setSearching(false);
    }
  };

  const resetToSearch = () => {
    setTarget(null);
    setCart({});
    setEmpNumInput('');
    setSearchError('');
    setSuccess(null);
  };

  // ── Switching order type clears the cart — items belong to different
  //    menus (preorderItems vs the 5 live groups) and carrying quantities
  //    across the switch would be confusing, not useful. ──
  const changeOrderType = (type) => {
    if (type === orderType) return;
    setOrderType(type);
    setCart({});
  };

  const addItem = (item) => setCart((c) => ({ ...c, [item.itemId]: (c[item.itemId] || 0) + 1 }));
  const incItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decItem = (id) => setCart((c) => {
    const next = { ...c };
    const q = (next[id] || 0) - 1;
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });

  const placeOrder = async ({ items, diningMode, consumerType, consumerFamilyMemberId }) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createProxyBbqOrder(token, {
        targetEmployeeNumber: target.employeeNumber,
        eventDate: event.eventDate,
        orderType,
        items, diningMode, consumerType, consumerFamilyMemberId,
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

  // ── Loading ──
  if (event === undefined) {
    return <div className={teabar.page}><div className={teabar.loading}>Loading…</div></div>;
  }

  // ── No event currently published ──
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

  // ── Success ──
  if (success) {
    return (
      <div className={teabar.page}>
        <div className={teabar.successBody}>
          <i className={`ti ti-circle-check ${teabar.successIcon}`} />
          <h2 className={teabar.successTitle}>
            {orderType === 'preorder'
              ? (success.isLateRequest ? 'Late preorder submitted' : 'Preorder placed')
              : 'Order placed'} for {target.employeeName}
          </h2>
          <p className={teabar.successLocation}>For {event.eventDate}</p>
          {orderType === 'preorder' && success.isLateRequest && (
            <p className={teabar.successNote}>
              Pending Manager approval — visible in the employee's BBQ Orders.
            </p>
          )}
          <div className={teabar.successActions}>
            <button type="button" className={teabar.successAgainBtn} onClick={resetToSearch}>
              Order for another employee
            </button>
          </div>
        </div>
      </div>
    );
  }

  // See file-header flagged assumption re: field shape (matches Screen #2).
  const windowStart = event.orderWindowStartAt ? new Date(event.orderWindowStartAt) : null;
  const windowEnd = event.orderWindowEndAt ? new Date(event.orderWindowEndAt) : null;
  const preorderCutoff = event.preorderCutoffAt ? new Date(event.preorderCutoffAt) : null;
  const isLate = orderType === 'preorder' && preorderCutoff ? now > preorderCutoff : false;

  // ── Live-window gating only applies when orderType is 'live'. Preorder
  //    has no equivalent client-side hard gate — same as the employee
  //    Preorder page (Screen #1): only a late-banner warning past
  //    preorderCutoffAt, with the true hard stop (event fully closed)
  //    left to the backend to reject, surfaced as a normal submit error. ──

  // ── Not Open Yet — countdown to windowStart (live only) ──
  if (orderType === 'live' && windowStart && now < windowStart) {
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

  // ── Closed for the night (live only) ──
  if (orderType === 'live' && windowEnd && now > windowEnd) {
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

  // ── SEARCH state (no target resolved yet) ──
  if (!target) {
    return (
      <div className={teabar.page}>
        <div className={teabar.pageHeader}><div>
          <h1 className={teabar.pageTitle}>BBQ Proxy Order</h1>
          <p className={teabar.pageSub}>Place a BBQ order on behalf of an employee · {event.eventDate}</p>
        </div></div>

        <div className={search.searchCard}>
          <label className={search.searchLabel}>Employee number</label>
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

  // ── ORDERING state (target resolved) ──
  const menu = event.menu || {};
  const groupsWithItems = MENU_GROUPS
    .map((g) => ({ ...g, items: menu[g.key] || [] }))
    .filter((g) => g.items.length > 0);
  const preorderItems = menu.preorderItems || [];

  const itemsById = {};
  if (orderType === 'preorder') {
    for (const it of preorderItems) itemsById[it.itemId] = it;
  } else {
    for (const g of groupsWithItems) {
      for (const it of g.items) itemsById[it.itemId] = it;
    }
  }

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <div className={teabar.page}>
      <div className={teabar.pageHeader}>
        <div>
          <h1 className={teabar.pageTitle}>BBQ Proxy Order</h1>
          <p className={teabar.pageSub}>
            Ordering for <strong>{target.employeeName}</strong> · {target.employeeNumber}
            {' · '}{target.family.length} family member{target.family.length === 1 ? '' : 's'} on file
          </p>
        </div>
        <button className={search.changeBtn} onClick={resetToSearch}>
          <i className="ti ti-switch-horizontal" /> Change employee
        </button>
      </div>

      <div className={styles.formRow}>
        <label className={styles.fieldLabel}>Order type</label>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${orderType === 'live' ? styles.toggleBtnActive : ''}`}
            onClick={() => changeOrderType('live')}
          >
            Live
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${orderType === 'preorder' ? styles.toggleBtnActive : ''}`}
            onClick={() => changeOrderType('preorder')}
          >
            Preorder
          </button>
        </div>
      </div>

      {orderType === 'preorder' && isLate && (
        <div className={lateStyles.lateBanner}>
          <i className="ti ti-clock-exclamation" />
          Preorder cutoff has passed — this will be submitted as a late
          request, pending Manager approval.
        </div>
      )}

      {orderType === 'preorder' ? (
        preorderItems.length === 0 ? (
          <div className={teabar.emptyCard}>
            <i className={`ti ti-meat-off ${teabar.emptyIcon}`} />
            <h2 className={teabar.emptyTitle}>No preorder items on this week's menu</h2>
            <p className={teabar.emptyBody}>Please check back later.</p>
          </div>
        ) : (
          <>
            <h2 className={teabar.sectionTitle}>Menu</h2>
            <MenuList items={preorderItems} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
          </>
        )
      ) : (
        groupsWithItems.length === 0 ? (
          <div className={teabar.emptyCard}>
            <i className={`ti ti-meat-off ${teabar.emptyIcon}`} />
            <h2 className={teabar.emptyTitle}>No live-order items on this week's menu</h2>
            <p className={teabar.emptyBody}>Please check back later.</p>
          </div>
        ) : (
          groupsWithItems.map((g) => (
            <div key={g.key} className={styles.groupBlock}>
              <h2 className={styles.groupHeader}>
                <i className={`ti ti-${g.icon} ${styles.groupHeaderIcon}`} />
                {g.label}
              </h2>
              <MenuList items={g.items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
            </div>
          ))
        )
      )}

      {lineCount > 0 && (
        <div className={teabar.cartBar}>
          <div className={teabar.cartSummary}>
            <i className="ti ti-shopping-cart" />
            <span>{lineCount} item{lineCount === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}</span>
          </div>
          <button type="button" className={teabar.cartReviewBtn}
            onClick={() => { setSubmitError(''); setShowModal(true); }}>
            Review &amp; Place {orderType === 'preorder' ? 'Preorder' : 'Order'}
          </button>
        </div>
      )}

      {showModal && (
        <ReviewModal
          cart={cart}
          itemsById={itemsById}
          employeeName={target.employeeName}
          familyMembers={target.family}
          orderType={orderType}
          isLate={isLate}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}
