// ─────────────────────────────────────────
// cafeOfficialService.js — Official Café Meal placement (Web)
// HomiLabs | Servio | V1.2 Slice 7 (web)
//
// FILE LOCATION: web/src/services/cafeOfficialService.js
//
// Supervisor-side service for placing OFFICIAL café meals. One function:
// createOfficialBatchOrder → POST /cafe/orders/official/batch.
//
// Pattern B — token passed in by the caller (matches cafeService.js /
// cafeKitchenService.js / cafeHistoryService.js). The page receives `token`
// from <WithToken> in App.jsx and forwards it here.
//
// An official meal is a normal multi-item café order with an official billing
// branch: billed to an official account, anchored to a SPONSORING employee,
// and flagged pending_approval. The meal still flows through the kitchen board
// like any order; admin approval governs billing only (it does not gate the
// kitchen). The backend (createOfficialOrderBatch) is the single authority on
// all rules — this function passes the supervisor's choices through and
// surfaces backend error messages verbatim.
//
// Backend response wrapper: { success, message, data }. We return data.data.
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── POST /cafe/orders/official/batch ───────────────────────────────────────
// Place a multi-item official café order. One consumer (always self — the
// official context), one shared bookingGroupId, one cafeOrders doc per line.
//
// payload = {
//   sponsoringEmployeeNumber,  (required) the employee who vouches / is billed
//   orderType,                 'cafe_hours' | 'anytime_takeaway'   (required)
//   diningMode,                'dine_in' | 'takeaway' | 'outdoor_seating' (required)
//   requestedPickupTime,       'HH:MM' — required by backend for any non-dine_in
//   requestedPickupDate,       'YYYY-MM-DD' — anytime_takeaway advance orders
//   costCentreCode,            free-text note (optional) — for accounts audit
//   officialGuestName,         descriptive only (optional)
//   items,                     [{ menuItemId, quantity }, ...]  (required, non-empty)
// }
//
// Returns: data = { bookingGroupId, orderCount, orders: [{ orderId, menuItemId,
//                   itemName, quantity, rateTargetKey }, ...] }
//
// Backend rejects (HTTP 400) on: missing sponsor, sponsor not found / inactive /
// other tenant, order outside the live café window, bad item in the array,
// empty array. 403 if the caller's role may not place official meals
// (cafe_waiter is excluded). We surface those messages verbatim.
export async function createOfficialBatchOrder(token, payload) {
  const res = await fetch(`${BASE_URL}/cafe/orders/official/batch`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to place official café meal');
  return body.data;
}
