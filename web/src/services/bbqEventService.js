// ─────────────────────────────────────────
// bbqEventService.js — V1.4 BBQ (frontend read)
// HomiLabs | Servio | Web
//
// Token passed as a parameter (Style B), matching teabarMenuService.js /
// teabarOrderService.js — NOT familyService.js's internal-getToken style.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── GET /bbq/events?status=published&limit=1 ──
// Returns the event object directly, or null if none is currently
// published (a normal state — e.g. Sat–Wed, before Thursday's publish).
export const getCurrentBbqEvent = async (token) => {
  const res = await fetch(`${BASE_URL}/bbq/events?status=published&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ event');
  const events = data.data?.events || [];
  return events.length > 0 ? events[0] : null;
};