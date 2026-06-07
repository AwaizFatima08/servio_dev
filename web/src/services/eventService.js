// web/src/services/eventService.js — complete replacement v2

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';
function authHeader(token) { return { Authorization: `Bearer ${token}` }; }
function jsonHeaders(token) { return { ...authHeader(token), 'Content-Type': 'application/json' }; }

export async function getNoteTemplates(token) {
  const res = await fetch(`${BASE_URL}/event-note-templates`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load note templates');
  return data.templates;
}
export async function createNoteTemplate(payload, token) {
  const res = await fetch(`${BASE_URL}/event-note-templates`, {
    method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create note template');
  return data;
}
export async function toggleNoteTemplate(templateId, isActive, token) {
  const res = await fetch(`${BASE_URL}/event-note-templates/${templateId}/status`, {
    method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update note template');
  return data;
}
export async function getEvents(query = {}, token) {
  const params = new URLSearchParams();
  if (query.eventType) params.set('eventType', query.eventType);
  if (query.status)    params.set('status', query.status);
  if (query.limit)     params.set('limit', String(query.limit));
  const res = await fetch(`${BASE_URL}/events?${params}`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load events');
  return data.events;
}
export async function getEvent(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load event');
  return data.event;
}
export async function createEvent(payload, token) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create event');
  return data.event;
}
export async function submitEvent(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/submit`, {
    method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit event');
  return data;
}
export async function publishEvent(eventId, payload, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to publish event');
  return data;
}
export async function returnEvent(eventId, payload, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/return`, {
    method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to return event');
  return data;
}
export async function cancelEvent(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/cancel`, {
    method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel event');
  return data;
}
export async function getAttendanceSummary(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/attendance/summary`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load attendance summary');
  return data.summary;
}
export async function getMyAttendanceResponse(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/attendance/my-response`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load your response');
  return data.response;
}
export async function submitAttendanceResponse(eventId, payload, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/attendance`, {
    method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit attendance');
  return data.result;
}
export async function getAttendanceResponses(eventId, token) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/attendance/responses`, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load responses');
  return data.responses;
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