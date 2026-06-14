// web/src/services/reservationSettingsService.js
// F7 — Booking Policy Widget API calls
// HomiLabs | Servio | Web
// Reads and writes reservationSettings — separate from appSettings.

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── getReservationSettings ──
// GET /mess/reservation-settings
// Returns the tenant's reservationSettings document.
// Admin only.
export async function getReservationSettings(token) {
  const res = await fetch(`${BASE_URL}/mess/reservation-settings`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reservation settings.');
  return data.settings;
}

// ── updateReservationSettings ──
// PATCH /mess/reservation-settings
// Admin updates booking policy fields.
// Allowed: cutoffHoursBeforeMeal, bookingWindowDays, maxGuestQuantityPerBooking
export async function updateReservationSettings(updates, token) {
  const res = await fetch(`${BASE_URL}/mess/reservation-settings`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update reservation settings.');
  return data;
}
