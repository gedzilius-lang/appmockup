"use client";
import { useState, useEffect } from "react";

// Vendor portal login + dashboard entry
export default function VendorPortalPage() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("pwl_vendor_token"));
    setReady(true);
  }, []);

  if (!ready) return null;

  if (token) {
    window.location.href = "/vendor/profile";
    return null;
  }

  return <VendorLogin onLogin={setToken} />;
}

function VendorLogin({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Login failed");
      if (data.role !== "VENDOR") throw new Error("This portal is for vendors only");
      localStorage.setItem("pwl_vendor_token", data.token);
      onLogin(data.token);
      window.location.href = "/vendor/profile";
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 400, margin: "4rem auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          <span style={{ color: "#a855f7" }}>Vendor</span> Portal
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Sign in to manage your storefront</p>
      </div>
      <div className="card" style={{ padding: "1.5rem" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "0.35rem" }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="hello@yourbrand.com" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "0.35rem" }}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required style={{ width: "100%" }} />
          </div>
          {error && <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: "0.5rem", padding: "0.6rem 0.9rem", color: "#ef4444", fontSize: "0.85rem" }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
        </form>
      </div>
      <p style={{ textAlign: "center", marginTop: "1.25rem", color: "#64748b", fontSize: "0.8rem" }}>
        Not a vendor yet? <a href="/apply">Apply here</a>
      </p>
    </main>
  );
}
