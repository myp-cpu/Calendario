import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('registro_token'));

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('registro_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setToken(storedToken);
        } else {
          // Token is invalid
          localStorage.removeItem('registro_token');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('registro_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (email) => {
    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('registro_token', data.access_token);
      setToken(data.access_token);
      
      // Set user data
      setUser({
        email: data.email,
        role: data.role,
        is_active: true
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('registro_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isEditor: user?.role === 'editor',
    isViewer: user?.role === 'viewer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
