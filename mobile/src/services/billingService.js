import api from './api';

export const getMyStatement = async (month) => {
  // Returns { success: true, data: { employeeNumber, month, reservations, totalAmount, issuedCount, pendingRateCount } }
  const res = await api.get(`/billing/my-statement?month=${month}`);
  return res.data; // { success, data }
};
