import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };
    loadSession();
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data.requiresTotp) {
      return data;
    }
    setUser(data.user);
    return data;
  };

  const completeTotpLogin = async ({ code, challengeToken }) => {
    const { data } = await api.post('/auth/login/totp', { code, challengeToken });
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data;
  };

  const requestTotpSetup = async () => {
    const { data } = await api.post('/auth/totp/setup');
    return data;
  };

  const verifyTotpSetup = async ({ code }) => {
    const { data } = await api.post('/auth/totp/verify', { code });
    setUser(data.user);
    return data;
  };

  const disableTotp = async ({ code }) => {
    const { data } = await api.post('/auth/totp/disable', { code });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    initializing,
    login,
    completeTotpLogin,
    requestTotpSetup,
    verifyTotpSetup,
    disableTotp,
    logout,
    register
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
