import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, initializing } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to login';
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
      <div className="auth-frame">
        <header className="auth-topbar">
          <div className="brand-lockup">
            <span className="brand-mark" />
            <div>
              <p className="muted">IEEE-HKN</p>
              <strong>Budget HQ</strong>
            </div>
          </div>
          <p className="topbar-tagline">Treasury access for chapter leadership</p>
        </header>

        <div className="auth-layout">
          <section className="auth-hero-panel card--glass">
            <div className="brand-pill">IEEE-HKN</div>
            <h1>Finance made friendly.</h1>
            <p className="muted">
              Track live balances, prep grant packets, and brief your chapter board with confidence—all from a single, secure
              workspace.
            </p>

            <div className="auth-hero-metrics">
              <article>
                <p className="muted">Next grant</p>
                <h3>Mini-Grant window</h3>
                <p className="tiny">Due in 8 days · $7,500</p>
              </article>
              <article>
                <p className="muted">Budget health</p>
                <h3>92% aligned</h3>
                <p className="tiny">Auto-syncs nightly with projections</p>
              </article>
            </div>
          </section>

          <section className="auth-form-panel card">
            <div className="form-header">
              <p className="pill pill--soft">Secure portal</p>
              <h2>Welcome back, treasurer</h2>
              <p className="muted">Sign in to continue planning your academic year budget.</p>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <form className="stack" onSubmit={handleSubmit}>
              <label>
                Username
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  placeholder="finance-chair"
                />
              </label>
              <label className="password-field">
                Password
                <div className="input-with-addon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
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
              <div className="form-utility-row">
                <label className="checkbox-pill">
                  <input type="checkbox" />
                  <span>Remember me for 30 days</span>
                </label>
                <button type="button" className="ghost-link">
                  Forgot password?
                </button>
              </div>
              <button className="primary block" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-footer">
              <p className="muted">
                Need an account? <Link to="/register">Create one</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
