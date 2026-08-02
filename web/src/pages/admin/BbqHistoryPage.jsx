// web/src/pages/admin/BbqHistoryPage.jsx
// BBQ — History — Screen #15 (new, added 02-Aug-2026)
// Role: bbq_supervisor | manager | admin | super_admin
// Path: /bbq-history
//
// Read-only audit trail for proxy and official BBQ orders — direct request
// from field testing (M9/M10-adjacent gap: nobody could see what had been
// placed on someone else's behalf, or the outcome of a billing decision,
// after the fact).
//
// SHAPE COPIED FROM: TeabarSharedHistoryPage.jsx, not CafeHistoryPage.jsx.
// Café's history is a table because cafeOrders is one document per item
// line — it has to reassemble rows into meaning. bbqOrders is one document
// per ORDER already (items[] array inside), same as Tea Bar's grouped
// output — a card grid is the correct shape here, not a table.
//
// FILTERS: Event Date and Employee Number, mutually exclusive (same
// trade-off Tea Bar made across three filters) — avoids a 3-field
// composite index for what is a genuinely small weekly dataset. No
// "include cancelled" toggle — history shows everything by design, same
// simpler choice Tea Bar made (café's toggle exists because café's
// day-to-day volume makes cancelled-by-default noisy; BBQ's doesn't).
//
// SCOPE: this screen is specifically the proxy/official audit trail, not
// general order history — self-placed live/preorder orders are filtered
// out CLIENT-SIDE (bookingSource !== 'self') rather than adding a third
// backend filter path. BBQ's total order volume is low enough that this
// costs nothing and keeps the index count down.
//
// Token: Pattern B — `token` prop from <WithToken>.
// Styling: zero new CSS — reuses TeabarSharedHistoryPage.module.css
// directly (card grid, badges, pills — all generic layout already
// carrying every class this page needs).

import { useState, useEffect, useCallback } from 'react';
import { getBbqOrderHistory, editBbqOrder, cancelBbqOrder } from '../../services/bbqOrderService';
import styles from './TeabarSharedHistoryPage.module.css';
// Modal/action-button classes reused from BbqMyOrdersPage.module.css —
// TeabarSharedHistoryPage.module.css has none of these (it was built as a
// pure read-only view, no actions). Not guessed at — these exact class
// names are confirmed in use in BbqMyOrdersPage.jsx.
import mgmt from '../employee/BbqMyOrdersPage.module.css';

