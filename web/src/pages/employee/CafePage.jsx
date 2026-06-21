// ─────────────────────────────────────────
// CafePage.jsx — Employee Café (Menu + Cart + Order)
// HomiLabs | Servio | V1.2 Web Slice 2.3-web-b/c
//
// FILE LOCATION: web/src/pages/employee/CafePage.jsx
//
// Slice 1            : read-only menu.
// Slice 2.3-web-a    : cart (Add / stepper / cart bar).
// Slice 2.3-web-b/c  : review modal + real submit + success screen (this update).
//
// The review modal gathers SESSION-LEVEL choices (one consumer for the whole
// order — restaurant model) and submits the multi-item order via
// createBatchOrder → POST /cafe/orders/batch. The backend stays the single
// authority on the time window, lead time, dining-mode/order-type interlock,
// and family-member ownership; the UI does friendly pre-checks only.
//
// Consumer picker: "Self (<employee>)" + each active family member. Whole order
// tagged to one consumer. The modal is a self-contained component so the
// supervisor PROXY flow (V1.2 Slice 3 web) can reuse it — it takes the cart,
// the employee name, the family list, and onSubmit/onClose. Proxy will render
// the same modal after an employee-search step and point onSubmit at
// /orders/proxy. No rewrite needed.
//
// Label model (shown on /my-cafe-orders, reworked in Slice 2.4):
//   "Order placed by - <consumerName>" (+ "through proxy booking" when a
//   supervisor booked). Billing always lands on the employee account; the audit
//   trail always records the real booker. The label is display-only.
//
// Token plumbing: Pattern B — `token` prop from <WithToken>. Employee name comes
// from useAuth().userProfile (same source Sidebar uses).
// ─────────────────────────────────────────

import { useState, useEffect } from 'react';
import { getCafeMenu, createBatchOrder } from '../../services/cafeService';
import { getMyFamily } from '../../services/familyService';
import { useAuth } from '../../context/AuthContext';
import styles from './CafePage.module.css';

const CAFE_HOURS_DISPLAY = '18:00 – 22:30';

const ORDER_TYPES = [
  { value: 'cafe_hours',       label: 'Café Hours' },
  { value: 'anytime_takeaway', label: 'Anytime Takeaway' },
];

const DINING_MODES = [
  { value: 'dine_in',         label: 'Dine-in',  icon: 'ti-armchair' },
  { value: 'takeaway',        label: 'Takeaway', icon: 'ti-shopping-bag' },
  { value: 'outdoor_seating', label: 'Outdoor',  icon: 'ti-sun' },
];

