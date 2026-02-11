#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/pwl-os/os/app"
mkdir -p "$BASE/ops" "$BASE/ops/bar" "$BASE/ops/runner" "$BASE/ops/security"

# Update layout to add Ops link
LAYOUT="/opt/pwl-os/os/app/layout.js"
if ! grep -q 'href="/ops"' "$LAYOUT"; then
  perl -i -pe 's#<a href="/radio">Radio</a>#<a href="/radio">Radio</a>\n            <a href="/ops">Ops</a>#' "$LAYOUT"
fi

# Shared client helper (inline in each page to keep it simple)

# /ops login page
cat > "$BASE/ops/page.js" <<'PAGE'
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
PAGE

# /ops/bar
cat > "$BASE/ops/bar/page.js" <<'PAGE'
"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function BarPage() {
  const [inv, setInv] = useState([]);
  const [status, setStatus] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/inventory/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load inventory");
    setInv(j);
    setStatus("");
  }

  async function sell(item) {
    if (!token || !venueId) return;
    const res = await fetch(`${API_BASE}/actions/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ venue_id: Number(venueId), item, amount: 1 })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Sell failed");
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Bar</h1>
      <p style={{ opacity: .8 }}>Sell items and reduce inventory (Phase 1.1).</p>
      {status ? <p>{status}</p> : null}
      <button onClick={load}>Refresh</button>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {inv.map(x => (
          <div key={x.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{x.item}</div>
              <div style={{ opacity: .8 }}>Qty: {x.qty} • Low threshold: {x.low_threshold}</div>
            </div>
            <button onClick={() => sell(x.item)}>Sell 1</button>
          </div>
        ))}
        {inv.length === 0 ? <div>No inventory yet. Add items in Admin.</div> : null}
      </div>
    </main>
  );
}
PAGE

# /ops/runner (poll logs)
cat > "$BASE/ops/runner/page.js" <<'PAGE'
"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function RunnerPage() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/logs/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load logs");
    setLogs(j.filter(x => x.type === "LOW_STOCK"));
    setStatus("");
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Runner Alerts</h1>
      <p style={{ opacity: .8 }}>Low stock alerts (polling every 5s).</p>
      {status ? <p>{status}</p> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {logs.map(l => (
          <div key={l.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>{l.payload?.item || "Item"}</div>
            <div style={{ opacity: .8 }}>
              Qty: {l.payload?.qty} • Threshold: {l.payload?.low_threshold} • {new Date(l.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {logs.length === 0 ? <div>No low stock alerts yet.</div> : null}
      </div>
    </main>
  );
}
PAGE

# /ops/security (add incident log + view recent logs)
cat > "$BASE/ops/security/page.js" <<'PAGE'
"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function SecurityPage() {
  const [logs, setLogs] = useState([]);
  const [incident, setIncident] = useState("Noise complaint at entrance");
  const [status, setStatus] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/logs/${venueId}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load logs");
    setLogs(j);
    setStatus("");
  }

  async function addIncident() {
    if (!token || !venueId) return;
    const res = await fetch(`${API_BASE}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        venue_id: Number(venueId),
        type: "INCIDENT",
        payload: { text: incident }
      })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Failed");
    setIncident("");
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Security</h1>
      <p style={{ opacity: .8 }}>Manual incidents + recent activity.</p>
      {status ? <p>{status}</p> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Log incident</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ minWidth: 320 }} value={incident} onChange={e=>setIncident(e.target.value)} />
          <button onClick={addIncident}>Submit</button>
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {logs.slice(0,50).map(l => (
          <div key={l.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>{l.type}</div>
            <div style={{ opacity: .8 }}>{new Date(l.created_at).toLocaleString()}</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(l.payload, null, 2)}</pre>
          </div>
        ))}
      </div>
    </main>
  );
}
PAGE

# Expose API base to client
cat > /opt/pwl-os/os/next.config.js <<'CFG'
module.exports = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL
  }
};
CFG

echo "✅ OS: added /ops pages (login + bar/runner/security)."
