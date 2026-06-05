// core/functions/src/feedback/feedbackRoutes.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const {
  submitFeedback, getFeedbackForReservation, getFeedbackSummary,
  getEligibleReservations, getMyFeedback,
} = require('./feedbackService');

const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE,
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

const supervisorAndAbove = [verifyToken, verifyRole(
  ROLES.MESS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

/** POST /feedback */
router.post('/', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const tenantId = req.tenantId;
    const { reservationId, feedbackArea, rating, isAnonymous } = req.body;
    const missing = ['reservationId', 'feedbackArea', 'rating']
      .filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length > 0) return errorResponse(res, `Missing: ${missing.join(', ')}`, 400);
    const result = await submitFeedback({ uid, officialEmployeeNumber, tenantId, reservationId, feedbackArea, rating: parseInt(rating), isAnonymous: isAnonymous || false });
    return res.status(201).json({ message: 'Feedback submitted successfully.', feedback: result });
  } catch (error) {
    console.error('Submit feedback error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/** GET /feedback/eligible — issued reservations within feedback window */
router.get('/eligible', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const reservations = await getEligibleReservations({ tenantId, officialEmployeeNumber });
    return res.status(200).json({ count: reservations.length, reservations });
  } catch (error) {
    console.error('GET feedback/eligible error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/** GET /feedback/my -- feedback history for current employee */
router.get('/my', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const { month } = req.query;
    if (month && !/^\d{4}-\d{2}$/.test(month)) return errorResponse(res, 'Invalid month format.', 400);
    const feedback = await getMyFeedback({ tenantId, officialEmployeeNumber, month });
    return res.status(200).json({ count: feedback.length, feedback });
  } catch (error) {
    console.error('GET feedback/my error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/** GET /feedback/reservation/:reservationId */
router.get('/reservation/:reservationId', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { reservationId } = req.params;
    const feedback = await getFeedbackForReservation({ tenantId, reservationId });
    return res.status(200).json({ reservationId, count: feedback.length, feedback });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** GET /feedback/summary?date=...&mealType=... */
router.get('/summary', supervisorAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date, mealType } = req.query;
    if (!date) return errorResponse(res, 'date query parameter is required.', 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    if (mealType && !['breakfast', 'lunch', 'dinner'].includes(mealType)) return errorResponse(res, 'Invalid mealType.', 400);
    const result = await getFeedbackSummary({ tenantId, date, mealType });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get feedback summary error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;