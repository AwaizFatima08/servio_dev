// ─────────────────────────────────────────────────────────────────────────────
// web/src/utils/dateUtils.js
// Shared date utility helpers for Servio web
// HomiLabs | Servio
//
// Bug 4 fix: Firestore server timestamps arrive from the API as plain objects,
// not JS Date instances. new Date({ _seconds: ... }) produces "Invalid Date".
// All web pages must use tsToDate() instead of new Date(timestamp) directly.
//
// Firestore timestamp shapes from Express serialisation:
//   { _seconds: N, _nanoseconds: N }   — most common
//   { seconds:  N, nanoseconds:  N }   — alternate
//   ISO string "2026-05-21T12:00:00Z"  — already a string
//   null / undefined                   — field not yet set
// ─────────────────────────────────────────────────────────────────────────────

// ── tsToDate ──────────────────────────────────────────────────────────────────
// Safely converts any Firestore timestamp value to a JS Date.
// Returns null if the value is null/undefined/unparseable.
export function tsToDate(ts) {
  if (!ts) return null;
  // Already a Date
  if (ts instanceof Date) return ts;
  // Firestore timestamp object — both serialisation shapes
  const secs = ts._seconds ?? ts.seconds;
  if (typeof secs === 'number') {
    return new Date(secs * 1000);
  }
  // ISO string or YYYY-MM-DD string
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ── formatTs ──────────────────────────────────────────────────────────────────
// Converts a Firestore timestamp to a human-readable date+time string.
// Returns fallback (default '—') if null/unparseable.
//
// Usage: formatTs(r.createdAt)           → "21 May 2026, 14:30"
//        formatTs(r.cancelledAt, 'N/A')  → "N/A" if not cancelled
export function formatTs(ts, fallback = '—') {
  const d = tsToDate(ts);
  if (!d) return fallback;
  return d.toLocaleString('en-PK', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ── formatTsDate ──────────────────────────────────────────────────────────────
// Date only — no time component.
// Usage: formatTsDate(r.issuedAt)  → "21 May 2026"
export function formatTsDate(ts, fallback = '—') {
  const d = tsToDate(ts);
  if (!d) return fallback;
  return d.toLocaleDateString('en-PK', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

// ── formatTsTime ──────────────────────────────────────────────────────────────
// Time only — no date component.
// Usage: formatTsTime(r.issuedAt)  → "14:30"
export function formatTsTime(ts, fallback = '—') {
  const d = tsToDate(ts);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-PK', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ── formatReservationDate ─────────────────────────────────────────────────────
// Formats a plain YYYY-MM-DD reservation date string for display.
// Appends T00:00:00Z to avoid timezone day-shift on parse.
// Usage: formatReservationDate("2026-05-21")  → "Wed, 21 May"
export function formatReservationDate(dateStr, fallback = '—') {
  if (!dateStr) return fallback;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  });
}

// ── timeAgo ───────────────────────────────────────────────────────────────────
// Returns a relative time string for a Firestore timestamp.
// Usage: timeAgo(r.createdAt)  → "2 hours ago" / "3 days ago"
export function timeAgo(ts, fallback = '—') {
  const d = tsToDate(ts);
  if (!d) return fallback;
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1)  return 'just now';
  if (mins  < 60)  return `${mins} min ago`;
  if (hours < 24)  return `${hours} hr ago`;
  if (days  <  7)  return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatTsDate(ts, fallback);
}
