// web/src/services/billingService.js
// Flow 14 — Billing Dashboard

import { auth } from '../config/firebase';

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /billing/employee/:employeeNumber?month=YYYY-MM ───────────────────
// Accounts supervisor looks up any employee's monthly billing statement.
// Calls the correct backend endpoint — accounts_supervisor role permitted.
export const getEmployeeStatement = async (employeeNumber, month) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/billing/employee/${employeeNumber}?month=${month}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load employee statement');
  return data.data;
};

// ── GET /billing/summary?month=YYYY-MM ────────────────────────────────────
// Month-level totals — employee vs official, pending counts
// Accounts supervisor and above only
export const getMonthlySummary = async (month) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/billing/summary?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load summary');
  return data.data;
};

// ── GET /billing/official?month=YYYY-MM ───────────────────────────────────
// All official account charges grouped by cost centre
export const getOfficialCharges = async (month) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/billing/official?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load official charges');
  return data.data;
};

// ── GET /billing/pending?date=YYYY-MM-DD ──────────────────────────────────
// Issued reservations where rate has not been applied yet
export const getPendingBilling = async (date) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/billing/pending?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending billing');
  return data.data;
};

// ── GET /billing/my-statement?month=YYYY-MM ───────────────────────────────
// Employee reads their own monthly bill.
// Any authenticated role permitted — employee reads own data only.
export const getMyStatement = async (month) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/billing/my-statement?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load billing statement');
  return data.data;
};