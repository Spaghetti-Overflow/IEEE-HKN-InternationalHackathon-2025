import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, initializing } = useAuth();
  const defaultTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'UTC';
    }
  }, []);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', timezone: defaultTimezone });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to register';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <main className="auth-shell">
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
              <div className="welcome-badge welcome-badge--success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Get Started</span>
              </div>
              <h2>Create your account</h2>
              <p className="muted form-subtitle">Join us and start managing your budgets effectively</p>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

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
                  placeholder="treasurer.jane"
                  className="input-modern"
                />
              </label>
              <label className="input-label">
                <span className="label-text">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Display name
                </span>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  required
                  placeholder="Jane Doe"
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
                    autoComplete="new-password"
                    placeholder="Create a strong password"
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

              <label className="input-label">
                <span className="label-text">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Preferred timezone
                </span>
                <input 
                  name="timezone" 
                  value={form.timezone} 
                  onChange={handleChange} 
                  placeholder="America/New_York" 
                  className="input-modern"
                />
              </label>

              <button className="primary block btn-modern" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    Create account
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              <p className="muted">
                Already have an account? <Link to="/login" className="link-highlight">Sign in</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
