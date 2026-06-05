// web/src/services/userManagementService.js
// Flow 01 — User Management + Approvals (Admin)
// Covers: list pending requests, approve, reject, list active users,
//         change role, change status, reset throttle

import { auth } from '../config/firebase';

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /auth/pending-requests ─────────────────────────────────────────────
// List all pending registration requests
export const getPendingRequests = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/pending-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending requests');
  return data.requests ?? [];
};

// ── POST /auth/approve/:requestId ──────────────────────────────────────────
// Approve a pending registration request
export const approveRegistration = async (requestId) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/approve/${requestId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve request');
  return data;
};

// ── POST /auth/reject/:requestId ───────────────────────────────────────────
// Reject a pending registration request
export const rejectRegistration = async (requestId) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/reject/${requestId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject request');
  return data;
};

// ── GET /auth/users ────────────────────────────────────────────────────────
// List all users (active, inactive, suspended)
export const getUsers = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load users');
  return data.users ?? [];
};

// ── PATCH /auth/users/:uid/role ────────────────────────────────────────────
// Change a user's role
export const updateUserRole = async (uid, role) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/users/${uid}/role`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update role');
  return data;
};

// ── PATCH /auth/users/:uid/status ─────────────────────────────────────────
// Activate or suspend a user
export const updateUserStatus = async (uid, status) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/users/${uid}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update status');
  return data;
};

// ── POST /auth/users/:uid/reset-throttle ──────────────────────────────────
// Reset throttle on a user account
// NOTE: backend expects uid in the URL path, not officialEmployeeNumber in body
export const resetThrottle = async (uid) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/auth/users/${uid}/reset-throttle`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reset throttle');
  return data;
};
