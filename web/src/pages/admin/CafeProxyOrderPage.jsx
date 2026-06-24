// web/src/pages/admin/CafeProxyOrderPage.jsx
// Café Supervisor — Proxy Ordering — V1.2 Web Slice 5
// Role: cafe_supervisor | cafe_waiter | (legacy) | manager | admin | super_admin
// Path: /cafe-proxy-order
//
// A supervisor places a multi-item café order ON BEHALF of an employee.
// Three sequential states in one component:
//   1. SEARCH   — enter an employee number, resolve the employee + family.
//   2. ORDERING — build a multi-item cart, review modal, place.
//   3. SUCCESS  — confirmation, "order for another employee".
//
// cafe_hours only (W4, 24-Jun): no order-type toggle, no pickup fields. The
// review modal is a stripped copy of CafePage's OrderModal (W2-b — copied, not
// shared; the employee page is NOT touched). Consumer is picked in the modal's
// dropdown (W6): Self (target employee) + the target's active family members.
//
// Styling: reuses CafePage.module.css (menu/cart/modal — brand-correct) plus a
// small CafeProxyOrderPage.module.css for the search step only.
//
// Token: Pattern B — `token` prop from <WithToken>.

import { useState } from 'react';
import { getCafeMenu, createProxyBatchOrder } from '../../services/cafeService';
import { getFamilyForEmployee } from '../../services/familyService';
import cafe from '../../pages/employee/CafePage.module.css';
import styles from './CafeProxyOrderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in',         label: 'Dine-in',  icon: 'ti-armchair' },
  { value: 'takeaway',        label: 'Takeaway', icon: 'ti-shopping-bag' },
  { value: 'outdoor_seating', label: 'Outdoor',  icon: 'ti-sun' },
];

// ─────────────────────────────────────────
// MenuList — copied from CafePage (cafe_hours proxy is otherwise identical).
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
// ProxyOrderModal — review + consumer + dining mode + submit.
// Stripped copy of CafePage's OrderModal: cafe_hours only, so NO order-type
// toggle, NO pickup time/date. Consumer dropdown = Self (target) + family (W6).
// ─────────────────────────────────────────
function ProxyOrderModal({
  cart, itemsById, employeeName, familyMembers,
  onInc, onDec, submitting, error, onClose, onPlace,
}) {
  const [diningMode, setDiningMode] = useState('dine_in');
  const [consumerId, setConsumerId] = useState('self'); // 'self' | familyMemberId

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));

  const canPlace = lines.length > 0 && !submitting;

  const handlePlace = () => {
    const consumerType = consumerId === 'self' ? 'self' : 'family_member';
    const payload = {
      orderType: 'cafe_hours',           // proxy UI is cafe_hours only (W4)
      diningMode,
      consumerType,
      items: lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
    };
    if (consumerType === 'family_member') payload.consumerFamilyMemberId = consumerId;
    onPlace(payload);
  };

  return (
    <div className={cafe.modalOverlay} onClick={onClose}>
      <div className={cafe.modal} onClick={(e) => e.stopPropagation()}>
        <div className={cafe.modalTitle}>Review order — for {employeeName}</div>

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
          <label className={cafe.modalLabel}>Order for</label>
          <select className={cafe.modalSelect} value={consumerId} onChange={(e) => setConsumerId(e.target.value)}>
            <option value="self">Self ({employeeName})</option>
            {familyMembers.map((m) => (
              <option key={m.familyMemberId} value={m.familyMemberId}>
                {m.relation ? `${m.relation} — ` : ''}{m.fullName}
              </option>
            ))}
          </select>
        </div>

        {error && <div className={cafe.modalError}><i className="ti ti-alert-circle" /> {error}</div>}

        <div className={cafe.modalActions}>
          <button type="button" className={cafe.modalCancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={cafe.modalConfirmBtn} onClick={handlePlace} disabled={!canPlace}>
            {submitting
              ? <><span className={cafe.spinnerSm} /> Placing…</>
              : <><i className="ti ti-check" /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CafeProxyOrderPage — main component (search → ordering → success).
// ─────────────────────────────────────────
export default function CafeProxyOrderPage({ token }) {
  // Search state
  const [empNumInput, setEmpNumInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Resolved target (null until a successful search)
  const [target, setTarget] = useState(null); // { employeeNumber, employeeName, family }

  // Menu + cart (loaded once a target is resolved)
  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [cart, setCart] = useState({});

  // Modal + submit
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  // ── Search: resolve employee + family, then load the café menu ──
  const onSearch = async () => {
    const num = empNumInput.trim().toUpperCase();
    if (!num) { setSearchError('Enter an employee number.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      const data = await getFamilyForEmployee(token, num);
      const family = (Array.isArray(data.members) ? data.members : [])
        .filter((m) => m.isActive && !m.deletionRequested);
      setTarget({
        employeeNumber: data.officialEmployeeNumber,
        employeeName: data.employeeName,
        family,
      });
      // Load the café menu now that we have a valid target.
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
      // Backend 404 → "Employee not found: <num>". Surface verbatim.
      setSearchError(e.message);
      setTarget(null);
    } finally {
      setSearching(false);
    }
  };

  const resetToSearch = () => {
    setTarget(null);
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

  // ── Place the proxy order ──
  const placeOrder = async (payload) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createProxyBatchOrder(token, {
        targetEmployeeNumber: target.employeeNumber,
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
          <h2 className={cafe.successTitle}>Order placed for {target.employeeName}</h2>
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
            Billed to {target.employeeName}'s account · rates entered by accounts the next day.
          </p>
          <div className={cafe.successActions}>
            <button type="button" className={cafe.successAgainBtn} onClick={resetToSearch}>
              Order for another employee
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SEARCH state (no target resolved yet) ──
  if (!target) {
    return (
      <div className={cafe.page}>
        <div className={cafe.pageHeader}><div>
          <h1 className={cafe.pageTitle}>Proxy Order</h1>
          <p className={cafe.pageSub}>Place a café order on behalf of an employee · 18:00 – 22:30</p>
        </div></div>

        <div className={styles.searchCard}>
          <label className={styles.searchLabel}>Employee number</label>
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

  // ── ORDERING state (target resolved) ──
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
          <h1 className={cafe.pageTitle}>Proxy Order</h1>
          <p className={cafe.pageSub}>
            Ordering for <strong>{target.employeeName}</strong> · {target.employeeNumber}
            {' · '}{target.family.length} family member{target.family.length === 1 ? '' : 's'} on file
          </p>
        </div>
        <button className={styles.changeBtn} onClick={resetToSearch}>
          <i className="ti ti-switch-horizontal" /> Change employee
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
        <ProxyOrderModal
          cart={cart}
          itemsById={itemsById}
          employeeName={target.employeeName}
          familyMembers={target.family}
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