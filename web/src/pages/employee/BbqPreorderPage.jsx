// web/src/pages/employee/BbqPreorderPage.jsx
// BBQ — Preorder tab — Screen #1
// Role: employee
// Path: /bbq-preorder (to be wired in App.jsx + Sidebar.jsx once this is confirmed working)
//
// Orderable from menu publish until bbqSettings.preorderCutoffTime
// (17:30 Fri). Past cutoff, ordering is NOT blocked (Option B, confirmed
// 13-Jul-2026) — a visible warning shows instead, and the order is
// submitted as a late request (backend stamps isLateRequest:true,
// lateRequestApprovalStatus:'pending' automatically; nothing extra is
// sent from here — the backend derives lateness from the server clock
// vs. event.preorderCutoffAt, not from anything the client claims).
//
// ASSUMPTION FLAGGED, NOT YET VERIFIED: getMyFamily()'s return shape.
// Written here as `familyData.members` (array), each with
// { familyMemberId, fullName, relation }. Grep-verify against the real
// backend response before trusting this — see chat for the exact check.
//
// Reuses TeabarSelfOrderPage.module.css directly for cart/menu/modal/
// success styling (imported as `teabar`) rather than duplicating those
// classes — only genuinely new pieces (consumer picker, dining mode
// toggle, late banner) live in this page's own small module.

import { useState, useEffect } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import { createBbqOrder } from '../../services/bbqOrderService';
import { getMyFamily } from '../../services/familyService';
import teabar from './TeabarSelfOrderPage.module.css';
import styles from './BbqPreorderPage.module.css';

const DINING_MODES = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
];

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
  cart, itemsById, familyMembers, isLate,
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
        <div className={teabar.modalTitle}>Review preorder</div>

        {isLate && (
          <div className={styles.lateBanner}>
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
              : <><i className="ti ti-check" /> Place Preorder</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BbqPreorderPage({ token }) {
  const [event, setEvent] = useState(undefined); // undefined = loading, null = none published
  const [eventError, setEventError] = useState('');

  const [familyMembers, setFamilyMembers] = useState([]);

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
        // ASSUMPTION — see file header. Adjust once verified.
        const members = (familyData?.members || []).filter((m) => m.isActive !== false);
        setFamilyMembers(members);
      } catch (e) {
        // Non-fatal — consumer picker just won't offer family members.
      }
    })();
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
        orderType: 'preorder',
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
          <h2 className={teabar.successTitle}>
            {success.isLateRequest ? 'Late preorder submitted' : 'Preorder placed'}
          </h2>
          <p className={teabar.successLocation}>For {event.eventDate}</p>
          {success.isLateRequest && (
            <p className={teabar.successNote}>
              Pending Manager approval — you'll see the outcome in My BBQ Orders.
            </p>
          )}
          <div className={teabar.successActions}>
            <button type="button" className={teabar.successAgainBtn} onClick={() => setSuccess(null)}>
              Order more
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = event.menu?.preorderItems || [];
  const itemsById = {};
  for (const it of items) itemsById[it.itemId] = it;

  const now = new Date();
  const cutoff = event.preorderCutoffAt ? new Date(event.preorderCutoffAt) : null;
  const isLate = cutoff ? now > cutoff : false;

  const lineCount = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <div className={teabar.page}>
      <div className={teabar.pageHeader}>
        <div>
          <h1 className={teabar.pageTitle}>BBQ Preorder</h1>
          <p className={teabar.pageSub}>{event.eventDate}</p>
        </div>
      </div>

      {isLate && (
        <div className={styles.lateBanner}>
          <i className="ti ti-clock-exclamation" />
          Preorder cutoff has passed — orders placed now go in as a late
          request, pending Manager approval.
        </div>
      )}

      {items.length === 0 ? (
        <div className={teabar.emptyCard}>
          <i className={`ti ti-meat-off ${teabar.emptyIcon}`} />
          <h2 className={teabar.emptyTitle}>No preorder items on this week's menu</h2>
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
                Review &amp; Place Preorder
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