// ─────────────────────────────────────────
// TeabarSelfOrderPage.jsx — Tea Bar Self-order (Screen 1)
// HomiLabs | Servio | Web
// FILE LOCATION: web/src/pages/employee/TeabarSelfOrderPage.jsx
//
// Two-step flow (Homi, 08-Jul-2026 — location picked before menu is shown,
// unlike café which has no location concept at all):
//   Step A — LocationPicker: employee picks one active Tea Bar location.
//   Step B — Menu + cart + review, only shown once a location is chosen.
//
// "Change location" mid-browsing clears the cart and returns to Step A
// (Homi, 08-Jul-2026 — deliberate full restart, not a partial reset).
//
// Review modal mirrors CafePage.jsx's OrderModal shape, but stripped down
// to what Tea Bar's design lock actually uses: no orderType, no diningMode,
// no consumer/family picker, no pickup time/date. Location is NOT a modal
// field here — it's already fixed by Step A before the modal ever opens.
//
// Success screen is an exact structural copy of CafePage's SuccessScreen
// (checkmark, itemized list, total, rate note, two actions) — per the
// locked design decision in the Tea Bar screen map, §1a. "Order again"
// does a FULL reset — cart AND location — back to Step A (Homi, 06-Jul-2026,
// confirmed again 08-Jul-2026 for the mid-browsing case too).
//
// Menu and locations are both loaded eagerly on mount (not lazy per step) —
// menu content doesn't depend on which location is chosen, so there's no
// reason to delay fetching it. This is my own default choice, not something
// explicitly decided on paper — flagged here in case it should be revisited.
// ─────────────────────────────────────────

import { useState, useEffect } from 'react';
import { getTeabarMenu } from '../../services/teabarMenuService';
import { createSelfOrder } from '../../services/teabarOrderService';
import { listTeabarLocations } from '../../services/teabarLocationService';
import styles from './TeabarSelfOrderPage.module.css';

const TEABAR_HOURS_DISPLAY = '07:30–13:00, 14:00–17:15 (closed for lunch)';

