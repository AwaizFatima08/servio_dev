// ─────────────────────────────────────────
// cafeService.js — Café API (Web)
// HomiLabs | Servio | V1.2 Web Slice 1 (read-only menu)
//
// FILE LOCATION: web/src/services/cafeService.js
//
// SLICE 1 (this slice): getCafeMenu — reads the resolved café menu fat
//   document via GET /cafe/menu.
// SLICE 2 (next)       : will add order placement + own-order listing.
//
// Pattern: token passed in by the caller (matches menuService.js and
// messService.js). The page receives `token` as a prop from <WithToken>
// in App.jsx and forwards it here.
//
// Backend response wrapper:
//   { success: true, message: "...", data: { ... } }
// We return data.data directly. No fallback chains.
//
// `notFound` semantics (set by the backend, not derived here):
//   data.notFound === true means "no menu to show" — either the
//   resolver hasn't run yet, the doc is for a different tenant, or
//   the doc is soft-disabled. The page treats all three the same way.
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── GET /cafe/menu ────────────────────────────────────────────────────────
// Returns data = either:
//   { serviceName, items, beverages, updatedAt, notFound: false }
// or:
//   { notFound: true }
//
// Item shape (verified against cafeMenuResolver.js):
//   { itemId, itemName, foodTypeCode, foodTypeName, baseUnit,
//     sortOrder, unitRate (null on FFL), rateType }
export async function getCafeMenu(token) {
  const res = await fetch(`${BASE_URL}/cafe/menu`, {
    headers: authHeader(token),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load café menu');
  return body.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// V1.2 Web Slice 2 — order placement, own-order listing, cancellation.
//
// Pattern B throughout (token passed in by the caller), matching getCafeMenu
// above and the rest of the web service layer (menuService / messService).
// The page receives `token` from <WithToken> in App.jsx and forwards it.
//
// Backend contract verified against core/functions/src/cafe/cafeRoutes.js and
// cafeOrderService.js (V1.2 Backend Slice 1):
//   POST  /cafe/orders                    self-order
//   GET   /cafe/orders/mine?days=N        own orders, newest first
//   PATCH /cafe/orders/:orderId/cancel    cancel (role-aware in backend)
//
// The backend remains the single authority on time windows, lead time,
// dining-mode/order-type consistency, family-member ownership, and who may
// cancel what. These functions do no client-side rule enforcement — they
// pass the user's choices through and surface backend error messages verbatim.
// ═══════════════════════════════════════════════════════════════════════════

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── POST /cafe/orders ──────────────────────────────────────────────────────
// Place an order for self or a family member.
//
// payload = {
//   orderType,                 'cafe_hours' | 'anytime_takeaway'   (required)
//   menuItemId,                string  (required) — an itemId from the café menu
//   quantity,                  positive integer (required)
//   diningMode,                'dine_in' | 'takeaway' | 'outdoor_seating' (required)
//   requestedPickupTime,       'HH:MM'  — required by backend for any non-dine_in
//                              order; omit/null for dine_in
//   consumerType,              'self' | 'family_member'  (required)
//   consumerFamilyMemberId,    familyMemberId — required iff consumerType is
//                              'family_member'; must be absent/null for 'self'
// }
//
// Returns: data = the created order document (includes orderId, orderStatus,
// cancellationWindowExpiresAt, consumerName, etc.).
//
// Backend rejects (HTTP 400) with a specific message on any of: order outside
// the live PKT window, < 2h lead time on anytime_takeaway, pickup past 23:00,
// anytime_takeaway with a non-takeaway diningMode, family member not owned /
// inactive / pending deletion, unknown menu item. We surface those verbatim.
export async function createSelfOrder(token, payload) {
  const res = await fetch(`${BASE_URL}/cafe/orders`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to place order');
  return body.data;
}

// ── GET /cafe/orders/mine?days=N ───────────────────────────────────────────
// List the caller's own café orders, newest first. Default 30-day window,
// backend caps at 90.
//
// Returns: data = { orders: [...], count }
// Each order: {
//   orderId, itemName, quantity,
//   orderType ('cafe_hours'|'anytime_takeaway'),
//   diningMode ('dine_in'|'takeaway'|'outdoor_seating'),
//   requestedPickupTime ('HH:MM' | null),
//   consumerType ('self'|'family_member'), consumerName,
//   orderStatus ('placed'|'accepted'|'cancelled'),
//   cancellationWindowExpiresAt (ISO | null),  // present for anytime_takeaway
//   amount (number | null),                    // null until rate entry
//   employeeNumber, employeeName,
//   cancellationReason, cancellationNote,
//   createdAt (ISO), updatedAt (ISO)
// }
export async function listMyOrders(token, days = 30) {
  const res = await fetch(`${BASE_URL}/cafe/orders/mine?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load orders');
  return body.data;
}

// ── PATCH /cafe/orders/:orderId/cancel ─────────────────────────────────────
// Cancel an order. The backend derives admin-vs-employee authority from the
// token and enforces all rules:
//   - employees cannot cancel cafe_hours orders at all (charged regardless);
//   - employees can cancel anytime_takeaway only within cancellationWindowExpiresAt;
//   - admin / super_admin can cancel either type at any time;
//   - ownership enforced for non-admins; already-cancelled orders rejected.
//
// reason: one of 'employee_request' | 'data_correction' | 'other' (café set).
// note:   optional free text (used mainly with 'other').
//
// Returns: data = { message, orderId }
export async function cancelOrder(token, orderId, reason, note) {
  const res = await fetch(`${BASE_URL}/cafe/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({
      cancellationReason: reason,
      cancellationNote: note || null,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to cancel order');
  return body.data;
}


// ── POST /cafe/orders/batch ────────────────────────────────────────────────
// V1.2 Web Slice 2.3 — multi-item ("restaurant-style") café order.
//
// One consumer for the WHOLE order (session-level), one shared bookingGroupId,
// one cafeOrders document per line. Mirrors the single-item createSelfOrder
// above but sends an items[] array. The backend (createSelfOrderBatch) writes
// all lines atomically (db.batch) and validates session-level rules once
// (window, pickup, family ownership, dining-mode/order-type interlock).
//
// payload = {
//   orderType,                 'cafe_hours' | 'anytime_takeaway'   (required)
//   diningMode,                'dine_in' | 'takeaway' | 'outdoor_seating' (required)
//   requestedPickupTime,       'HH:MM' — required by backend for any non-dine_in
//                              order; omit/null for dine_in
//   consumerType,              'self' | 'family_member'  (required)
//   consumerFamilyMemberId,    familyMemberId — required iff consumerType is
//                              'family_member'; absent/null for 'self'
//   items,                     [{ menuItemId, quantity }, ...]  (required, non-empty)
// }
//
// Returns: data = { bookingGroupId, orderCount, orders: [{ orderId, menuItemId,
//                   itemName, quantity, rateTargetKey }, ...] }
//
// Backend surfaces a specific 400 message on any rejection (window closed, bad
// item in array, lead-time, interlock, family not owned, empty array). We pass
// the user's choices through and surface those messages verbatim — the backend
// stays the single authority on all rules.
export async function createBatchOrder(token, payload) {
  const res = await fetch(`${BASE_URL}/cafe/orders/batch`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to place order');
  return body.data;
}