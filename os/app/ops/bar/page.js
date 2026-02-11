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
