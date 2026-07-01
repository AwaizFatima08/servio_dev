// ─────────────────────────────────────────
// cafeHistoryService.js — Café Order-History API (Web)
// HomiLabs | Servio | V1.2 Web Slice 6 (supervisor order-history view)
//
// FILE LOCATION: web/src/services/cafeHistoryService.js
//
// Own service file — deliberately SEPARATE from cafeKitchenService.js (web).
// The live board and the history view share no state and no concerns; keeping
// the services apart mirrors the backend's own split (getKitchenOrders vs
// listCafeOrderHistory live in one backend file but are distinct functions)
// and keeps the live-board service untouched by this slice. Additive only.
//
// Pattern B — token passed in by the caller (matches cafeService.js and the
// rest of the web café layer). The page receives `token` as a prop from
// <WithToken> in App.jsx and forwards it here. We do NOT self-fetch the token.
//
// Backend contract (verified on disk against
// core/functions/src/cafe/cafeKitchenService.js listCafeOrderHistory +
// cafeRoutes.js GET /cafe/history, 26-Jun):
//   GET /cafe/history?days=&day=&includeCancelled=&cursor=
//   → data = { orders, count, hasMore, nextCursor }
//
// This sub-slice calls with DEFAULTS ONLY (7-day window, cancelled excluded,
// no day pick). The day-picker and includeCancelled toggle are a later
// sub-slice — the params are threaded here so that slice is a page change
// only, not a service change.
//
// Roles allowed by the backend on this route: cafe_supervisor, cafe_waiter,
// (legacy cafe_bakery_tuckshop_supervisor), manager, admin, super_admin.
// Anyone else gets 403 — the backend is the single authority on that.
//
// Backend response wrapper: { success, message, data }. We return data.data.
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── GET /cafe/history ──────────────────────────────────────────────────────
// opts (all optional):
//   days             integer — lookback window. Omitted → backend default 7.
//   day              'YYYY-MM-DD' — single-day pick; WINS over days on backend.
//   includeCancelled boolean — widen status set to include cancelled.
//   cursor           ISO string — load-more: the nextCursor from the prior page.
//
// Returns data = {
//   orders: [ ... ],   // up to 25, newest-placed first (createdAt DESC)
//   count,             // orders.length for this page
//   hasMore,           // true → another page exists, use nextCursor
//   nextCursor,        // ISO string to pass back as `cursor`, or null
// }
//
// Order shape (raw cafeOrders doc): { orderId, itemName, quantity,
//   orderStatus ('placed'|'accepted'|'prepared'|'cancelled'),
//   orderType, diningMode, requestedPickupDate, requestedPickupTime,
//   consumerType ('self'|'family_member'), consumerName,
//   employeeNumber, employeeName, createdAt, ... }
export async function getCafeOrderHistory(token, opts = {}) {
  const { days, day, includeCancelled, cursor, employeeNumber, officialOnly } = opts;

  const params = new URLSearchParams();
  if (days != null) params.set('days', String(days));
  if (day) params.set('day', day);
  if (includeCancelled) params.set('includeCancelled', 'true');
  if (cursor) params.set('cursor', cursor);
  if (employeeNumber) params.set('employeeNumber', employeeNumber);
  if (officialOnly) params.set('officialOnly', 'true');

  const qs = params.toString();
  const url = `${BASE_URL}/cafe/history${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { headers: authHeader(token) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load order history');
  return body.data;
}
