import api from './api';

export const getEligibleReservations = async () => {
  const res = await api.get('/feedback/eligible');
  return res.data; // { count, reservations }
};

export const getMyFeedback = async (month) => {
  const url = month ? `/feedback/my?month=${month}` : '/feedback/my';
  const res = await api.get(url);
  return res.data;
};

export const submitFeedback = async (payload) => {
  // payload: { reservationId, feedbackArea, rating, isAnonymous }
  const res = await api.post('/feedback', payload);
  return res.data;
};
