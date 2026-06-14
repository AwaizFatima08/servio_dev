// ─────────────────────────────────────────
// familyService.js — Family Member CRUD Logic
// HomiLabs | Servio | V1 Extension V1.1
//
// FILE LOCATION: functions/src/family/familyService.js
//
// Employee self-manages dependents (spouse, son, daughter).
// No admin approval for add / edit / activate / deactivate.
// Admin approval is required only for:
//   - permanent deletion of a wrongly-entered member (zero transactions)
//   - married → single marital status change (cascades deactivation)
//
// Convention notes:
//   - Named DB: getFirestore('servio-dev')
//   - new Date() for all timestamps (Key Technical Rule #11) — NOT serverTimestamp
//   - tenantId on every query (tenant isolation)
//   - familyMembers keyed by auto-id; owner linked via officialEmployeeNumber
// ─────────────────────────────────────────

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const {
  COLLECTIONS,
  MEMBER_RELATIONS,
  TENANTS,
} = require('../constants');

const now = () => new Date();

// Default cap if appSettings has not been seeded with the value yet.
const DEFAULT_MAX_FAMILY_MEMBERS = 12;

// Relations that require a date of birth (spouse DOB is optional per scope).
const DOB_REQUIRED_RELATIONS = [MEMBER_RELATIONS.SON, MEMBER_RELATIONS.DAUGHTER];

// ─────────────────────────────────────────
// _resolveEmployeeNumber
// Maps the calling user's uid to their officialEmployeeNumber.
// Family members are owned by the employee, identified by officialEmployeeNumber.
// ─────────────────────────────────────────
async function _resolveEmployeeNumber(uid) {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User account not found');
  }
  const { officialEmployeeNumber } = userDoc.data();
  if (!officialEmployeeNumber) {
    throw new Error('No employee number linked to this account');
  }
  return officialEmployeeNumber;
}

// ─────────────────────────────────────────
// _getMaxFamilyMembers
// Reads the configurable cap from appSettings; falls back to default.
// ─────────────────────────────────────────
async function _getMaxFamilyMembers(tenantId) {
  try {
    const doc = await db.collection(COLLECTIONS.APP_SETTINGS).doc(tenantId).get();
    if (doc.exists) {
      const v = doc.data().maxFamilyMembersPerEmployee;
      if (typeof v === 'number' && v > 0) return v;
    }
  } catch (e) {
    // Non-fatal — fall back to default cap.
    console.warn('familyService: could not read maxFamilyMembersPerEmployee, using default', e.message);
  }
  return DEFAULT_MAX_FAMILY_MEMBERS;
}

// ─────────────────────────────────────────
// _validateMemberInput
// Shared validation for add and edit.
// ─────────────────────────────────────────
function _validateMemberInput({ relation, fullName, dateOfBirth }, { requireRelation = true } = {}) {
  if (requireRelation) {
    const validRelations = Object.values(MEMBER_RELATIONS);
    if (!relation || !validRelations.includes(relation)) {
      throw new Error(`relation must be one of: ${validRelations.join(', ')}`);
    }
  }

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
      throw new Error('fullName must be a non-empty string');
    }
  }

  // DOB required for son and daughter; optional for spouse.
  if (requireRelation && DOB_REQUIRED_RELATIONS.includes(relation)) {
    if (!dateOfBirth) {
      throw new Error(`dateOfBirth is required for relation: ${relation}`);
    }
  }

  if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== '') {
    // Expect YYYY-MM-DD; basic shape check only.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw new Error('dateOfBirth must be in YYYY-MM-DD format');
    }
  }
}

// ─────────────────────────────────────────
// _toISO  — normalise Firestore timestamps / Date to ISO string
// ─────────────────────────────────────────
const _toISO = (ts) => {
  if (!ts) return null;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return ts;
};

// ─────────────────────────────────────────
// _shape  — outward shape for a family member document
// ─────────────────────────────────────────
const _shape = (id, data) => ({
  familyMemberId: id,
  officialEmployeeNumber: data.officialEmployeeNumber,
  relation: data.relation,
  fullName: data.fullName,
  dateOfBirth: data.dateOfBirth || null,
  isActive: data.isActive,
  deletionRequested: data.deletionRequested || false,
  deletionRequestReason: data.deletionRequestReason || null,
  deletionRequestNote: data.deletionRequestNote || null,
  deletionRequestedAt: _toISO(data.deletionRequestedAt),
  createdAt: _toISO(data.createdAt),
  updatedAt: _toISO(data.updatedAt),
});

// ─────────────────────────────────────────
// listMyFamily
// Returns all family members (active + inactive) owned by the caller.
// Deletion-pending members are included with deletionRequested = true so the
// UI can dim them. tenantId-scoped.
// ─────────────────────────────────────────
async function listMyFamily({ uid, tenantId }) {
  const officialEmployeeNumber = await _resolveEmployeeNumber(uid);

  const snap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
    .where('tenantId', '==', tenantId)
    .where('officialEmployeeNumber', '==', officialEmployeeNumber)
    .get();

  const members = snap.docs.map(d => _shape(d.id, d.data()));

  // Stable display order: relation then name (avoids needing a composite index).
  members.sort((a, b) => {
    if (a.relation !== b.relation) return a.relation.localeCompare(b.relation);
    return (a.fullName || '').localeCompare(b.fullName || '');
  });

  return { officialEmployeeNumber, count: members.length, members };
}

