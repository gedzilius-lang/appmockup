"use client";
import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RunnerPage() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/logs/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load logs");
    const alerts = j.filter(x => x.type === "LOW_STOCK");
    if (alerts.length > prevCountRef.current && prevCountRef.current > 0) {
      setNewCount(alerts.length - prevCountRef.current);
      setTimeout(() => setNewCount(0), 5000);
    }
    prevCountRef.current = alerts.length;
    setLogs(alerts);
    setStatus("");
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>
            Runner Alerts
            {newCount > 0 && (
              <span className="pulse-neon" style={{
                display: "inline-block",
                marginLeft: "0.5rem",
                background: "#ef444430",
                color: "#ef4444",
                fontSize: "0.7rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                border: "1px solid #ef444450",
                verticalAlign: "middle",
              }}>
                +{newCount} new
              </span>
            )}
          </h1>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>
            Polling every 5s &middot; Low stock alerts
          </div>
        </div>
        <button onClick={() => { window.location.href = "/ops"; }} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
      </div>

      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      <div style={{ display: "grid", gap: "0.6rem" }}>
        {logs.map((l, i) => {
          const qty = l.payload?.qty ?? 0;
          const threshold = l.payload?.low_threshold ?? 5;
          const isCritical = qty <= 0;
          const borderColor = isCritical ? "#ef4444" : "#f97316";

          return (
            <div key={l.id} className="card" style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {l.payload?.item || "Item"}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem", fontSize: "0.8rem" }}>
                    <span style={{ color: isCritical ? "#ef4444" : "#f97316", fontWeight: 700 }}>
                      Qty: {qty}
                    </span>
                    <span style={{ color: "#64748b" }}>Threshold: {threshold}</span>
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap" }}>
                  {timeAgo(l.created_at)}
                </div>
              </div>
              {isCritical && (
                <div style={{ marginTop: "0.5rem" }}>
                  <span className="tag tag-red">OUT OF STOCK</span>
                </div>
              )}
            </div>
          );
        })}
        {logs.length === 0 && !status && (
          <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
            No low stock alerts. All items are stocked.
          </div>
        )}
      </div>
    </main>
  );
}
