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

// ── GET /teabar/orders/employee-lookup/:employeeNumber ───────────────────
// Resolves an employee number to a name before placing a proxy/official
// order. Checks the employees master collection (everyone on staff), not
// users — so this works even for employees who've never signed up for a
// Servio login.
export const lookupTeabarEmployee = async (token, employeeNumber) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/employee-lookup/${employeeNumber}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Employee not found');
  return data.data;
};

// ── POST /teabar/orders/proxy — attendant orders on someone's behalf ────
// locationId is never sent — always resolved server-side from the
// attendant's own current assignment.
export const createProxyOrder = async (token, { targetEmployeeNumber, items }) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/proxy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetEmployeeNumber, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place proxy order');
  return data.data;
};

// ── POST /teabar/orders/official — billed to a department, not a person ──
// locationId is never sent, same as proxy. costCentreCode and
// officialGuestName are both optional free text.
export const createOfficialOrder = async (token, { sponsoringEmployeeNumber, items, costCentreCode, officialGuestName }) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/official`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sponsoringEmployeeNumber, items, costCentreCode, officialGuestName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to place official order');
  return data.data;
};

// ── GET /teabar/orders/official/pending — admin billing-approval queue ──
// Already grouped by bookingGroupId server-side — no client-side grouping
// needed here, unlike café's equivalent page.
export const listPendingOfficialTeabarOrders = async (token) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/official/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending official orders');
  return data.data;
};

// ── PATCH /teabar/orders/official/:bookingGroupId/approve ───────────────
export const approveOfficialTeabarOrder = async (token, bookingGroupId) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/official/${bookingGroupId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve order');
  return data.data;
};

// ── PATCH /teabar/orders/official/:bookingGroupId/reject ────────────────
// approvalNote is optional free text — a reason for the rejection.
export const rejectOfficialTeabarOrder = async (token, bookingGroupId, approvalNote) => {
  const res = await fetch(`${BASE_URL}/teabar/orders/official/${bookingGroupId}/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ approvalNote: approvalNote || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject order');
  return data.data;
};

// ── GET /teabar/orders/history/admin — manager/admin/super_admin ────────
// One filter at a time — day wins outright over employeeNumber, which
// wins over locationId — matches the backend's own precedence exactly
// (verified live, 09-Jul). Omit all three for every location, every
// employee, last 30 days.
export const getTeabarAdminHistory = async (token, { locationId, day, employeeNumber } = {}) => {
  const params = new URLSearchParams();
  if (day) params.set('day', day);
  else if (employeeNumber) params.set('employeeNumber', employeeNumber);
  else if (locationId) params.set('locationId', locationId);

  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/teabar/orders/history/admin${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Tea Bar history');
  return data.data;
};