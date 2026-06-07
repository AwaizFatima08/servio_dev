// web/src/pages/admin/AppSettingsPage.jsx
// Screen 19b — App Settings (Admin / Super Admin only)
// Edits all system settings AND support contact values.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAppSettings, updateAppSettings } from '../../services/appSettingsService';
import { getReservationSettings, updateReservationSettings } from '../../services/reservationSettingsService';
import styles from './AppSettingsPage.module.css';

export default function AppSettingsPage() {
  const { getToken } = useAuth();
  const [settings, setSettings]       = useState(null);
  const [editMode, setEditMode]       = useState(false);
  const [form, setForm]               = useState({});
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // Booking policy (reservationSettings) — separate widget
  const [resSettings, setResSettings]       = useState(null);
  const [resEditMode, setResEditMode]       = useState(false);
  const [resForm, setResForm]               = useState({});
  const [resSaving, setResSaving]           = useState(false);
  const [resError, setResError]             = useState('');
  const [resSuccess, setResSuccess]         = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const s = await getAppSettings();
      setSettings(s);
      setForm({
        managerName:               s.managerName               ?? '',
        managerPhone:              s.managerPhone              ?? '',
        supportEmail:              s.supportEmail              ?? '',
        supportPhone:              s.supportPhone              ?? '',
        mealFeedbackWindowHours:   s.mealFeedbackWindowHours   ?? 24,
        eventFeedbackWindowHours:  s.eventFeedbackWindowHours  ?? 48,
        notificationExpiryDays:    s.notificationExpiryDays    ?? 30,
        billingCycleDay:           s.billingCycleDay           ?? 1,
        throttleAttemptLimit:      s.throttleAttemptLimit      ?? 5,
        throttleWindowMinutes:     s.throttleWindowMinutes     ?? 60,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await getReservationSettings(token);
      setResSettings(s);
      setResForm({
        cutoffHoursBeforeMeal:       s.cutoffHoursBeforeMeal       ?? 3,
        bookingWindowDays:           s.bookingWindowDays           ?? 7,
        maxGuestQuantityPerBooking:  s.maxGuestQuantityPerBooking  ?? 5,
      });
    } catch (e) {
      setResError(e.message);
    }
  }, [getToken]);

  useEffect(() => { fetchSettings(); fetchResSettings(); }, [fetchSettings, fetchResSettings]);

  const handleChange = (key, val) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      await updateAppSettings(form);
      setSuccessMsg('Settings saved.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditMode(false);
      fetchSettings();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveResSettings = async () => {
    setResSaving(true);
    setResError('');
    try {
      const token = await getToken();
      await updateReservationSettings(resForm, token);
      setResSuccess('Booking policy saved.');
      setTimeout(() => setResSuccess(''), 4000);
      setResEditMode(false);
      fetchResSettings();
    } catch (e) {
      setResError(e.message);
    } finally {
      setResSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>App Settings</h1>
          <p className={styles.subtitle}>System configuration and support contact values</p>
        </div>
        {!editMode ? (
          <button className={styles.editBtn} onClick={() => setEditMode(true)}>Edit</button>
        ) : (
          <div className={styles.editActions}>
            <button className={styles.saveBtn} onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className={styles.cancelBtn} onClick={() => { setEditMode(false); fetchSettings(); }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {error      && <div className={styles.errorBanner}>{error}</div>}
      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

      {/* Support Contacts */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Support Contacts</h2>
        <p className={styles.sectionNote}>
          These values appear in the support popup when employees click the help icon in the bottom strip.
        </p>
        <div className={styles.fieldGrid}>
          <Field label="Manager Name"  value={form.managerName}  editMode={editMode}
            onChange={v => handleChange('managerName', v)} />
          <Field label="Manager Phone" value={form.managerPhone} editMode={editMode}
            onChange={v => handleChange('managerPhone', v)} placeholder="e.g. 0300-1234567" />
          <Field label="Support Email" value={form.supportEmail} editMode={editMode}
            onChange={v => handleChange('supportEmail', v)} placeholder="e.g. club@fatima-group.com" />
          <Field label="Support Phone" value={form.supportPhone} editMode={editMode}
            onChange={v => handleChange('supportPhone', v)} />
        </div>
      </section>

      {/* System Settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>System Settings</h2>
        <div className={styles.fieldGrid}>
          <Field label="Feedback Window — Meals (hours)"    value={form.mealFeedbackWindowHours}  editMode={editMode} type="number"
            onChange={v => handleChange('mealFeedbackWindowHours',  parseInt(v))} />
          <Field label="Feedback Window — Events (hours)"   value={form.eventFeedbackWindowHours} editMode={editMode} type="number"
            onChange={v => handleChange('eventFeedbackWindowHours', parseInt(v))} />
          <Field label="Notification Expiry (days)"         value={form.notificationExpiryDays}   editMode={editMode} type="number"
            onChange={v => handleChange('notificationExpiryDays',   parseInt(v))} />
          <Field label="Billing Cycle Start (day of month)" value={form.billingCycleDay}          editMode={editMode} type="number"
            onChange={v => handleChange('billingCycleDay',          parseInt(v))} />
          <Field label="Throttle — Max Attempts"            value={form.throttleAttemptLimit}     editMode={editMode} type="number"
            onChange={v => handleChange('throttleAttemptLimit',     parseInt(v))} />
          <Field label="Throttle — Window (minutes)"        value={form.throttleWindowMinutes}    editMode={editMode} type="number"
            onChange={v => handleChange('throttleWindowMinutes',    parseInt(v))} />
        </div>
      </section>

      {/* Booking Policy — reads/writes reservationSettings, not appSettings */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Booking Policy</h2>
            <p className={styles.sectionNote}>
              Controls booking cutoff, booking window, and guest limits. Stored separately from app settings.
            </p>
          </div>
          {!resEditMode ? (
            <button className={styles.editBtn} onClick={() => setResEditMode(true)}>Edit</button>
          ) : (
            <div className={styles.editActions}>
              <button className={styles.saveBtn} onClick={saveResSettings} disabled={resSaving}>
                {resSaving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={() => { setResEditMode(false); fetchResSettings(); }}>
                Cancel
              </button>
            </div>
          )}
        </div>
        {resError   && <div className={styles.errorBanner}>{resError}</div>}
        {resSuccess && <div className={styles.successBanner}>{resSuccess}</div>}
        <div className={styles.fieldGrid}>
          <Field
            label="Booking Cutoff Before Meal (hours)"
            value={resForm.cutoffHoursBeforeMeal}
            editMode={resEditMode}
            type="number"
            onChange={v => setResForm(prev => ({ ...prev, cutoffHoursBeforeMeal: parseInt(v) }))}
          />
          <Field
            label="Booking Window (days ahead)"
            value={resForm.bookingWindowDays}
            editMode={resEditMode}
            type="number"
            onChange={v => setResForm(prev => ({ ...prev, bookingWindowDays: parseInt(v) }))}
          />
          <Field
            label="Max Guest Quantity Per Booking"
            value={resForm.maxGuestQuantityPerBooking}
            editMode={resEditMode}
            type="number"
            onChange={v => setResForm(prev => ({ ...prev, maxGuestQuantityPerBooking: parseInt(v) }))}
          />
        </div>
      </section>

    </div>
  );
}

function Field({ label, value, editMode, onChange, type = 'text', placeholder }) {
  return (
    <div className={styles.fieldItem}>
      <label className={styles.fieldLabel}>{label}</label>
      {editMode ? (
        <input
          type={type}
          className={styles.fieldInput}
          value={value ?? ''}
          placeholder={placeholder ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <div className={styles.fieldValue}>
          {value || <span className={styles.fieldEmpty}>Not set</span>}
        </div>
      )}
    </div>
  );
}
