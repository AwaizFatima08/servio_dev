// ─────────────────────────────────────────
// templateService.js — Templates & Cycles API
// HomiLabs | Servio | Web
// ─────────────────────────────────────────

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Templates ──

export async function getTemplates(token) {
  const res = await fetch(`${BASE_URL}/templates`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load templates');
  return data.data.templates || [];
}

export async function getTemplate(templateId, token) {
  const res = await fetch(`${BASE_URL}/templates/${templateId}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load template');
  return data.data.template;
}

export async function createTemplate(payload, token) {
  const res = await fetch(`${BASE_URL}/templates`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create template');
  return data.data;
}

export async function updateTemplate(templateId, updates, token) {
  const res = await fetch(`${BASE_URL}/templates/${templateId}`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update template');
  return data.data;
}

// ── Cycles ──

export async function getCycles(token) {
  const res = await fetch(`${BASE_URL}/templates/cycles`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load cycles');
  return data.data.cycles || [];
}

export async function getActiveCycle(token) {
  const res = await fetch(`${BASE_URL}/templates/cycles/active`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(data.message || 'Failed to load active cycle');
  return data.data.cycle;
}

export async function createCycle(payload, token) {
  const res = await fetch(`${BASE_URL}/templates/cycles`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create cycle');
  return data.data;
}

export async function setCycleStatus(cycleId, status, token, endDate = null) {
  const res = await fetch(`${BASE_URL}/templates/cycles/${cycleId}/status`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(endDate ? { endDate } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update cycle status');
  return data.data;
}

// ── Daily Menu Resolver ──

export async function resolveMenus(date, token) {
  const res = await fetch(`${BASE_URL}/mess/resolve-daily-menus`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to resolve menus');
  return data.result;
}