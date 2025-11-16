import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
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

  return (
    <main className="auth-screen">
      <section className="card auth-card">
        <h1>Create your workspace</h1>
        <p className="muted">Set up an account for your chapter finance team.</p>
        {error ? <p className="error-text">{error}</p> : null}
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Username
            <input name="username" value={form.username} onChange={handleChange} required autoComplete="username" />
          </label>
          <label>
            Display name
            <input name="displayName" value={form.displayName} onChange={handleChange} required />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Preferred timezone
            <input name="timezone" value={form.timezone} onChange={handleChange} />
          </label>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
