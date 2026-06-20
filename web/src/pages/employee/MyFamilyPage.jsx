// ─────────────────────────────────────────
// MyFamilyPage.jsx — Employee My Family (Slice 3b)
// HomiLabs | Servio | V1.1
//
// FILE LOCATION: web/src/pages/employee/MyFamilyPage.jsx
//
// Slice 3b scope:
//   - Marital Status card (Edit-Save with dropdown) lives ABOVE everything.
//     Always visible, regardless of current status or family state.
//   - Family list + Add button are gated: shown if status !== 'single' OR
//     any active family rows exist. Hidden otherwise (with a small empty-state
//     prompt below the marital card so the page never feels broken).
//   - Edit Member dialog now offers a relation dropdown with DOB safeguard
//     (changing TO son/daughter requires a non-null DOB).
//   - No nudges, no hints about family side after marital change. Pure save.
//
// Slice 2 carryover (unchanged):
//   - Add member dialog (relation radio + DOB).
//   - Per-row Edit + Deactivate/Reactivate.
//   - Deletion deliberately not exposed. Deletion-pending rows render
//     read-only for back-compat (no UI route puts a row into that state).
//   - All write actions re-fetch the list afterwards — list is authoritative.
//
// Removed in Slice 3b:
//   - pendingMaritalStatus banner (dead branch — Slice 3a removed the pending
//     state entirely; backend writes pendingMaritalStatus=null defensively).
// ─────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getMyMaritalStatus,
  setMyMaritalStatus,
  getMyFamily,
  addFamilyMember,
  updateFamilyMember,
  setFamilyMemberStatus,
} from '../../services/familyService';
import styles from './MyFamilyPage.module.css';

// Mirrors the backend MEMBER_RELATIONS constant. Kept here as a small
// local lookup; a single source of truth across web/mobile would live in a
// shared constants file in a later cleanup.
const RELATION_LABELS = {
  spouse:   'Spouse',
  son:      'Son',
  daughter: 'Daughter',
};
const RELATION_ORDER = ['spouse', 'son', 'daughter'];
const DOB_REQUIRED = new Set(['son', 'daughter']);

const formatRelation = (r) => RELATION_LABELS[r] || r || '—';

// Mirrors backend MARITAL_STATUS (Slice 3a). Four values, employee-controlled.
const MARITAL_LABELS = {
  single:   'Single',
  married:  'Married',
  divorced: 'Divorced',
  widowed:  'Widowed',
};
const MARITAL_ORDER = ['single', 'married', 'divorced', 'widowed'];

const formatMarital = (s) => (s ? MARITAL_LABELS[s] || s : 'Not set');

// Cap mirrored from appSettings.maxFamilyMembersPerEmployee (default 12).
// Hardcoded on the client only for the "Add disabled" visual hint — the real
// enforcement is the backend's cap check, whose error message we surface
// verbatim if the user gets through somehow (stale data, race, etc.).
const CAP_HINT = 12;

