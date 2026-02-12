"use client";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

const ROLES = [
  { value: "BAR", label: "Bar", desc: "Sell items, manage inventory", color: "#06b6d4" },
  { value: "RUNNER", label: "Runner", desc: "Low stock alerts, restocking", color: "#f97316" },
  { value: "SECURITY", label: "Security", desc: "Log incidents, view activity", color: "#ec4899" },
];

export default function OpsLogin() {
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("BAR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role })
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Login failed"); return; }

      localStorage.setItem("pwl_token", j.token);
      localStorage.setItem("pwl_role", j.role);
      localStorage.setItem("pwl_venue_id", String(j.venue_id));

      if (role === "BAR") window.location.href = "/ops/bar";
      else if (role === "RUNNER") window.location.href = "/ops/runner";
      else if (role === "SECURITY") window.location.href = "/ops/security";
      else window.location.href = "/";
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("pwl_token");
    localStorage.removeItem("pwl_role");
    localStorage.removeItem("pwl_venue_id");
    setError("");
    setPin("");
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Ops Login</h1>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.35rem" }}>
          Staff login with venue PIN
        </p>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        {/* Role selection as cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              style={{
                background: role === r.value ? `${r.color}15` : "#0f0f1a",
                border: `1px solid ${role === r.value ? r.color : "#1e1e2e"}`,
                borderRadius: "0.5rem",
                padding: "0.75rem 0.5rem",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: role === r.value ? r.color : "#e2e8f0" }}>
                {r.label}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.2rem" }}>{r.desc}</div>
            </button>
          ))}
        </div>

        {/* PIN input */}
        <input
          type="password"
          placeholder="Venue PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          style={{
            width: "100%",
            fontSize: "1.5rem",
            fontFamily: "monospace",
            textAlign: "center",
            letterSpacing: "0.15em",
            padding: "0.75rem",
            marginBottom: "0.75rem",
          }}
        />

        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 0.75rem", textAlign: "center" }}>{error}</p>}

        <button
          className="btn-primary"
          onClick={login}
          disabled={!pin || loading}
          style={{ width: "100%", padding: "0.65rem" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <button
          onClick={logout}
          style={{ width: "100%", marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b", background: "transparent", border: "none" }}
        >
          Clear Session
        </button>
      </div>
    </main>
  );
}
