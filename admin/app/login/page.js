"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
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
      <div style={{ width: "100%", maxWidth: 400, padding: "2rem", background: "#14141f", border: "1px solid #1e1e2e", borderRadius: "0.75rem", boxShadow: "0 0 40px #a855f710" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, textAlign: "center", marginTop: 0, marginBottom: "0.25rem", color: "#a855f7" }}>
          PWL Admin
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", marginBottom: "1.5rem" }}>
          Sign in to manage venues
        </p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
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
              transition: "background 0.15s, transform 0.1s, box-shadow 0.15s",
              boxShadow: "0 0 12px #a855f730",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "0.6rem 0.75rem",
  background: "#0f0f1a",
  border: "1px solid #1e1e2e",
  borderRadius: "0.5rem",
  color: "#e2e8f0",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};
