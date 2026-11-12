import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("current_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem("current_user", JSON.stringify(profile));
        } catch (err) {
          console.error("Auth check failed:", err);
          api.clearTokens();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const refreshUserProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
      localStorage.setItem("current_user", JSON.stringify(profile));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role,
        isAdmin: user?.role === "admin",
        isAnalyst: user?.role === "security_analyst" || user?.role === "admin",
        isEmployee: user?.role === "employee",
        login,
        logout,
        refreshUserProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
