// web/src/pages/admin/TeabarOfficialOrderPage.jsx
// Tea Bar — Official Order — Screen 5
// Role: teabar_attendant | admin | super_admin (per the backend route's
// role gate — same as proxy). NOT manager.
//
// Nearly identical to Screen 4, three differences: (1) the searched
// employee is the SPONSOR, not the consumer, (2) two optional fields —
// cost centre note, guest/occasion name, (3) the item is served
// immediately regardless of billing approval — success wording must say
// so plainly, not imply the order is still pending (locked decision,
// mirrors café's official-meal model).

import { useState, useEffect } from 'react';
import { getMyTeabarLocation } from '../../services/teabarLocationService';
import { getTeabarMenu } from '../../services/teabarMenuService';
import {
  lookupTeabarEmployee,
  createOfficialOrder,
} from '../../services/teabarOrderService';
import teabar from '../employee/TeabarSelfOrderPage.module.css';
import styles from './TeabarOfficialOrderPage.module.css';

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

function OfficialReviewModal({ cart, itemsById, sponsorName, submitting, error, onClose, onPlace }) {
  const [costCentreCode, setCostCentreCode] = useState('');
  const [officialGuestName, setOfficialGuestName] = useState('');

  const lines = Object.entries(cart).map(([itemId, qty]) => ({
    itemId, qty, name: itemsById[itemId]?.itemName || itemId,
  }));
  const canPlace = lines.length > 0 && !submitting;

  const handlePlace = () => {
    onPlace({
      items: lines.map((l) => ({ itemId: l.itemId, quantity: l.qty })),
      costCentreCode: costCentreCode.trim() || null,
      officialGuestName: officialGuestName.trim() || null,
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
          <label className={styles.fieldLabel}>Cost centre (as communicated · optional)</label>
          <input
            className={styles.textInput}
            value={costCentreCode}
            onChange={(e) => setCostCentreCode(e.target.value)}
            placeholder="e.g. 12345678"
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel}>Guest / occasion (optional)</label>
          <input
            className={styles.textInput}
            value={officialGuestName}
            onChange={(e) => setOfficialGuestName(e.target.value)}
            placeholder="e.g. Visiting auditor"
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

export default function TeabarOfficialOrderPage({ token }) {
  const [location, setLocation] = useState(undefined);
  const [locError, setLocError] = useState('');

  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');

  const [empNumInput, setEmpNumInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sponsor, setSponsor] = useState(null);

  const [cart, setCart] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const loc = await getMyTeabarLocation(token);
        setLocation(loc);
      } catch (e) {
        setLocError(e.message);
        setLocation(null);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setMenuLoading(true);
      setMenuError('');
      try {
        const data = await getTeabarMenu(token);
        setMenu(data);
      } catch (e) {
        setMenuError(e.message);
      } finally {
        setMenuLoading(false);
      }
    })();
  }, [token]);

  const onSearch = async () => {
    const num = empNumInput.trim().toUpperCase();
    if (!num) { setSearchError('Enter an employee number.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      const found = await lookupTeabarEmployee(token, num);
      setSponsor(found);
    } catch (e) {
      setSearchError(e.message);
      setSponsor(null);
    } finally {
      setSearching(false);
    }
  };

  const resetSponsor = () => {
    setSponsor(null);
    setEmpNumInput('');
    setSearchError('');
    setCart({});
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

  const placeOrder = async ({ items, costCentreCode, officialGuestName }) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createOfficialOrder(token, {
        sponsoringEmployeeNumber: sponsor.officialEmployeeNumber,
        items,
        costCentreCode,
        officialGuestName,
      });
      setSuccess({ ...result, sponsorName: sponsor.fullName });
      setCart({});
      setShowModal(false);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (location === undefined) {
    return <div className={teabar.page}><div className={teabar.loading}>Loading…</div></div>;
  }

  if (location === null) {
    return (
      <div className={teabar.page}>
        <div className={styles.notAssignedCard}>
          <i className="ti ti-map-pin-off" />
          <h2>No location assigned yet</h2>
          <p>{locError || "You're not currently covering a Tea Bar location. Ask a Manager or Admin to assign you one on the Locations screen."}</p>
        </div>
      </div>
    );
  }

  if (success) {
    const orders = Array.isArray(success.orders) ? success.orders : [];
    const totalUnits = orders.reduce((s, o) => s + (o.quantity || 0), 0);
    return (
      <div className={teabar.page}>
        <div className={teabar.successBody}>
          <i className={`ti ti-circle-check ${teabar.successIcon}`} />
          <h2 className={teabar.successTitle}>Official order served · sponsored by {success.sponsorName}</h2>
          <p className={teabar.successLocation}>From {success.locationName}</p>
          <div className={teabar.successDetails}>
            {orders.map((o) => (
              <div key={o.orderId} className={teabar.successRow}>
                <span className={teabar.successItem}>{o.itemName}</span>
                <span className={teabar.successQty}>×{o.quantity}</span>
              </div>
            ))}
            <div className={teabar.successRow}>
              <span className={teabar.successItem}><strong>Total</strong></span>
              <span className={teabar.successQty}>
                <strong>{orders.length} item{orders.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}</strong>
              </span>
            </div>
          </div>
          <p className={teabar.successNote}>
            Item served now · billed to an official account, billing approval by admin still pending.
          </p>
          <div className={teabar.successActions}>
            <button type="button" className={teabar.successAgainBtn} onClick={resetSponsor}>
              Place another official order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className={teabar.page}>
        <div className={teabar.pageHeader}><div>
          <h1 className={teabar.pageTitle}>Official Order</h1>
          <p className={teabar.pageSub}>Ordering from <strong>{location.locationName}</strong></p>
        </div></div>

        <div className={styles.searchCard}>
          <label className={styles.searchLabel}>Sponsoring employee number</label>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              value={empNumInput}
              onChange={(e) => setEmpNumInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              placeholder="e.g. FFL0003"
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

  const noMenu = !menu || menu.notFound === true || !Array.isArray(menu.items) || menu.items.length === 0;
  const items = noMenu ? [] : menu.items;
  const itemsById = {};
  for (const it of items) itemsById[it.itemId] = it;

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <div className={teabar.page}>
      <div className={teabar.pageHeader}>
        <div>
          <h1 className={teabar.pageTitle}>Official Order</h1>
          <p className={teabar.pageSub}>
            Sponsored by <strong>{sponsor.fullName}</strong> · {sponsor.officialEmployeeNumber}
            {' · from '}{location.locationName}
          </p>
        </div>
        <button className={styles.changeBtn} onClick={resetSponsor}>
          <i className="ti ti-switch-horizontal" /> Change sponsor
        </button>
      </div>

      {menuLoading ? (
        <div className={teabar.loading}>Loading menu…</div>
      ) : menuError ? (
        <div className={teabar.errorBanner}>{menuError}</div>
      ) : noMenu ? (
        <div className={teabar.emptyCard}>
          <i className={`ti ti-coffee-off ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>Tea Bar menu is being set up</h2>
          <p className={teabar.emptyBody}>Please check back later.</p>
        </div>
      ) : (
        <>
          <h2 className={teabar.sectionTitle}>Menu</h2>
          <MenuList items={items} cart={cart} onAdd={addItem} onInc={incItem} onDec={decItem} />

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
        <OfficialReviewModal
          cart={cart}
          itemsById={itemsById}
          sponsorName={sponsor.fullName}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowModal(false)}
          onPlace={placeOrder}
        />
      )}
    </div>
  );
}