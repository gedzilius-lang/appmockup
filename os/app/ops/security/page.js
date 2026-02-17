"use client";
import { useEffect, useState } from "react";

const API_BASE = "/api";

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
  // Top-up state
  const [topupUid, setTopupUid] = useState("");
  const [topupSessionId, setTopupSessionId] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

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

  async function topUp() {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) { showToast("Enter a valid amount", "error"); return; }
    if (!topupUid.trim() && !topupSessionId.trim()) { showToast("Enter UID tag or Session ID", "error"); return; }
    setTopupLoading(true);
    try {
      const body = { amount: amt };
      if (topupSessionId.trim()) body.session_id = Number(topupSessionId);
      else if (topupUid.trim()) body.uid_tag = topupUid.trim();
      const res = await fetch(`${API_BASE}/wallet/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) { showToast(j.error || "Top-up failed", "error"); return; }
      showToast(`+${amt} NC added. New balance: ${j.new_balance} NC`, "success");
      setTopupAmount("");
      setTopupUid("");
      setTopupSessionId("");
      await load();
    } catch { showToast("Network error", "error"); }
    finally { setTopupLoading(false); }
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

      {/* Wallet Top-up */}
      <div className="card" style={{
        marginBottom: "1.25rem",
        border: "1px solid #a855f730",
        boxShadow: "0 0 12px #a855f710",
      }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700, color: "#a855f7" }}>
          Top Up Wallet
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            placeholder="UID tag"
            value={topupUid}
            onChange={e => setTopupUid(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.65rem" }}
          />
          <input
            placeholder="Session ID"
            value={topupSessionId}
            onChange={e => setTopupSessionId(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.65rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            placeholder="Amount (NC)"
            min="1"
            value={topupAmount}
            onChange={e => setTopupAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && topUp()}
            style={{ flex: 1, fontSize: "1rem", fontWeight: 700, padding: "0.5rem 0.65rem" }}
          />
          <button
            onClick={topUp}
            disabled={topupLoading}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: "#a855f7",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: topupLoading ? "wait" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 0 8px #a855f740",
            }}
            onPointerDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
            onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
            onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {topupLoading ? "..." : "Top Up"}
          </button>
        </div>
      </div>

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
