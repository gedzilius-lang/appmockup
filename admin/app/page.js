"use client";
import { useState } from "react";

const API = "https://api.peoplewelike.club";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role: "VENUE_ADMIN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid PIN");
      localStorage.setItem("pwl_admin_token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f" }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "2rem", background: "#14141f", border: "1px solid #1e1e2e", borderRadius: "0.75rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 0, marginBottom: "0.25rem", color: "#a855f7" }}>
          PWL Admin
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
          Enter venue PIN to access dashboard
        </p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            maxLength={8}
            style={{
              padding: "0.85rem",
              background: "#0f0f1a",
              border: "1px solid #1e1e2e",
              borderRadius: "0.5rem",
              color: "#e2e8f0",
              fontSize: "1.5rem",
              fontFamily: "monospace",
              textAlign: "center",
              letterSpacing: "0.5rem",
              outline: "none",
            }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.65rem",
              background: "#a855f7",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
