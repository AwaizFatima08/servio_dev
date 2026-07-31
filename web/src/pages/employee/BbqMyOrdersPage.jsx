// web/src/pages/employee/BbqMyOrdersPage.jsx
// BBQ — My Orders — Screen #3
// Role: employee
// Path: /my-bbq-orders
//
// Full scope, confirmed 13-Jul-2026: history + edit (placed only,
// items/quantity only) + cancel (placed only) + request-cancellation
// (accepted only). No "edit after accepted" path exists — that's
// Manager discretion via the existing cancellation-request flow.

import { useState, useEffect, useCallback } from 'react';
import { getMyBbqOrders, editBbqOrder, cancelBbqOrder, requestBbqCancellation } from '../../services/bbqOrderService';
import styles from './BbqMyOrdersPage.module.css';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EditModal({ order, submitting, error, onClose, onSave }) {
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Edit order</div>
        {order.items.map((it) => (
          <div key={it.itemId} className={styles.editLine}>
            <span className={styles.editLineName}>{it.itemName}</span>
            <div className={styles.qtyStepper}>
              <button type="button" className={styles.qtyBtn} onClick={() => dec(it.itemId)}>−</button>
              <span className={styles.qtyValue}>{quantities[it.itemId]}</span>
              <button type="button" className={styles.qtyBtn} onClick={() => inc(it.itemId)}>+</button>
            </div>
          </div>
        ))}
        {error && <div className={styles.rowError}><i className="ti ti-alert-circle" /> {error}</div>}
        <div className={styles.modalActions}>
          <button className={styles.cancelModalBtn} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className={styles.confirmModalBtn} onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BbqMyOrdersPage({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyBbqOrders(token);
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onCancel = async (orderId) => {
    setBusyId(orderId);
    setRowError((r) => ({ ...r, [orderId]: '' }));
    try {
      await cancelBbqOrder(token, orderId);
      await load();
    } catch (e) {
      setRowError((r) => ({ ...r, [orderId]: e.message }));
    } finally {
      setBusyId(null);
    }
  };

  const onRequestCancellation = async (orderId) => {
    setBusyId(orderId);
    setRowError((r) => ({ ...r, [orderId]: '' }));
    try {
      await requestBbqCancellation(token, orderId);
      await load();
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
      await load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My BBQ Orders</h1>
        <p className={styles.subtitle}>{orders.length > 0 && `${orders.length} order${orders.length === 1 ? '' : 's'}`}</p>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading your orders…</div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-meat-off" />
          <p>No BBQ orders yet.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {orders.map((o) => {
            const cancelPending = o.cancellationRequestStatus === 'pending';
            const canEdit = o.orderStatus === 'placed' && !cancelPending;
            const canCancel = o.orderStatus === 'placed' && !cancelPending;
            const canRequestCancel = o.orderStatus === 'accepted' && !cancelPending;
            const busy = busyId === o.orderId;

            return (
              <div key={o.orderId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.eventDate}>{o.eventDate}</span>
                  <span>{fmtDate(o.createdAt)}</span>
                </div>

                <div className={styles.lines}>
                  {o.items.map((it) => (
                    <div key={it.itemId} className={styles.line}>
                      <span className={styles.lineName}>{it.itemName}</span>
                      <span className={styles.lineQty}>×{it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.pill} ${styles[`status_${o.orderStatus}`] || ''}`}>
                    {o.orderStatus}
                  </span>
                  {o.isLateRequest && o.lateRequestApprovalStatus === 'pending' && (
                    <span className={`${styles.pill} ${styles.pill_late}`}>Late — pending Manager approval</span>
                  )}
                  {o.isLateRequest && o.lateRequestApprovalStatus === 'rejected' && (
                    <span className={`${styles.pill} ${styles.status_cancelled}`}>Late request rejected</span>
                  )}
                  {cancelPending && (
                    <span className={`${styles.pill} ${styles.pill_cancelPending}`}>Cancellation pending</span>
                  )}
                </div>

                {rowError[o.orderId] && (
                  <div className={styles.rowError}><i className="ti ti-alert-circle" /> {rowError[o.orderId]}</div>
                )}

                {(canEdit || canCancel || canRequestCancel) && (
                  <div className={styles.actions}>
                    {canEdit && (
                      <button className={styles.editBtn} onClick={() => { setEditError(''); setEditingOrder(o); }}>
                        Edit
                      </button>
                    )}
                    {canCancel && (
                      <button className={styles.cancelBtn} onClick={() => onCancel(o.orderId)} disabled={busy}>
                        {busy ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                    {canRequestCancel && (
                      <button className={styles.requestCancelBtn} onClick={() => onRequestCancellation(o.orderId)} disabled={busy}>
                        {busy ? 'Requesting…' : 'Request cancellation'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingOrder && (
        <EditModal
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