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

// ── GET /bbq/events?status=published — full list, for the event-picker
//    dropdown on Screens #10/#11 (Table Booking Admin/Manager review).
//    Unlike getCurrentBbqEvent, this deliberately does NOT pick one —
//    it returns everything published so the screen can let the user
//    choose, sorted soonest-first by eventDate (YYYY-MM-DD sorts
//    correctly as a plain string). ──
export const getPublishedBbqEvents = async (token) => {
  const res = await fetch(`${BASE_URL}/bbq/events?status=published`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ events');
  const events = data.data?.events || [];
  return [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
};