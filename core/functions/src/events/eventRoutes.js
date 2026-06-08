// core/functions/src/events/eventRoutes.js
// COMPLETE REPLACEMENT — adds getAttendanceResponses endpoint for report download
// FIX: /active route moved before /:eventId to prevent Express route interception

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const {
  createEvent, submitEvent, publishEvent, returnEvent, cancelEvent,
  getEvents, getEvent, submitAttendanceResponse, getAttendanceSummary,
  getMyAttendanceResponse, getAttendanceResponses,
} = require('./eventService');

const anyAuthenticated = [verifyToken, verifyRole(
  ROLES.EMPLOYEE, ROLES.MESS_SUPERVISOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN
)];
const managerAndAbove = [verifyToken, verifyRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const adminOnly = [verifyToken, verifyRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

// POST /events
router.post('/', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const createdByRole = req.userRole;
    const createdByEmployeeNumber = req.officialEmployeeNumber;
    const {
      eventType, eventCategory, title, subtitle, description, eventDate,
      startAt, endAt, targetScope, requiresAttendance, responseCutoffAt,
      allowEditUntilCutoff, selectedNoteIds, customNotice, specialRequirements,
      menuSelectionIds, menuSelectionNames, decorRequired, billingDestination,
      costCentreCode, hostEmployeeNumber, hostEmployeeName,
    } = req.body;

    const missing = ['eventType', 'eventCategory', 'title', 'eventDate', 'startAt', 'endAt']
      .filter(f => !req.body[f]);
    if (missing.length > 0) return errorResponse(res, `Missing required fields: ${missing.join(', ')}`, 400);
    if (eventType === 'official' && !['manager', 'admin', 'super_admin'].includes(createdByRole))
      return errorResponse(res, 'Only manager and above can create official events.', 403);

    const result = await createEvent({
      tenantId, createdByUid: uid, createdByName: createdByEmployeeNumber,
      createdByEmployeeNumber, createdByRole, eventType, eventCategory,
      title, subtitle, description, eventDate, startAt, endAt, targetScope,
      requiresAttendance, responseCutoffAt, allowEditUntilCutoff, selectedNoteIds,
      customNotice, specialRequirements, menuSelectionIds, menuSelectionNames,
      decorRequired, billingDestination, costCentreCode, hostEmployeeNumber, hostEmployeeName,
    });
    return res.status(201).json({ message: 'Event created successfully.', event: result });
  } catch (error) {
    console.error('Create event error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// GET /events
router.get('/', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { eventType, status, limit } = req.query;
    const events = await getEvents({ tenantId, eventType, status, limit: limit ? parseInt(limit) : 20 });
    return res.status(200).json({ count: events.length, events });
  } catch (error) {
    console.error('Get events error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// GET /events/active
// Returns published events where eventDate >= today (PKT).
// Used by employee home screen event banner (F5). Any authenticated user.
// IMPORTANT: Must appear before GET /events/:eventId to avoid route interception.
router.get('/active', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Today in PKT (UTC+5)
    const pktNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const todayPkt = `${pktNow.getFullYear()}-${String(pktNow.getMonth() + 1).padStart(2, '0')}-${String(pktNow.getDate()).padStart(2, '0')}`;

    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore('servio-dev');

    const snap = await db
      .collection('events')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'published')
      .where('eventDate', '>=', todayPkt)
      .orderBy('eventDate', 'asc')
      .limit(10)
      .get();

    const events = snap.docs.map(d => {
      const ev = d.data();
      return {
        eventId:             ev.eventId,
        title:               ev.title,
        eventDate:           ev.eventDate,
        eventType:           ev.eventType,
        requiresAttendance:  ev.requiresAttendance,
        responseCutoffAt:    ev.responseCutoffAt,
        venue:               ev.venue || null,
      };
    });

    return res.status(200).json({ count: events.length, events });
  } catch (error) {
    console.error('GET /events/active error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// GET /events/:eventId/attendance/my-response  — MUST be before /:eventId
router.get('/:eventId/attendance/my-response', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const { eventId } = req.params;
    const response = await getMyAttendanceResponse({ tenantId, eventId, officialEmployeeNumber });
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Get my attendance response error:', error.message);
    return errorResponse(res, error.message, 404);
  }
});

// GET /events/:eventId/attendance/summary — manager and above
router.get('/:eventId/attendance/summary', managerAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const summary = await getAttendanceSummary({ tenantId, eventId });
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Get attendance summary error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// GET /events/:eventId/attendance/responses — employee-wise detail, manager and above
router.get('/:eventId/attendance/responses', managerAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const responses = await getAttendanceResponses({ tenantId, eventId });
    return res.status(200).json({ count: responses.length, responses });
  } catch (error) {
    console.error('Get attendance responses error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

// GET /events/:eventId
router.get('/:eventId', anyAuthenticated, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const event = await getEvent({ tenantId, eventId });
    return res.status(200).json({ event });
  } catch (error) {
    console.error('Get event error:', error.message);
    return errorResponse(res, error.message, 404);
  }
});

// PATCH /events/:eventId/submit
router.patch('/:eventId/submit', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const result = await submitEvent({ eventId, tenantId, submittedByUid: uid, submittedByRole: req.userRole });
    return res.status(200).json({ message: 'Event submitted successfully.', result });
  } catch (error) {
    console.error('Submit event error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// PATCH /events/:eventId/publish — admin only
router.patch('/:eventId/publish', adminOnly, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const { venue, location } = req.body;
    const result = await publishEvent({ eventId, tenantId, publishedByUid: uid, venue, location });
    return res.status(200).json({ message: 'Event published successfully.', result });
  } catch (error) {
    console.error('Publish event error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// PATCH /events/:eventId/return — admin only
router.patch('/:eventId/return', adminOnly, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const { returnComments } = req.body;
    if (!returnComments) return errorResponse(res, 'returnComments is required.', 400);
    const result = await returnEvent({ eventId, tenantId, returnedByUid: uid, returnComments });
    return res.status(200).json({ message: 'Event returned successfully.', result });
  } catch (error) {
    console.error('Return event error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// PATCH /events/:eventId/cancel — manager and above
router.patch('/:eventId/cancel', managerAndAbove, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const { eventId } = req.params;
    const result = await cancelEvent({ eventId, tenantId, cancelledByUid: uid });
    return res.status(200).json({ message: 'Event cancelled successfully.', result });
  } catch (error) {
    console.error('Cancel event error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

// POST /events/:eventId/attendance
router.post('/:eventId/attendance', anyAuthenticated, async (req, res) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.tenantId;
    const officialEmployeeNumber = req.officialEmployeeNumber;
    const { eventId } = req.params;
    const { attendanceStatus, counts, employeeName } = req.body;
    if (!attendanceStatus) return errorResponse(res, 'attendanceStatus is required.', 400);
    if (!['attending', 'not_attending'].includes(attendanceStatus))
      return errorResponse(res, 'Invalid attendanceStatus. Use attending or not_attending.', 400);
    const result = await submitAttendanceResponse({
      tenantId, eventId, uid, officialEmployeeNumber,
      employeeName: employeeName || officialEmployeeNumber,
      attendanceStatus, counts: counts || {}, source: 'self',
    });
    return res.status(200).json({ message: 'Attendance response submitted.', result });
  } catch (error) {
    console.error('Submit attendance error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;