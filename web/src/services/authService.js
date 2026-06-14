// ─────────────────────────────────────────
// authService.js — Authentication Service
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { BASE_URL } from './config.js';

const API_BASE = BASE_URL;

// ─────────────────────────────────────────
// login
// Signs in with Firebase Auth then fetches
// role and profile from backend
// ─────────────────────────────────────────
export async function login(email, password) {
  // Step 1 — Firebase Auth
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();

  // Step 2 — Fetch user profile from backend
  const response = await axios.get(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    user: credential.user,
    token,
    profile: response.data.data,
  };
}

// ─────────────────────────────────────────
// getProfile
// Fetches fresh profile with existing token
// ─────────────────────────────────────────
export async function getProfile(token) {
  const response = await axios.get(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}
