"use client";
import { useEffect, useState, useRef } from "react";

const API_BASE = "/api";

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
  const [inventory, setInventory] = useState([]);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("alerts");
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  }

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    try {
      const [logsData, invData] = await Promise.all([
        apiFetch(`/logs/${venueId}`),
        apiFetch(`/inventory/${venueId}`),
      ]);
      const alerts = logsData.filter(x => x.type === "LOW_STOCK");
      if (alerts.length > prevCountRef.current && prevCountRef.current > 0) {
        setNewCount(alerts.length - prevCountRef.current);
        setTimeout(() => setNewCount(0), 5000);
      }
      prevCountRef.current = alerts.length;
      setLogs(alerts);
      setInventory(invData);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Failed to load");
    }
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
            Runner
            {newCount > 0 && (
              <span className="pulse-neon" style={{
                display: "inline-block", marginLeft: "0.5rem",
                background: "#ef444430", color: "#ef4444",
                fontSize: "0.7rem", padding: "0.15rem 0.5rem",
                borderRadius: "9999px", border: "1px solid #ef444450",
                verticalAlign: "middle",
              }}>+{newCount} new</span>
            )}
          </h1>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>
            Polling every 5s
          </div>
        </div>
        <button onClick={() => { window.location.href = "/ops"; }} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
      </div>

      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
        {[["alerts", `Alerts (${logs.length})`], ["stock", "All Stock"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="btn-press"
            style={{
              padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: 700,
              background: tab === key ? "#a855f7" : "#14141f",
              color: tab === key ? "#fff" : "#94a3b8",
              border: `1px solid ${tab === key ? "#a855f7" : "#1e1e2e"}`,
              borderRadius: "0.5rem",
            }}
          >{label}</button>
        ))}
      </div>

      {/* Alerts Tab */}
      {tab === "alerts" && (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {logs.map(l => {
            const qty = l.payload?.qty ?? 0;
            const threshold = l.payload?.low_threshold ?? 5;
            const isCritical = qty <= 0;
            const borderColor = isCritical ? "#ef4444" : "#f97316";
            return (
              <div key={l.id} className="card" style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{l.payload?.item || "Item"}</div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem", fontSize: "0.8rem" }}>
                      <span style={{ color: isCritical ? "#ef4444" : "#f97316", fontWeight: 700 }}>Qty: {qty}</span>
                      <span style={{ color: "#64748b" }}>Threshold: {threshold}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap" }}>{timeAgo(l.created_at)}</div>
                </div>
                {isCritical && (
                  <div style={{ marginTop: "0.5rem" }}><span className="tag tag-red">OUT OF STOCK</span></div>
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
      )}

      {/* All Stock Tab */}
      {tab === "stock" && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {inventory.map(item => {
            const max = item.max_qty || item.qty;
            const pct = max > 0 ? Math.min(100, Math.round((item.qty / max) * 100)) : 0;
            const isLow = item.qty <= item.low_threshold;
            const isEmpty = item.qty <= 0;
            const barColor = isEmpty ? "#ef4444" : isLow ? "#f97316" : "#a855f7";

            return (
              <div key={item.id} className="card" style={{ padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.item}</span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    <span style={{ fontWeight: 700, color: isEmpty ? "#ef4444" : isLow ? "#f97316" : "#e2e8f0" }}>
                      {item.qty}
                    </span>
                    {" / "}{max}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{
                  height: "0.5rem", borderRadius: "0.25rem",
                  background: "#0a0a0f", overflow: "hidden",
                  position: "relative",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "0.25rem",
                    width: `${pct}%`, background: barColor,
                    transition: "width 0.3s ease",
                  }} />
                  {/* Threshold marker */}
                  {max > 0 && (
                    <div style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${Math.round((item.low_threshold / max) * 100)}%`,
                      width: "1px", background: "#f9731680",
                    }} />
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem", fontSize: "0.65rem", color: "#64748b" }}>
                  <span>Threshold: {item.low_threshold}</span>
                  <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
                </div>
              </div>
            );
          })}
          {inventory.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
              No inventory items.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
