// ─────────────────────────────────────────
// employeeService.js — Employee Master API
// HomiLabs | Servio | Web
// ─────────────────────────────────────────

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── List employees ──
// query: { search, employeeType, isActive, limit }
export async function getEmployees(query = {}, token) {
  const params = new URLSearchParams();
  if (query.search)       params.set('search', query.search);
  if (query.employeeType) params.set('employeeType', query.employeeType);
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive));
  if (query.limit)        params.set('limit', String(query.limit));

  const res = await fetch(`${BASE_URL}/employees?${params}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load employees');
  return data.data; // { count, employees }
}

// ── Get single employee ──
export async function getEmployee(employeeNumber, token) {
  const res = await fetch(`${BASE_URL}/employees/${employeeNumber}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load employee');
  return data.data.employee;
}

// ── Add employee ──
export async function addEmployee(payload, token) {
  const res = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add employee');
  return data.data;
}

// ── Set employee active/inactive ──
export async function setEmployeeStatus(employeeNumber, isActive, token) {
  const res = await fetch(`${BASE_URL}/employees/${employeeNumber}/status`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update status');
  return data.data;
}

// ── Update employee fields (admin) ──
export async function updateEmployee(employeeNumber, updates, token) {
  const res = await fetch(`${BASE_URL}/employees/${employeeNumber}`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update employee');
  return data.data;
}
