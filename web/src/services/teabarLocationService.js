// ─────────────────────────────────────────
// teabarLocationService.js — Tea Bar Location Management (frontend)
// HomiLabs | Servio | Web
//
// Talks to the 5 location routes in teabarRoutes.js (backend), confirmed
// 06-Jul-2026. Token passed in as a parameter (Style B — matches café's
// admin-facing pages), not fetched internally.
//
// IMPORTANT — response shape: these backend routes use the shared
// successResponse() helper (see utils.js), which wraps the real answer
// inside a `data` field: { success, message, data: {...} }. This is
// DIFFERENT from getUserByEmployeeNumber (no wrapper) and getUsers (one
// plain box, no wrapper) — three different shapes exist in this app today.
// Confirmed by reading utils.js and teabarRoutes.js directly.
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── GET /teabar/locations ───────────────────────────────────────────────
export const listTeabarLocations = async (token, includeInactive = false) => {
  const url = includeInactive
    ? `${BASE_URL}/teabar/locations?activeOnly=false`
    : `${BASE_URL}/teabar/locations`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Tea Bar locations');
  return data.data.locations ?? [];
};

// ── POST /teabar/locations ──────────────────────────────────────────────
export const createTeabarLocation = async (token, locationName) => {
  const res = await fetch(`${BASE_URL}/teabar/locations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locationName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create Tea Bar location');
  return data.data;
};

// ── PUT /teabar/locations/:locationId ───────────────────────────────────
// updates: { locationName?, isActive? } — only send fields that changed.
export const updateTeabarLocation = async (token, locationId, updates) => {
  const res = await fetch(`${BASE_URL}/teabar/locations/${locationId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update Tea Bar location');
  return data.data;
};

// ── PATCH /teabar/locations/:locationId/assign ──────────────────────────
export const assignTeabarAttendant = async (token, locationId, attendantUid) => {
  const res = await fetch(`${BASE_URL}/teabar/locations/${locationId}/assign`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attendantUid }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to assign attendant');
  return data.data;
};

// ── PATCH /teabar/locations/:locationId/unassign ────────────────────────
export const unassignTeabarAttendant = async (token, locationId) => {
  const res = await fetch(`${BASE_URL}/teabar/locations/${locationId}/unassign`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to unassign attendant');
  return data.data;
};

// ── GET /teabar/locations/mine — "which location do I currently cover?" ──
// Returns null (not an error) if the caller is not currently assigned —
// the backend always answers 200 here, so check the value, not a catch.
export const getMyTeabarLocation = async (token) => {
  const res = await fetch(`${BASE_URL}/teabar/locations/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load your Tea Bar location');
  return data.data.location;
};