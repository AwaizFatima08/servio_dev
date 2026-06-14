// web/src/services/feedbackAdminService.js
// F8 — Admin Feedback Review API calls
// HomiLabs | Servio | Web

import { BASE_URL } from './config.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── getAdminFeedback ──
// GET /feedback/admin?date=...&mealType=...&status=...&feedbackArea=...
// Admin reads all feedback submissions with optional filters.
export async function getAdminFeedback({ date, mealType, status, feedbackArea } = {}, token) {
  const params = new URLSearchParams();
  if (date)         params.set('date', date);
  if (mealType)     params.set('mealType', mealType);
  if (status)       params.set('status', status);
  if (feedbackArea) params.set('feedbackArea', feedbackArea);

  const url = `${BASE_URL}/feedback/admin${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: authHeader(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load feedback.');
  return data.feedback || [];
}

// ── reviewFeedback ──
// PATCH /feedback/:feedbackId/review
// Admin marks feedback as reviewed or resolved.
export async function reviewFeedback(feedbackId, status, token) {
  const res = await fetch(`${BASE_URL}/feedback/${feedbackId}/review`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update feedback status.');
  return data.result;
}
