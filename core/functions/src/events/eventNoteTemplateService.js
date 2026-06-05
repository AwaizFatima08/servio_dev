// ─────────────────────────────────────────────────────────────────────────────
// eventNoteTemplateService.js — Event Note Template Operations
// HomiLabs | Servio | Backend
// Flow 10 support: note templates for event creation
// ─────────────────────────────────────────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const COLLECTION = 'eventNoteTemplates';

// ─────────────────────────────────────────────────────────────────────────────
// GET all note templates for a tenant
// Returns only active + visible templates, ordered by title
// ─────────────────────────────────────────────────────────────────────────────
async function getNoteTemplates({ tenantId }) {
  const snapshot = await db.collection(COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .where('isVisible', '==', true)
    .orderBy('title', 'asc')
    .get();

  const templates = snapshot.docs.map(doc => ({
    templateId: doc.id,
    ...doc.data(),
  }));

  return { count: templates.length, templates };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE a new note template
// ─────────────────────────────────────────────────────────────────────────────
async function createNoteTemplate({ tenantId, createdByUid, title, body }) {
  const now = new Date();

  const docRef = await db.collection(COLLECTION).add({
    tenantId,
    title: title.trim(),
    body: body.trim(),
    isActive: true,
    isVisible: true,
    createdBy: createdByUid,
    createdAt: now,
    updatedAt: now,
  });

  // Write templateId into the document itself
  await docRef.update({ templateId: docRef.id });

  return { templateId: docRef.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE active/visible status of a note template
// Used to deactivate templates that are no longer needed
// ─────────────────────────────────────────────────────────────────────────────
async function toggleNoteTemplate({ tenantId, templateId, isActive }) {
  const ref = db.collection(COLLECTION).doc(templateId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error('Note template not found.');
  }

  const data = snap.data();
  if (data.tenantId !== tenantId) {
    throw new Error('Note template does not belong to this tenant.');
  }

  await ref.update({
    isActive,
    isVisible: isActive, // toggling active also toggles visible
    updatedAt: new Date(),
  });

  return { templateId };
}

module.exports = { getNoteTemplates, createNoteTemplate, toggleNoteTemplate };
