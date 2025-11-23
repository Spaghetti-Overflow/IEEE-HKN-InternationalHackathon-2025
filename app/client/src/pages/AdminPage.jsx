import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/client.js';
import '../styles/admin.css';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const data = await adminApi.getUsers();
        setUsers(data);
      } else if (activeTab === 'categories') {
        const data = await adminApi.getCategories();
        setCategories(data);
      } else if (activeTab === 'settings') {
        const data = await adminApi.getSettings();
        setSettings(data);
      } else if (activeTab === 'stats') {
        const data = await adminApi.getStats();
        setStats(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await adminApi.updateUser(userId, { role });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminApi.deleteUser(userId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await adminApi.createCategory({
        name: formData.get('name'),
        type: formData.get('type')
      });
      e.target.reset();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Are you sure? This will not delete existing transactions.')) return;
    try {
      await adminApi.deleteCategory(categoryId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const updateSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await adminApi.updateSettings({
        organization_name: formData.get('organization_name'),
        theme: formData.get('theme'),
        primary_color: formData.get('primary_color'),
        logo_url: formData.get('logo_url')
      });
      alert('Settings updated successfully');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="container-xxl">
          <div>
            <h1>
              Admin Panel
              <span className="admin-header-subtitle">System Management & Configuration</span>
            </h1>
          </div>
          <button className="btn btn-outline-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="container-xxl admin-container">
        <nav className="admin-tabs">
          <button
            className={`tab ${activeTab === 'users' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`tab ${activeTab === 'categories' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
        </nav>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="admin-content">
            {activeTab === 'users' && (
              <div className="card">
                <h2>User Management</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Display Name</th>
                        <th>Role</th>
                        <th>OAuth</th>
                        <th>2FA</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>{u.display_name || '—'}</td>
                          <td>
                            <select
                              value={u.role}
                              onChange={(e) => updateUserRole(u.id, e.target.value)}
                              disabled={u.id === user.id}
                            >
                              <option value="member">Member</option>
                              <option value="treasurer">Treasurer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>{u.oauth_provider || '—'}</td>
                          <td>{u.totp_enabled ? 'Yes' : 'No'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteUser(u.id)}
                              disabled={u.id === user.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="card">
                <h2>Category Management</h2>
                <form className="category-form" onSubmit={createCategory}>
                  <input name="name" placeholder="Category name" required />
                  <select name="type" required>
                    <option value="both">Both</option>
                    <option value="income">Income only</option>
                    <option value="expense">Expense only</option>
                  </select>
                  <button type="submit" className="btn btn-primary">Add Category</button>
                </form>
                <ul className="category-list">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <span>
                        <strong>{cat.name}</strong> ({cat.type})
                      </span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteCategory(cat.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="card">
                <h2>Application Settings</h2>
                <form className="settings-form" onSubmit={updateSettings}>
                  <label>
                    Organization Name
                    <input
                      name="organization_name"
                      defaultValue={settings.organization_name || ''}
                      placeholder="IEEE-HKN Chapter"
                    />
                  </label>
                  <label>
                    Theme
                    <select name="theme" defaultValue={settings.theme || 'default'}>
                      <option value="default">Default</option>
                      <option value="dark">Dark</option>
                      <option value="high-contrast">High Contrast</option>
                    </select>
                  </label>
                  <label>
                    Primary Color
                    <input
                      type="color"
                      name="primary_color"
                      defaultValue={settings.primary_color || '#1d4ed8'}
                    />
                  </label>
                  <label>
                    Logo URL
                    <input
                      name="logo_url"
                      type="url"
                      defaultValue={settings.logo_url || ''}
                      placeholder="https://example.com/logo.png"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary">Save Settings</button>
                </form>
              </div>
            )}

            {activeTab === 'stats' && stats && (
              <div className="card">
                <h2>System Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>{stats.users}</h3>
                    <p>Total Users</p>
                  </div>
                  <div className="stat-card">
                    <h3>{stats.budgets}</h3>
                    <p>Total Budgets</p>
                  </div>
                  <div className="stat-card">
                    <h3>{stats.transactions}</h3>
                    <p>Total Transactions</p>
                  </div>
                </div>
                <h3>Role Distribution</h3>
                <ul>
                  {stats.roleDistribution.map((r) => (
                    <li key={r.role}>
                      <strong>{r.role}:</strong> {r.count} users
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
