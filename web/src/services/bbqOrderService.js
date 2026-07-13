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