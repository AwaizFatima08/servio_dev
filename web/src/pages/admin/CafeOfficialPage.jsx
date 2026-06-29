// web/src/pages/admin/CafeOfficialPage.jsx
// Café — Official Meal Placement — V1.2 Slice 7 (web)
// Role: cafe_supervisor | manager | admin | super_admin   (cafe_waiter EXCLUDED)
// Path: /cafe-official
//
// A supervisor places a multi-item OFFICIAL café order, billed to an official
// account and anchored to a SPONSORING employee. Copied from CafeProxyOrderPage
// (search → ordering → success), with three changes:
//   1. NO consumer picker — an official meal is always 'self' (the official
//      context, not a family member). The modal has no "Order for" dropdown.
//   2. The searched employee IS the sponsor (relabelled "Sponsoring employee").
//   3. The modal adds two optional fields: a cost-centre free-text NOTE (as
//      communicated to the supervisor — for the accounts audit, never a key)
//      and an official-guest / occasion descriptive field.
//
// cafe_hours only (mirrors the proxy UI): no order-type toggle, no pickup
// fields. Approval is billing-only and runs in parallel to the kitchen — the
// meal flows onto the board like any order; admin approves billing separately.
//
// Styling: reuses CafePage.module.css (menu/cart/modal) + the proxy page's
// search-step module CSS (generic search styling, nothing proxy-specific).
// Token: Pattern B — `token` prop from <WithToken>.

import { useState } from 'react';
import { getCafeMenu } from '../../services/cafeService';
import { createOfficialBatchOrder } from '../../services/cafeOfficialService';
import { getFamilyForEmployee } from '../../services/familyService';
import cafe from '../../pages/employee/CafePage.module.css';
import styles from './CafeProxyOrderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in',         label: 'Dine-in',  icon: 'ti-armchair' },
  { value: 'takeaway',        label: 'Takeaway', icon: 'ti-shopping-bag' },
  { value: 'outdoor_seating', label: 'Outdoor',  icon: 'ti-sun' },
];

