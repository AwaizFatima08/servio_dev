// ─────────────────────────────────────────
// teabarOrderService.js — V1.3 (Tea Bar — Orders, frontend)
// HomiLabs | Servio | Web
//
// Talks to the order routes in teabarRoutes.js (backend), confirmed by
// direct read 08-Jul-2026:
//   POST   /teabar/orders
//   GET    /teabar/orders/history/mine
//   PATCH  /teabar/orders/:bookingGroupId/cancel
// Token passed as a parameter (Style B), matching teabarLocationService.js
// and teabarMenuService.js (web).
//
// Response shape: wrapped in successResponse() -> { success, message, data }.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── POST /teabar/orders — employee self-order ───────────────────────────
// items: [{ itemId, quantity }]
export const createSelfOrder = async (token, { locationId, items }) => {
  const res = await fetch(`${BASE_URL}/teabar/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locationId, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place order');
  return data.data;
};

// ── GET /teabar/orders/history/mine — employee's own past orders ────────
// No params — backend always returns the caller's own last-30-days history.
export const getMyTeabarHistory = async (token) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/history/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load order history');
  return data.data;
};

// ── PATCH /teabar/orders/:bookingGroupId/cancel ──────────────────────────
// No body — cancelledByUid always comes from the verified token, server-side.
export const cancelTeabarOrder = async (token, bookingGroupId) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/${bookingGroupId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
  return data.data;
};

// ── GET /teabar/orders/dashboard — attendant's live counter view ────────
// No params — backend always resolves the caller's own assigned location
// server-side; a locationId sent from here would be ignored anyway.
export const getTeabarDashboard = async (token) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load dashboard');
  return data.data;
};

// ── PATCH /teabar/orders/:bookingGroupId/issue — "Handed over" tap ──────
// No body — issuedByUid always comes from the verified token, server-side.
export const issueTeabarOrderGroup = async (token, bookingGroupId) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/${bookingGroupId}/issue`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark order as issued');
  return data.data;
};