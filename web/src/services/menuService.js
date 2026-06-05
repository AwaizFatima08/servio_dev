// ─────────────────────────────────────────
// menuService.js — Menu Catalogue API
// HomiLabs | Servio | Web
// ─────────────────────────────────────────

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Get food types (reference data for dropdowns) ──
export async function getFoodTypes(token) {
  const res = await fetch(`${BASE_URL}/menu/food-types`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load food types');
  return data.data.foodTypes || [];
}

// ── Get menu items ──
// query: { serviceCategory, foodTypeCode, isActive, search, limit }
export async function getMenuItems(query = {}, token) {
  const params = new URLSearchParams();
  if (query.serviceCategory) params.set('serviceCategory', query.serviceCategory);
  if (query.foodTypeCode)    params.set('foodTypeCode', query.foodTypeCode);
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive));
  if (query.search)          params.set('search', query.search);
  if (query.limit)           params.set('limit', String(query.limit));

  const res = await fetch(`${BASE_URL}/menu/items?${params}`, {
    headers: authHeader(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load menu items');
  return data.data; // { count, items }
}

// ── Add menu item ──
// payload: { itemName, foodTypeCode, baseUnit, serviceCategories[],
//            supportsFeedback, supportsRate, sortOrder }
// itemType always 'individual' in V1
export async function addMenuItem(payload, token) {
  const res = await fetch(`${BASE_URL}/menu/items`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      itemType: 'individual',           // always individual in V1
      constituentItemIds: null,         // combos not used in V1
      constituentItemNames: null,
      rateType: 'retrospective',        // FFL always retrospective
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add item');
  return data.data;
}

// ── Update menu item ──
export async function updateMenuItem(itemId, updates, token) {
  const res = await fetch(`${BASE_URL}/menu/items/${itemId}`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update item');
  return data.data;
}

// ── Set item active / inactive ──
export async function setMenuItemStatus(itemId, isActive, token) {
  const res = await fetch(`${BASE_URL}/menu/items/${itemId}/status`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update status');
  return data.data;
}
