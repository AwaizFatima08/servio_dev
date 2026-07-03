// ─────────────────────────────────────────
// teabarLocationService.js — V1.3 (Tea Bar — Locations, first slice)
// HomiLabs | Servio
//
// Manages the small master list of Tea Bar locations (6 at launch, admin-
// extensible per TeaBar_Design_Lock_03Jul2026.md §2). One attendant covers
// exactly one location at a time (§9, Gap 4 — locked 03-Jul-2026); rotation
// is an ADMIN bookkeeping action (reassign assignedAttendantUid), not
// something an attendant does themselves.
//
// Mirrors cafeOrderService.js patterns (Firestore access, doc-builder style,
// validate-then-write). Uses new Date() for timestamps, NOT serverTimestamp
// (Technical Rule #11, same as café).
//
// Covers:
//   - createLocation           (admin adds a new Tea Bar location)
//   - listLocations            (admin/attendant — see all locations)
//   - getLocationById          (fetch one location, validated by tenant)
//   - updateLocation           (admin edits name / active flag)
//   - assignAttendant          (admin assigns/reassigns one attendant)
//   - unassignAttendant        (admin removes coverage — e.g. attendant on leave)
//   - getLocationForAttendant  (resolve "my location" from the caller's own uid —
//                                used by teabarOrderService / teabarDashboardService
//                                in the NEXT slice; included here since it is
//                                location-domain logic, not order-domain logic)
//
// Design lock reference: TeaBar_Design_Lock_03Jul2026.md §2, §9 (Gap 4).
// Field list: locationId, locationName, assignedAttendantUid, isActive,
// tenantId, createdAt, updatedAt — no fields beyond this locked list.
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS, ROLES, ACCOUNT_STATUS } = require('../constants');

// ─────────────────────────────────────────
// User lookup helper — confirms an attendant account is real, active, in
// this tenant, and actually holds the teabar_attendant role, before letting
// an admin assign them to a location. Mirrors cafeOrderService._getEmployee.
// ─────────────────────────────────────────
async function _getAttendantUser({ tenantId, attendantUid }) {
  const doc = await db.collection(COLLECTIONS.USERS).doc(attendantUid).get();

  if (!doc.exists) {
    throw new Error(`Attendant account not found: ${attendantUid}`);
  }
  const data = doc.data();
  if (data.tenantId !== tenantId) {
    throw new Error(`Attendant account not found: ${attendantUid}`);
  }
  if (data.role !== ROLES.TEABAR_ATTENDANT) {
    throw new Error(`Account ${attendantUid} does not hold the teabar_attendant role.`);
  }
  if (data.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new Error(`Attendant account ${attendantUid} is not active (status: ${data.status}).`);
  }
  return data;
}

// ─────────────────────────────────────────
// Location lookup helper — fetch + validate tenant match. Shared by every
// function below that needs to confirm a locationId is real before acting
// on it. Throws if not found or wrong tenant (never leaks cross-tenant data).
// ─────────────────────────────────────────
async function _getLocationDoc({ locationId, tenantId }) {
  const ref = db.collection(COLLECTIONS.TEABAR_LOCATIONS).doc(locationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error('Tea Bar location not found.');
  }
  const data = doc.data();
  if (data.tenantId !== tenantId) {
    throw new Error('Tea Bar location not found.');
  }
  return { ref, data };
}

// ─────────────────────────────────────────
// createLocation
// Admin adds a new Tea Bar location. Rejects a duplicate name within the
// same tenant (case-insensitive) — a safety net, not a locked design rule;
// easy to remove later if it turns out to be unwanted friction.
// ─────────────────────────────────────────
async function createLocation({ tenantId, locationName }) {
  if (typeof locationName !== 'string' || !locationName.trim()) {
    throw new Error('locationName is required.');
  }
  const trimmedName = locationName.trim();

  const existing = await db
    .collection(COLLECTIONS.TEABAR_LOCATIONS)
    .where('tenantId', '==', tenantId)
    .where('locationName', '==', trimmedName)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error(`A Tea Bar location named "${trimmedName}" already exists.`);
  }

  const now = new Date();
  const doc = {
    tenantId,
    locationName: trimmedName,
    assignedAttendantUid: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTIONS.TEABAR_LOCATIONS).add(doc);
  return { locationId: ref.id, ...doc };
}

// ─────────────────────────────────────────
// listLocations
// Returns every Tea Bar location for the tenant, alphabetical by name.
// activeOnly defaults to true — closed/retired locations are hidden from
// normal use but never deleted (soft-delete convention, isActive flag).
//
// NOTE (action item, not yet done): this query combines two where()
// clauses with an orderBy() — per project rule, it needs a Firestore
// composite index before it will run. Create the index (console or
// firestore.indexes.json), wait for it to finish building, THEN test this
// function — same index-before-function order your project already follows
// everywhere else.
// ─────────────────────────────────────────
async function listLocations({ tenantId, activeOnly = true }) {
  let q = db.collection(COLLECTIONS.TEABAR_LOCATIONS).where('tenantId', '==', tenantId);

  if (activeOnly) {
    q = q.where('isActive', '==', true);
  }

  const snap = await q.orderBy('locationName').get();
  const locations = snap.docs.map((d) => ({ locationId: d.id, ...d.data() }));
  return { locations, count: locations.length };
}

