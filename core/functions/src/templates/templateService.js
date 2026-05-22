// ─────────────────────────────────────────
// templateService.js — Weekly Templates & Menu Cycles
// HomiLabs | Servio | Flow 04
// ─────────────────────────────────────────
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS, CYCLE_STATUS } = require('../constants');

const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

const _toISO = (t) => {
  if (!t) return null;
  if (t._seconds) return new Date(t._seconds * 1000).toISOString();
  if (t.toDate) return t.toDate().toISOString();
  return t;
};

const _cleanTimestamps = (data) => ({
  ...data,
  createdAt: _toISO(data.createdAt),
  updatedAt: _toISO(data.updatedAt),
  ...(data.closedAt ? { closedAt: _toISO(data.closedAt) } : {}),
});

// Valid weekdays
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ─────────────────────────────────────────
// createTemplate
// schedule structure:
// {
//   monday: {
//     breakfast: { combo1Id, combo1Name },
//     lunch:     { combo1Id, combo1Name, combo2Id, combo2Name },
//     dinner:    { combo1Id, combo1Name, combo2Id, combo2Name },
//   },
//   tuesday: { ... },
//   ...
// }
// ─────────────────────────────────────────
const createTemplate = async ({ templateName, description, schedule, tenantId, createdByUid }) => {

  // Validate schedule has all 7 days
  for (const day of WEEKDAYS) {
    if (!schedule[day]) {
      return { success: false, message: `Schedule missing day: ${day}` };
    }
  }

  const ref = db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES).doc();
  await ref.set({
    templateId: ref.id,
    templateName,
    description: description || null,
    schedule,
    isActive: true,
    tenantId,
    createdBy: createdByUid,
    createdAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Template "${templateName}" created`,
    templateId: ref.id,
  };
};

// ─────────────────────────────────────────
// getTemplates
// ─────────────────────────────────────────
const getTemplates = async (tenantId) => {
  const snapshot = await db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES)
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .get();

  const templates = snapshot.docs.map(doc => {
    const data = doc.data();
    // Return summary without full schedule to keep response light
    const { schedule, ...summary } = data;
    return _cleanTimestamps(summary);
  });

  return { success: true, count: templates.length, templates };
};

// ─────────────────────────────────────────
// getTemplate
// Returns full template including schedule
// ─────────────────────────────────────────
const getTemplate = async (templateId) => {
  const doc = await db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES).doc(templateId).get();

  if (!doc.exists) {
    return { success: false, message: `Template ${templateId} not found` };
  }

  return { success: true, template: _cleanTimestamps(doc.data()) };
};

// ─────────────────────────────────────────
// updateTemplate
// ─────────────────────────────────────────
const updateTemplate = async (templateId, updates) => {
  const doc = await db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES).doc(templateId).get();

  if (!doc.exists) {
    return { success: false, message: `Template ${templateId} not found` };
  }

  const allowed = ['templateName', 'description', 'schedule'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, message: 'No valid fields to update' };
  }

  // Validate schedule if provided
  if (safeUpdates.schedule) {
    for (const day of WEEKDAYS) {
      if (!safeUpdates.schedule[day]) {
        return { success: false, message: `Schedule missing day: ${day}` };
      }
    }
  }

  safeUpdates.updatedAt = ts();
  await db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES).doc(templateId).update(safeUpdates);

  return { success: true, message: 'Template updated', templateId };
};

// ─────────────────────────────────────────
// createCycle
// ─────────────────────────────────────────
const createCycle = async ({ cycleName, startDate, weekTemplateId, tenantId, createdByUid }) => {

  // Validate template exists
  const templateDoc = await db.collection(COLLECTIONS.MESS_WEEKLY_TEMPLATES).doc(weekTemplateId).get();
  if (!templateDoc.exists) {
    return { success: false, message: `Template ${weekTemplateId} not found` };
  }

  const ref = db.collection(COLLECTIONS.MENU_CYCLES).doc();
  await ref.set({
    cycleId: ref.id,
    cycleName,
    startDate,
    endDate: null,
    status: CYCLE_STATUS.DRAFT,
    weekTemplateId,
    isActive: false,
    tenantId,
    createdBy: createdByUid,
    closedBy: null,
    closedAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  });

  return {
    success: true,
    message: `Cycle "${cycleName}" created as draft`,
    cycleId: ref.id,
  };
};

// ─────────────────────────────────────────
// getCycles
// ─────────────────────────────────────────
const getCycles = async (tenantId) => {
  const snapshot = await db.collection(COLLECTIONS.MENU_CYCLES)
    .where('tenantId', '==', tenantId)
    .get();

  const cycles = snapshot.docs
    .map(doc => _cleanTimestamps(doc.data()))
    .sort((a, b) => {
      if (a.startDate < b.startDate) return 1;
      if (a.startDate > b.startDate) return -1;
      return 0;
    });

  return { success: true, count: cycles.length, cycles };
};

// ─────────────────────────────────────────
// getActiveCycle
// ─────────────────────────────────────────
const getActiveCycle = async (tenantId) => {
  const snapshot = await db.collection(COLLECTIONS.MENU_CYCLES)
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { success: false, message: 'No active cycle found' };
  }

  return { success: true, cycle: _cleanTimestamps(snapshot.docs[0].data()) };
};

// ─────────────────────────────────────────
// setCycleStatus
// Handles: draft → active, active → closed
// Only one cycle can be active at a time
// ─────────────────────────────────────────
const setCycleStatus = async ({ cycleId, status, endDate, updatedByUid, tenantId }) => {

  const doc = await db.collection(COLLECTIONS.MENU_CYCLES).doc(cycleId).get();

  if (!doc.exists) {
    return { success: false, message: `Cycle ${cycleId} not found` };
  }

  const cycle = doc.data();

  // Validate transition
  if (status === CYCLE_STATUS.ACTIVE) {
    if (cycle.status !== CYCLE_STATUS.DRAFT) {
      return { success: false, message: `Cannot activate — cycle is already ${cycle.status}` };
    }

    // Check no other cycle is active
    const activeSnapshot = await db.collection(COLLECTIONS.MENU_CYCLES)
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!activeSnapshot.empty) {
      return { success: false, message: 'Another cycle is already active. Close it first.' };
    }

    await db.collection(COLLECTIONS.MENU_CYCLES).doc(cycleId).update({
      status: CYCLE_STATUS.ACTIVE,
      isActive: true,
      updatedAt: ts(),
    });

    return { success: true, message: `Cycle "${cycle.cycleName}" is now active`, cycleId };
  }

  if (status === CYCLE_STATUS.CLOSED) {
    if (cycle.status !== CYCLE_STATUS.ACTIVE) {
      return { success: false, message: `Cannot close — cycle is not active` };
    }

    const closeDate = endDate || new Date().toISOString().split('T')[0];

    await db.collection(COLLECTIONS.MENU_CYCLES).doc(cycleId).update({
      status: CYCLE_STATUS.CLOSED,
      isActive: false,
      endDate: closeDate,
      closedBy: updatedByUid,
      closedAt: ts(),
      updatedAt: ts(),
    });

    return { success: true, message: `Cycle "${cycle.cycleName}" closed`, cycleId };
  }

  return { success: false, message: `Invalid status transition: ${status}` };
};

module.exports = {
  createTemplate, getTemplates, getTemplate, updateTemplate,
  createCycle, getCycles, getActiveCycle, setCycleStatus,
};