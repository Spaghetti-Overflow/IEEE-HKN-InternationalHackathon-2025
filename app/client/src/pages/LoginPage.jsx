import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, completeTotpLogin, user, initializing } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [challengeToken, setChallengeToken] = useState(null);
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (!initializing && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_not_configured') {
      setError('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.');
    } else if (errorParam === 'oauth_failed') {
      setError('OAuth authentication failed. Please try again or use username/password.');
    }
  }, [searchParams]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(form);
      if (result?.requiresTotp) {
        setChallengeToken(result.challengeToken);
        setTotpCode('');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await completeTotpLogin({ code: totpCode, challengeToken });
      setChallengeToken(null);
      setTotpCode('');
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid verification code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <main className="auth-screen">
        <section className="card auth-card">
          <p className="muted">Checking your session…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow--primary" />
      <div className="auth-glow auth-glow--secondary" />
      <div className="auth-glow auth-glow--accent" />
      <div className="auth-frame">
        <header className="auth-topbar">
          <div className="brand-lockup">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="white" fillOpacity="0.7"/>
              </svg>
            </span>
            <div>
              <p className="muted brand-subtitle">IEEE-HKN</p>
              <strong className="brand-title">Budget HQ</strong>
            </div>
          </div>
        </header>

        <div className="auth-layout auth-layout--centered">
          <section className="auth-form-panel card">
            <div className="form-header">
              <div className="welcome-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Welcome Back</span>
              </div>
              <h2>Sign in to your account</h2>
              <p className="muted form-subtitle">Continue managing your budgets with ease</p>
            </div>

            {error ? (
              <div className={error.includes('environment variables') || error.includes('not configured') ? 'config-error-box' : 'error-box'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {error.includes('environment variables') || error.includes('not configured') ? (
                    <>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </>
                  ) : (
                    <>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </>
                  )}
                </svg>
                <div>
                  <p className="error-title">
                    {error.includes('environment variables') || error.includes('not configured') ? 'Configuration Required' : 'Error'}
                  </p>
                  <p className="error-message">{error}</p>
                </div>
              </div>
            ) : null}

            {challengeToken ? (
              <form className="stack auth-form" onSubmit={handleTotpSubmit}>
                <div className="security-notice">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <p className="muted">
                    Enter the 6-digit verification code from your authenticator app.
                  </p>
                </div>
                <label>
                  Verification code
                  <input
                    name="totp"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    required
                    autoComplete="one-time-code"
                  />
                </label>
                <div className="form-utility-row">
                  <button
                    type="button"
                    className="ghost-link"
                    onClick={() => {
                      setChallengeToken(null);
                      setTotpCode('');
                      setError(null);
                    }}
                  >
                    ← Back to password
                  </button>
                </div>
                <button className="primary block" type="submit" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify and continue'}
                </button>
              </form>
            ) : (
              <form className="stack auth-form" onSubmit={handleSubmit}>
                <label className="input-label">
                  <span className="label-text">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Username
                  </span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder="Enter your username"
                    className="input-modern"
                  />
                </label>
                <label className="password-field input-label">
                  <span className="label-text">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Password
                  </span>
                  <div className="input-with-addon">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="input-modern"
                    />
                    <button
                      type="button"
                      className="ghost-btn password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <button className="primary block btn-modern" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                      </svg>
                      Sign in
                    </>
                  )}
                </button>
                
                <div className="divider">
                  <span>or continue with</span>
                </div>
                
                <button
                  type="button"
                  className="btn btn-outline-primary block btn-google"
                  onClick={async () => {
                    setError(null);
                    try {
                      // Check if OAuth is configured
                      const response = await fetch('/api/auth/oauth/google/status');
                      const data = await response.json();
                      
                      if (!data.configured) {
                        // OAuth not configured, show error
                        setError(data.message);
                      } else {
                        // OAuth is configured, proceed with redirect
                        window.location.href = '/api/auth/oauth/google?redirect_after=/dashboard';
                      }
                    } catch (err) {
                      console.error('OAuth status check error:', err);
                      // If status check fails, show error
                      setError('Unable to check OAuth configuration. Please try again later.');
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </form>
            )}

            <div className="auth-footer">
              <p className="muted">
                Don't have an account? <Link to="/register" className="link-highlight">Create one</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
