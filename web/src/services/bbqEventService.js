// ─────────────────────────────────────────
// bbqEventService.js — V1.4 BBQ (frontend read)
// HomiLabs | Servio | Web
//
// Token passed as a parameter (Style B), matching teabarMenuService.js /
// teabarOrderService.js — NOT familyService.js's internal-getToken style.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── GET /bbq/events?status=published ──
// Returns the NEAREST published event, or null if none currently
// qualifies (a normal state — e.g. Sat–Wed, before Thursday's publish).
//
// FIXED 02-Aug-2026 — bug found live, not by inspection. Previously
// fetched limit=1 and trusted the backend's own eventDate-desc ordering
// to hand back "the current one." That only worked by accident, because
// until tonight only one event had ever been published at a time.
// published status never reverts (same as orderStatus never un-cancels)
// — every published event stays published forever. The moment a SECOND
// one existed, eventDate-desc surfaced the most-FUTURE one, not the
// nearest one, and every employee-facing screen quietly showed the
// wrong week. getPublishedBbqEvents (used by Screens #10/#11's event
// picker) already had to solve this exact problem and re-sorts
// client-side rather than trusting the backend's order — this now does
// the same, plus excludes events that have already fully closed out.
//
// "Nearest" = smallest eventDate among events whose closeoutAt hasn't
// passed yet (or has no closeoutAt at all — be conservative, don't
// exclude on missing data). If EVERY published event has already closed
// out, there is genuinely no current event — return null rather than
// surfacing stale, fully-finished data as if it were live.
export const getCurrentBbqEvent = async (token) => {
  const res = await fetch(`${BASE_URL}/bbq/events?status=published`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ event');
  const events = data.data?.events || [];
  if (events.length === 0) return null;

  const now = new Date();
  const stillOpen = events.filter((e) => !e.closeoutAt || new Date(e.closeoutAt) > now);
  if (stillOpen.length === 0) return null;

  const sorted = [...stillOpen].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return sorted[0];
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

// ── GET /bbq/events?status=X — generic list, Screens #12/#13 ──
// Unlike getPublishedBbqEvents (published-only, sorted for a dropdown),
// this is the raw list call — any status, or none (all statuses,
// newest-eventDate-first per the backend's own orderBy).
export const getBbqEventsList = async (token, { status, limit } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit) params.set('limit', limit);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/bbq/events${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ events');
  return data.data?.events || [];
};

// ── GET /bbq/events/:eventId — single event, full resolved menu ──
export const getBbqEvent = async (token, eventId) => {
  const res = await fetch(`${BASE_URL}/bbq/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load BBQ event');
  return data.data?.event;
};

// ── POST /bbq/events — save/update draft, Screen #12 (manager) ──
// Upsert against the deterministic {tenantId}_{eventDate} doc ID.
// Backend rejects (400) if eventDate isn't a Friday, or if a doc
// already exists for that date and isn't draft/returned — surfaced
// verbatim, not re-worded here.
export const saveBbqEventDraft = async (token, { eventDate, itemIds }) => {
  const res = await fetch(`${BASE_URL}/bbq/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventDate, itemIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save BBQ event draft');
  return data.data;
};

// ── PATCH /bbq/events/:eventId/submit — Screen #12 (manager) ──
export const submitBbqEvent = async (token, eventId) => {
  const res = await fetch(`${BASE_URL}/bbq/events/${eventId}/submit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit BBQ event');
  return data.data;
};

// ── PATCH /bbq/events/:eventId/publish — Screen #13 (admin). No body —
//    unlike official club events' publish, which requires a venue,
//    bbqEvents' publish takes nothing extra. ──
export const publishBbqEvent = async (token, eventId) => {
  const res = await fetch(`${BASE_URL}/bbq/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to publish BBQ event');
  return data.data;
};

// ── PATCH /bbq/events/:eventId/return — Screen #13 (admin) ──
export const returnBbqEvent = async (token, eventId, returnComments) => {
  const res = await fetch(`${BASE_URL}/bbq/events/${eventId}/return`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnComments }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to return BBQ event');
  return data.data;
};