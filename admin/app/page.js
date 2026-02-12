"use client";
import { useEffect } from "react";
import { useAuth } from "./lib/auth";

export default function AdminRoot() {
  const { token, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (token) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, [ready, token]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="spinner" />
    </div>
  );
}
