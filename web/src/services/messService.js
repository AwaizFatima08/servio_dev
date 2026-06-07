// ─────────────────────────────────────────
// messService.js — Mess API calls
// HomiLabs | Servio | Web
// Updated: quantity now passed in createReservation
// ─────────────────────────────────────────

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── getDailyMenu ──
// GET /mess/daily-menu/:date/:mealType
// Returns null for 404 (menu not generated yet)
export async function getDailyMenu(date, mealType, token) {
  const res = await fetch(
    `${BASE_URL}/mess/daily-menu/${date}/${mealType}`,
    { headers: authHeader(token) }
  );
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(data.message || 'Failed to load menu');
  }
  return data.menu;
}

// ── getReservationsForDate ──
// GET /mess/reservations?date=YYYY-MM-DD
// NOTE: Endpoint parked — returns empty array if missing
export async function getReservationsForDate(date, token) {
  const res = await fetch(
    `${BASE_URL}/mess/reservations?date=${date}`,
    { headers: authHeader(token) }
  );
  if (res.status === 404) {
    console.warn('GET /mess/reservations not found — endpoint may be missing');
    return [];
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reservations');
  return data.reservations || data.data || [];
}

// ── getTodayReservations ── shorthand
export async function getTodayReservations(token) {
  const pkt   = new Date(new Date().getTime() + 5 * 60 * 60 * 1000);
  const today = `${pkt.getUTCFullYear()}-${String(pkt.getUTCMonth() + 1).padStart(2, '0')}-${String(pkt.getUTCDate()).padStart(2, '0')}`;
  const month = today.slice(0, 7); // YYYY-MM
  const res = await fetch(
    `${BASE_URL}/mess/my-reservations?month=${month}&status=active`,
    { headers: authHeader(token) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reservations');
  // Filter to today only — my-reservations returns full month
  const all = data.reservations || [];
  return all.filter(r => r.reservationDate === today);
}

// ── createReservation ──
// POST /mess/reservations
// payload includes quantity — backend now accepts and stores it
export async function createReservation(payload, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Booking failed');
    if (data.existingReservationId) err.existingReservationId = data.existingReservationId;
    throw err;
  }
  return data.reservation;
}

// ── createWeeklyReservations ──
// Calls createReservation once per slot. Returns { succeeded, failed }.
// Partial failure is expected — continues even if some slots fail.
export async function createWeeklyReservations(slots, token) {
  const succeeded = [];
  const failed = [];

  for (const slot of slots) {
    try {
      const result = await createReservation({
        reservationDate: slot.reservationDate,
        mealType:        slot.mealType,
        menuItemId:      slot.menuItemId,
        menuOptionKey:   slot.menuOptionKey,
        optionLabel:     slot.optionLabel,
        itemName:        slot.itemName,
        selectionMode:   slot.selectionMode,
        diningMode:      slot.diningMode,
        subjectType:     'self',
        quantity:        slot.quantity || 1,
      }, token);
      succeeded.push({ ...slot, reservationId: result?.reservationId });
    } catch (err) {
      failed.push({ ...slot, error: err.message });
    }
  }

  return { succeeded, failed };
}

// ── cancelReservation ──
// PATCH /mess/reservations/:id/cancel
export async function cancelReservation(reservationId, cancellationReason, token) {
  const res = await fetch(
    `${BASE_URL}/mess/reservations/${reservationId}/cancel`,
    {
      method: 'PATCH',
      headers: { ...authHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellationReason }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Cancellation failed');
  return data.result;
}

// ── getBookableWeek ──
// Returns array of 7 YYYY-MM-DD strings starting from today
export function getBookableWeek() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ── getIssuanceList ──
// GET /mess/reservations/issuance-list?date=YYYY-MM-DD&mealType=lunch
export async function getIssuanceList(date, mealType, token) {
  const params = new URLSearchParams({ date, mealType });
  const res = await fetch(`${BASE_URL}/mess/reservations/issuance-list?${params}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load issuance list');
  return data; // { date, mealType, count, reservations }
}

// ── issueReservation ──
// PATCH /mess/reservations/:reservationId/issue
export async function issueReservation(reservationId, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/${reservationId}/issue`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to issue reservation');
  return data;
}

// ── markNoShow ──
// PATCH /mess/reservations/:reservationId/no-show
export async function markNoShow(reservationId, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/${reservationId}/no-show`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark no-show');
  return data;
}

// ── getEmployees ──
// GET /employees?search=...&limit=30
// Used by Proxy Booking and Walk-in for employee search dropdown
export async function getEmployees(search, token) {
  const params = new URLSearchParams({ limit: '30' });
  if (search) params.set('search', search);
  const res = await fetch(`${BASE_URL}/employees?${params}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load employees');
  return data.data?.employees || data.employees || [];
}

// ── createWalkInReservation ──
// POST /mess/reservations/walk-in
// Used by WalkInPage — employee subject only
export async function createWalkInReservation(payload, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/walk-in`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Walk-in failed');
  return data.reservation;
}

// ── createProxyReservation ──
// POST /mess/reservations/proxy
// Used by ProxyBookingPage
export async function createProxyReservation(payload, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/proxy`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Proxy booking failed');
  return data.reservation;
}

// ── createAlaCarteBooking ──
// POST /mess/reservations/alacarte
export async function createAlaCarteBooking(payload, token) {
  // payload: { reservationDate, diningMode, items: [{ itemId, itemName, quantity }] }
  const res = await fetch(`${BASE_URL}/mess/reservations/alacarte`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Ala carte booking failed.');
    throw error;
  }
  return data.booking;
}

// ── getActiveMenuItems ──
// GET /mess/menu-items/active
// Returns full active menuItems catalogue for special meal selection.
export async function getActiveMenuItems(token) {
  const res = await fetch(`${BASE_URL}/mess/menu-items/active`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load menu items');
  return data.items || [];
}

// ── createSpecialMealWalkIn ──
// POST /mess/reservations/special-meal
// Supervisor walk-in special meal for lunch or dinner.
export async function createSpecialMealWalkIn(payload, token) {
  // payload: { targetEmployeeNumber, reservationDate, mealType, diningMode,
  //            items: [{ itemId, itemName, baseUnit, foodTypeCode, quantity }] }
  const res = await fetch(`${BASE_URL}/mess/reservations/special-meal`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Special meal walk-in failed.');
  return data.booking;
}
// ── createOfficialGuestWalkIn ──
// POST /mess/reservations/official-guest-walkin
// Supervisor walk-in for an official guest (no system account).
export async function createOfficialGuestWalkIn(payload, token) {
  // payload: { guestName, sponsoringEmployeeNumber, reservationDate, mealType,
  //            diningMode, comboItem, items }
  const res = await fetch(`${BASE_URL}/mess/reservations/official-guest-walkin`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Official guest walk-in failed.');
  return data.booking;
}

// ── getPendingOfficialGuestApprovals ──
// GET /mess/reservations/official-guest-pending
// Admin: fetch all pending official guest billing approvals.
export async function getPendingOfficialGuestApprovals(token, date) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const url = `${BASE_URL}/mess/reservations/official-guest-pending${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending approvals.');
  return data.reservations || [];
}

// ── approveOfficialGuestMeal ──
// PATCH /mess/reservations/:reservationId/approve-official-guest
export async function approveOfficialGuestMeal(reservationId, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/${reservationId}/approve-official-guest`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Approval failed.');
  return data.result;
}

// ── rejectOfficialGuestMeal ──
// PATCH /mess/reservations/:reservationId/reject-official-guest
export async function rejectOfficialGuestMeal(reservationId, approvalNote, token) {
  const res = await fetch(`${BASE_URL}/mess/reservations/${reservationId}/reject-official-guest`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Rejection failed.');
  return data.result;
}