// ─────────────────────────────────────────
// MenuList — copied from the proxy page (identical).
// ─────────────────────────────────────────
function MenuList({ items, cart, onAdd, onInc, onDec }) {
  return (
    <div className={cafe.menuList}>
      {items.map((item) => {
        const qty = cart[item.itemId] || 0;
        const inCart = qty > 0;
        return (
          <div key={item.itemId} className={cafe.menuRow}>
            <div className={cafe.menuRowLeft}>
              <span className={cafe.menuRowName}>{item.itemName}</span>
              {item.baseUnit && <span className={cafe.menuRowDetail}>per {item.baseUnit}</span>}
            </div>
            <div className={cafe.menuRowRight}>
              {item.foodTypeName && <span className={cafe.menuBadge}>{item.foodTypeName}</span>}
              {inCart ? (
                <div className={cafe.qtyStepper}>
                  <button type="button" className={cafe.qtyBtn} onClick={() => onDec(item.itemId)}
                    title={qty === 1 ? 'Remove from order' : 'Decrease quantity'}>
                    <i className={qty === 1 ? 'ti ti-trash' : 'ti ti-minus'} />
                  </button>
                  <span className={cafe.qtyValue}>{qty}</span>
                  <button type="button" className={cafe.qtyBtn} onClick={() => onInc(item.itemId)} title="Increase quantity">
                    <i className="ti ti-plus" />
                  </button>
                </div>
              ) : (
                <button type="button" className={cafe.addBtn} onClick={() => onAdd(item)}>
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
// OfficialOrderModal — review + dining mode + cost centre + guest name + submit.
// NO consumer dropdown (official is always self). cafe_hours only.
// ─────────────────────────────────────────
function OfficialOrderModal({
  cart, itemsById, sponsorName,
  onInc, onDec, submitting, error, onClose, onPlace,
}) {
  const [diningMode, setDiningMode] = useState('dine_in');
  const [costCentreCode, setCostCentreCode] = useState('');
  const [officialGuestName, setOfficialGuestName] = useState('');

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));

  const canPlace = lines.length > 0 && !submitting;

  const handlePlace = () => {
    const payload = {
      orderType: 'cafe_hours',           // official UI is cafe_hours only
      diningMode,
      costCentreCode: costCentreCode.trim() || null,
      officialGuestName: officialGuestName.trim() || null,
      items: lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
    };
    onPlace(payload);
  };

  return (
    <div className={cafe.modalOverlay} onClick={onClose}>
      <div className={cafe.modal} onClick={(e) => e.stopPropagation()}>
        <div className={cafe.modalTitle}>Official order — sponsored by {sponsorName}</div>

        <div className={cafe.modalLines}>
          {lines.map((l) => (
            <div key={l.itemId} className={cafe.modalLine}>
              <span className={cafe.modalLineName}>{l.name}</span>
              <div className={cafe.qtyStepper}>
                <button type="button" className={cafe.qtyBtn} onClick={() => onDec(l.itemId)}
                  title={l.qty === 1 ? 'Remove' : 'Decrease'}>
                  <i className={l.qty === 1 ? 'ti ti-trash' : 'ti ti-minus'} />
                </button>
                <span className={cafe.qtyValue}>{l.qty}</span>
                <button type="button" className={cafe.qtyBtn} onClick={() => onInc(l.itemId)} title="Increase">
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={cafe.formRow}>
          <label className={cafe.modalLabel}>Dining mode</label>
          <div className={cafe.segmented}>
            {DINING_MODES.map((m) => (
              <button key={m.value} type="button"
                className={`${cafe.segBtn} ${diningMode === m.value ? cafe.segActive : ''}`}
                onClick={() => setDiningMode(m.value)}>
                <i className={`ti ${m.icon}`} /> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className={cafe.formRow}>
          <label className={cafe.modalLabel}>Cost centre (as communicated · optional)</label>
          <input
            className={cafe.modalSelect}
            value={costCentreCode}
            onChange={(e) => setCostCentreCode(e.target.value)}
            placeholder="e.g. 12345678"
          />
        </div>

        <div className={cafe.formRow}>
          <label className={cafe.modalLabel}>Guest / occasion (optional)</label>
          <input
            className={cafe.modalSelect}
            value={officialGuestName}
            onChange={(e) => setOfficialGuestName(e.target.value)}
            placeholder="e.g. Visiting auditor from Head Office"
          />
        </div>

        {error && <div className={cafe.modalError}><i className="ti ti-alert-circle" /> {error}</div>}

        <div className={cafe.modalActions}>
          <button type="button" className={cafe.modalCancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={cafe.modalConfirmBtn} onClick={handlePlace} disabled={!canPlace}>
            {submitting
              ? <><span className={cafe.spinnerSm} /> Placing…</>
              : <><i className="ti ti-check" /> Place Official Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CafeOfficialPage — main component (search → ordering → success).
// ─────────────────────────────────────────
export default function CafeOfficialPage({ token }) {
  // Search state
  const [empNumInput, setEmpNumInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Resolved sponsor (null until a successful search)
  const [sponsor, setSponsor] = useState(null); // { employeeNumber, employeeName }

  // Menu + cart
  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [cart, setCart] = useState({});

  // Modal + submit
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  // ── Search: resolve the sponsoring employee (Option A: reuse the family
  // endpoint purely for number → name; the family list is ignored). ──
  const onSearch = async () => {
    const num = empNumInput.trim().toUpperCase();
    if (!num) { setSearchError('Enter a sponsoring employee number.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      const data = await getFamilyForEmployee(token, num);
      setSponsor({
        employeeNumber: data.officialEmployeeNumber,
        employeeName: data.employeeName,
      });
      setMenuLoading(true);
      setMenuError('');
      try {
        const m = await getCafeMenu(token);
        setMenu(m);
      } catch (e) {
        setMenuError(e.message);
      } finally {
        setMenuLoading(false);
      }
    } catch (e) {
      setSearchError(e.message);
      setSponsor(null);
    } finally {
      setSearching(false);
    }
  };

  const resetToSearch = () => {
    setSponsor(null);
    setMenu(null);
    setCart({});
    setEmpNumInput('');
    setSearchError('');
    setSuccess(null);
  };

  // ── Cart ops ──
  const addItem = (item) => setCart((c) => ({ ...c, [item.itemId]: (c[item.itemId] || 0) + 1 }));
  const incItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decItem = (id) => setCart((c) => {
    const next = { ...c };
    const q = (next[id] || 0) - 1;
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });

  // ── Place the official order ──
  const placeOrder = async (payload) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createOfficialBatchOrder(token, {
        sponsoringEmployeeNumber: sponsor.employeeNumber,
        ...payload,
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

  // ── SUCCESS state ──
  if (success) {
    const orders = Array.isArray(success.orders) ? success.orders : [];
    const totalUnits = orders.reduce((s, o) => s + (o.quantity || 0), 0);
    return (
      <div className={cafe.page}>
        <div className={cafe.successBody}>
          <i className={`ti ti-circle-check ${cafe.successIcon}`} />
          <h2 className={cafe.successTitle}>Official meal placed · sponsored by {sponsor.employeeName}</h2>
          <div className={cafe.successDetails}>
            {orders.map((o) => (
              <div key={o.orderId} className={cafe.successRow}>
                <span className={cafe.successItem}>{o.itemName}</span>
                <span className={cafe.successQty}>×{o.quantity}</span>
              </div>
            ))}
            <div className={cafe.successRow}>
              <span className={cafe.successItem}><strong>Total</strong></span>
              <span className={cafe.successQty}>
                <strong>{orders.length} item{orders.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}</strong>
              </span>
            </div>
          </div>
          <p className={cafe.successNote}>
            Billed to an official account · pending billing approval by admin.
          </p>
          <div className={cafe.successActions}>
            <button type="button" className={cafe.successAgainBtn} onClick={resetToSearch}>
              Place another official order
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SEARCH state ──
  if (!sponsor) {
    return (
      <div className={cafe.page}>
        <div className={cafe.pageHeader}><div>
          <h1 className={cafe.pageTitle}>Official Order</h1>
          <p className={cafe.pageSub}>Place an official café order billed to an official account · 18:00 – 22:30</p>
        </div></div>

        <div className={styles.searchCard}>
          <label className={styles.searchLabel}>Sponsoring employee number</label>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              value={empNumInput}
              onChange={(e) => setEmpNumInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              placeholder="e.g. FFL00003"
              autoFocus
            />
            <button className={styles.searchBtn} onClick={onSearch} disabled={searching}>
              {searching ? 'Searching…' : <><i className="ti ti-search" /> Search</>}
            </button>
          </div>
          {searchError && (
            <div className={styles.searchError}><i className="ti ti-alert-circle" /> {searchError}</div>
          )}
        </div>
      </div>
    );
  }

  // ── ORDERING state ──
  const noMenu = !menu || menu.notFound === true || !Array.isArray(menu.items) || menu.items.length === 0;
  const items = noMenu ? [] : menu.items;
  const beverages = (!noMenu && Array.isArray(menu.beverages)) ? menu.beverages : [];

  const itemsById = {};
  for (const it of [...items, ...beverages]) itemsById[it.itemId] = it;

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <div className={cafe.page}>
      <div className={cafe.pageHeader}>
        <div>
          <h1 className={cafe.pageTitle}>Official Order</h1>
          <p className={cafe.pageSub}>
            Sponsored by <strong>{sponsor.employeeName}</strong> · {sponsor.employeeNumber}
            {' · billed to an official account'}
          </p>
        </div>
        <button className={styles.changeBtn} onClick={resetToSearch}>
          <i className="ti ti-switch-horizontal" /> Change sponsor
        </button>
      </div>

      {menuLoading ? (
        <div className={cafe.loading}>Loading menu…</div>
      ) : menuError ? (
        <div className={cafe.errorBanner}>{menuError}</div>
      ) : noMenu ? (
        <div className={cafe.emptyCard}>
          <i className={`ti ti-coffee-off ${cafe.emptyIcon}`} />
          <h2 className={cafe.emptyTitle}>Café menu is being set up</h2>
          <p className={cafe.emptyBody}>The café menu is not available yet.</p>
        </div>
      ) : (
        <>
          <h2 className={cafe.sectionTitle}>Menu</h2>
          <MenuList items={items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
          {beverages.length > 0 && (
            <>
              <h2 className={cafe.sectionTitle}>Beverages</h2>
              <MenuList items={beverages} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />
            </>
          )}

          {lineCount > 0 && (
            <div className={cafe.cartBar}>
              <div className={cafe.cartSummary}>
                <i className="ti ti-shopping-cart" />
                <span>{lineCount} item{lineCount === 1 ? '' : 's'} · {totalQty} unit{totalQty === 1 ? '' : 's'}</span>
              </div>
              <button type="button" className={cafe.cartReviewBtn}
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
