"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("pwl_admin_token"));
    setReady(true);
  }, []);

  function login(tkn) {
    localStorage.setItem("pwl_admin_token", tkn);
    setToken(tkn);
  }

  function logout() {
    localStorage.removeItem("pwl_admin_token");
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