// ─────────────────────────────────────────
// LocationPicker — Step A
// ─────────────────────────────────────────
function LocationPicker({ locations, loading, error, onSelect }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tea Bar</h1>
          <p className={styles.pageSub}>Choose where you're ordering from</p>
        </div>
      </div>

      {loading && <div className={styles.loading}>Loading locations…</div>}

      {!loading && error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {!loading && !error && locations.length === 0 && (
        <div className={styles.emptyCard}>
          <i className={`ti ti-map-pin-off ${styles.emptyIcon}`} />
          <h2 className={styles.emptyTitle}>No Tea Bar locations available</h2>
          <p className={styles.emptyBody}>Please check back later.</p>
        </div>
      )}

      {!loading && !error && locations.length > 0 && (
        <div className={styles.locationGrid}>
          {locations.map((loc) => {
            const noAttendant = !loc.assignedAttendantUid;
            return (
              <button
                key={loc.locationId}
                type="button"
                className={`${styles.locationCard} ${noAttendant ? styles.locationCardWarning : ''}`}
                onClick={() => onSelect(loc)}
              >
                <i className="ti ti-map-pin" />
                <span>{loc.locationName}</span>
                {noAttendant && (
                  <span className={styles.noAttendantBadge}>
                    <i className="ti ti-alert-triangle" /> No attendant on duty
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MenuList — Step B, item rows with Add button / quantity stepper.
// Same interaction pattern as café's MenuList (CafePage.jsx).
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
// ReviewModal — Step B review + submit. No location field (already fixed
// by Step A). No orderType / diningMode / consumer picker — Tea Bar's
// design lock excludes all of these (TeaBar_Design_Lock_03Jul2026.md §11).
// ─────────────────────────────────────────
function ReviewModal({ cart, itemsById, submitting, error, onClose, onPlace }) {
  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));

  const canPlace = lines.length > 0 && !submitting;

  const handlePlace = () => {
    onPlace({
      items: lines.map((l) => ({ itemId: l.itemId, quantity: l.qty })),
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Review your order</div>

        <div className={styles.modalLines}>
          {lines.map((l) => (
            <div key={l.itemId} className={styles.modalLine}>
              <span className={styles.modalLineName}>{l.name}</span>
              <span className={styles.qtyValue}>×{l.qty}</span>
            </div>
          ))}
        </div>

        <p className={styles.modalHint}>Open {TEABAR_HOURS_DISPLAY}.</p>

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
// SuccessScreen — exact structural copy of CafePage's SuccessScreen.
// ─────────────────────────────────────────
function SuccessScreen({ result, onDone }) {
  const orders = Array.isArray(result?.orders) ? result.orders : [];
  const totalUnits = orders.reduce((s, o) => s + (o.quantity || 0), 0);
  return (
    <div className={styles.page}>
      <div className={styles.successBody}>
        <i className={`ti ti-circle-check ${styles.successIcon}`} />
        <h2 className={styles.successTitle}>Order placed</h2>
        {result?.locationName && (
          <p className={styles.successLocation}>From {result.locationName}</p>
        )}
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
          <a href="/my-teabar-orders" className={styles.successLink}>
            <i className="ti ti-receipt" /> View my order history
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
// TeabarSelfOrderPage — main page component.
// ─────────────────────────────────────────
export default function TeabarSelfOrderPage({ token }) {
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState('');

  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');

  const [selectedLocation, setSelectedLocation] = useState(null); // null = Step A

  const [cart, setCart] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      setLocError('');
      try {
        const data = await listTeabarLocations(token); // active only, default
        if (!cancelled) setLocations(data);
      } catch (e) {
        if (!cancelled) setLocError(e.message);
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setMenuLoading(true);
      setMenuError('');
      try {
        const data = await getTeabarMenu(token);
        if (!cancelled) setMenu(data);
      } catch (e) {
        if (!cancelled) setMenuError(e.message);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const addItem = (item) => setCart((c) => ({ ...c, [item.itemId]: (c[item.itemId] || 0) + 1 }));
  const incItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decItem = (id) => setCart((c) => {
    const next = { ...c };
    const q = (next[id] || 0) - 1;
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });

  // Full restart — used by both "Change location" mid-browsing and
  // "Order again" after a successful order (Homi, 08-Jul-2026: both cases
  // clear the cart and return to Step A, no partial-reset path exists).
  const restart = () => {
    setSelectedLocation(null);
    setCart({});
    setShowModal(false);
    setSubmitError('');
    setSuccess(null);
  };

  const placeOrder = async ({ items }) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createSelfOrder(token, {
        locationId: selectedLocation.locationId,
        items,
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

  if (success) {
    return <SuccessScreen result={success} onDone={restart} />;
  }

  // ── Step A — no location chosen yet ──
  if (!selectedLocation) {
    return (
      <LocationPicker
        locations={locations}
        loading={locLoading}
        error={locError}
        onSelect={setSelectedLocation}
      />
    );
  }

  // ── Step B — location chosen, show menu ──
  if (menuLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Tea Bar</h1>
          <p className={styles.pageSub}>Ordering from {selectedLocation.locationName}</p>
        </div></div>
        <div className={styles.loading}>Loading menu…</div>
      </div>
    );
  }

  if (menuError) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Tea Bar</h1>
          <p className={styles.pageSub}>Ordering from {selectedLocation.locationName}</p>
        </div></div>
        <div className={styles.errorBanner}>{menuError}</div>
      </div>
    );
  }

  const noMenu =
    !menu || menu.notFound === true || !Array.isArray(menu.items) || menu.items.length === 0;

  if (noMenu) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}><div>
          <h1 className={styles.pageTitle}>Tea Bar</h1>
          <p className={styles.pageSub}>Ordering from {selectedLocation.locationName}</p>
        </div></div>
        <div className={styles.emptyCard}>
          <i className={`ti ti-coffee-off ${styles.emptyIcon}`} />
          <h2 className={styles.emptyTitle}>Tea Bar menu is being set up</h2>
          <p className={styles.emptyBody}>The Tea Bar menu is not available yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  const items = menu.items;
  const itemsById = {};
  for (const it of items) itemsById[it.itemId] = it;

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  const openModal = () => { setSubmitError(''); setShowModal(true); };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{menu.serviceName || 'Tea Bar'}</h1>
          <p className={styles.pageSub}>
            Open {TEABAR_HOURS_DISPLAY} · {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className={styles.locationStrip}>
        <span><i className="ti ti-map-pin" /> Ordering from <strong>{selectedLocation.locationName}</strong></span>
        <button type="button" className={styles.changeLocationBtn} onClick={restart}>
          Change
        </button>
      </div>

      {!selectedLocation.assignedAttendantUid && (
        <div className={styles.noAttendantStrip}>
          <i className="ti ti-alert-triangle" /> No attendant currently on duty here — your order may be delayed. You can pick a nearby location instead.
        </div>
      )}

      <h2 className={styles.sectionTitle}>Menu</h2>
      <MenuList items={items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />

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
        <ReviewModal
          cart={cart}
          itemsById={itemsById}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}