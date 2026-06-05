// web/src/pages/employee/MyProfilePage.jsx
// Screen 20 — My Profile (All Roles) — Flow 01

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMyProfile,
  updateMyProfile,
  submitPendingChange,
  changePassword,
} from '../../services/profileService';
import styles from './MyProfilePage.module.css';

const GRADE_OPTIONS = [
  'MT1','MT2','MT3','MT4','MT5','MT6',
  'M5','M6','M7','M8','M9','M9A',
  'M10','M11','M11A','M12','M12A','M13',
];

export default function MyProfilePage() {
  const { refreshProfile } = useAuth();

  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');

  // Contact edit
  const [editContact, setEditContact]   = useState(false);
  const [phone, setPhone]               = useState('');
  const [displayName, setDisplayName]   = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Pending change
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [pendingGrade, setPendingGrade] = useState('');
  const [pendingDesig, setPendingDesig] = useState('');
  const [pendingHouse, setPendingHouse] = useState('');
  const [savingPending, setSavingPending] = useState(false);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass]   = useState('');
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [savingPass, setSavingPass]     = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = await getMyProfile();
      setProfile(p);
      setPhone(p.phoneNumber ?? p.employee?.phoneNumber ?? '');
      setDisplayName(p.displayName ?? '');
      setPendingGrade(p.employee?.pendingGrade ?? '');
      setPendingDesig(p.employee?.pendingDesignation ?? '');
      setPendingHouse(p.employee?.pendingHouseNumber ?? '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const saveContact = async () => {
    setSavingContact(true);
    setError('');
    try {
      await updateMyProfile({ phoneNumber: phone, displayName });
      flash('Profile updated.');
      setEditContact(false);
      fetchProfile();
      if (refreshProfile) refreshProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handlePendingSubmit = async () => {
    const body = {};
    if (pendingGrade) body.pendingGrade       = pendingGrade;
    if (pendingDesig) body.pendingDesignation = pendingDesig;
    if (pendingHouse) body.pendingHouseNumber = pendingHouse;
    if (Object.keys(body).length === 0) {
      setError('Enter at least one change.');
      return;
    }
    setSavingPending(true);
    setError('');
    try {
      await submitPendingChange(body);
      flash('Change request submitted. Admin will review.');
      setShowPendingForm(false);
      fetchProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingPending(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPass.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { setError('Passwords do not match.'); return; }
    setSavingPass(true);
    setError('');
    try {
      await changePassword(currentPass, newPass);
      flash('Password changed successfully.');
      setShowPasswordForm(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e) {
      // Firebase error codes are not user-friendly — translate the common one
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else {
        setError(e.message);
      }
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;

  const emp  = profile?.employee ?? {};
  const user = profile?.user ?? profile ?? {};

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Profile</h1>
      </div>

      {error      && <div className={styles.errorBanner}>{error}</div>}
      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

      {profile && (
        <>
          {/* Profile header card */}
          <div className={styles.profileCard}>
            <div className={styles.avatarCircle}>
              {(displayName || emp.fullName || '?').charAt(0).toUpperCase()}
            </div>
            <div className={styles.profileMain}>
              <div className={styles.profileName}>{displayName || emp.fullName || '—'}</div>
              <div className={styles.profileEmpNum}>{user.officialEmployeeNumber ?? '—'}</div>
              <div className={styles.profileRole}>
                <span className={styles.roleBadge}>{user.role ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Contact Info</h2>
              {!editContact ? (
                <button className={styles.editBtn} onClick={() => setEditContact(true)}>Edit</button>
              ) : (
                <div className={styles.editActions}>
                  <button className={styles.saveSmBtn} onClick={saveContact} disabled={savingContact}>
                    {savingContact ? '…' : 'Save'}
                  </button>
                  <button className={styles.cancelSmBtn} onClick={() => setEditContact(false)}>Cancel</button>
                </div>
              )}
            </div>
            <div className={styles.fieldGrid}>
              <ProfileField label="Display Name" value={displayName} editMode={editContact}
                onChange={setDisplayName} placeholder="Your preferred name" />
              <ProfileField label="Phone Number" value={phone} editMode={editContact}
                onChange={setPhone} placeholder="03001234567" />
              <ProfileField label="Email"        value={user.personalEmail ?? user.email} editMode={false} />
              <ProfileField label="House Number" value={emp.houseNumber} editMode={false} />
            </div>
          </section>

          {/* HR info */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>HR Information</h2>
              <button className={styles.editBtn} onClick={() => setShowPendingForm(v => !v)}>
                {showPendingForm ? 'Close' : 'Request Change'}
              </button>
            </div>
            <div className={styles.fieldGrid}>
              <ProfileField label="Full Name"   value={emp.fullName}    editMode={false} />
              <ProfileField label="Department"  value={emp.department}  editMode={false} />
              <ProfileField label="Designation" value={emp.designation} editMode={false} />
              <ProfileField label="Grade"       value={emp.grade}       editMode={false} />
            </div>

            {(emp.pendingGrade || emp.pendingDesignation || emp.pendingHouseNumber) && (
              <div className={styles.pendingNote}>
                ⏳ Pending changes: {[emp.pendingGrade, emp.pendingDesignation, emp.pendingHouseNumber].filter(Boolean).join(', ')} — awaiting admin approval
              </div>
            )}

            {showPendingForm && (
              <div className={styles.pendingForm}>
                <p className={styles.pendingFormNote}>
                  These changes will be submitted for admin approval. Your current info stays active until approved.
                </p>
                <div className={styles.fieldGrid}>
                  <div className={styles.fieldItem}>
                    <label className={styles.fieldLabel}>New Grade (optional)</label>
                    <select className={styles.fieldInput} value={pendingGrade} onChange={e => setPendingGrade(e.target.value)}>
                      <option value="">— No change —</option>
                      {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className={styles.fieldItem}>
                    <label className={styles.fieldLabel}>New Designation (optional)</label>
                    <input type="text" className={styles.fieldInput} value={pendingDesig}
                      onChange={e => setPendingDesig(e.target.value)} placeholder="e.g. Senior Engineer" />
                  </div>
                  <div className={styles.fieldItem}>
                    <label className={styles.fieldLabel}>New House Number (optional)</label>
                    <input type="text" className={styles.fieldInput} value={pendingHouse}
                      onChange={e => setPendingHouse(e.target.value)} placeholder="e.g. A-14" />
                  </div>
                </div>
                <button className={styles.submitPendingBtn} onClick={handlePendingSubmit} disabled={savingPending}>
                  {savingPending ? 'Submitting…' : 'Submit for Approval'}
                </button>
              </div>
            )}
          </section>

          {/* Password change */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Password</h2>
              <button className={styles.editBtn} onClick={() => setShowPasswordForm(v => !v)}>
                {showPasswordForm ? 'Close' : 'Change Password'}
              </button>
            </div>
            {showPasswordForm && (
              <div className={styles.passwordForm}>
                <div className={styles.passwordFields}>
                  <PasswordField label="Current Password" value={currentPass} onChange={setCurrentPass} />
                  <PasswordField label="New Password"     value={newPass}     onChange={setNewPass} />
                  <PasswordField label="Confirm Password" value={confirmPass} onChange={setConfirmPass} />
                </div>
                <button className={styles.submitPendingBtn} onClick={handlePasswordChange} disabled={savingPass}>
                  {savingPass ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ProfileField({ label, value, editMode, onChange, placeholder }) {
  return (
    <div className={styles.fieldItem}>
      <label className={styles.fieldLabel}>{label}</label>
      {editMode ? (
        <input type="text" className={styles.fieldInput} value={value ?? ''}
          placeholder={placeholder ?? ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <div className={styles.fieldValue}>{value || <span className={styles.fieldEmpty}>—</span>}</div>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div className={styles.fieldItem}>
      <label className={styles.fieldLabel}>{label}</label>
      <input type="password" className={styles.fieldInput} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
