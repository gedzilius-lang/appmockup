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
