// web/src/pages/employee/BbqLiveOrderPage.jsx
// BBQ — Live tab — Screen #2
// Role: employee
// Path: /bbq-live-order
//
// Orderable only 19:30–22:30 (event.orderWindowStartAt / orderWindowEndAt).
// Unlike Screen #1 (Preorder), there is NO late-request concept for live
// orders — the backend hard-rejects createBbqOrder calls outside the
// window (see bbqOrderService.js _validateOrderWindow: LIVE branch throws
// outright, no isLateRequest flag). So this screen gates client-side too:
// before the window it shows a live countdown, after it shows a closed
// message, and the order form only renders inside the window.
//
// Menu is 5 combined groups from the published event (preorderItems is
// deliberately excluded — that's Screen #1 only), each rendered as its own
// section, only if it actually has items: Live Cook, Kids, Beverages,
// Bread, Dessert. Design doc §3: "live-cook/kids/beverages/breads/desserts
// combined".
//
// ASSUMPTION FLAGGED, NOT YET VERIFIED: this reads event.orderWindowStartAt
// and event.orderWindowEndAt as values `new Date(...)` can parse directly
// (matching how BbqPreorderPage.jsx reads event.preorderCutoffAt — no
// .toDate() call, since this is JSON from the API, not a raw Firestore
// Timestamp object). Grep-verify GET /bbq/events' actual response shape
// for these two fields before trusting this — same discipline as Screen #1's
// getMyFamily() shape flag.
//
// Built by copying Screen #1's pattern directly (per 31-Jul-2026 decision:
// no shared component extraction, additive-only) — reuses
// TeabarSelfOrderPage.module.css for cart/menu-row/modal/empty-state
// styling exactly like BbqPreorderPage.jsx does, with only group headers
// and the countdown living in this page's own small module.

import { useState, useEffect } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import { createBbqOrder } from '../../services/bbqOrderService';
import { getMyFamily } from '../../services/familyService';
import teabar from './TeabarSelfOrderPage.module.css';
import styles from './BbqLiveOrderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
];

// ── The 5 groups combined on this screen, in display order.
//    (preorderItems is deliberately excluded — that's Screen #1 only.) ──
const MENU_GROUPS = [
  { key: 'liveCookItems', label: 'Live Cook', icon: 'flame' },
  { key: 'kidsItems',     label: 'Kids',       icon: 'users' },
  { key: 'beverages',     label: 'Beverages',  icon: 'cup' },
  { key: 'breadItems',    label: 'Bread',      icon: 'bowl' },
  { key: 'dessertItems',  label: 'Dessert',    icon: 'box' },
];

// ── Turns a millisecond duration into "3d 04:12:33" or "04:12:33" ──
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
  cart, itemsById, familyMembers,
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
        <div className={teabar.modalTitle}>Review order</div>

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
            <option value="self">Self</option>
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
              : <><i className="ti ti-check" /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BbqLiveOrderPage({ token }) {
  const [event, setEvent] = useState(undefined); // undefined = loading, null = none published
  const [eventError, setEventError] = useState('');

  const [familyMembers, setFamilyMembers] = useState([]);

  const [now, setNow] = useState(new Date());

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
    (async () => {
      try {
        const familyData = await getMyFamily();
        const members = (familyData?.members || []).filter((m) => m.isActive !== false);
        setFamilyMembers(members);
      } catch (e) {
        // Non-fatal — consumer picker just won't offer family members.
      }
    })();
  }, []);

  // ── Tick every second so Not-Open-Yet / Live / Closed states and the
  //    countdown update themselves live, no page refresh needed. ──
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      const result = await createBbqOrder(token, {
        eventDate: event.eventDate,
        orderType: 'live',
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

  // ── No event currently published — normal state most of the week ──
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
          <h2 className={teabar.successTitle}>Order placed</h2>
          <p className={teabar.successLocation}>For {event.eventDate}</p>
          <div className={teabar.successActions}>
            <button type="button" className={teabar.successAgainBtn} onClick={() => setSuccess(null)}>
              Order more
            </button>
          </div>
        </div>
      </div>
    );
  }

  // See file-header flagged assumption re: field shape.
  const windowStart = event.orderWindowStartAt ? new Date(event.orderWindowStartAt) : null;
  const windowEnd = event.orderWindowEndAt ? new Date(event.orderWindowEndAt) : null;

  // ── Not Open Yet — countdown to windowStart ──
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

  // ── Closed for the night — after windowEnd ──
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

  // ── Live — build the combined 5-group menu ──
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
          <h1 className={teabar.pageTitle}>BBQ Live Order</h1>
          <p className={teabar.pageSub}>{event.eventDate}</p>
        </div>
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
        <ReviewModal
          cart={cart}
          itemsById={itemsById}
          familyMembers={familyMembers}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}
