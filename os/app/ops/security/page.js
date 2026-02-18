"use client";
import { useEffect, useState } from "react";
import { isNfcSupported, scanUidOnce } from "../../lib/nfc";
import { useNetworkStatus } from "../../lib/useNetworkStatus";
import { apiFetch } from "../../lib/api";
import { useWakeLock } from "../../lib/useWakeLock";

const TYPE_COLORS = {
  SELL: { bg: "#06b6d420", color: "#06b6d4", border: "#06b6d440" },
  LOW_STOCK: { bg: "#f9731620", color: "#f97316", border: "#f9731640" },
  INCIDENT: { bg: "#ef444420", color: "#ef4444", border: "#ef444440" },
  CHECK_IN: { bg: "#22c55e20", color: "#22c55e", border: "#22c55e40" },
  CHECKOUT: { bg: "#64748b20", color: "#64748b", border: "#64748b40" },
  TOPUP: { bg: "#a855f720", color: "#a855f7", border: "#a855f740" },
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
  const nfcAvailable = typeof window !== "undefined" && isNfcSupported();
  const networkOnline = useNetworkStatus();

  // Door scan state
  const [scanUid, setScanUid] = useState("");
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;
  useWakeLock();

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load logs ──
  async function loadLogs() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    try {
      const j = await apiFetch(`/logs/${venueId}`);
      setLogs(j);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Failed to load logs");
    }
  }

  // ── Scan / Lookup ──
  function startNfcScan() {
    if (scanning) return;
    setScanning(true);
    scanUidOnce({
      onUid: (uid) => {
        setScanUid(uid);
        setScanning(false);
        fetchPreview(uid);
      },
      onError: (err) => {
        setScanning(false);
        showToast(err.message || "NFC scan failed", "error");
      },
    });
  }

  async function fetchPreview(uid) {
    if (!uid?.trim()) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const j = await apiFetch(`/uid/${encodeURIComponent(uid.trim())}/history`);
      setPreview(j);
    } catch (err) {
      showToast(err.message || "Lookup failed", "error");
    } finally {
      setPreviewLoading(false);
    }
  }

  function clearPreview() {
    setPreview(null);
    setScanUid("");
  }

  // ── Check In ──
  async function doCheckIn() {
    if (!scanUid.trim() || !venueId) return;
    setCheckinLoading(true);
    try {
      const j = await apiFetch("/guest/checkin", {
        method: "POST",
        body: JSON.stringify({ venue_id: Number(venueId), uid_tag: scanUid.trim() }),
      });
      showToast(`Checked in! +${j.points_awarded} NC, +${j.xp_awarded} XP`, "success");
      clearPreview();
      await loadLogs();
    } catch (err) {
      showToast(err.message || "Check-in failed", "error");
    } finally {
      setCheckinLoading(false);
    }
  }

  // ── Incident ──
  async function addIncident() {
    if (!token || !venueId || !incident.trim()) return;
    try {
      await apiFetch("/logs", {
        method: "POST",
        body: JSON.stringify({ venue_id: Number(venueId), type: "INCIDENT", payload: { text: incident } }),
      });
      setIncident("");
      showToast("Incident logged", "success");
      await loadLogs();
    } catch (err) {
      showToast(err.message || "Failed to submit", "error");
    }
  }

  useEffect(() => { loadLogs(); }, []);

  const isAlreadyIn = preview?.active_session != null;

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Security / Door</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={loadLogs} className="btn-secondary btn-press" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Refresh</button>
          <button onClick={() => { window.location.href = "/ops"; }} className="btn-press" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
        </div>
      </div>

      {!networkOnline && (
        <div style={{
          marginBottom: "1rem", padding: "0.6rem 1rem", borderRadius: "0.5rem",
          background: "#ef444420", border: "1px solid #ef444460", color: "#ef4444",
          fontSize: "0.85rem", fontWeight: 700, textAlign: "center",
        }}>
          Network unavailable
        </div>
      )}
      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      {/* ── Door Scan Panel ── */}
      <div className="card" style={{
        marginBottom: "1.25rem",
        border: "1px solid #22c55e40",
        background: "linear-gradient(135deg, #14141f 0%, #0f1f14 100%)",
        padding: "1.25rem",
      }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 800, color: "#22c55e" }}>
          Scan Tag
        </h2>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <input
            placeholder="UID tag"
            value={scanUid}
            onChange={e => setScanUid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchPreview(scanUid)}
            style={{ flex: 1, fontSize: "0.9rem", padding: "0.5rem 0.65rem" }}
          />
          {nfcAvailable && (
            <button
              onClick={startNfcScan}
              className={`btn-press ${scanning ? "btn-danger" : "btn-secondary"}`}
              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              {scanning ? "Scanning..." : "NFC"}
            </button>
          )}
          <button
            onClick={() => fetchPreview(scanUid)}
            disabled={previewLoading || !scanUid.trim()}
            className="btn-primary btn-press"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            {previewLoading ? "..." : "Lookup"}
          </button>
        </div>

        {/* ── Tag Preview Card ── */}
        {preview && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            background: "#0a0a0f",
            border: `1px solid ${isAlreadyIn ? "#22c55e40" : "#06b6d440"}`,
          }}>
            {/* Status row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%", display: "inline-block",
                background: isAlreadyIn ? "#22c55e" : "#ef4444",
                boxShadow: isAlreadyIn ? "0 0 8px #22c55e80" : "none",
              }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isAlreadyIn ? "#22c55e" : "#ef4444" }}>
                {isAlreadyIn ? "CHECKED IN" : "NOT CHECKED IN"}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b", fontFamily: "monospace" }}>
                {preview.uid_tag}
              </span>
            </div>

            {/* Balance */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase" }}>Balance</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#a855f7" }}>
                  {preview.balance != null ? `${preview.balance} NC` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase" }}>Visits</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#06b6d4" }}>
                  {preview.sessions.length}
                </div>
              </div>
            </div>

            {/* Last 3 visits */}
            {preview.sessions.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.3rem", textTransform: "uppercase" }}>Recent Visits</div>
                {preview.sessions.slice(0, 3).map(s => (
                  <div key={s.id} style={{
                    display: "flex", justifyContent: "space-between", padding: "0.25rem 0",
                    fontSize: "0.8rem", borderBottom: "1px solid #1e1e2e",
                  }}>
                    <span style={{ color: "#cbd5e1" }}>{new Date(s.started_at).toLocaleDateString()}</span>
                    <span style={{ color: "#f97316", fontWeight: 600 }}>{s.total_spend} NC</span>
                    <span style={{ color: s.ended_at ? "#64748b" : "#22c55e" }}>{s.ended_at ? "Ended" : "Active"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              {!isAlreadyIn ? (
                <button
                  onClick={doCheckIn}
                  disabled={checkinLoading}
                  className="btn-confirm btn-press"
                  style={{ flex: 1, padding: "0.6rem", fontSize: "0.95rem", fontWeight: 700 }}
                >
                  {checkinLoading ? "Checking in..." : "Check In"}
                </button>
              ) : (
                <div style={{
                  flex: 1, padding: "0.5rem", textAlign: "center",
                  fontSize: "0.85rem", color: "#22c55e", fontWeight: 600,
                  background: "#22c55e10", borderRadius: "0.5rem", border: "1px solid #22c55e30",
                }}>
                  Already checked in
                </div>
              )}
              <button
                onClick={clearPreview}
                className="btn-secondary btn-press"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Incident form ── */}
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
          <button className="btn-danger btn-press" onClick={addIncident} style={{ alignSelf: "flex-end" }}>Submit</button>
        </div>
      </div>

      {/* ── Activity Log ── */}
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>Activity Log</h2>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {logs.slice(0, 50).map(l => {
          const tc = TYPE_COLORS[l.type] || { bg: "#14141f", color: "#64748b", border: "#1e1e2e" };
          return (
            <div key={l.id} className="card" style={{ padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "9999px",
                    fontSize: "0.65rem", fontWeight: 600, background: tc.bg, color: tc.color,
                    border: `1px solid ${tc.border}`, textTransform: "uppercase", letterSpacing: "0.04em",
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
