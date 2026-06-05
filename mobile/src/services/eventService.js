import api from './api';

// Correct endpoint: GET /events?status=published
// Returns { count, events }
export const getActiveEvents = async () => {
  const res = await api.get('/events?status=published');
  return res.data;
};

export const getEventById = async (eventId) => {
  const res = await api.get(`/events/${eventId}`);
  return res.data;
};

export const submitAttendance = async (eventId, attendanceStatus, counts = {}, employeeName = '') => {
  const res = await api.post(`/events/${eventId}/attendance`, {
    attendanceStatus,
    counts,
    employeeName,
  });
  return res.data;
};

export const getMyAttendanceResponse = async (eventId) => {
  const res = await api.get(`/events/${eventId}/attendance/my-response`);
  return res.data;
};
