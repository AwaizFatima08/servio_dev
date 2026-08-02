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

// ── POST /bbq/orders/proxy — Screen #4 ──
export const createProxyBbqOrder = async (token, { targetEmployeeNumber, eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId }) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/proxy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEmployeeNumber, eventDate, orderType, items, diningMode, consumerType, consumerFamilyMemberId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place proxy BBQ order');
  return data.data;
};

// ── POST /bbq/orders/official — Screen #5 ──
export const createOfficialBbqOrder = async (token, { sponsoringEmployeeNumber, guestName, eventDate, orderType, items, diningMode, costCentreCode }) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/official`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sponsoringEmployeeNumber, guestName, eventDate, orderType, items, diningMode, costCentreCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place official BBQ order');
  return data.data;
};

// ── GET /bbq/orders/official-pending — Screen #14 ──
export const listBbqOfficialPending = async (token, eventDate) => {
  const qs = eventDate ? `?eventDate=${encodeURIComponent(eventDate)}` : '';
  const res = await fetch(`${BASE_URL}/bbq/orders/official-pending${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending official BBQ orders');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/official/approve — Screen #14 ──
export const approveBbqOfficialOrder = async (token, orderId) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/official/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve official BBQ order');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/official/reject — Screen #14 ──
export const rejectBbqOfficialOrder = async (token, orderId, approvalNote) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/official/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalNote: approvalNote || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject official BBQ order');
  return data.data;
};

// ── GET /bbq/orders/history — Screen #15 ──
export const getBbqOrderHistory = async (token, { eventDate, employeeNumber } = {}) => {
  const params = new URLSearchParams();
  if (eventDate) params.set('eventDate', eventDate);
  else if (employeeNumber) params.set('employeeNumber', employeeNumber);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/bbq/orders/history${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ order history');
  return data.data;
};