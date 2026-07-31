// ─────────────────────────────────────────
// bbqKitchenService.js — V1.4 BBQ (frontend) — Screen #6
// HomiLabs | Servio | Web
//
// Token passed as a parameter (Style B), matching bbqOrderService.js /
// bbqEventService.js.
//
// Unlike café, a BBQ order is ONE Firestore document holding an items[]
// array (bbqOrders schema, design doc §2.3) — there is no group-by-
// bookingGroupId step needed here. Each doc returned by
// GET /bbq/kitchen/orders is already one full order card.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── GET /bbq/kitchen/orders?eventDate=... ──
export const getBbqKitchenOrders = async (token, eventDate) => {
  const res = await fetch(`${BASE_URL}/bbq/kitchen/orders?eventDate=${encodeURIComponent(eventDate)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load kitchen orders');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/accept ──
export const acceptBbqOrder = async (token, orderId) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to accept order');
  return data.data;
};

// ── PATCH /bbq/orders/:orderId/prepared ──
export const markBbqOrderPrepared = async (token, orderId) => {
  const res = await fetch(`${BASE_URL}/bbq/orders/${orderId}/prepared`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark order prepared');
  return data.data;
};