// ─────────────────────────────────────────
// getLocationById
// Single-location fetch, validated by tenant. Used by other services (order
// placement, dashboard) to confirm a locationId is real and active before
// using it.
// ─────────────────────────────────────────
async function getLocationById({ locationId, tenantId }) {
  const { data } = await _getLocationDoc({ locationId, tenantId });
  return { locationId, ...data };
}

// ─────────────────────────────────────────
// updateLocation
// Admin edits a location's name and/or active flag. Partial update — only
// the fields actually passed are changed. assignedAttendantUid is NOT
// editable here — that always goes through assignAttendant/unassignAttendant
// below, so the "clear the old location" safety logic can never be skipped.
// ─────────────────────────────────────────
async function updateLocation({ locationId, tenantId, locationName, isActive }) {
  const { ref } = await _getLocationDoc({ locationId, tenantId });

  const updates = { updatedAt: new Date() };

  if (locationName !== undefined) {
    if (typeof locationName !== 'string' || !locationName.trim()) {
      throw new Error('locationName must be a non-empty string.');
    }
    updates.locationName = locationName.trim();
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      throw new Error('isActive must be true or false.');
    }
    updates.isActive = isActive;
  }

  await ref.update(updates);
  return { locationId, message: 'Location updated.' };
}

// ─────────────────────────────────────────
// assignAttendant
// Admin assigns (or reassigns) one attendant to one location.
//
// Safety behaviour (locked in this session, 03-Jul-2026): before writing the
// new assignment, this function searches for any OTHER location in the same
// tenant that currently has this attendantUid assigned, and clears it first
// — in the same atomic batch as the new assignment. This makes "one
// attendant, one location" a guarantee enforced by the code, not just a
// rule an admin has to remember to follow by hand.
// ─────────────────────────────────────────
async function assignAttendant({ locationId, tenantId, attendantUid }) {
  // Confirm the target location is real and belongs to this tenant.
  const { ref: targetRef, data: targetData } = await _getLocationDoc({ locationId, tenantId });

  if (targetData.isActive !== true) {
    throw new Error('Cannot assign an attendant to an inactive location.');
  }

  // Confirm the attendant account is real, active-tenant, correct role.
  await _getAttendantUser({ tenantId, attendantUid });

  // Find any OTHER location currently pointing to this attendant.
  const staleSnap = await db
    .collection(COLLECTIONS.TEABAR_LOCATIONS)
    .where('tenantId', '==', tenantId)
    .where('assignedAttendantUid', '==', attendantUid)
    .get();

  const now = new Date();
  const batch = db.batch();

  for (const staleDoc of staleSnap.docs) {
    if (staleDoc.id !== locationId) {
      batch.update(staleDoc.ref, { assignedAttendantUid: null, updatedAt: now });
    }
  }

  batch.update(targetRef, { assignedAttendantUid: attendantUid, updatedAt: now });

  await batch.commit();

  return {
    locationId,
    attendantUid,
    message: 'Attendant assigned. Any previous location assignment for this attendant was cleared.',
  };
}

// ─────────────────────────────────────────
// unassignAttendant
// Admin removes attendant coverage from a location without assigning anyone
// new (e.g. the attendant goes on leave and the spot is temporarily empty).
// ─────────────────────────────────────────
async function unassignAttendant({ locationId, tenantId }) {
  const { ref } = await _getLocationDoc({ locationId, tenantId });

  await ref.update({ assignedAttendantUid: null, updatedAt: new Date() });
  return { locationId, message: 'Attendant unassigned from this location.' };
}

// ─────────────────────────────────────────
// getLocationForAttendant
// Resolves "which location does THIS attendant currently cover?" — never
// trusts anything the client sends for this; always looked up fresh from
// teabarLocations by the caller's own verified uid. This is the function the
// dashboard and proxy-order routes (next slice) will call so an attendant
// can never act on a location that isn't actually theirs.
// Returns null if the attendant is not currently assigned anywhere.
// ─────────────────────────────────────────
async function getLocationForAttendant({ tenantId, attendantUid }) {
  const snap = await db
    .collection(COLLECTIONS.TEABAR_LOCATIONS)
    .where('tenantId', '==', tenantId)
    .where('assignedAttendantUid', '==', attendantUid)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const d = snap.docs[0];
  return { locationId: d.id, ...d.data() };
}

module.exports = {
  createLocation,
  listLocations,
  getLocationById,
  updateLocation,
  assignAttendant,
  unassignAttendant,
  getLocationForAttendant,
};