export default function MyFamilyPage() {
  const [marital, setMarital] = useState(null);
  const [family,  setFamily]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Transient feedback for write actions (lives above the list).
  // type: 'success' | 'error'. Auto-clears after ~4s on success.
  const [flash, setFlash] = useState(null);

  // Dialog state. Only one open at a time. null = closed.
  const [addOpen,  setAddOpen]  = useState(false);
  const [editing,  setEditing]  = useState(null); // the member being edited

  // Per-row busy lock so the user can't fire two status toggles on the same
  // row while one is in flight. Map of familyMemberId -> true.
  const [rowBusy, setRowBusy] = useState({});

  // ── Loaders ─────────────────────────────────────────────────────────────
  // After writes we only refresh the relevant slice — marital and family
  // are independent now (no cascade).
  const refreshFamily = useCallback(async () => {
    try {
      const f = await getMyFamily();
      setFamily(f);
    } catch (e) {
      setFlash({ type: 'error', text: `Refresh failed: ${e.message}` });
    }
  }, []);

  const refreshMarital = useCallback(async () => {
    try {
      const m = await getMyMaritalStatus();
      setMarital(m);
    } catch (e) {
      setFlash({ type: 'error', text: `Refresh failed: ${e.message}` });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [m, f] = await Promise.all([getMyMaritalStatus(), getMyFamily()]);
        if (cancelled) return;
        setMarital(m);
        setFamily(f);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-clear successful flashes after 4s. Errors stay until next action.
  useEffect(() => {
    if (flash?.type !== 'success') return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // ── Derived ─────────────────────────────────────────────────────────────

  const status   = marital?.maritalStatus || null;
  const members  = family?.members || [];

  // Page gating: show family list + Add when status != single OR any active
  // members exist. This protects divorced/widowed employees with children.
  const hasActiveMembers = useMemo(
    () => members.some(m => m.isActive),
    [members]
  );
  const showFamilySection = (status && status !== 'single') || hasActiveMembers;

  // Count for the cap visual. Backend counts active + inactive but excludes
  // deletion-pending. Mirror that here so the disabled state matches reality.
  const countAgainstCap = useMemo(
    () => members.filter(m => !m.deletionRequested).length,
    [members]
  );
  const atCap = countAgainstCap >= CAP_HINT;

  // ── Action handlers ────────────────────────────────────────────────────

  const handleMaritalSave = async (next) => {
    // Caller (MaritalCard) does the no-op check, but a second guard here
    // costs nothing and protects against backend "already" errors.
    if (next === status) return;
    await setMyMaritalStatus(next);
    setFlash({ type: 'success', text: 'Marital status updated.' });
    await refreshMarital();
  };

  const handleAdd = async ({ relation, fullName, dateOfBirth }) => {
    try {
      await addFamilyMember({ relation, fullName, dateOfBirth });
      setAddOpen(false);
      setFlash({ type: 'success', text: 'Family member added.' });
      await refreshFamily();
    } catch (e) {
      // Surface backend message inside the dialog — the dialog handles this.
      throw e;
    }
  };

  const handleEdit = async (familyMemberId, fields) => {
    try {
      await updateFamilyMember(familyMemberId, fields);
      setEditing(null);
      setFlash({ type: 'success', text: 'Family member updated.' });
      await refreshFamily();
    } catch (e) {
      throw e;
    }
  };

  const handleToggleStatus = async (member) => {
    const id = member.familyMemberId;
    if (rowBusy[id]) return;
    setRowBusy(prev => ({ ...prev, [id]: true }));
    setFlash(null);
    try {
      const nextActive = !member.isActive;
      await setFamilyMemberStatus(id, nextActive);
      setFlash({
        type: 'success',
        text: `${member.fullName} ${nextActive ? 'reactivated' : 'deactivated'}.`,
      });
      await refreshFamily();
    } catch (e) {
      setFlash({ type: 'error', text: e.message });
    } finally {
      setRowBusy(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // ── States ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Family</h1>
        </div>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Family</h1>
        </div>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Family</h1>
        <p className={styles.subtitle}>
          Your marital status and the family members registered under your profile.
        </p>
      </div>

      {flash && (
        <div className={flash.type === 'success' ? styles.flashSuccess : styles.flashError}>
          {flash.text}
          <button
            type="button"
            className={styles.flashClose}
            onClick={() => setFlash(null)}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* Marital status — always shown. */}
      <MaritalCard
        currentStatus={status}
        onSave={handleMaritalSave}
      />

      {showFamilySection ? (
        <>
          {/* Family-list header: Add button + cap visual */}
          <div className={styles.familyHeader}>
            <h2 className={styles.sectionTitle}>Family members</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => { setFlash(null); setAddOpen(true); }}
                disabled={atCap}
                title={atCap ? `Limit of ${CAP_HINT} reached` : 'Add a family member'}
              >
                + Add member
              </button>
              {atCap && (
                <div className={styles.capNote}>Limit of {CAP_HINT} reached</div>
              )}
            </div>
          </div>

          {members.length === 0 ? (
            <div className={styles.emptyCard}>
              <i className={`ti ti-user-plus ${styles.emptyIcon}`} />
              <h2 className={styles.emptyTitle}>No family members yet.</h2>
              <p className={styles.emptyBody}>
                Tap <strong>Add member</strong> above to register your spouse and children.
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {members.map((m) => (
                <MemberRow
                  key={m.familyMemberId}
                  member={m}
                  busy={!!rowBusy[m.familyMemberId]}
                  onEdit={() => { setFlash(null); setEditing(m); }}
                  onToggleStatus={() => handleToggleStatus(m)}
                />
              ))}
            </div>
          )}

          <div className={styles.footerNote}>
            Records are permanent — entries you no longer need can be deactivated.
          </div>
        </>
      ) : (
        // status === 'single' AND no active members → no family section.
        // Keep a small, friendly hint so the page never looks broken.
        <div className={styles.singleHint}>
          Family members can be added once your marital status is set to married, divorced, or widowed.
        </div>
      )}

      {addOpen && (
        <AddDialog
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
        />
      )}

      {editing && (
        <EditDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => handleEdit(editing.familyMemberId, fields)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MaritalCard — Edit-Save card with full-width dropdown.
// Mirrors the Contact Info section pattern from MyProfilePage.
// ─────────────────────────────────────────
function MaritalCard({ currentStatus, onSave }) {
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(currentStatus || '');
  const [saving,  setSaving]  = useState(false);
  const [localError, setLocalError] = useState('');

  // If the parent re-fetches and currentStatus shifts (e.g. someone changed
  // it in another tab), keep the working buffer in sync while NOT editing.
  useEffect(() => {
    if (!editing) setWorking(currentStatus || '');
  }, [currentStatus, editing]);

  const startEdit = () => {
    setLocalError('');
    setWorking(currentStatus || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setLocalError('');
    setWorking(currentStatus || '');
    setEditing(false);
  };

  const save = async () => {
    if (!working) {
      setLocalError('Please select a status.');
      return;
    }
    if (working === currentStatus) {
      // No-op — close edit mode silently.
      setEditing(false);
      return;
    }
    setSaving(true);
    setLocalError('');
    try {
      await onSave(working);
      setEditing(false);
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Marital Status</h2>
        {!editing ? (
          <button type="button" className={styles.editBtn} onClick={startEdit}>
            Edit
          </button>
        ) : (
          <div className={styles.editActions}>
            <button
              type="button"
              className={styles.saveSmBtn}
              onClick={save}
              disabled={saving}
            >
              {saving ? '…' : 'Save'}
            </button>
            <button
              type="button"
              className={styles.cancelSmBtn}
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className={styles.fieldItem}>
        <label className={styles.fieldLabel}>Status</label>
        {editing ? (
          <select
            className={styles.fieldInput}
            value={working}
            onChange={(e) => setWorking(e.target.value)}
            disabled={saving}
            autoFocus
          >
            <option value="" disabled>— Select status —</option>
            {MARITAL_ORDER.map((s) => (
              <option key={s} value={s}>{MARITAL_LABELS[s]}</option>
            ))}
          </select>
        ) : (
          <div className={styles.fieldValue}>
            {currentStatus
              ? formatMarital(currentStatus)
              : <span className={styles.fieldEmpty}>Not set</span>}
          </div>
        )}
      </div>

      {localError && <div className={styles.modalError}>{localError}</div>}
    </section>
  );
}

// ─────────────────────────────────────────
// MemberRow — single row in the list with edit + status controls
// Deletion-pending rows are read-only (kept for back-compat; no UI route
// to create one in Slice 2+). All other rows get Edit + a status toggle.
// ─────────────────────────────────────────
function MemberRow({ member, busy, onEdit, onToggleStatus }) {
  const { fullName, relation, dateOfBirth, isActive, deletionRequested } = member;

  let badge = null;
  let rowClass = styles.row;
  if (deletionRequested) {
    badge = <span className={`${styles.badge} ${styles.badgeDeletion}`}>Deletion pending</span>;
    rowClass = `${styles.row} ${styles.rowDim}`;
  } else if (!isActive) {
    badge = <span className={`${styles.badge} ${styles.badgeInactive}`}>Deactivated</span>;
    rowClass = `${styles.row} ${styles.rowDim}`;
  }

  return (
    <div className={rowClass}>
      <div className={styles.rowMain}>
        <div className={styles.rowName}>{fullName || '—'}</div>
        <div className={styles.rowMeta}>
          <span className={styles.metaItem}>{formatRelation(relation)}</span>
          {dateOfBirth && <span className={styles.metaDot}>·</span>}
          {dateOfBirth && <span className={styles.metaItem}>DOB {dateOfBirth}</span>}
        </div>
      </div>

      <div className={styles.rowRight}>
        {badge}
        {!deletionRequested && (
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={onEdit}
              disabled={busy}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={onToggleStatus}
              disabled={busy}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// AddDialog — new member: relation + fullName + dateOfBirth
// Frontend validation mirrors the backend so the user gets immediate
// feedback. Backend remains authoritative — its errors are surfaced verbatim.
// ─────────────────────────────────────────
function AddDialog({ onClose, onSubmit }) {
  const [relation, setRelation]   = useState('spouse');
  const [fullName, setFullName]   = useState('');
  const [dob, setDob]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const dobRequired = DOB_REQUIRED.has(relation);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const name = fullName.trim();
    if (!name) {
      setLocalError('Full name is required.');
      return;
    }
    if (dobRequired && !dob) {
      setLocalError(`Date of birth is required for ${RELATION_LABELS[relation].toLowerCase()}.`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        relation,
        fullName: name,
        dateOfBirth: dob || null,
      });
    } catch (err) {
      setLocalError(err.message);
      setSubmitting(false);
    }
    // On success the parent closes the dialog — no need to reset submitting.
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Add family member</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Relation</label>
            <div className={styles.radioGroup}>
              {RELATION_ORDER.map((r) => (
                <label key={r} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="relation"
                    value={r}
                    checked={relation === r}
                    onChange={() => setRelation(r)}
                  />
                  <span>{RELATION_LABELS[r]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="fm-fullname">Full name</label>
            <input
              id="fm-fullname"
              type="text"
              className={styles.formInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="fm-dob">
              Date of birth {dobRequired ? '' : '(optional)'}
            </label>
            <input
              id="fm-dob"
              type="date"
              className={styles.formInput}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required={dobRequired}
            />
          </div>

          {localError && <div className={styles.modalError}>{localError}</div>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
            >
              {submitting ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// EditDialog — fullName, dateOfBirth, and (Slice 3b) relation.
// Relation is now a radio group matching AddDialog's pattern.
//
// DOB safeguard logic (frontend mirror of backend rule):
//   The submit blocks if the SELECTED (post-edit) relation is son/daughter
//   AND DOB is empty. Backend evaluates the same way (post-merge state),
//   so this matches behaviour and prevents a server round-trip for the
//   common case. Backend remains authoritative — its message surfaces if
//   the frontend somehow misses an edge.
//
// We deliberately do NOT auto-clear DOB when switching FROM child to spouse —
// the user's DOB entry, if any, stays in the field. They can clear it manually
// if they want; spouse DOB is optional either way.
// ─────────────────────────────────────────
function EditDialog({ member, onClose, onSubmit }) {
  const [relation, setRelation]     = useState(member.relation || 'spouse');
  const [fullName, setFullName]     = useState(member.fullName || '');
  const [dob, setDob]               = useState(member.dateOfBirth || '');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  // DOB requirement follows the SELECTED relation, not the original one —
  // matches backend evaluation against the post-merge state.
  const dobRequired = DOB_REQUIRED.has(relation);

  // No-op detection: don't bother the backend if nothing changed.
  const nameChanged = fullName.trim() !== (member.fullName || '').trim();
  const dobChanged  = (dob || '') !== (member.dateOfBirth || '');
  const relChanged  = relation !== member.relation;
  const dirty       = nameChanged || dobChanged || relChanged;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const name = fullName.trim();
    if (!name) {
      setLocalError('Full name is required.');
      return;
    }
    if (dobRequired && !dob) {
      setLocalError(`Date of birth is required for ${RELATION_LABELS[relation].toLowerCase()}.`);
      return;
    }
    if (!dirty) {
      setLocalError('No changes to save.');
      return;
    }

    // Send only the fields that actually changed — keeps the request honest
    // and avoids re-triggering backend validation on unchanged values.
    const payload = {};
    if (nameChanged) payload.fullName    = name;
    if (dobChanged)  payload.dateOfBirth = dob || null;
    if (relChanged)  payload.relation    = relation;

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setLocalError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Edit family member</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Relation</label>
            <div className={styles.radioGroup}>
              {RELATION_ORDER.map((r) => (
                <label key={r} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="edit-relation"
                    value={r}
                    checked={relation === r}
                    onChange={() => setRelation(r)}
                    disabled={submitting}
                  />
                  <span>{RELATION_LABELS[r]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="fm-edit-fullname">Full name</label>
            <input
              id="fm-edit-fullname"
              type="text"
              className={styles.formInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="fm-edit-dob">
              Date of birth {dobRequired ? '' : '(optional)'}
            </label>
            <input
              id="fm-edit-dob"
              type="date"
              className={styles.formInput}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required={dobRequired}
            />
          </div>

          {localError && <div className={styles.modalError}>{localError}</div>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting || !dirty}
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
