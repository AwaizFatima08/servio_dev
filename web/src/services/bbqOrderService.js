// ─────────────────────────────────────────
// bbqOrderService.js — V1.4 BBQ (frontend)
// HomiLabs | Servio | Web
//
// Token passed as a parameter (Style B), matching teabarOrderService.js.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── POST /bbq/orders — employee self-order ──
export const createBbqOrder = async (token, { eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId }) => {
  const res = await fetch(`${BASE_URL}/bbq/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place BBQ order');
  return data.data;
};

// ── GET /bbq/orders/mine — needed for Screen #3, added now while the file's open ──
export const getMyBbqOrders = async (token) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load your BBQ orders');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/edit — items/quantity only, placed orders only ──
export const editBbqOrder = async (token, orderId, { items }) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/edit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update order');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/cancel — placed orders only ──
export const cancelBbqOrder = async (token, orderId, cancellationReason) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancellationReason: cancellationReason || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/request-cancellation — accepted orders only ──
export const requestBbqCancellation = async (token, orderId, reason) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/request-cancellation`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to request cancellation');
  return data.data;
};