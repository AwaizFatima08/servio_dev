// web/src/pages/shared/ContactUsPage.jsx
// Screen 19 — Contact Us (All roles — read-only)
// Shows support contacts from appSettings.
// Employees see this to know who to call. Admin edits values in App Settings.

import { useState, useEffect, useCallback } from 'react';
import { getAppSettings } from '../../services/appSettingsService';
import styles from './ContactUsPage.module.css';

export default function ContactUsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const s = await getAppSettings();
      setSettings(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Contact Us</h1>
          <p className={styles.subtitle}>Support contacts for FFL Management Club</p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Support Contacts</h2>
        <p className={styles.sectionNote}>
          Reach out to the club management team for any queries or assistance.
        </p>
        <div className={styles.fieldGrid}>
          <ContactRow label="Manager Name"  value={settings?.managerName} />
          <ContactRow label="Manager Phone" value={settings?.managerPhone} />
          <ContactRow label="Support Email" value={settings?.supportEmail} />
          <ContactRow label="Support Phone" value={settings?.supportPhone} />
        </div>
      </section>
    </div>
  );
}

function ContactRow({ label, value }) {
  return (
    <div className={styles.fieldItem}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.fieldValue}>
        {value || <span className={styles.fieldEmpty}>Not set</span>}
      </div>
    </div>
  );
}
