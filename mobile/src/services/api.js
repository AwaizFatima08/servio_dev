// mobile/src/services/api.js
//
// ─────────────────────────────────────────────────────
// FIX (Batch 1, 01 Jun 2026): Bug 2 — "Unauthorized: Invalid token"
//
// Root cause: the request interceptor was reading the token from
// AsyncStorage.getItem('token'). That value was written ONCE at login
// (and once at signup). But Firebase ID tokens expire after exactly
// 1 hour. After the first hour, every API call sent a stale token,
// the backend's verifyRole middleware rejected it with 401, and the
// mobile app surfaced "Unauthorized: Invalid token".
//
// Fix: read the token from Firebase auth directly using
// auth.currentUser.getIdToken(). This method auto-refreshes when the
// current token is within 5 minutes of expiry, so every API call
// gets a fresh, valid token without the app having to manage it.
//
// AsyncStorage is no longer needed here — the Firebase SDK persists
// the user session itself (see firebase.js where getReactNativePersistence
// is configured).
//
// Side effect (good): this also auto-resolves Bug 6 ("Mobile My Bill
// shows Rs. 0"), because that screen was failing the same way — the
// stale token caused billing API calls to fail, the catch block fell
// through, and the screen rendered with empty totals.
// ─────────────────────────────────────────────────────

import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ─── Request interceptor: attach a fresh token to every call ──
// Skip if Authorization header was already set manually by the caller
// (login and signup flows do this on purpose, since auth.currentUser
// may not yet be populated when those first calls happen).
api.interceptors.request.use(async (config) => {
  if (config.headers.Authorization) {
    return config;
  }

  // Pull a fresh token from Firebase. getIdToken() auto-refreshes
  // when the current token is within 5 minutes of expiry.
  // Passing 'false' means: use the cached token if it's still valid,
  // otherwise refresh. (Passing 'true' would force a refresh every call,
  // which is wasteful.)
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken(false);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      // If token refresh fails (network blip, account disabled, etc.),
      // let the request go through anyway — the backend will return
      // 401 and the response interceptor below will surface it.
      console.warn('[api] getIdToken failed:', err?.message || err);
    }
  }
  return config;
});

// ─── Response interceptor: turn 4xx/5xx into real errors ──
// Axios resolves on 4xx responses by default — it does not throw.
// This interceptor ensures any 4xx or 5xx response is treated as an error,
// so catch blocks in service files receive the backend error message correctly.
// Without this, bookMeal() and other calls would show "Booked!" even when
// the backend returned a 400 cutoff error.
api.interceptors.response.use(
  (response) => {
    if (response.status >= 400) {
      const err = new Error(response.data?.message || 'Request failed');
      err.response = response;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
