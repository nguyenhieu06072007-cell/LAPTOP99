import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const validateToken = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      setToken(storedToken);
    } catch (error) {
      console.error('Token validation failed', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      
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
    if (!user || !user.permissions) return false;
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
