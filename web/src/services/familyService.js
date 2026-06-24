// ─────────────────────────────────────────
// familyService.js — Family Member & Marital Status API (Web)
// HomiLabs | Servio | V1.1 — Slice 3b (read + write, relation editable, 4-value marital)
//
// FILE LOCATION: web/src/services/familyService.js
//
// SLICE 1 (shipped 18-Jun-2026): getMyMaritalStatus, getMyFamily.
// SLICE 2 (shipped 19-Jun-2026): addFamilyMember, updateFamilyMember,
//                                setFamilyMemberStatus.
// SLICE 3b (this update)       : setMyMaritalStatus.
//                                updateFamilyMember extended to accept `relation`.
//
// Backend changes since Slice 2 (Slice 3a — backend-only, 19-Jun-2026):
//   - maritalStatus vocab expanded: 'single' | 'married' | 'divorced' | 'widowed'.
//     Employee-controlled, no admin approval, no pending state, no cascade.
//   - relation is now EDITABLE via PATCH /family/me/:id. DOB safeguard:
//     edits that result in son/daughter require a non-null DOB. Every real
//     relation change appends to relationHistory[] on the member doc.
//
// Deletion endpoints (POST/DELETE /family/me/:id/delete-request) remain
// deliberately unwired. Decision 18-Jun-2026 (still in force): soft-delete
// only, records are permanent once created. Backend endpoints remain
// deployed but unused — see command board parked-decisions log.
//
// Backend response wrapper (verified in core/functions/src/utils.js):
//   { success: true, message: "...", data: { ... } }
// We return data.data directly. No fallback chains.
// ─────────────────────────────────────────

import { auth } from '../config/firebase';
import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /family/marital-status/me ─────────────────────────────────────────
// Backend returns: data = { officialEmployeeNumber, maritalStatus, pendingMaritalStatus }
//   maritalStatus       : 'single' | 'married' | 'divorced' | 'widowed' | null
//   pendingMaritalStatus: always null post-Slice-3a (kept in response shape
//                         for backward compatibility; backend writes null
//                         defensively on every marital change).
export const getMyMaritalStatus = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/family/marital-status/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load marital status');
  return body.data;
};

// ── PATCH /family/marital-status/me ───────────────────────────────────────
// Set my marital status. Employee-controlled — immediate write, no admin step.
// Backend body: { maritalStatus }
//   maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' (required)
// Backend rules:
//   - rejects unknown values with "must be one of: single, married, divorced, widowed"
//   - rejects same-value writes with a "already" message (no-op detection)
//   - no transition restrictions; any value can be set from any state
//   - no cascade on family members; status and family list are decoupled
// Returns: data = { message, maritalStatus, pending: false }
export const setMyMaritalStatus = async (maritalStatus) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/family/marital-status/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ maritalStatus }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to update marital status');
  return body.data;
};

// ── GET /family/me ────────────────────────────────────────────────────────
// Backend returns: data = { officialEmployeeNumber, count, members }
// Each member: {
//   familyMemberId, officialEmployeeNumber,
//   relation ('spouse'|'son'|'daughter'),
//   fullName,
//   dateOfBirth (YYYY-MM-DD | null),
//   isActive (bool),
//   deletionRequested (bool),
//   deletionRequestReason (string | null),
//   deletionRequestNote   (string | null),
//   deletionRequestedAt   (ISO | null),
//   relationHistory ([{from, to, changedAt, changedByUid}, ...]),
//   createdAt, updatedAt  (ISO)
// }
export const getMyFamily = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/family/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load family members');
  return body.data;
};

// ── POST /family/me ───────────────────────────────────────────────────────
// Add a new family member.
// Backend body: { relation, fullName, dateOfBirth }
//   relation    : 'spouse' | 'son' | 'daughter' (required, editable later via PATCH)
//   fullName    : non-empty string (required)
//   dateOfBirth : 'YYYY-MM-DD' — required for son/daughter, optional for spouse
// Returns: data = { message, member }
// Surfaces backend error messages verbatim (e.g. "Maximum of 12 family members reached").
export const addFamilyMember = async ({ relation, fullName, dateOfBirth }) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/family/me`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ relation, fullName, dateOfBirth: dateOfBirth || null }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to add family member');
  return body.data;
};

// ── PATCH /family/me/:familyMemberId ──────────────────────────────────────
// Edit relation, fullName and/or dateOfBirth.
// Backend body: any subset of { relation, fullName, dateOfBirth }
// Backend rules (Slice 3a):
//   - refuses if member has deletionRequested === true (won't happen via our UI)
//   - refuses to clear DOB for son/daughter
//   - DOB safeguard: edits resulting in son/daughter require a non-null DOB
//     (the post-merge state is what matters — backend evaluates after merging)
//   - relation must be one of: 'spouse' | 'son' | 'daughter'
//   - requires at least one of the three fields
//   - real relation changes append to relationHistory[]; name/DOB-only edits don't
// Returns: data = { message, member }
export const updateFamilyMember = async (familyMemberId, { fullName, dateOfBirth, relation }) => {
  const token = await getToken();

  // Build payload only with fields the caller actually wants to change.
  // Sending undefined keys would be filtered by JSON.stringify anyway, but
  // being explicit keeps the request body easy to reason about in DevTools.
  const payload = {};
  if (fullName    !== undefined) payload.fullName    = fullName;
  if (dateOfBirth !== undefined) payload.dateOfBirth = dateOfBirth || null;
  if (relation    !== undefined) payload.relation    = relation;

  const res = await fetch(`${BASE_URL}/family/me/${familyMemberId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to update family member');
  return body.data;
};

// ── PATCH /family/me/:familyMemberId/status ───────────────────────────────
// Activate or deactivate a member.
// Backend body: { isActive: true | false }   (strict boolean — string fails)
// Returns: data = { message, familyMemberId, isActive }
export const setFamilyMemberStatus = async (familyMemberId, isActive) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/family/me/${familyMemberId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive: !!isActive }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to update status');
  return body.data;
};

// ── GET /family/employee/:employeeNumber ──────────────────────────────────
// V1.2 Slice 5 (proxy ordering). Returns the SELECTABLE family of a GIVEN
// employee — for a supervisor composing a proxy café order. Café-staff + admin
// only (backend-gated). 404 if the employee is missing/inactive.
//
// Pattern B — token passed IN by the caller (CafeProxyOrderPage is a <WithToken>
// page), NOT self-fetched like the /me functions above. This matches the café
// service layer; the proxy page lives on the café side.
//
// Backend returns: data = { officialEmployeeNumber, employeeName, count, members }
// Each member is the same shape as getMyFamily (familyMemberId, relation,
// fullName, isActive, ...), already filtered to active + non-deletion-pending.
export const getFamilyForEmployee = async (token, employeeNumber) => {
  const res = await fetch(`${BASE_URL}/family/employee/${employeeNumber}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Failed to load employee family');
  return body.data;
};