// ─────────────────────────────────────────
// addFamilyMember
// Creates a new active family member for the caller.
// Enforces the per-employee cap (active + inactive counted, deletion-pending excluded).
// ─────────────────────────────────────────
async function addFamilyMember({ uid, tenantId, relation, fullName, dateOfBirth }) {
  const officialEmployeeNumber = await _resolveEmployeeNumber(uid);

  _validateMemberInput({ relation, fullName, dateOfBirth }, { requireRelation: true });
  if (!fullName) throw new Error('fullName is required');

  // Cap check — count existing members not pending deletion.
  const existingSnap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
    .where('tenantId', '==', tenantId)
    .where('officialEmployeeNumber', '==', officialEmployeeNumber)
    .get();

  const liveCount = existingSnap.docs.filter(d => d.data().deletionRequested !== true).length;
  const max = await _getMaxFamilyMembers(tenantId);
  if (liveCount >= max) {
    throw new Error(`Maximum of ${max} family members reached`);
  }

  const ref = db.collection(COLLECTIONS.FAMILY_MEMBERS).doc();
  const ts = now();
  await ref.set({
    officialEmployeeNumber,
    relation,
    fullName: fullName.trim(),
    dateOfBirth: dateOfBirth || null,
    isActive: true,
    deletionRequested: false,
    deletionRequestedAt: null,
    deletionRequestReason: null,
    deletionRequestNote: null,
    createdByUid: uid,
    tenantId,
    createdAt: ts,
    updatedAt: ts,
  });

  const saved = await ref.get();
  return { message: 'Family member added', member: _shape(ref.id, saved.data()) };
}

