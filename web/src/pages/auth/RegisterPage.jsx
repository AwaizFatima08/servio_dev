// ─────────────────────────────────────────
// RegisterPage.jsx — Employee Registration
// HomiLabs | Servio | Web | Screen 01B
// ─────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import axios from 'axios';
import styles from './RegisterPage.module.css';

const API_BASE = 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api';

const STEPS = { FORM: 'form', PENDING: 'pending' };

export default function RegisterPage() {
  const [step, setStep]       = useState(STEPS.FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    officialEmployeeNumber: '',
    cnicLast4: '',
    dateOfBirth: '',
    personalEmail: '',
    password: '',
    confirmPassword: '',
  });

  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!form.officialEmployeeNumber.trim()) return 'Employee number is required.';
    if (!form.cnicLast4.trim() || form.cnicLast4.trim().length !== 4) return 'Enter the last 4 digits of your CNIC.';
    if (!/^\d{4}$/.test(form.cnicLast4.trim())) return 'CNIC last 4 must be digits only.';
    if (!form.dateOfBirth) return 'Date of birth is required.';
    if (!form.personalEmail.trim()) return 'Personal email is required.';
    if (!form.personalEmail.includes('@')) return 'Enter a valid email address.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    let firebaseUser = null;

    try {
      // Step 1 — Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.personalEmail.trim().toLowerCase(),
        form.password,
      );
      firebaseUser = credential.user;

      // Step 2 — Register with backend
      await axios.post(`${API_BASE}/auth/register`, {
        uid: firebaseUser.uid,
        officialEmployeeNumber: form.officialEmployeeNumber.trim().toUpperCase().replace(/-/g, ''),
        cnicLast4: form.cnicLast4.trim(),
        dateOfBirth: form.dateOfBirth,
        personalEmail: form.personalEmail.trim().toLowerCase(),
      });

      // Step 3 — Show pending screen
      setStep(STEPS.PENDING);

    } catch (err) {
      // If backend fails after Firebase account created,
      // the Firebase account exists but registration failed.
      // User can try again — backend will handle duplicate uid gracefully.
      const code = err?.code || '';
      const backendMsg = err?.response?.data?.message || '';

      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (backendMsg.includes('employee_not_found') || backendMsg.includes('not found')) {
        setError('Employee number not found. Please check your details or contact your administrator.');
      } else if (backendMsg.includes('cnic_mismatch')) {
        setError('CNIC digits do not match our records. Please check and try again.');
      } else if (backendMsg.includes('dob_mismatch')) {
        setError('Date of birth does not match our records. Please check and try again.');
      } else if (backendMsg.includes('account_exists') || backendMsg.includes('already')) {
        setError('A registration already exists for this employee number. Please sign in or contact your administrator.');
      } else if (backendMsg.includes('throttle') || backendMsg.includes('isThrottled')) {
        setError('Too many failed attempts. Your account has been temporarily locked. Contact your administrator.');
      } else {
        setError('Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pending approval screen ──
  if (step === STEPS.PENDING) {
    return (
      <div className={styles.page}>
        <div className={styles.pendingWrap}>
          <div className={styles.pendingIcon}>
            <i className="ti ti-clock-check" aria-hidden="true" />
          </div>
          <h2 className={styles.pendingTitle}>Registration submitted</h2>
          <p className={styles.pendingText}>
            Your registration request has been received and is pending administrator approval.
            You will be able to sign in once your account is approved.
          </p>
          <div className={styles.pendingNote}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <span>
              If you need urgent access, contact the club administrator or
              Senior Executive Club at the FFL Management Club.
            </span>
          </div>
          <Link to="/login" className={styles.backBtn}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftInner}>
          <img src="/logo-mark.png" alt="Servio" className={styles.mark} />
          <h1 className={styles.wordmark}>Servio</h1>
          <p className={styles.subtitle}>HOSPITALITY MANAGEMENT</p>
          <div className={styles.divider} />
          <p className={styles.tagline}>
            Every meal, every service, every event; perfectly managed.
          </p>
          <p className={styles.maker}>homilabs.org</p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formWrap}>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Create account</h2>
            <p className={styles.formSub}>Register using your FFL employee details</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>

            {/* Employee Number */}
            <div className={styles.field}>
              <label htmlFor="officialEmployeeNumber" className={styles.label}>
                Employee Number
              </label>
              <div className={styles.inputWrap}>
                <i className="ti ti-id-badge" aria-hidden="true" />
                <input
                  id="officialEmployeeNumber"
                  name="officialEmployeeNumber"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. FFL00001"
                  value={form.officialEmployeeNumber}
                  onChange={handleChange}
                  autoComplete="off"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Two column row — CNIC + DOB */}
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label htmlFor="cnicLast4" className={styles.label}>
                  CNIC Last 4 Digits
                </label>
                <div className={styles.inputWrap}>
                  <i className="ti ti-credit-card" aria-hidden="true" />
                  <input
                    id="cnicLast4"
                    name="cnicLast4"
                    type="text"
                    maxLength={4}
                    className={styles.input}
                    placeholder="e.g. 4521"
                    value={form.cnicLast4}
                    onChange={handleChange}
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="dateOfBirth" className={styles.label}>
                  Date of Birth
                </label>
                <div className={styles.inputWrap}>
                  <i className="ti ti-calendar" aria-hidden="true" />
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    className={`${styles.input} ${styles.dateInput}`}
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Personal Email */}
            <div className={styles.field}>
              <label htmlFor="personalEmail" className={styles.label}>
                Personal Email
              </label>
              <div className={styles.inputWrap}>
                <i className="ti ti-mail" aria-hidden="true" />
                <input
                  id="personalEmail"
                  name="personalEmail"
                  type="email"
                  className={styles.input}
                  placeholder="your personal email address"
                  value={form.personalEmail}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrap}>
                <i className="ti ti-lock" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.togglePass}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <div className={styles.inputWrap}>
                <i className="ti ti-lock-check" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.togglePass}
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <i className={`ti ${showConfirm ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.error} role="alert">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Submitting registration...
                </>
              ) : (
                <>
                  <i className="ti ti-user-plus" aria-hidden="true" />
                  Register
                </>
              )}
            </button>

          </form>

          <p className={styles.signInLink}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
