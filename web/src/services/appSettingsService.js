// web/src/services/appSettingsService.js
// Screen 19 — Contact Us / App Settings (Admin)
//
// FIX (Batch 1, 02 Jun 2026): Bug 14 + Bug 15 — Contact Us shows "Not set"
//
// Root cause: GET /app-settings returns { settings: {...} }
// but the service was reading data.data ?? data — which is wrong.
// data.data is undefined, so it fell back to the full response object
// { settings: {...} }, meaning form.managerName etc were always undefined.
//
// Fix: return data.settings instead of data.data ?? data.
// One word change. No backend change needed.
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from '../config/firebase';

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// GET /app-settings
// Returns full appSettings document for the tenant
export const getAppSettings = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/app-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load settings');
  return data.settings;          // ← FIX: was  data.data ?? data
};

// PATCH /app-settings
// Updates appSettings fields — admin only
export const updateAppSettings = async (fields) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/app-settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Save failed');
  return data;
};
