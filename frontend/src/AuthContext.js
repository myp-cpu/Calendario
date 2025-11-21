import React, { createContext, useContext, useState, useEffect } from "react";
import { login as requestLogin, fetchCurrentUser } from "@/services/authService";

const AuthContext = createContext();
const TOKEN_KEY = "registro_token";
const USER_KEY = "registro_user";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const isLoggingInRef = React.useRef(false);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        setUser(null);
        localStorage.removeItem(USER_KEY);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const currentUser = await fetchCurrentUser(token);
        if (!isMounted) return;
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch (error) {
        console.error("Error verifying token:", error);
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async ({ email }) => {
    // Prevent concurrent login calls
    if (isLoggingInRef.current) {
      return { success: false, error: "Login already in progress" };
    }

    isLoggingInRef.current = true;
    try {
      const data = await requestLogin({ email });
      const { access_token, user: userData } = data;

      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);

      isLoggingInRef.current = false;
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      isLoggingInRef.current = false;
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token && user),
    role: user?.role ?? null,
    isEditor: user?.role === "editor",
    isViewer: user?.role === "viewer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
