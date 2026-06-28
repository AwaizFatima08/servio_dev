// ─────────────────────────────────────────
// cafeKitchenService.js — Café Kitchen API (Web)
// HomiLabs | Servio | V1.2 Web Slice 3 (kitchen dashboard)
//
// FILE LOCATION: web/src/services/cafeKitchenService.js
//
// Pattern B — token passed in by the caller (matches cafeService.js and the
// rest of the web café layer). The page receives `token` as a prop from
// <WithToken> in App.jsx and forwards it here. We do NOT self-fetch the token
// (that is the mess kitchenService.js pattern — café stays consistent with
// cafeService.js instead).
//
// Backend contract (verified against core/functions/src/cafe/cafeRoutes.js,
// field-tested 23-Jun): the board now keys off requestedPickupDate (pickup
// day, PKT), not creation date, and returns orders already sorted
// soonest-pickup-first by the backend.
//   GET   /cafe/kitchen/orders            today's placed+accepted, pickup-sorted
//   PATCH /cafe/orders/:orderId/accept    placed -> accepted
//   PATCH /cafe/orders/:orderId/prepared  accepted -> prepared (Slice 4)
//
// Roles allowed by the backend on these routes: cafe_supervisor, cafe_waiter,
// (legacy cafe_bakery_tuckshop_supervisor), admin, super_admin. Employees are
// rejected (403) — the backend is the single authority on that.
//
// Backend response wrapper: { success, message, data }. We return data.data.
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── GET /cafe/kitchen/orders ───────────────────────────────────────────────
// Returns data = {
//   date,                       // YYYY-MM-DD (PKT) the board is showing
//   orders: [ ... ],            // placed + accepted, soonest pickup first
//   totalCount,
//   unacknowledgedCount,        // how many are still 'placed' (not yet accepted)
//   generatedAt,                // ISO string, server time
// }
//
// Order shape (from cafeOrderService _buildOrderDoc + kitchen read):
//   { orderId, itemName, quantity,
//     orderType ('cafe_hours'|'anytime_takeaway'),
//     diningMode ('dine_in'|'takeaway'|'outdoor_seating'),
//     requestedPickupDate ('YYYY-MM-DD'),
//     requestedPickupTime ('HH:MM' | null),   // null for dine_in
//     consumerType ('self'|'family_member'), consumerName,
//     orderStatus ('placed'|'accepted'),
//     isOverrun (bool — true for accepted orders sat >15min since acceptedAt),
//     employeeNumber, employeeName,
//     createdAt, ... }
export async function getKitchenOrders(token) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/orders`, {
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load kitchen orders');
  return body.data;
}

// ── PATCH /cafe/orders/:orderId/accept ─────────────────────────────────────
// Kitchen acknowledges a placed order: placed -> accepted. The backend sets
// acceptedAt / acceptedByUid and rejects if the order is already accepted,
// cancelled, missing, or another tenant's. We surface backend messages verbatim.
//
// Returns: data = { message, orderId }
export async function acceptOrder(token, orderId) {
  const res = await fetch(`${BASE_URL}/cafe/orders/${orderId}/accept`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to accept order');
  return body.data;
}

// ── PATCH /cafe/orders/:orderId/prepared ───────────────────────────────────
// Kitchen hands over a finished order: accepted -> prepared (V1.2 Slice 4).
// Terminal state — the order then falls off the board (backend returns only
// placed+accepted). Backend rejects if the order is not in 'accepted' state
// (cannot skip placed->prepared), already prepared, cancelled, missing, or
// another tenant's. We surface backend messages verbatim. NOT a billing event.
//
// Returns: data = { message, orderId }
export async function markPrepared(token, orderId) {
  const res = await fetch(`${BASE_URL}/cafe/orders/${orderId}/prepared`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to mark order prepared');
  return body.data;
}
// ─────────────────────────────────────────
// GROUP (whole-order) operations — V1.2 kitchen whole-order model (28-Jun lock)
//
// The kitchen board operates on the ORDER as one unit, grouped by groupKey
// (= bookingGroupId for batch orders, or the orderId for single orders). These
// call the backend group routes, which act atomically over every doc in the
// group (all-or-nothing). Backend contract (cafeRoutes.js, proven 28-Jun):
//   PATCH /cafe/kitchen/group/:groupKey/accept    placed   -> accepted  (no body)
//   PATCH /cafe/kitchen/group/:groupKey/prepared  accepted -> prepared  (no body)
//   PATCH /cafe/kitchen/group/:groupKey/cancel    -> cancelled (body: reason+note)
// Returns: data = { message, groupKey, count }
// ─────────────────────────────────────────

// Whole-order accept. Mirrors acceptOrder (no body, authHeader only).
export async function acceptOrderGroup(token, groupKey) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/group/${groupKey}/accept`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to accept order');
  return body.data;
}

// Whole-order mark-prepared. Mirrors markPrepared (no body, authHeader only).
export async function markOrderGroupPrepared(token, groupKey) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/group/${groupKey}/prepared`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to mark order prepared');
  return body.data;
}

// Whole-order cancel. Sends a JSON body (reason + note), so it needs a
// Content-Type header — built inline here since this file otherwise only does
// header-less PATCHes. Reason is always 'employee_request' from the board (the
// locked rule: cancel only ever on an employee's verbal request). Backend walls
// (_assertCafeOrderCancellable) do the real enforcement.
export async function cancelOrderGroup(token, groupKey, reason, note) {
  const res = await fetch(`${BASE_URL}/cafe/kitchen/group/${groupKey}/cancel`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cancellationReason: reason,
      cancellationNote: note || null,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to cancel order');
  return body.data;
}
