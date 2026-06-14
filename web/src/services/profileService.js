// web/src/services/profileService.js
// Screen 20 — My Profile (All Roles) — Flow 01

import { auth } from '../config/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';

import { BASE_URL } from './config.js';

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};

// ── GET /profile/me ───────────────────────────────────────────────────────
// Backend returns a FLAT object with all fields at the top level.
// MyProfilePage expects: { user: {...}, employee: {...} }
// We reshape here so the page code does not need to change.
export const getMyProfile = async () => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load profile');

  // The backend returns { profile: { uid, role, fullName, grade, ... } } — flat
  const flat = data.profile ?? data;

  // Reshape into the nested structure MyProfilePage expects
  return {
    // user sub-object — fields the page reads from profile.user
    user: {
      uid:                    flat.uid,
      officialEmployeeNumber: flat.officialEmployeeNumber,
      personalEmail:          flat.personalEmail,
      email:                  flat.personalEmail,
      role:                   flat.role,
      status:                 flat.status,
      defaultView:            flat.defaultView,
    },
    // employee sub-object — fields the page reads from profile.employee
    employee: {
      fullName:               flat.fullName,
      grade:                  flat.grade,
      designation:            flat.designation,
      department:             flat.department,
      houseNumber:            flat.houseNumber,
      residenceType:          flat.residenceType,
      phoneNumber:            flat.phoneNumber,
      employeeType:           flat.employeeType,
      pendingGrade:           flat.pendingGrade,
      pendingDesignation:     flat.pendingDesignation,
      pendingHouseNumber:     flat.pendingHouseNumber,
      pendingResidenceType:   flat.pendingResidenceType,
    },
    // Keep top-level fields for backwards compatibility
    phoneNumber:              flat.phoneNumber,
    displayName:              flat.displayName ?? '',
    officialEmployeeNumber:   flat.officialEmployeeNumber,
    role:                     flat.role,
  };
};

// ── PATCH /profile/me ─────────────────────────────────────────────────────
// Allowed fields: grade, designation, houseNumber, residenceType, phoneNumber
// displayName is NOT accepted by backend — stripped here
export const updateMyProfile = async (fields) => {
  const token = await getToken();

  // Only send fields the backend allows — remove displayName
  const payload = {};
  const allowed = ['grade', 'designation', 'houseNumber', 'residenceType', 'phoneNumber'];
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== '') {
      payload[key] = fields[key];
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No valid fields to update');
  }

  const res = await fetch(`${BASE_URL}/profile/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Save failed');
  return data;
};

// ── POST /profile/pending-change ──────────────────────────────────────────
// Submit grade / designation / house number for admin approval
export const submitPendingChange = async (fields) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/profile/pending-change`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Submission failed');
  return data;
};

// ── changePassword ────────────────────────────────────────────────────────
// Re-authenticates with Firebase then sets new password
// Done entirely client-side via Firebase Auth SDK — no backend call needed
export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not authenticated');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};
