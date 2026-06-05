// core/functions/src/events/eventService.js
// COMPLETE REPLACEMENT — includes:
// - expanded guest age brackets in submitAttendanceResponse
// - updated aggregator for new brackets
// - getMyAttendanceResponse function
// - Bug 3 fix: notification on event publish

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const { FieldValue } = require('firebase-admin/firestore');
const {
  COLLECTIONS,
  EVENT_TYPES,
  EVENT_STATUS_OFFICIAL,
  EVENT_STATUS_PERSONAL,
  TARGET_SCOPES,
  NOTIFICATION_TARGET_TYPES,
  NOTIFICATION_LAYERS,
} = require('../constants');

// Bug 3 fix: wire in notification service
const { createNotification } = require('../notifications/notificationService');

async function createEvent({
  tenantId, createdByUid, createdByName, createdByEmployeeNumber, createdByRole,
  eventType, eventCategory, title, subtitle, description, eventDate,
  startAt, endAt, targetScope, requiresAttendance, responseCutoffAt,
  allowEditUntilCutoff, selectedNoteIds, customNotice, specialRequirements,
  menuSelectionIds, menuSelectionNames, decorRequired, billingDestination,
  costCentreCode, hostEmployeeNumber, hostEmployeeName,
}) {
  if (!Object.values(EVENT_TYPES).includes(eventType)) {
    throw new Error(`Invalid eventType. Use: ${Object.values(EVENT_TYPES).join(', ')}`);
  }

  const initialStatus = eventType === EVENT_TYPES.OFFICIAL
    ? EVENT_STATUS_OFFICIAL.DRAFT
    : EVENT_STATUS_PERSONAL.DRAFT;

  const eventRef = db.collection(COLLECTIONS.EVENTS).doc();
  const eventId = eventRef.id;

  const eventDoc = {
    eventId, tenantId, eventType, eventCategory, title,
    subtitle: subtitle || null, description: description || null,
    eventDate, startAt, endAt, venue: null, location: null,
    targetScope: targetScope || TARGET_SCOPES.ALL_EMPLOYEES,
    targetCountEstimate: null,
    requiresAttendance: requiresAttendance || false,
    responseCutoffAt: responseCutoffAt || null,
    allowEditUntilCutoff: allowEditUntilCutoff !== false,
    selectedNoteIds: selectedNoteIds || [], notesSnapshot: [],
    customNotice: customNotice || null,
    specialRequirements: specialRequirements || null,
    menuSelectionIds: menuSelectionIds || null,
    menuSelectionNames: menuSelectionNames || null,
    decorRequired: decorRequired || false,
    billingDestination: billingDestination || 'employee_account',
    costCentreCode: costCentreCode || null,
    hostEmployeeNumber: hostEmployeeNumber || null,
    hostEmployeeName: hostEmployeeName || null,
    status: initialStatus, reportLocked: false,
    showPopupOnPublish: true, showOnEmployeeDashboard: false,
    dashboardPriority: null, createdByUid, createdByName,
    createdByEmployeeNumber,
    publishedByUid: null, publishedAt: null,
    returnedByUid: null, returnedAt: null, returnComments: null,
    closedByUid: null, closedAt: null,
    householdsResponded: 0, householdsPending: 0, grandTotalAttendees: 0,
    isVisible: true, isActive: true, isSoftDeleted: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await eventRef.set(eventDoc);
  return { eventId, status: initialStatus, eventType };
}

async function submitEvent({ eventId, tenantId, submittedByUid, submittedByRole }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const isOfficial = event.eventType === EVENT_TYPES.OFFICIAL;
  if (isOfficial) {
    if (![EVENT_STATUS_OFFICIAL.DRAFT, EVENT_STATUS_OFFICIAL.RETURNED].includes(event.status))
      throw new Error(`Cannot submit event with status: ${event.status}`);
  } else {
    if (![EVENT_STATUS_PERSONAL.DRAFT, EVENT_STATUS_PERSONAL.RETURNED].includes(event.status))
      throw new Error(`Cannot submit event with status: ${event.status}`);
  }

  const newStatus = isOfficial
    ? EVENT_STATUS_OFFICIAL.PENDING_REVIEW
    : EVENT_STATUS_PERSONAL.PENDING_APPROVAL;

  await ref.update({ status: newStatus, updatedAt: FieldValue.serverTimestamp() });
  return { eventId, status: newStatus };
}

async function publishEvent({ eventId, tenantId, publishedByUid, venue, location }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');
  if (event.eventType !== EVENT_TYPES.OFFICIAL)
    throw new Error('Only official events can be published.');
  if (event.status !== EVENT_STATUS_OFFICIAL.PENDING_REVIEW)
    throw new Error(`Cannot publish event with status: ${event.status}`);

  let notesSnapshot = [];
  if (event.selectedNoteIds && event.selectedNoteIds.length > 0) {
    const noteSnaps = await Promise.all(
      event.selectedNoteIds.map(id =>
        db.collection(COLLECTIONS.EVENT_NOTE_TEMPLATES).doc(id).get()
      )
    );
    notesSnapshot = noteSnaps.filter(s => s.exists).map(s => ({ templateId: s.id, ...s.data() }));
  }

  await ref.update({
    status: EVENT_STATUS_OFFICIAL.PUBLISHED,
    publishedByUid, publishedAt: FieldValue.serverTimestamp(),
    venue: venue || null, location: location || null,
    notesSnapshot, showOnEmployeeDashboard: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Bug 3 fix: Notify all employees of the published event (fire-and-forget)
  createNotification({
    tenantId,
    createdByUid: publishedByUid,
    createdByName: null,
    notificationLayer: NOTIFICATION_LAYERS.INFORMATIONAL,
    notificationType: 'event_published',
    triggerSource: 'event_publish',
    title: `New Event: ${event.title}`,
    body: `An event "${event.title}" has been published. Check the Events section for details.`,
    targetType: NOTIFICATION_TARGET_TYPES.ALL_EMPLOYEES,
    contextType: 'event',
    contextId: eventId,
  }).catch(err => console.error('[Notification] event_published failed:', err));

  return { eventId, status: EVENT_STATUS_OFFICIAL.PUBLISHED };
}

async function returnEvent({ eventId, tenantId, returnedByUid, returnComments }) {
  if (!returnComments) throw new Error('returnComments is required when returning an event.');
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const returnableStatuses = [EVENT_STATUS_OFFICIAL.PENDING_REVIEW, EVENT_STATUS_PERSONAL.PENDING_APPROVAL];
  if (!returnableStatuses.includes(event.status))
    throw new Error(`Cannot return event with status: ${event.status}`);

  await ref.update({
    status: event.eventType === EVENT_TYPES.OFFICIAL
      ? EVENT_STATUS_OFFICIAL.RETURNED : EVENT_STATUS_PERSONAL.RETURNED,
    returnedByUid, returnedAt: FieldValue.serverTimestamp(),
    returnComments, updatedAt: FieldValue.serverTimestamp(),
  });

  return { eventId, status: 'returned', returnComments };
}

async function cancelEvent({ eventId, tenantId, cancelledByUid }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');
  if (['closed', 'cancelled'].includes(event.status))
    throw new Error(`Cannot cancel event with status: ${event.status}`);

  const cancelStatus = event.eventType === EVENT_TYPES.OFFICIAL
    ? EVENT_STATUS_OFFICIAL.CANCELLED : EVENT_STATUS_PERSONAL.CANCELLED;

  await ref.update({ status: cancelStatus, isActive: false, updatedAt: FieldValue.serverTimestamp() });
  return { eventId, status: cancelStatus };
}

async function getEvents({ tenantId, eventType, status, limit }) {
  let query = db.collection(COLLECTIONS.EVENTS)
    .where('tenantId', '==', tenantId)
    .where('isSoftDeleted', '==', false);
  if (eventType) query = query.where('eventType', '==', eventType);
  if (status) query = query.where('status', '==', status);
  const snap = await query.limit(limit || 20).get();
  return snap.docs.map(doc => doc.data());
}

async function getEvent({ tenantId, eventId }) {
  const doc = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();
  if (!doc.exists) throw new Error('Event not found.');
  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');
  return event;
}

// ── submitAttendanceResponse — updated counts schema ──
async function submitAttendanceResponse({
  tenantId, eventId, uid, officialEmployeeNumber,
  employeeName, attendanceStatus, counts, source,
}) {
  const eventDoc = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();
  if (!eventDoc.exists) throw new Error('Event not found.');
  const event = eventDoc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  if (event.status !== EVENT_STATUS_OFFICIAL.PUBLISHED &&
      event.status !== EVENT_STATUS_PERSONAL.CONFIRMED) {
    throw new Error('Attendance can only be submitted for published or confirmed events.');
  }
  if (!event.requiresAttendance) throw new Error('This event does not require attendance responses.');

  if (event.responseCutoffAt) {
    const cutoff = event.responseCutoffAt.toDate
      ? event.responseCutoffAt.toDate() : new Date(event.responseCutoffAt);
    if (new Date() > cutoff) throw new Error('Response cutoff has passed.');
  }

  const finalCounts = {
    selfAttending:       counts.selfAttending || false,
    spouseAttending:     counts.spouseAttending || false,
    adults:              counts.adults || 0,
    children_12_17:      counts.children_12_17 || 0,
    children_under_12:   counts.children_under_12 || 0,
    permanentGuests_adults:    counts.permanentGuests_adults || 0,
    permanentGuests_12_17:     counts.permanentGuests_12_17 || 0,
    permanentGuests_under_12:  counts.permanentGuests_under_12 || 0,
    visitingGuests_adults:     counts.visitingGuests_adults || 0,
    visitingGuests_12_17:      counts.visitingGuests_12_17 || 0,
    visitingGuests_under_12:   counts.visitingGuests_under_12 || 0,
  };

  const totalAttendees = attendanceStatus === 'attending'
    ? (finalCounts.selfAttending ? 1 : 0) +
      (finalCounts.spouseAttending ? 1 : 0) +
      finalCounts.adults +
      finalCounts.children_12_17 +
      finalCounts.children_under_12 +
      finalCounts.permanentGuests_adults +
      finalCounts.permanentGuests_12_17 +
      finalCounts.permanentGuests_under_12 +
      finalCounts.visitingGuests_adults +
      finalCounts.visitingGuests_12_17 +
      finalCounts.visitingGuests_under_12
    : 0;

  const responseId = `${eventId}_${officialEmployeeNumber}`;
  const responseRef = db.collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES).doc(responseId);
  const existingDoc = await responseRef.get();
  const responseVersion = existingDoc.exists ? (existingDoc.data().responseVersion || 0) + 1 : 1;

  const responseDoc = {
    responseId, eventId, tenantId,
    employeeNumber: officialEmployeeNumber,
    employeeName, uid, attendanceStatus,
    counts: finalCounts, totalAttendees,
    submittedAt: FieldValue.serverTimestamp(),
    responseVersion,
    submissionLocked: false,
    source: source || 'self',
    isActive: true, isVisible: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await responseRef.set(responseDoc);
  await aggregateAttendance({ tenantId, eventId });

  return { responseId, eventId, attendanceStatus, totalAttendees, responseVersion };
}

// ── aggregateAttendance — updated for expanded guest brackets ──
async function aggregateAttendance({ tenantId, eventId }) {
  const snap = await db.collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES)
    .where('tenantId', '==', tenantId)
    .where('eventId', '==', eventId)
    .get();

  const responses = snap.docs.map(d => d.data());
  const householdsResponded    = responses.length;
  const householdsAttending    = responses.filter(r => r.attendanceStatus === 'attending').length;
  const householdsNotAttending = responses.filter(r => r.attendanceStatus === 'not_attending').length;

  let totalSelf = 0, totalSpouses = 0, totalAdults = 0;
  let totalChildren_12_17 = 0, totalChildren_under12 = 0;
  let totalPermanentGuests_adults = 0, totalPermanentGuests_12_17 = 0, totalPermanentGuests_under12 = 0;
  let totalVisitingGuests_adults = 0, totalVisitingGuests_12_17 = 0, totalVisitingGuests_under12 = 0;

  for (const r of responses) {
    if (r.attendanceStatus !== 'attending') continue;
    const c = r.counts || {};
    if (c.selfAttending)  totalSelf++;
    if (c.spouseAttending) totalSpouses++;
    totalAdults              += c.adults || 0;
    totalChildren_12_17      += c.children_12_17 || 0;
    totalChildren_under12    += c.children_under_12 || 0;
    totalPermanentGuests_adults   += c.permanentGuests_adults || 0;
    totalPermanentGuests_12_17    += c.permanentGuests_12_17 || 0;
    totalPermanentGuests_under12  += c.permanentGuests_under_12 || 0;
    totalVisitingGuests_adults    += c.visitingGuests_adults || 0;
    totalVisitingGuests_12_17     += c.visitingGuests_12_17 || 0;
    totalVisitingGuests_under12   += c.visitingGuests_under_12 || 0;
  }

  const totalPermanentGuests = totalPermanentGuests_adults + totalPermanentGuests_12_17 + totalPermanentGuests_under12;
  const totalVisitingGuests  = totalVisitingGuests_adults + totalVisitingGuests_12_17 + totalVisitingGuests_under12;

  const grandTotal = totalSelf + totalSpouses + totalAdults +
    totalChildren_12_17 + totalChildren_under12 +
    totalPermanentGuests + totalVisitingGuests;

  const categoryTotals = {
    adults:   totalSelf + totalSpouses + totalAdults,
    children: totalChildren_12_17 + totalChildren_under12,
    permanentGuests: totalPermanentGuests,
    visitingGuests:  totalVisitingGuests,
    grandTotal,
  };

  const summaryDoc = {
    eventId, tenantId,
    totalResponses: householdsResponded,
    householdsResponded, householdsAttending,
    householdsNotAttending, householdsPending: 0,
    counts: {
      totalSelf, totalSpouses, totalAdults,
      totalChildren_12_17, totalChildren_under12,
      totalPermanentGuests_adults, totalPermanentGuests_12_17, totalPermanentGuests_under12,
      totalVisitingGuests_adults, totalVisitingGuests_12_17, totalVisitingGuests_under12,
    },
    categoryTotals,
    totalAttendees: grandTotal, grandTotal,
    lastAggregatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTIONS.EVENT_ATTENDANCE_SUMMARIES)
    .doc(eventId).set(summaryDoc, { merge: true });

  await db.collection(COLLECTIONS.EVENTS).doc(eventId).update({
    householdsResponded,
    householdsPending: 0,
    grandTotalAttendees: grandTotal,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return summaryDoc;
}

async function getAttendanceSummary({ tenantId, eventId }) {
  const doc = await db.collection(COLLECTIONS.EVENT_ATTENDANCE_SUMMARIES).doc(eventId).get();
  if (!doc.exists) return { eventId, message: 'No responses submitted yet.', totalResponses: 0, grandTotal: 0 };
  return doc.data();
}

async function getMyAttendanceResponse({ tenantId, eventId, officialEmployeeNumber }) {
  const responseId = `${eventId}_${officialEmployeeNumber}`;
  const doc = await db.collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES).doc(responseId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Access denied.');
  return data;
}

async function getAttendanceResponses({ tenantId, eventId }) {
  const snap = await db.collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES)
    .where('tenantId', '==', tenantId)
    .where('eventId', '==', eventId)
    .get();
  return snap.docs.map(d => d.data());
}

module.exports = {
  createEvent,
  submitEvent,
  publishEvent,
  returnEvent,
  cancelEvent,
  getEvents,
  getEvent,
  submitAttendanceResponse,
  aggregateAttendance,
  getAttendanceSummary,
  getMyAttendanceResponse,
  getAttendanceResponses,
};
