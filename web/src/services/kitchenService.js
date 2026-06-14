// web/src/services/kitchenService.js
// Flow 15 — Kitchen Dashboard

import { auth } from '../config/firebase';

import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// GET /kitchen/summary?date=YYYY-MM-DD
// All three meals in one call — used on first load
export const getDaySummary = async (date) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/kitchen/summary?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load day summary');
  return data.data;
};

// GET /kitchen/headcount?date=YYYY-MM-DD&mealType=lunch
// Post-cutoff confirmed booking count per combo
export const getHeadcount = async (date, mealType) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/kitchen/headcount?date=${date}&mealType=${mealType}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load headcount');
  return data.data;
};

// GET /kitchen/issuance-progress?date=YYYY-MM-DD&mealType=lunch
// Live issued / pending / no-show per combo
export const getIssuanceProgress = async (date, mealType) => {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/kitchen/issuance-progress?date=${date}&mealType=${mealType}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load issuance progress');
  return data.data;
};
