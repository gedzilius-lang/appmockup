"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

function qtyColor(qty, threshold) {
  if (qty <= 0) return "#ef4444";
  if (qty <= threshold) return "#f97316";
  return "#22c55e";
}

export default function BarPage() {
  const [inv, setInv] = useState([]);
  const [status, setStatus] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toast, setToast] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/inventory/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load inventory");
    setInv(j);
    setStatus("");
    setLastRefresh(new Date());
  }

  async function sell(item) {
    if (!token || !venueId) return;
    const res = await fetch(`${API_BASE}/actions/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ venue_id: Number(venueId), item, amount: 1 })
    });
    const j = await res.json();
    if (!res.ok) { showToast(j.error || "Sell failed", "error"); return; }
    showToast(`Sold 1x ${item}`, "success");
    await load();
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Bar</h1>
          {lastRefresh && (
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>
              Auto-refresh 15s &middot; Last: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={load} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Refresh</button>
          <button onClick={() => { window.location.href = "/ops"; }} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
        </div>
      </div>

      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {inv.map(x => (
          <div key={x.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{x.item}</div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: qtyColor(x.qty, x.low_threshold) }}>
                  {x.qty}
                </span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>/ threshold {x.low_threshold}</span>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => sell(x.item)}
              disabled={x.qty <= 0}
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              Sell
            </button>
          </div>
        ))}
        {inv.length === 0 && !status && (
          <div className="card" style={{ color: "#64748b", textAlign: "center", gridColumn: "1 / -1" }}>
            No inventory items. Add items in Admin.
          </div>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </main>
  );
}
