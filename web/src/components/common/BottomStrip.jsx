// ─────────────────────────────────────────
// BottomStrip.jsx — Footer Strip Component
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import styles from './BottomStrip.module.css';

export default function BottomStrip() {
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef(null);

  // Close popup on outside click
  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPopupOpen(false);
      }
    }
    if (popupOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popupOpen]);

  return (
    <footer className={styles.strip}>
      <div className={styles.content}>
        <p className={styles.tagline}>
          <strong>Every meal, every service, every event;</strong> perfectly managed.
        </p>
        <p className={styles.devBy}>
          Developed by <span>HomiLabs</span> · homilabs.org
        </p>
        <p className={styles.mgBy}>
          Managed by <span>Awaiz Fatima</span> · <span>Muhammad Abdulhadi</span> · <span>Parishay Zainab</span>
        </p>
      </div>

      {/* Support icon */}
      <div className={styles.supportWrap} ref={popupRef}>
        <button
          className={styles.supportBtn}
          onClick={() => setPopupOpen(v => !v)}
          aria-label="Contact support"
          title="Support"
        >
          <i className="ti ti-headset" aria-hidden="true" />
        </button>

        {popupOpen && (
          <div className={styles.popup}>
            <div className={styles.popupHead}>
              <i className="ti ti-headset" aria-hidden="true" />
              <span>Support</span>
            </div>
            <div className={styles.popupBody}>
              <div className={styles.popupRow}>
                <i className="ti ti-phone" aria-hidden="true" />
                <div>
                  <div className={styles.popupLabel}>Club Manager</div>
                  <div className={styles.popupValue}>Mr. Qasim Ejaz</div>
                </div>
              </div>
              <div className={styles.popupRow}>
                <i className="ti ti-mail" aria-hidden="true" />
                <div>
                  <div className={styles.popupLabel}>Support Email</div>
                  <div className={styles.popupValue}>support@servio.homilabs.org</div>
                </div>
              </div>
            </div>
            <div className={styles.popupFoot}>
              Servio v1.0 · FFL Management Club
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
