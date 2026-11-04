import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize synchronously from localStorage so F5 does NOT cause logout or flicker
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  // If we already have stored credentials, don't block the UI with loading=true
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateToken = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data.data;
      setUser(freshUser);
      setToken(storedToken);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch (error) {
      console.warn('Token validation warning:', error?.response?.status || error.message);
      // ONLY log out if backend explicitly responds with 401 Unauthorized (token expired/invalid)
      // Do NOT log out on network errors, timeouts, 500 errors, or cold start delays!
      if (error?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      // Silently refresh full permissions in background
      try {
        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        if (meRes.data?.data) {
          setUser(meRes.data.data);
          localStorage.setItem('user', JSON.stringify(meRes.data.data));
        }
      } catch (e) {
        console.warn('Could not fetch extra me data right after login:', e.message);
      }

      toast.success('Đăng nhập thành công!');
      navigate('/');
      return true;
    } catch (error) {
      toast.error(error.message || 'Đăng nhập thất bại.');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Đổi mật khẩu thành công!');
      return true;
    } catch (error) {
      toast.error(error.message || 'Đổi mật khẩu thất bại.');
      throw error;
    }
  };

  const can = (permission) => {
    if (!user) return false;
    // Super admin has full access to everything
    if (user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    changePassword,
    can
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};