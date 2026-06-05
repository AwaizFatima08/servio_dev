import api from './api';

// Get my reservations — optional ?month=YYYY-MM or ?status=active|cancelled
// If date is passed we filter in memory on the calling screen
export const getMyReservations = async (date) => {
  const res = await api.get(`/mess/my-reservations`);
  return res.data;
};

// FIXED: backend uses path params — /mess/daily-menu/:date/:mealType
export const getDailyMenu = async (date, mealType) => {
  const res = await api.get(`/mess/daily-menu/${date}/${mealType}`);
  return res.data;
};

// Book a meal for self
// payload: { reservationDate, mealType, menuItemId, menuOptionKey, optionLabel, itemName, diningMode, selectionMode }
export const bookMeal = async (payload) => {
  const res = await api.post(`/mess/reservations`, payload);
  return res.data;
};

// Cancel a reservation
export const cancelReservation = async (reservationId, cancellationReason, cancellationNote = '') => {
  const res = await api.patch(`/mess/reservations/${reservationId}/cancel`, {
    cancellationReason,
    cancellationNote,
  });
  return res.data;
};
