// web/src/services/ratesService.js
// Flow 07 — Rate Entry

import { auth } from '../config/firebase';

const BASE_URL = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// GET /rates/pending?rateDate=YYYY-MM-DD
// Returns yesterday's served items needing rate entry
// Each item includes: rateTargetKey, mealType, menuOptionKey, displayLabel,
// comboName, issuedCount, lastHistoricalRate, rateAlreadyEntered, existingRate
export const getPendingRateEntries = async (rateDate) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/rates/pending?date=${rateDate}`, {
  headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load pending entries');
  return data.items;
};

// POST /rates/submit
// Submit rate entries for one date
// entries = [{ rateTargetKey, menuItemId, itemName, mealType,
//              menuOptionKey, selectionMode, unitRate }]
export const submitRateEntries = async (rateDate, entryDate, entries) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rateDate, entryDate, entries }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit rates');
  return data.result;
};

// GET /rates?rateDate=YYYY-MM-DD
// Returns all rate entries already submitted for a date
export const getRatesForDate = async (rateDate) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/rates?rateDate=${rateDate}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load rates');
  return data.data;
};
