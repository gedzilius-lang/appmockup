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
