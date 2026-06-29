// ─────────────────────────────────────────
// cafeOfficialApprovalService.js — Official Café Meal billing approval (Web)
// HomiLabs | Servio | V1.2 Slice 7 (web) — ADMIN side
//
// FILE LOCATION: web/src/services/cafeOfficialApprovalService.js
//
// Admin-side service for the official-meal billing-approval queue. Three calls:
//   listOfficialPending   GET   /cafe/orders/official-pending
//   approveOfficialGroup  PATCH /cafe/kitchen/group/:groupKey/approve-official
//   rejectOfficialGroup   PATCH /cafe/kitchen/group/:groupKey/reject-official
//
// NOTE the two URL families. The pending LIST lives under /cafe/orders/ (it is
// an order query). APPROVE/REJECT live under /cafe/kitchen/group/:groupKey/
// because they are WHOLE-ORDER group operations, co-located with the kitchen's
// other group routes (accept / prepared / cancel). This mirrors the backend.
//
// listOfficialPending returns a FLAT list (one row per order line). The page
// groups it in memory by bookingGroupId into one card per order — the same
// in-memory grouping the kitchen board uses. Approve/reject act on the
// bookingGroupId (the whole order), not a single line.
//
// Approval is billing-only and independent of the kitchen: the meal is served
// regardless. The backend is the single authority on the guards (must be an
// official meal, must be pending_approval). We surface its messages verbatim.
//
// Pattern B — token passed in by the caller. Backend wrapper { success,
// message, data }; we return data.data.
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── GET /cafe/orders/official-pending ──────────────────────────────────────
// All official café meals awaiting billing approval, newest first (flat — one
// row per line). Optional ?date=YYYY-MM-DD filter (backend-supported).
//
// Returns: data = { orders: [...], count }
// Each order carries: orderId, bookingGroupId, employeeNumber, employeeName,
//   sponsoringEmployeeNumber, sponsoringEmployeeName, costCentreCode,
//   officialGuestName, itemName, quantity, orderType, diningMode,
//   requestedPickupTime, createdByEmployeeNumber, createdAt, approvalStatus,
//   orderStatus, ... (full order doc).
export async function listOfficialPending(token, date) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`${BASE_URL}/cafe/orders/official-pending${qs}`, {
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load pending official meals');
  return body.data;
}

// ── PATCH /cafe/kitchen/group/:groupKey/approve-official ───────────────────
// Approve billing for a whole official order (every line in the group flips
// pending_approval → approved, atomically). No body.
//
// Returns: data = { message, groupKey, count }
export async function approveOfficialGroup(token, groupKey) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/group/${groupKey}/approve-official`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to approve official meal');
  return body.data;
}

// ── PATCH /cafe/kitchen/group/:groupKey/reject-official ────────────────────
// Reject billing for a whole official order (every line flips
// pending_approval → rejected, atomically). Body: { approvalNote? }.
// Rejection is a billing/audit decision — it does NOT cancel the order or
// touch the kitchen; accounts resolve a rejected charge manually.
//
// Returns: data = { message, groupKey, count }
export async function rejectOfficialGroup(token, groupKey, approvalNote) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/group/${groupKey}/reject-official`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ approvalNote: approvalNote || null }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to reject official meal');
  return body.data;
}
