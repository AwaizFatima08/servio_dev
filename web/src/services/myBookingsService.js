// web/src/services/myBookingsService.js
// Employee-facing booking history — Flow 06
// Separate from messService.js which is supervisor-facing

import { auth } from '../config/firebase';

import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /mess/my-reservations?month=YYYY-MM&status=active|cancelled ───────
// Employee's own reservations — active + history
// month is optional — omit to get all
// status is optional — omit to get all statuses
export const getMyReservations = async ({ month, status } = {}) => {
  const token = await getToken();
  const params = new URLSearchParams();
  if (month)  params.set('month', month);
  if (status) params.set('status', status);
  const query = params.toString();
  const res = await fetch(
    `${BASE_URL}/mess/my-reservations${query ? `?${query}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reservations');
  return data.reservations ?? [];
};

// ── PATCH /mess/reservations/:reservationId/cancel ────────────────────────
// Employee cancels own reservation
export const cancelReservation = async (reservationId, reason = 'employee_request', note = '') => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/mess/reservations/${reservationId}/cancel`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellationReason: reason,
        cancellationNote: note || null,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel reservation');
  return data.result ?? data;
};
