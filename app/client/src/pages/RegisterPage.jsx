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
      <div className="auth-frame">
        <header className="auth-topbar">
          <div className="brand-lockup">
            <span className="brand-mark" />
            <div>
              <p className="muted">IEEE-HKN</p>
              <strong>Budget HQ</strong>
            </div>
          </div>
          <p className="topbar-tagline">Empower your chapter’s financial playbook</p>
        </header>

        <div className="auth-layout register-layout">
          <section className="auth-hero-panel card--glass">
            <div className="brand-pill">New members</div>
            <h1>Launch your finance HQ.</h1>
            <p className="muted">
              Bring budgets, grants, receipts, and timelines together. Create your workspace and invite your fellow officers in
              minutes.
            </p>

            <ul className="auth-highlights">
              <li>
                <span className="highlight-icon">📊</span>
                Unified analytics + projections
              </li>
              <li>
                <span className="highlight-icon">🧾</span>
                Smart receipt vault with one-click exports
              </li>
              <li>
                <span className="highlight-icon">🚀</span>
                Ready for mini-grants, fundraising, and outreach
              </li>
            </ul>

            <div className="auth-stats">
              <article className="stat-card">
                <p className="stat-label">Setup time</p>
                <p className="stat-value">&lt; 3 min</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Chapters onboard</p>
                <p className="stat-value">320+</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Confidence boost</p>
                <p className="stat-value">98%</p>
              </article>
            </div>
          </section>

          <section className="auth-form-panel card">
            <div className="form-header">
              <p className="pill pill--soft">Create workspace</p>
              <h2>Tell us about your chapter</h2>
              <p className="muted">We’ll personalize dashboards to your timezone and leadership style.</p>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <form className="stack register-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Username
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder="treasurer.jane"
                  />
                </label>
                <label>
                  Display name
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    required
                    placeholder="Jane Doe"
                  />
                </label>
              </div>

              <label className="password-field">
                Password
                <div className="input-with-addon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label>
                Preferred timezone
                <input name="timezone" value={form.timezone} onChange={handleChange} placeholder="America/New_York" />
              </label>

              <div className="onboarding-hints">
                <p className="muted">You can invite additional officers from the dashboard after onboarding.</p>
                <p className="muted">Need help? We’ll guide you through budgets, events, and deadline tracking.</p>
              </div>

              <button className="primary block" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>

            <div className="auth-footer">
              <p className="muted">
                Already registered? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
