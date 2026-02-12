"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [venueId, setVenueId] = useState(null);
  const [guestToken, setGuestToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("pwl_token"));
    setRole(localStorage.getItem("pwl_role"));
    setVenueId(localStorage.getItem("pwl_venue_id"));
    setGuestToken(localStorage.getItem("pwl_guest_token"));
    setReady(true);
  }, []);

  function loginStaff(data) {
    localStorage.setItem("pwl_token", data.token);
    localStorage.setItem("pwl_role", data.role);
    localStorage.setItem("pwl_venue_id", String(data.venue_id));
    setToken(data.token);
    setRole(data.role);
    setVenueId(String(data.venue_id));
  }

  function loginGuest(tkn) {
    localStorage.setItem("pwl_guest_token", tkn);
    setGuestToken(tkn);
  }

  function logout() {
    localStorage.removeItem("pwl_token");
    localStorage.removeItem("pwl_role");
    localStorage.removeItem("pwl_venue_id");
    setToken(null);
    setRole(null);
    setVenueId(null);
  }

  function logoutGuest() {
    localStorage.removeItem("pwl_guest_token");
    setGuestToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, venueId, guestToken, ready, loginStaff, loginGuest, logout, logoutGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