function formatUpdated(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ─────────────────────────────────────────
// MenuList — rows with Add button / quantity stepper. (Slice 2.3-web-a)
// ─────────────────────────────────────────
function MenuList({ items, cart, onAdd, onInc, onDec }) {
  return (
    <div className={styles.menuList}>
      {items.map((item) => {
        const qty = cart[item.itemId] || 0;
        const inCart = qty > 0;
        return (
          <div key={item.itemId} className={styles.menuRow}>
            <div className={styles.menuRowLeft}>
              <span className={styles.menuRowName}>{item.itemName}</span>
              {item.baseUnit && (
                <span className={styles.menuRowDetail}>per {item.baseUnit}</span>
              )}
            </div>
            <div className={styles.menuRowRight}>
              {item.foodTypeName && (
                <span className={styles.menuBadge}>{item.foodTypeName}</span>
              )}
              {inCart ? (
                <div className={styles.qtyStepper}>
                  <button type="button" className={styles.qtyBtn}
                    onClick={() => onDec(item.itemId)}
                    title={qty === 1 ? 'Remove from order' : 'Decrease quantity'}>
                    <i className={qty === 1 ? 'ti ti-trash' : 'ti ti-minus'} />
                  </button>
                  <span className={styles.qtyValue}>{qty}</span>
                  <button type="button" className={styles.qtyBtn}
                    onClick={() => onInc(item.itemId)} title="Increase quantity">
                    <i className="ti ti-plus" />
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.addBtn} onClick={() => onAdd(item)}>
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

// ─────────────────────────────────────────
// OrderModal — review + session choices + submit. Proxy-reusable.
// ─────────────────────────────────────────
function OrderModal({
  cart, itemsById, employeeName, familyMembers,
  onInc, onDec, submitting, error, onClose, onPlace,
}) {
  const [orderType, setOrderType] = useState('cafe_hours');
  const [diningMode, setDiningMode] = useState('dine_in');
  const [consumerId, setConsumerId] = useState('self'); // 'self' | familyMemberId
  const [pickupTime, setPickupTime] = useState('');

  const isAnytime = orderType === 'anytime_takeaway';
  useEffect(() => {
    if (isAnytime && diningMode !== 'takeaway') setDiningMode('takeaway');
  }, [isAnytime, diningMode]);

  const needsPickup = diningMode !== 'dine_in';

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));

  const canPlace =
    lines.length > 0 && !submitting &&
    (!needsPickup || (pickupTime && /^\d{2}:\d{2}$/.test(pickupTime)));

  const handlePlace = () => {
    const consumerType = consumerId === 'self' ? 'self' : 'family_member';
    const payload = {
      orderType, diningMode, consumerType,
      items: lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
    };
    if (consumerType === 'family_member') payload.consumerFamilyMemberId = consumerId;
    if (needsPickup) payload.requestedPickupTime = pickupTime;
    onPlace(payload);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Review your order</div>

        <div className={styles.modalLines}>
          {lines.map((l) => (
            <div key={l.itemId} className={styles.modalLine}>
              <span className={styles.modalLineName}>{l.name}</span>
              <div className={styles.qtyStepper}>
                <button type="button" className={styles.qtyBtn}
                  onClick={() => onDec(l.itemId)} title={l.qty === 1 ? 'Remove' : 'Decrease'}>
                  <i className={l.qty === 1 ? 'ti ti-trash' : 'ti ti-minus'} />
                </button>
                <span className={styles.qtyValue}>{l.qty}</span>
                <button type="button" className={styles.qtyBtn}
                  onClick={() => onInc(l.itemId)} title="Increase">
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.formRow}>
          <label className={styles.modalLabel}>Order type</label>
          <div className={styles.segmented}>
            {ORDER_TYPES.map((t) => (
              <button key={t.value} type="button"
                className={`${styles.segBtn} ${orderType === t.value ? styles.segActive : ''}`}
                onClick={() => setOrderType(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formRow}>
          <label className={styles.modalLabel}>Dining mode</label>
          <div className={styles.segmented}>
            {DINING_MODES.map((m) => {
              const disabled = isAnytime && m.value !== 'takeaway';
              return (
                <button key={m.value} type="button" disabled={disabled}
                  className={`${styles.segBtn} ${diningMode === m.value ? styles.segActive : ''} ${disabled ? styles.segDisabled : ''}`}
                  onClick={() => !disabled && setDiningMode(m.value)}>
                  <i className={`ti ${m.icon}`} /> {m.label}
                </button>
              );
            })}
          </div>
          {isAnytime && <span className={styles.modalHint}>Anytime Takeaway is takeaway only.</span>}
        </div>

        <div className={styles.formRow}>
          <label className={styles.modalLabel}>Order for</label>
          <select className={styles.modalSelect}
            value={consumerId} onChange={(e) => setConsumerId(e.target.value)}>
            <option value="self">Self ({employeeName})</option>
            {familyMembers.map((m) => (
              <option key={m.familyMemberId} value={m.familyMemberId}>
                {m.relation ? `${m.relation} — ` : ''}{m.fullName}
              </option>
            ))}
          </select>
        </div>

        {needsPickup && (
          <div className={styles.formRow}>
            <label className={styles.modalLabel}>Pickup time</label>
            <input type="time" className={styles.modalSelect}
              value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
            <span className={styles.modalHint}>
              {orderType === 'anytime_takeaway' ? 'At least 2 hours ahead, by 23:00.' : 'By 23:00.'}
            </span>
          </div>
        )}

        {error && <div className={styles.modalError}><i className="ti ti-alert-circle" /> {error}</div>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={styles.modalConfirmBtn} onClick={handlePlace} disabled={!canPlace}>
            {submitting
              ? <><span className={styles.spinnerSm} /> Placing…</>
              : <><i className="ti ti-check" /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SuccessScreen — full confirmation after a successful order.
// ─────────────────────────────────────────
function SuccessScreen({ result, onDone }) {
  const orders = Array.isArray(result?.orders) ? result.orders : [];
  const totalUnits = orders.reduce((s, o) => s + (o.quantity || 0), 0);
  return (
    <div className={styles.page}>
      <div className={styles.successBody}>
        <i className={`ti ti-circle-check ${styles.successIcon}`} />
        <h2 className={styles.successTitle}>Order placed</h2>
        <div className={styles.successDetails}>
          {orders.map((o) => (
            <div key={o.orderId} className={styles.successRow}>
              <span className={styles.successItem}>{o.itemName}</span>
              <span className={styles.successQty}>×{o.quantity}</span>
            </div>
          ))}
          <div className={styles.successRow}>
            <span className={styles.successItem}><strong>Total</strong></span>
            <span className={styles.successQty}>
              <strong>{orders.length} item{orders.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}</strong>
            </span>
          </div>
        </div>
        <p className={styles.successNote}>
          Rates are entered by accounts the next day — your bill updates then.
        </p>
        <div className={styles.successActions}>
          <a href="/my-cafe-orders" className={styles.successLink}>
            <i className="ti ti-receipt" /> View my café orders
          </a>
          <button type="button" className={styles.successAgainBtn} onClick={onDone}>
            Order again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CafePage — main page component.
// ─────────────────────────────────────────
export default function CafePage({ token }) {
  const { userProfile } = useAuth();
  const employeeName =
    userProfile?.employee?.fullName ||
    userProfile?.user?.officialEmployeeNumber ||
    'Self';

  const [menu,    setMenu]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [family, setFamily] = useState([]);

  const [cart, setCart] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCafeMenu(token);
        if (cancelled) return;
        setMenu(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyFamily();
        if (cancelled) return;
        const members = Array.isArray(data?.members) ? data.members : [];
        setFamily(members.filter((m) => m.isActive && !m.deletionRequested));
      } catch {
        if (!cancelled) setFamily([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addItem = (item) => setCart((c) => ({ ...c, [item.itemId]: (c[item.itemId] || 0) + 1 }));
  const incItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decItem = (id) => setCart((c) => {
    const next = { ...c };
    const q = (next[id] || 0) - 1;
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });

  const placeOrder = async (payload) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createBatchOrder(token, payload);
      setSuccess(result);
      setCart({});
      setShowModal(false);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Café</h1>
          <p className={styles.pageSub}>Order window: {CAFE_HOURS_DISPLAY}</p>
        </div></div>
        <div className={styles.loading}>Loading menu…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Café</h1>
          <p className={styles.pageSub}>Order window: {CAFE_HOURS_DISPLAY}</p>
        </div></div>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    );
  }

  if (success) {
    return <SuccessScreen result={success} onDone={() => setSuccess(null)} />;
  }

  const noMenu =
    !menu || menu.notFound === true || !Array.isArray(menu.items) || menu.items.length === 0;

  if (noMenu) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Café</h1>
          <p className={styles.pageSub}>Order window: {CAFE_HOURS_DISPLAY}</p>
        </div></div>
        <div className={styles.emptyCard}>
          <i className={`ti ti-coffee-off ${styles.emptyIcon}`} />
          <h2 className={styles.emptyTitle}>Café menu is being set up</h2>
          <p className={styles.emptyBody}>The café menu is not available yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  const items     = menu.items;
  const beverages = Array.isArray(menu.beverages) ? menu.beverages : [];
  const updated   = formatUpdated(menu.updatedAt);

  const itemsById = {};
  for (const it of [...items, ...beverages]) itemsById[it.itemId] = it;

  const lineCount = Object.keys(cart).length;
  const totalQty  = Object.values(cart).reduce((s, q) => s + q, 0);

  const openModal = () => { setSubmitError(''); setShowModal(true); };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{menu.serviceName || 'Café'}</h1>
          <p className={styles.pageSub}>
            Order window: {CAFE_HOURS_DISPLAY}{' · '}
            {items.length} item{items.length === 1 ? '' : 's'}
            {updated && ` · Updated ${updated}`}
          </p>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Menu</h2>
      <MenuList items={items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />

      {beverages.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Beverages</h2>
          <MenuList items={beverages} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
        </>
      )}

      {lineCount > 0 && (
        <div className={styles.cartBar}>
          <div className={styles.cartSummary}>
            <i className="ti ti-shopping-cart" />
            <span>{lineCount} item{lineCount === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}</span>
          </div>
          <button type="button" className={styles.cartReviewBtn} onClick={openModal}>
            Review &amp; Place Order
          </button>
        </div>
      )}

      {showModal && (
        <OrderModal
          cart={cart}
          itemsById={itemsById}
          employeeName={employeeName}
          familyMembers={family}
          onInc={incItem}
          onDec={decItem}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}
