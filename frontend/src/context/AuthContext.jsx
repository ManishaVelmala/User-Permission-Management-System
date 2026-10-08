import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount and fetch current user with permissions
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me/');
          const userData = res.data;
          setUser(userData);
          setPermissions(userData.permissions || []);
        } catch {
          // Token invalid or expired
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
          setPermissions([]);
        }
      } else {
        setUser(null);
        setPermissions([]);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/login/', { email, password });
    const { access, refresh, user: userData } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(userData);
    setPermissions(userData.permissions || []);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setPermissions([]);
  };

  /**
   * Reusable helper to check if the authenticated user has a specific permission code.
   * Case-insensitive matching.
   *
   * @param {string} permissionCode - e.g. "CREATE_EMPLOYEE"
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (permissionCode) => {
      if (!permissionCode || !permissions) return false;
      const normalized = String(permissionCode).trim().toUpperCase();
      return permissions.some((code) => String(code).trim().toUpperCase() === normalized);
    },
    [permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
