// web/src/services/eventService.js
// Event API calls for web
// HomiLabs | Servio | Web

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── getActiveEvents ──
// GET /events/active
// Returns published events that are today or upcoming.
// Used by EmployeeDashboard for the event banner (F5).
export async function getActiveEvents(token) {
  const res = await fetch(`${BASE_URL}/events/active`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load events.');
  return data.events || [];
}
