// web/src/services/feedbackService.js
// Flow 08 — Employee Feedback

import { auth } from '../config/firebase';

import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /feedback/eligible ────────────────────────────────────────────────
// Returns issued reservations eligible for feedback (within 24hr window)
// Backend returns: { count, reservations: [...] }
export const getEligibleReservations = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/feedback/eligible`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load eligible reservations');
  return data.reservations ?? [];
};

// ── GET /feedback/my ──────────────────────────────────────────────────────
// Returns all feedback submitted by the current employee
// Backend returns: { count, feedback: [...] }
export const getMyFeedback = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/feedback/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load submitted feedback');
  return data.feedback ?? [];
};

// ── POST /feedback ────────────────────────────────────────────────────────
// Submit feedback for an issued reservation
export const submitFeedback = async (payload) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Submission failed');
  return data;
};
