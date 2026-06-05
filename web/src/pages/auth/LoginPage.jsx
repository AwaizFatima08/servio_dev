// ─────────────────────────────────────────
// LoginPage.jsx — Authentication Screen
// HomiLabs | Servio | Web | Screen 01
// ─────────────────────────────────────────
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { login } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

const VIEWS = { LOGIN: 'login', RESET: 'reset', RESET_SENT: 'reset_sent' };

export default function LoginPage() {
  const navigate = useNavigate();
  // AuthContext owns userProfile exclusively

  const [view, setView] = useState(VIEWS.LOGIN);

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Reset state
  const [resetEmail, setResetEmail]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]   = useState('');

  // ── Login submit ──
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      // AuthContext.onAuthStateChanged fires after Firebase login,
      // fetches profile, and sets userProfile. ProtectedRoute waits
      // for profileLoading before rendering — role routing is safe.
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = err?.code || '';
      const backendMsg = err?.response?.data?.message || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (backendMsg.includes('inactive') || backendMsg.includes('suspended')) {
        setError('Your account is inactive. Please contact your administrator.');
      } else if (backendMsg.includes('pending') || backendMsg.includes('not found')) {
        setError('Your account is pending approval. Please contact your administrator.');
      } else {
        setError('Sign in failed. Please contact your administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password reset submit ──
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your personal email address.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
      setView(VIEWS.RESET_SENT);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setResetError('No account found with this email address.');
      } else if (code === 'auth/too-many-requests') {
        setResetError('Too many attempts. Please wait a moment and try again.');
      } else {
        setResetError('Could not send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ── Reset sent confirmation view ──
  if (view === VIEWS.RESET_SENT) {
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
        <div className={styles.tenantHeader}>
          <div className={styles.tenantBadge}>
            <span className={styles.tenantDot} aria-hidden="true" />
            FFL Management Club
          </div>
        </div>
          <div className={styles.formWrap}>
            <div className={styles.sentIcon}>
              <i className="ti ti-mail-check" aria-hidden="true" />
            </div>
            <h2 className={styles.formTitle}>Check your email</h2>
            <p className={styles.sentText}>
              A password reset link has been sent to{' '}
              <strong>{resetEmail}</strong>.
              Click the link in that email to set a new password.
            </p>
            <p className={styles.sentNote}>
              Did not receive it? Check your spam folder or wait a few minutes.
            </p>
            <button
              className={styles.submitBtn}
              onClick={() => { setView(VIEWS.LOGIN); setResetEmail(''); }}
              style={{ marginTop: 24 }}
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Password reset form view ──
  if (view === VIEWS.RESET) {
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
        <div className={styles.tenantHeader}>
          <div className={styles.tenantBadge}>
            <span className={styles.tenantDot} aria-hidden="true" />
            FFL Management Club
          </div>
        </div>
          <div className={styles.formWrap}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Reset password</h2>
              <p className={styles.formSub}>
                Enter the personal email you used to register.
                We will send you a reset link.
              </p>
            </div>
            <form onSubmit={handleReset} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="resetEmail" className={styles.label}>
                  Personal email address
                </label>
                <div className={styles.inputWrap}>
                  <i className="ti ti-mail" aria-hidden="true" />
                  <input
                    id="resetEmail"
                    type="email"
                    className={styles.input}
                    placeholder="your personal email address"
                    value={resetEmail}
                    onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                    autoComplete="email"
                    autoFocus
                    disabled={resetLoading}
                  />
                </div>
              </div>

              {resetError && (
                <div className={styles.error} role="alert">
                  <i className="ti ti-alert-circle" aria-hidden="true" />
                  <span>{resetError}</span>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={resetLoading}>
                {resetLoading ? (
                  <><span className={styles.spinner} aria-hidden="true" />Sending reset link...</>
                ) : (
                  <><i className="ti ti-send" aria-hidden="true" />Send reset link</>
                )}
              </button>
            </form>

            <p className={styles.signInLink}>
              <button
                className={styles.linkBtn}
                onClick={() => { setView(VIEWS.LOGIN); setResetError(''); }}
              >
                <i className="ti ti-arrow-left" aria-hidden="true" />
                Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main login view ──
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
        <div className={styles.tenantHeader}>
          <div className={styles.tenantBadge}>
            <span className={styles.tenantDot} aria-hidden="true" />
            FFL Management Club
          </div>
        </div>
        <div className={styles.formWrap}>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSub}>Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className={styles.form} noValidate>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <div className={styles.inputWrap}>
                <i className="ti ti-mail" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="your personal email address"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <button
                  type="button"
                  className={styles.forgotBtn}
                  onClick={() => { setView(VIEWS.RESET); setError(''); }}
                >
                  Forgot password?
                </button>
              </div>
              <div className={styles.inputWrap}>
                <i className="ti ti-lock" aria-hidden="true" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
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

            {error && (
              <div className={styles.error} role="alert">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <><span className={styles.spinner} aria-hidden="true" />Signing in...</>
              ) : (
                <><i className="ti ti-login" aria-hidden="true" />Sign in</>
              )}
            </button>

          </form>

          <p className={styles.helpNote}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            Access is restricted to authorised FFL Management Club members.
            Contact your administrator if you need assistance.
          </p>

          <div className={styles.registerRow}>
            <span className={styles.registerText}>New employee?</span>
            <Link to="/register" className={styles.registerLink}>
              <i className="ti ti-user-plus" aria-hidden="true" />
              Register your account
            </Link>
          </div>


        </div>
      </div>
    </div>
  );
}
