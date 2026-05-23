// core/functions/src/events/eventService.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');
const {
  COLLECTIONS,
  EVENT_TYPES,
  EVENT_STATUS_OFFICIAL,
  EVENT_STATUS_PERSONAL,
  TARGET_SCOPES,
} = require('../constants');

// ─────────────────────────────────────────
// createEvent
// Creates a new event in draft status
// ─────────────────────────────────────────
async function createEvent({
  tenantId,
  createdByUid,
  createdByName,
  createdByEmployeeNumber,
  createdByRole,
  eventType,
  eventCategory,
  title,
  subtitle,
  description,
  eventDate,
  startAt,
  endAt,
  targetScope,
  requiresAttendance,
  responseCutoffAt,
  allowEditUntilCutoff,
  selectedNoteIds,
  customNotice,
  specialRequirements,
  menuSelectionIds,
  menuSelectionNames,
  decorRequired,
  billingDestination,
  costCentreCode,
  hostEmployeeNumber,
  hostEmployeeName,
}) {
  // --- Validate eventType ---
  if (!Object.values(EVENT_TYPES).includes(eventType)) {
    throw new Error(`Invalid eventType. Use: ${Object.values(EVENT_TYPES).join(', ')}`);
  }

  // --- Set initial status based on type ---
  const initialStatus = eventType === EVENT_TYPES.OFFICIAL
    ? EVENT_STATUS_OFFICIAL.DRAFT
    : EVENT_STATUS_PERSONAL.DRAFT;

  const eventRef = db.collection(COLLECTIONS.EVENTS).doc();
  const eventId = eventRef.id;

  const eventDoc = {
    eventId,
    tenantId,
    eventType,
    eventCategory,
    title,
    subtitle: subtitle || null,
    description: description || null,
    eventDate,
    startAt,
    endAt,
    venue: null,
    location: null,
    targetScope: targetScope || TARGET_SCOPES.ALL_EMPLOYEES,
    targetCountEstimate: null,
    requiresAttendance: requiresAttendance || false,
    responseCutoffAt: responseCutoffAt || null,
    allowEditUntilCutoff: allowEditUntilCutoff !== false,
    selectedNoteIds: selectedNoteIds || [],
    notesSnapshot: [],
    customNotice: customNotice || null,
    specialRequirements: specialRequirements || null,
    menuSelectionIds: menuSelectionIds || null,
    menuSelectionNames: menuSelectionNames || null,
    decorRequired: decorRequired || false,
    billingDestination: billingDestination || 'employee_account',
    costCentreCode: costCentreCode || null,
    hostEmployeeNumber: hostEmployeeNumber || null,
    hostEmployeeName: hostEmployeeName || null,
    status: initialStatus,
    reportLocked: false,
    showPopupOnPublish: true,
    showOnEmployeeDashboard: false,
    dashboardPriority: null,
    createdByUid,
    createdByName,
    createdByEmployeeNumber,
    publishedByUid: null,
    publishedAt: null,
    returnedByUid: null,
    returnedAt: null,
    returnComments: null,
    closedByUid: null,
    closedAt: null,
    householdsResponded: 0,
    householdsPending: 0,
    grandTotalAttendees: 0,
    isVisible: true,
    isActive: true,
    isSoftDeleted: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await eventRef.set(eventDoc);

  return { eventId, status: initialStatus, eventType };
}

// ─────────────────────────────────────────
// submitEvent
// Employee/Manager submits draft for review
// Official: draft → pending_review
// Personal: draft → pending_approval
// ─────────────────────────────────────────
async function submitEvent({ eventId, tenantId, submittedByUid, submittedByRole }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Event not found.');

  const event = doc.data();

  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const isOfficial = event.eventType === EVENT_TYPES.OFFICIAL;

  // Validate current status allows submission
  if (isOfficial) {
    if (![EVENT_STATUS_OFFICIAL.DRAFT, EVENT_STATUS_OFFICIAL.RETURNED]
      .includes(event.status)) {
      throw new Error(`Cannot submit event with status: ${event.status}`);
    }
  } else {
    if (![EVENT_STATUS_PERSONAL.DRAFT, EVENT_STATUS_PERSONAL.RETURNED]
      .includes(event.status)) {
      throw new Error(`Cannot submit event with status: ${event.status}`);
    }
  }

  const newStatus = isOfficial
    ? EVENT_STATUS_OFFICIAL.PENDING_REVIEW
    : EVENT_STATUS_PERSONAL.PENDING_APPROVAL;

  await ref.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { eventId, status: newStatus };
}

// ─────────────────────────────────────────
// publishEvent
// Admin publishes official event
// pending_review → published
// ─────────────────────────────────────────
async function publishEvent({ eventId, tenantId, publishedByUid, venue, location }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Event not found.');

  const event = doc.data();

  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  if (event.eventType !== EVENT_TYPES.OFFICIAL) {
    throw new Error('Only official events can be published. Personal events use approval flow.');
  }

  if (event.status !== EVENT_STATUS_OFFICIAL.PENDING_REVIEW) {
    throw new Error(`Cannot publish event with status: ${event.status}`);
  }

  // Build notesSnapshot from selectedNoteIds
  let notesSnapshot = [];
  if (event.selectedNoteIds && event.selectedNoteIds.length > 0) {
    const noteSnaps = await Promise.all(
      event.selectedNoteIds.map(id =>
        db.collection(COLLECTIONS.EVENT_NOTE_TEMPLATES).doc(id).get()
      )
    );
    notesSnapshot = noteSnaps
      .filter(s => s.exists)
      .map(s => ({ templateId: s.id, ...s.data() }));
  }

  await ref.update({
    status: EVENT_STATUS_OFFICIAL.PUBLISHED,
    publishedByUid,
    publishedAt: FieldValue.serverTimestamp(),
    venue: venue || null,
    location: location || null,
    notesSnapshot,
    showOnEmployeeDashboard: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { eventId, status: EVENT_STATUS_OFFICIAL.PUBLISHED };
}

// ─────────────────────────────────────────
// returnEvent
// Admin returns event with comments
// pending_review/pending_approval → returned
// ─────────────────────────────────────────
async function returnEvent({ eventId, tenantId, returnedByUid, returnComments }) {
  if (!returnComments) throw new Error('returnComments is required when returning an event.');

  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Event not found.');

  const event = doc.data();

  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const returnableStatuses = [
    EVENT_STATUS_OFFICIAL.PENDING_REVIEW,
    EVENT_STATUS_PERSONAL.PENDING_APPROVAL,
  ];

  if (!returnableStatuses.includes(event.status)) {
    throw new Error(`Cannot return event with status: ${event.status}`);
  }

  await ref.update({
    status: event.eventType === EVENT_TYPES.OFFICIAL
      ? EVENT_STATUS_OFFICIAL.RETURNED
      : EVENT_STATUS_PERSONAL.RETURNED,
    returnedByUid,
    returnedAt: FieldValue.serverTimestamp(),
    returnComments,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { eventId, status: 'returned', returnComments };
}

// ─────────────────────────────────────────
// cancelEvent
// Admin/Manager cancels an event
// ─────────────────────────────────────────
async function cancelEvent({ eventId, tenantId, cancelledByUid }) {
  const ref = db.collection(COLLECTIONS.EVENTS).doc(eventId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Event not found.');

  const event = doc.data();

  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  const nonCancellableStatuses = ['closed', 'cancelled'];
  if (nonCancellableStatuses.includes(event.status)) {
    throw new Error(`Cannot cancel event with status: ${event.status}`);
  }

  const cancelStatus = event.eventType === EVENT_TYPES.OFFICIAL
    ? EVENT_STATUS_OFFICIAL.CANCELLED
    : EVENT_STATUS_PERSONAL.CANCELLED;

  await ref.update({
    status: cancelStatus,
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { eventId, status: cancelStatus };
}

// ─────────────────────────────────────────
// getEvents
// List events with optional filters
// ─────────────────────────────────────────
async function getEvents({ tenantId, eventType, status, limit }) {
  let query = db.collection(COLLECTIONS.EVENTS)
    .where('tenantId', '==', tenantId)
    .where('isSoftDeleted', '==', false);

  if (eventType) query = query.where('eventType', '==', eventType);
  if (status) query = query.where('status', '==', status);

  const snap = await query.limit(limit || 20).get();
  return snap.docs.map(doc => doc.data());
}

// ─────────────────────────────────────────
// getEvent
// Get single event by ID
// ─────────────────────────────────────────
async function getEvent({ tenantId, eventId }) {
  const doc = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();

  if (!doc.exists) throw new Error('Event not found.');

  const event = doc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  return event;
}

// ─────────────────────────────────────────
// submitAttendanceResponse
// Employee submits attendance response for an event
// One response per employee per event — updates if already exists
// ─────────────────────────────────────────
async function submitAttendanceResponse({
  tenantId,
  eventId,
  uid,
  officialEmployeeNumber,
  employeeName,
  attendanceStatus,
  counts,
  source,
}) {
  // --- 1. Fetch event ---
  const eventDoc = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();
  if (!eventDoc.exists) throw new Error('Event not found.');

  const event = eventDoc.data();
  if (event.tenantId !== tenantId) throw new Error('Access denied.');

  if (event.status !== EVENT_STATUS_OFFICIAL.PUBLISHED &&
      event.status !== EVENT_STATUS_PERSONAL.CONFIRMED) {
    throw new Error('Attendance can only be submitted for published or confirmed events.');
  }

  if (!event.requiresAttendance) {
    throw new Error('This event does not require attendance responses.');
  }

  // --- 2. Check cutoff ---
  if (event.responseCutoffAt) {
    const cutoff = event.responseCutoffAt.toDate
      ? event.responseCutoffAt.toDate()
      : new Date(event.responseCutoffAt);
    if (new Date() > cutoff) {
      throw new Error('Response cutoff has passed.');
    }
  }

  // --- 3. Build counts and total ---
  const finalCounts = {
    selfAttending: counts.selfAttending || false,
    spouseAttending: counts.spouseAttending || false,
    adults: counts.adults || 0,
    children_12_17: counts.children_12_17 || 0,
    children_under_12: counts.children_under_12 || 0,
    permanentGuests: counts.permanentGuests || 0,
    visitingGuests: counts.visitingGuests || 0,
  };

  const totalAttendees = attendanceStatus === 'attending'
    ? (finalCounts.selfAttending ? 1 : 0) +
      (finalCounts.spouseAttending ? 1 : 0) +
      finalCounts.adults +
      finalCounts.children_12_17 +
      finalCounts.children_under_12 +
      finalCounts.permanentGuests +
      finalCounts.visitingGuests
    : 0;

  // --- 4. Composite document ID: {eventId}_{employeeNumber} ---
  const responseId = `${eventId}_${officialEmployeeNumber}`;
  const responseRef = db
    .collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES)
    .doc(responseId);

  const existingDoc = await responseRef.get();
  const responseVersion = existingDoc.exists
    ? (existingDoc.data().responseVersion || 0) + 1
    : 1;

  const responseDoc = {
    responseId,
    eventId,
    tenantId,
    employeeNumber: officialEmployeeNumber,
    employeeName,
    uid,
    attendanceStatus,
    counts: finalCounts,
    totalAttendees,
    submittedAt: FieldValue.serverTimestamp(),
    responseVersion,
    submissionLocked: false,
    source: source || 'self',
    isActive: true,
    isVisible: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await responseRef.set(responseDoc);

  // --- 5. Run aggregator inline ---
  await aggregateAttendance({ tenantId, eventId });

  return {
    responseId,
    eventId,
    attendanceStatus,
    totalAttendees,
    responseVersion,
  };
}

// ─────────────────────────────────────────
// aggregateAttendance
// Reads all responses for an event and updates summary + event mirrors
// ─────────────────────────────────────────
async function aggregateAttendance({ tenantId, eventId }) {
  const snap = await db
    .collection(COLLECTIONS.EVENT_ATTENDANCE_RESPONSES)
    .where('tenantId', '==', tenantId)
    .where('eventId', '==', eventId)
    .get();

  const responses = snap.docs.map(d => d.data());

  const householdsResponded = responses.length;
  const householdsAttending = responses.filter(r => r.attendanceStatus === 'attending').length;
  const householdsNotAttending = responses.filter(r => r.attendanceStatus === 'not_attending').length;

  // Aggregate counts
  let totalSelf = 0, totalSpouses = 0, totalAdults = 0;
  let totalChildren_12_17 = 0, totalChildren_under12 = 0;
  let totalPermanentGuests = 0, totalVisitingGuests = 0;

  for (const r of responses) {
    if (r.attendanceStatus !== 'attending') continue;
    const c = r.counts || {};
    if (c.selfAttending) totalSelf++;
    if (c.spouseAttending) totalSpouses++;
    totalAdults += c.adults || 0;
    totalChildren_12_17 += c.children_12_17 || 0;
    totalChildren_under12 += c.children_under_12 || 0;
    totalPermanentGuests += c.permanentGuests || 0;
    totalVisitingGuests += c.visitingGuests || 0;
  }

  const grandTotal = totalSelf + totalSpouses + totalAdults +
    totalChildren_12_17 + totalChildren_under12 +
    totalPermanentGuests + totalVisitingGuests;

  const categoryTotals = {
    adults: totalSelf + totalSpouses + totalAdults,
    children: totalChildren_12_17 + totalChildren_under12,
    guests: totalPermanentGuests + totalVisitingGuests,
    grandTotal,
  };

  const summaryDoc = {
    eventId,
    tenantId,
    totalResponses: householdsResponded,
    householdsResponded,
    householdsAttending,
    householdsNotAttending,
    householdsPending: 0,
    counts: {
      totalSelf,
      totalSpouses,
      totalAdults,
      totalChildren_12_17,
      totalChildren_under12,
      totalPermanentGuests,
      totalVisitingGuests,
    },
    categoryTotals,
    totalAttendees: grandTotal,
    grandTotal,
    lastAggregatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Write summary document
  await db.collection(COLLECTIONS.EVENT_ATTENDANCE_SUMMARIES)
    .doc(eventId)
    .set(summaryDoc, { merge: true });

  // Mirror key fields onto events document
  await db.collection(COLLECTIONS.EVENTS).doc(eventId).update({
    householdsResponded,
    householdsPending: 0,
    grandTotalAttendees: grandTotal,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return summaryDoc;
}

// ─────────────────────────────────────────
// getAttendanceSummary
// Returns aggregated summary for an event
// ─────────────────────────────────────────
async function getAttendanceSummary({ tenantId, eventId }) {
  const doc = await db
    .collection(COLLECTIONS.EVENT_ATTENDANCE_SUMMARIES)
    .doc(eventId)
    .get();

  if (!doc.exists) {
    return {
      eventId,
      message: 'No responses submitted yet.',
      totalResponses: 0,
      grandTotal: 0,
    };
  }

  return doc.data();
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
  getAttendanceSummary,
};