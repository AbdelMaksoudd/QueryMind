import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  demoLogin as apiDemoLogin,
  getAuthConfig,
  getMe,
  login as apiLogin,
  register as apiRegister,
  tokenStore,
  updateProfile as apiUpdateProfile,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const config = await getAuthConfig();
        if (active) setDemoMode(config.demo_mode);
      } catch {
        // Backend may be offline; the catalog will report its own error.
      }

      if (tokenStore.get()) {
        try {
          const me = await getMe();
          if (active) setUser(me);
        } catch {
          tokenStore.clear();
        }
      }
      if (active) setInitializing(false);
    })();

    const clearOnUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', clearOnUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', clearOnUnauthorized);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      demoMode,
      initializing,
      isAuthenticated: Boolean(user),
      login: async (credentials) => {
        const result = await apiLogin(credentials);
        setUser(result.user);
        return result;
      },
      register: async (payload) => {
        const result = await apiRegister(payload);
        setUser(result.user);
        return result;
      },
      demoLogin: async (userId) => {
        const result = await apiDemoLogin(userId);
        setUser(result.user);
        return result;
      },
      updateProfile: async (payload) => {
        const updated = await apiUpdateProfile(payload);
        setUser(updated);
        return updated;
      },
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
    }),
    [user, demoMode, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
