import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
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
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="card auth-card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage your chapter budgets.</p>
        {error ? <p className="error-text">{error}</p> : null}
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Username
            <input name="username" value={form.username} onChange={handleChange} required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