const SOURCE_LABELS = { self: 'Self', proxy: 'Proxy', official: 'Official' };
const STATUS_LABELS = { placed: 'Placed', accepted: 'Accepted', prepared: 'Prepared', cancelled: 'Cancelled' };
const APPROVAL_LABELS = {
  pending_approval: 'Approval pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Edit modal — direct adaptation of BbqMyOrdersPage.jsx's own EditModal,
// same quantity-stepper shape, reused here for role-based management
// rather than ownership-based.
function EditOrderModal({ order, submitting, error, onClose, onSave }) {
  const [quantities, setQuantities] = useState(
    Object.fromEntries(order.items.map((it) => [it.itemId, it.quantity]))
  );

  const inc = (id) => setQuantities((q) => ({ ...q, [id]: q[id] + 1 }));
  const dec = (id) => setQuantities((q) => ({ ...q, [id]: Math.max(1, q[id] - 1) }));

  const handleSave = () => {
    const items = order.items.map((it) => ({ itemId: it.itemId, quantity: quantities[it.itemId] }));
    onSave(items);
  };

  return (
    <div className={mgmt.overlay} onClick={onClose}>
      <div className={mgmt.modal} onClick={(e) => e.stopPropagation()}>
        <div className={mgmt.modalTitle}>Edit order — {order.employeeName}</div>
        {order.items.map((it) => (
          <div key={it.itemId} className={mgmt.editLine}>
            <span className={mgmt.editLineName}>{it.itemName}</span>
            <div className={mgmt.qtyStepper}>
              <button type="button" className={mgmt.qtyBtn} onClick={() => dec(it.itemId)}>−</button>
              <span className={mgmt.qtyValue}>{quantities[it.itemId]}</span>
              <button type="button" className={mgmt.qtyBtn} onClick={() => inc(it.itemId)}>+</button>
            </div>
          </div>
        ))}
        {error && <div className={mgmt.rowError}><i className="ti ti-alert-circle" /> {error}</div>}
        <div className={mgmt.modalActions}>
          <button className={mgmt.cancelModalBtn} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className={mgmt.confirmModalBtn} onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtCreatedAt(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function BbqHistoryPage({ token }) {
  const [filters, setFilters] = useState({ eventDate: '', employeeNumber: '' });
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tracks the last-applied filter so a post-edit/cancel refresh re-runs
  // the SAME query, not a reset to "all orders" — same principle as
  // café's history buildOpts().
  const [activeQuery, setActiveQuery] = useState({});

  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const load = useCallback(async (activeFilters) => {
    setLoading(true);
    setError('');
    setActiveQuery(activeFilters);
    try {
      const data = await getBbqOrderHistory(token, activeFilters);
      setAllOrders(data.orders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load({}); }, [load]);

  const onCancelOrder = async (orderId) => {
    setBusyId(orderId);
    setRowError((r) => ({ ...r, [orderId]: '' }));
    try {
      await cancelBbqOrder(token, orderId);
      await load(activeQuery);
    } catch (e) {
      setRowError((r) => ({ ...r, [orderId]: e.message }));
    } finally {
      setBusyId(null);
    }
  };

  const onSaveEdit = async (items) => {
    setEditSubmitting(true);
    setEditError('');
    try {
      await editBbqOrder(token, editingOrder.orderId, { items });
      setEditingOrder(null);
      await load(activeQuery);
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const onApply = () => {
    if (filters.eventDate) load({ eventDate: filters.eventDate });
    else if (filters.employeeNumber.trim()) load({ employeeNumber: filters.employeeNumber.trim().toUpperCase() });
    else load({});
  };

  const onClear = () => {
    setFilters({ eventDate: '', employeeNumber: '' });
    load({});
  };

  // Scope: proxy + official only. Self-placed orders live on Screen #3 and
  // the kitchen dashboard — this screen exists specifically for orders
  // placed BY someone else FOR another employee, or billed officially.
  const orders = allOrders.filter((o) => o.bookingSource === 'proxy' || o.bookingSource === 'official');

  const windowLabel = filters.eventDate
    ? filters.eventDate
    : filters.employeeNumber.trim()
      ? `for ${filters.employeeNumber.trim().toUpperCase()}`
      : 'all events';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>BBQ History</h1>
          <p className={styles.subtitle}>
            Proxy &amp; official orders · {windowLabel}
            {orders.length > 0 && ` · ${orders.length} order${orders.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => load(filters.eventDate ? { eventDate: filters.eventDate }
            : filters.employeeNumber.trim() ? { employeeNumber: filters.employeeNumber.trim().toUpperCase() }
            : {})}
          disabled={loading}
        >
          <i className="ti ti-refresh" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Event date</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.eventDate}
            onChange={(e) => setFilters({ eventDate: e.target.value, employeeNumber: '' })}
          />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Employee number</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="e.g. FFL00100"
            value={filters.employeeNumber}
            onChange={(e) => setFilters({ eventDate: '', employeeNumber: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') onApply(); }}
          />
        </div>

        <div className={styles.filterActions}>
          <button className={styles.applyBtn} onClick={onApply} disabled={loading}>
            <i className="ti ti-filter" /> Apply
          </button>
          <button className={styles.clearBtn} onClick={onClear} disabled={loading}>
            Clear
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading && orders.length === 0 ? (
        <div className={styles.loading}>Loading history…</div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-history-off" />
          <p>No proxy or official BBQ orders for this filter.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {orders.map((o) => {
            const isOfficial = o.bookingSource === 'official';
            const lines = Array.isArray(o.items) ? o.items : [];
            return (
              <div key={o.orderId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.sourceBadge}>{SOURCE_LABELS[o.bookingSource] || o.bookingSource}</span>
                  <span className={styles.createdCell}>{fmtCreatedAt(o.createdAt)}</span>
                </div>

                <div className={styles.consumerLine}>
                  <i className="ti ti-user" /> {o.employeeName}
                  <span className={styles.viaEmp}> · {o.employeeNumber}</span>
                </div>
                {o.createdByEmployeeNumber && o.createdByEmployeeNumber !== o.employeeNumber && (
                  <div className={styles.viaEmp}>Placed by {o.createdByEmployeeNumber}</div>
                )}

                <div className={styles.lines}>
                  {lines.map((it) => (
                    <div key={it.itemId} className={styles.line}>
                      <span className={styles.lineName}>{it.itemName}</span>
                      <span className={styles.lineQty}>×{it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Event</span>
                    <span className={styles.metaValue}>{o.eventDate}</span>
                  </div>
                  {isOfficial && (
                    <>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Guest / occasion</span>
                        <span className={styles.metaValue}>{o.guestName || '—'}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Cost centre</span>
                        <span className={styles.metaValue}>{o.costCentreCode || '—'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.statusPill} ${styles[`status_${o.orderStatus}`] || ''}`}>
                    {STATUS_LABELS[o.orderStatus] || o.orderStatus}
                  </span>
                  {isOfficial && (
                    <span className={`${styles.approvalPill} ${styles[`approval_${o.approvalStatus}`] || ''}`}>
                      {APPROVAL_LABELS[o.approvalStatus] || o.approvalStatus}
                    </span>
                  )}
                </div>

                {rowError[o.orderId] && (
                  <div className={mgmt.rowError}><i className="ti ti-alert-circle" /> {rowError[o.orderId]}</div>
                )}

                {/* Edit/Cancel — placed orders only, matches the backend's
                    own restriction (editBbqOrder/cancelBbqOrder both
                    "placed orders only"), not just an ownership check —
                    role already grants access via isSupervisorPlus, so
                    this is available for ANY placed order on this screen,
                    not just ones this viewer placed themselves. */}
                {o.orderStatus === 'placed' && (
                  <div className={mgmt.actions}>
                    <button className={mgmt.editBtn} onClick={() => { setEditError(''); setEditingOrder(o); }}>
                      Edit
                    </button>
                    <button
                      className={mgmt.cancelBtn}
                      onClick={() => onCancelOrder(o.orderId)}
                      disabled={busyId === o.orderId}
                    >
                      {busyId === o.orderId ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          submitting={editSubmitting}
          error={editError}
          onClose={() => !editSubmitting && setEditingOrder(null)}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
}
