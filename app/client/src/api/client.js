import axios from 'axios';

const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || 4000;

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  if (envUrl) {
    try {
      if (typeof window === 'undefined') {
        return envUrl;
      }
      const envHost = new URL(envUrl).hostname;
      const isEnvLocal = envHost === 'localhost' || envHost === '127.0.0.1';
      const isWindowLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (envHost === window.location.hostname || (!isEnvLocal && envHost)) {
        return envUrl;
      }

      if (isEnvLocal && isWindowLocal) {
        return envUrl;
      }
    } catch (error) {
      // Fall back when the env URL cannot be parsed
      return envUrl;
    }
  }

  if (typeof window !== 'undefined') {
    const portSuffix = DEFAULT_API_PORT ? `:${DEFAULT_API_PORT}` : '';
    return `${window.location.protocol}//${window.location.hostname}${portSuffix}`;
  }

  return 'http://localhost:4000';
}

const api = axios.create({
  baseURL: `${resolveApiBaseUrl()}/api`,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    config.headers['X-User-Timezone'] = tz;
  } catch (error) {
    // ignore timezone errors
  }
  return config;
});

export default api;

export async function getExportToken() {
  const response = await api.get('/auth/export-token');
  return response.data.token;
}

// Admin API functions
export const adminApi = {
  async getUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  },
  async updateUser(userId, updates) {
    const response = await api.patch(`/admin/users/${userId}`, updates);
    return response.data;
  },
  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  async getCategories() {
    const response = await api.get('/admin/categories');
    return response.data;
  },
  async createCategory(category) {
    const response = await api.post('/admin/categories', category);
    return response.data;
  },
  async updateCategory(categoryId, updates) {
    const response = await api.patch(`/admin/categories/${categoryId}`, updates);
    return response.data;
  },
  async deleteCategory(categoryId) {
    const response = await api.delete(`/admin/categories/${categoryId}`);
    return response.data;
  },
  async getSettings() {
    const response = await api.get('/admin/settings');
    return response.data;
  },
  async updateSettings(settings) {
    const response = await api.post('/admin/settings', settings);
    return response.data;
  },
  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};
