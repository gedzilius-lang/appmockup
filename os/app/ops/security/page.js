"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

const TYPE_COLORS = {
  SELL: { bg: "#06b6d420", color: "#06b6d4", border: "#06b6d440" },
  LOW_STOCK: { bg: "#f9731620", color: "#f97316", border: "#f9731640" },
  INCIDENT: { bg: "#ef444420", color: "#ef4444", border: "#ef444440" },
  CHECK_IN: { bg: "#22c55e20", color: "#22c55e", border: "#22c55e40" },
  QUEST_COMPLETE: { bg: "#a855f720", color: "#a855f7", border: "#a855f740" },
  ORDER_UNDO: { bg: "#f9731620", color: "#f97316", border: "#f9731640" },
  RULE_TRIGGERED: { bg: "#06b6d420", color: "#06b6d4", border: "#06b6d440" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPayload(payload) {
  if (!payload) return "";
  if (payload.text) return payload.text;
  if (payload.item) return `${payload.item} (qty: ${payload.qty ?? payload.qty_after ?? "?"})`;
  if (payload.order_id) return `Order #${payload.order_id} - Total: ${payload.total}`;
  return JSON.stringify(payload);
}

export default function SecurityPage() {
  const [logs, setLogs] = useState([]);
  const [incident, setIncident] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    const res = await fetch(`${API_BASE}/logs/${venueId}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (!res.ok) return setStatus(j.error || "Failed to load logs");
    setLogs(j);
    setStatus("");
  }

  async function addIncident() {
    if (!token || !venueId || !incident.trim()) return;
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
    if (!res.ok) { showToast(j.error || "Failed to submit", "error"); return; }
    setIncident("");
    showToast("Incident logged", "success");
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Security</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={load} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Refresh</button>
          <button onClick={() => { window.location.href = "/ops"; }} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
        </div>
      </div>

      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      {/* Incident form */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700 }}>Log Incident</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <textarea
            value={incident}
            onChange={e => setIncident(e.target.value)}
            placeholder="Describe the incident..."
            rows={2}
            style={{ flex: 1, resize: "vertical" }}
          />
          <button className="btn-danger" onClick={addIncident} style={{ alignSelf: "flex-end" }}>Submit</button>
        </div>
      </div>

      {/* Timeline */}
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>Activity Log</h2>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {logs.slice(0, 50).map(l => {
          const tc = TYPE_COLORS[l.type] || { bg: "#14141f", color: "#64748b", border: "#1e1e2e" };
          return (
            <div key={l.id} className="card" style={{ padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    background: tc.bg,
                    color: tc.color,
                    border: `1px solid ${tc.border}`,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {l.type}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                    {formatPayload(l.payload)}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>
                  {timeAgo(l.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && !status && (
          <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
            No activity logs yet.
          </div>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </main>
  );
}
