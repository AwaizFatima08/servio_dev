// web/src/services/bbqTableRequestService.js
// Screen #9 — BBQ Table Request (Employee)
// HomiLabs | Servio | Web
//
// This slice covers only what Screen #9 needs: submit, view own history,
// resubmit (after Admin returns), cancel. Admin's approve/return/reject
// and Manager's confirm/cancel-from-approved are added when Screens #10
// and #11 are built — same one-slice-at-a-time discipline as the backend.

import { BASE_URL } from './config.js';

// ── POST /bbq/table-requests — employee submits ──
export const createTableRequest = async (token, { eventDate, expectedGuestCount, requestNote, employeeName }) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventDate, expectedGuestCount, requestNote, employeeName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit table request');
  return data.data;
};

// ── GET /bbq/table-requests/mine — employee's own history ──
export const getMyTableRequests = async (token) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load your table requests');
  return data.data;
};

// ── PATCH /bbq/table-requests/:requestId/resubmit — owner only, 'returned' only ──
export const resubmitTableRequest = async (token, requestId, { expectedGuestCount, requestNote }) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/resubmit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedGuestCount, requestNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to resubmit table request');
  return data.data;
};

// ── PATCH /bbq/table-requests/:requestId/cancel — owner or manager+ ──
export const cancelTableRequest = async (token, requestId) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel table request');
  return data.data;
};

// ─────────────────────────────────────────
// Screen #10 — Table Booking Approval (Admin)
// ─────────────────────────────────────────

// ── GET /bbq/table-requests?eventDate=... — Admin/Manager, event-scoped.
//    No status filter sent — this screen fetches everything for the
//    chosen event once, then splits pending vs. history client-side,
//    since the backend only supports a single status value per call and
//    the history tab needs two (returned + rejected). ──
export const getTableRequestsForEvent = async (token, eventDate) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests?eventDate=${encodeURIComponent(eventDate)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load table requests');
  return data.data?.requests || [];
};

// ── PATCH /bbq/table-requests/:requestId/approve — Admin ──
export const approveTableRequest = async (token, requestId) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve table request');
  return data.data;
};

// ── PATCH /bbq/table-requests/:requestId/return — Admin, comments required ──
export const returnTableRequest = async (token, requestId, returnComments) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/return`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnComments }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to return table request');
  return data.data;
};

// ── PATCH /bbq/table-requests/:requestId/reject — Admin, reason required ──
export const rejectTableRequest = async (token, requestId, rejectionReason) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject table request');
  return data.data;
};

// ─────────────────────────────────────────
// Screen #11 — Table Booking Confirmation (Manager)
// cancelTableRequest (above, from Screen #9) is reused here as-is — the
// backend infers owner-vs-manager+ from the verified token, no change
// needed for a different caller role.
// ─────────────────────────────────────────

// ── PATCH /bbq/table-requests/:requestId/confirm — Manager ──
export const confirmTableRequest = async (token, requestId) => {
  const res = await fetch(`${BASE_URL}/bbq/table-requests/${requestId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to confirm table request');
  return data.data;
};