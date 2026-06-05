// web/src/services/reportingService.js
// Flow 11 — Reporting Dashboard

import { auth } from '../config/firebase';

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /reports/daily-headcount?date=YYYY-MM-DD ──────────────────────────
// Live daily headcount — used by reporting dashboard Live Today tab
export const getDailyHeadcount = async (date) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/reports/daily-headcount?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load headcount');
  return data.data;
};

// ── GET /reports/admin-alerts ─────────────────────────────────────────────
// Live admin alerts — pending approvals, pending rate entries, etc.
export const getAdminAlerts = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/reports/admin-alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load alerts');
  return data.data;
};

// ── GET /reports/snapshot/:reportType?period=YYYY-MM ─────────────────────
// Reads a pre-computed snapshot document
// reportType examples: weekly_booking_summary, monthly_billing_summary,
//                      feedback_trends, event_summary
export const getSnapshot = async (reportType, period) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/reports/snapshot/${reportType}?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load snapshot');
  return data.data;
};

// ── GET /reports/snapshots/:reportType?limit=12 ───────────────────────────
// Lists available snapshot periods for a report type
// Used by frontend to populate a period picker
export const listSnapshots = async (reportType, limit = 12) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/reports/snapshots/${reportType}?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to list snapshots');
  return data.data;
};

// ── GET /reports/event/:eventId ───────────────────────────────────────────
// On-demand event summary
export const getEventSummary = async (eventId) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/reports/event/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load event summary');
  return data.data;
};

// ── POST /reports/trigger-snapshot ────────────────────────────────────────
// Manual snapshot trigger — admin only, for testing without waiting for midnight
export const triggerManualSnapshot = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/reports/trigger-snapshot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to trigger snapshot');
  return data.data;
};
