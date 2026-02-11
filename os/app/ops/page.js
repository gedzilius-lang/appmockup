"use client";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function OpsLogin() {
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("BAR");
  const [status, setStatus] = useState("");

  async function login() {
    setStatus("Signing in...");
    const res = await fetch(`${API_BASE}/auth/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, role })
    });
    const j = await res.json();
    if (!res.ok) {
      setStatus(j.error || "Failed");
      return;
    }
    localStorage.setItem("pwl_token", j.token);
    localStorage.setItem("pwl_role", j.role);
    localStorage.setItem("pwl_venue_id", String(j.venue_id));

    // redirect by role
    if (role === "BAR") window.location.href = "/ops/bar";
    else if (role === "RUNNER") window.location.href = "/ops/runner";
    else if (role === "SECURITY") window.location.href = "/ops/security";
    else window.location.href = "/";
  }

  function logout() {
    localStorage.removeItem("pwl_token");
    localStorage.removeItem("pwl_role");
    localStorage.removeItem("pwl_venue_id");
    setStatus("Logged out");
  }

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Ops Login</h1>
      <p style={{ opacity: .8 }}>Staff/operations login using venue PIN (Phase 1.1).</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Venue PIN" value={pin} onChange={e=>setPin(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="BAR">BAR</option>
          <option value="RUNNER">RUNNER</option>
          <option value="SECURITY">SECURITY</option>
        </select>
        <button onClick={login}>Sign in</button>
        <button onClick={logout}>Clear session</button>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      <hr style={{ margin: "16px 0" }} />
      <p style={{ opacity: .8 }}>
        Admin creates venues & sets PINs at <a href="https://admin.peoplewelike.club" target="_blank">admin.peoplewelike.club</a>.
      </p>
    </main>
  );
}
