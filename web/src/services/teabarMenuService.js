// ─────────────────────────────────────────
// teabarMenuService.js — V1.3 (Tea Bar — Menu, frontend read)
// HomiLabs | Servio | Web
//
// Talks to GET /teabar/menu (backend, teabarRoutes.js, confirmed by direct
// read 08-Jul-2026). Token passed as a parameter (Style B — matches
// teabarLocationService.js), not fetched internally.
//
// Response shape: wrapped in successResponse() -> { success, message, data }
// — confirmed from the backend route handler, same convention already
// documented in teabarLocationService.js (web).
// ─────────────────────────────────────────
import { BASE_URL } from './config.js';

// ── GET /teabar/menu ────────────────────────────────────────────────────
export const getTeabarMenu = async (token) => {
  const res = await fetch(`${BASE_URL}/teabar/menu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Tea Bar menu');
  return data.data;
};