// ─────────────────────────────────────────
// _loadOwnedMember
// Loads a family member and confirms it belongs to the caller + tenant.
// Throws if not found or not owned. Returns { ref, data }.
// ─────────────────────────────────────────
async function _loadOwnedMember({ uid, tenantId, familyMemberId }) {
  const officialEmployeeNumber = await _resolveEmployeeNumber(uid);
  const ref = db.collection(COLLECTIONS.FAMILY_MEMBERS).doc(familyMemberId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Family member not found');
  const data = doc.data();
  if (data.tenantId !== tenantId || data.officialEmployeeNumber !== officialEmployeeNumber) {
    // Do not leak existence — treat as not found.
    throw new Error('Family member not found');
  }
  return { ref, data, officialEmployeeNumber };
}

// ─────────────────────────────────────────
// updateFamilyMember
// Edits fullName and/or dateOfBirth. Relation is immutable after creation
// (a wrong relation = wrong entry → delete + re-add).
// DOB editing remains with the employee in V1.1 (V3 review point).
// ─────────────────────────────────────────
async function updateFamilyMember({ uid, tenantId, familyMemberId, fullName, dateOfBirth }) {
  const { ref, data } = await _loadOwnedMember({ uid, tenantId, familyMemberId });

  if (data.deletionRequested === true) {
    throw new Error('Cannot edit a member that is pending deletion');
  }

  _validateMemberInput({ fullName, dateOfBirth }, { requireRelation: false });

  const updates = { updatedAt: now() };
  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (dateOfBirth !== undefined) {
    // Guard: son/daughter must keep a DOB.
    if ((dateOfBirth === null || dateOfBirth === '') && DOB_REQUIRED_RELATIONS.includes(data.relation)) {
      throw new Error(`dateOfBirth cannot be cleared for relation: ${data.relation}`);
    }
    updates.dateOfBirth = dateOfBirth || null;
  }

  if (Object.keys(updates).length === 1) {
    throw new Error('No valid fields to update');
  }

  await ref.update(updates);
  const saved = await ref.get();
  return { message: 'Family member updated', member: _shape(ref.id, saved.data()) };
}

// ─────────────────────────────────────────
// setFamilyMemberStatus
// Activate / deactivate a member. No approval needed. Deactivated members
// cannot be selected in any service transaction (enforced at consumer-tag time).
// ─────────────────────────────────────────
async function setFamilyMemberStatus({ uid, tenantId, familyMemberId, isActive }) {
  if (typeof isActive !== 'boolean') {
    throw new Error('isActive must be true or false');
  }
  const { ref, data } = await _loadOwnedMember({ uid, tenantId, familyMemberId });

  if (data.deletionRequested === true) {
    throw new Error('Cannot change status of a member that is pending deletion');
  }

  await ref.update({ isActive, updatedAt: now() });
  return {
    message: `Family member ${isActive ? 'activated' : 'deactivated'}`,
    familyMemberId,
    isActive,
  };
}

// ─────────────────────────────────────────
// requestDeletion
// Employee flags a wrong entry for permanent deletion.
// Sets isActive = false + deletionRequested = true. Member dims in UI and
// cannot be selected anywhere. Admin verifies zero transactions then approves.
// ─────────────────────────────────────────
async function requestDeletion({ uid, tenantId, familyMemberId, reason }) {
  const { ref, data } = await _loadOwnedMember({ uid, tenantId, familyMemberId });

  if (data.deletionRequested === true) {
    throw new Error('Deletion already requested for this member');
  }

  await ref.update({
    isActive: false,
    deletionRequested: true,
    deletionRequestedAt: now(),
    deletionRequestReason: (reason || '').trim() || null,
    deletionRequestNote: null,
    updatedAt: now(),
  });

  return { message: 'Deletion requested. Pending admin verification.', familyMemberId };
}

// ─────────────────────────────────────────
// cancelDeletionRequest
// Employee withdraws their own pending deletion request (before admin acts).
// Returns the record to a normal deactivated state.
// ─────────────────────────────────────────
async function cancelDeletionRequest({ uid, tenantId, familyMemberId }) {
  const { ref, data } = await _loadOwnedMember({ uid, tenantId, familyMemberId });

  if (data.deletionRequested !== true) {
    throw new Error('No pending deletion request to cancel');
  }

  await ref.update({
    deletionRequested: false,
    deletionRequestedAt: null,
    deletionRequestReason: null,
    deletionRequestNote: null,
    updatedAt: now(),
    // Stays inactive — employee re-activates manually if desired.
  });

  return { message: 'Deletion request cancelled', familyMemberId };
}

// ─────────────────────────────────────────
// ADMIN — listDeletionRequests
// Lists all family members pending deletion for the tenant, for admin review.
// ─────────────────────────────────────────
async function listDeletionRequests({ tenantId }) {
  const snap = await db.collection(COLLECTIONS.FAMILY_MEMBERS)
    .where('tenantId', '==', tenantId)
    .where('deletionRequested', '==', true)
    .get();

  const requests = snap.docs.map(d => _shape(d.id, d.data()));
  requests.sort((a, b) => (a.deletionRequestedAt || '').localeCompare(b.deletionRequestedAt || ''));
  return { count: requests.length, requests };
}

// ─────────────────────────────────────────
// ADMIN — approveDeletion
// Permanent deletion. Admin must have verified zero transactions exist.
// V1.1 has no consumer-tagged transactions yet (café/tuckshop/BBQ arrive in
// V1.2+), so the zero-transaction check is a stub returning true for now and
// MUST be implemented before V1.2 family tagging goes live.
// ─────────────────────────────────────────
async function approveDeletion({ tenantId, familyMemberId }) {
  const ref = db.collection(COLLECTIONS.FAMILY_MEMBERS).doc(familyMemberId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Family member not found');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Family member not found');
  if (data.deletionRequested !== true) {
    throw new Error('This member is not pending deletion');
  }

  const hasTransactions = await _memberHasTransactions(tenantId, familyMemberId);
  if (hasTransactions) {
    throw new Error('Cannot delete: this member has service transactions on record');
  }

  await ref.delete();
  return { message: 'Family member permanently deleted', familyMemberId };
}

// ─────────────────────────────────────────
// ADMIN — rejectDeletion
// Admin rejects the deletion request with an explanatory note.
// Record returns to normal (deactivated) state; note surfaced to employee.
// ─────────────────────────────────────────
async function rejectDeletion({ tenantId, familyMemberId, note }) {
  const ref = db.collection(COLLECTIONS.FAMILY_MEMBERS).doc(familyMemberId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Family member not found');
  const data = doc.data();
  if (data.tenantId !== tenantId) throw new Error('Family member not found');
  if (data.deletionRequested !== true) {
    throw new Error('This member is not pending deletion');
  }

  await ref.update({
    deletionRequested: false,
    deletionRequestedAt: null,
    deletionRequestReason: null,
    deletionRequestNote: (note || '').trim() || 'Deletion request rejected by admin',
    updatedAt: now(),
    // Remains inactive — employee reviews and reactivates if needed.
  });

  return { message: 'Deletion request rejected', familyMemberId };
}

// ─────────────────────────────────────────
// _memberHasTransactions
// Placeholder transaction guard. In V1.1 there are no consumer-tagged service
// collections yet. When V1.2 (cafeOrders) etc. land, this must query each
// service collection for documents tagging this familyMemberId.
// Returns false for now so wrongly-entered members can be cleaned up.
// ─────────────────────────────────────────
async function _memberHasTransactions(/* tenantId, familyMemberId */) {
  // TODO (V1.2+): query cafeOrders / tuckshopOrders / bbqOrders for
  // consumerFamilyMemberId === familyMemberId before allowing permanent delete.
  return false;
}

module.exports = {
  listMyFamily,
  addFamilyMember,
  updateFamilyMember,
  setFamilyMemberStatus,
  requestDeletion,
  cancelDeletionRequest,
  // admin
  listDeletionRequests,
  approveDeletion,
  rejectDeletion,
};
