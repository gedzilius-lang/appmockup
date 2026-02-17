"use client";
import { useEffect, useState } from "react";
import { isNfcSupported, scanUidOnce } from "../lib/nfc";

const API_BASE = "/api";

export default function GuestPanel() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [uid, setUid] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState(null);
  const [scanning, setScanning] = useState(false);
  const nfcAvailable = typeof window !== "undefined" && isNfcSupported();

  function startNfcScan() {
    if (scanning) return;
    setScanning(true);
    scanUidOnce({
      onUid: (u) => { setUid(u); setScanning(false); showToast("NFC scan successful", "success"); },
      onError: (err) => { setScanning(false); showToast(err.message || "NFC scan failed", "error"); },
    });
  }

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function track(name, payload = {}) {
    try {
      const token = localStorage.getItem("pwl_guest_token");
      await fetch(`${API_BASE}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, venue_id: venueId ? Number(venueId) : null, payload })
      });
    } catch {}
  }

  async function loadVenues() {
    const res = await fetch(`${API_BASE}/public/venues`, { cache: "no-store" });
    const j = await res.json();
    setVenues(Array.isArray(j) ? j : []);
    if (!venueId && j?.[0]?.id) setVenueId(String(j[0].id));
  }

  async function loadMe() {
    const token = localStorage.getItem("pwl_guest_token");
    if (!token) { setMe(null); return; }
    const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (!res.ok) { setMe(null); return; }
    setMe(j);
  }

  async function refreshMe() {
    setRefreshing(true);
    await loadMe();
    setRefreshing(false);
    showToast("Refreshed", "info");
  }

  async function checkin() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/guest/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: Number(venueId), uid_tag: uid || null })
      });
      const j = await res.json();
      if (!res.ok) { showToast(j.error || "Check-in failed", "error"); return; }
      localStorage.setItem("pwl_guest_token", j.token);
      showToast(`Checked in! +${j.points_awarded} NC, +${j.xp_awarded} XP`, "success");
      await track("checkin_ui", { points_awarded: j.points_awarded });
      await loadMe();
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  }

  async function checkout() {
    const token = localStorage.getItem("pwl_guest_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/guest/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await res.json();
      if (!res.ok) { showToast(j.error || "Checkout failed", "error"); return; }
      showToast("Checked out successfully", "success");
      await track("checkout_ui", {});
      await loadMe();
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  }

  function clearSession() {
    localStorage.removeItem("pwl_guest_token");
    setMe(null);
    showToast("Session cleared", "info");
  }

  useEffect(() => {
    loadVenues();
    loadMe();
    track("pageview", { page: "/guest" });
  }, []);

  const venueName = me?.session?.venue_id
    ? venues.find(v => v.id === me.session.venue_id)?.name || `Venue #${me.session.venue_id}`
    : null;

  return (
    <main>
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 800 }}>Guest</h1>

      {/* Wallet Balance — top, prominent */}
      {me && (
        <div className="card" style={{
          marginBottom: "1rem",
          border: "1px solid #a855f740",
          boxShadow: "0 0 20px #a855f715",
          background: "linear-gradient(135deg, #14141f 0%, #1a1028 100%)",
          textAlign: "center",
          padding: "1.5rem 1rem",
        }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
            Wallet Balance
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#a855f7", lineHeight: 1 }}>
            {me.user.points} <span style={{ fontSize: "1rem", fontWeight: 600 }}>NC</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", marginTop: "0.75rem" }}>
            <MiniStat label="XP" value={me.user.xp} color="#06b6d4" />
            <MiniStat label="Level" value={me.user.level} color="#22c55e" />
          </div>
          <button
            onClick={refreshMe}
            disabled={refreshing}
            className="btn-secondary btn-press"
            style={{ marginTop: "1rem", fontSize: "0.8rem", padding: "0.35rem 1rem" }}
          >
            {refreshing ? "..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Active Session Panel */}
      {me?.session && (
        <div className="card" style={{ marginBottom: "1rem", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e80" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#22c55e" }}>Active Session</span>
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "#94a3b8" }}>
            {venueName && <span>{venueName}</span>}
            <span>Started {new Date(me.session.started_at).toLocaleTimeString()}</span>
            {me.session.total_spent != null && (
              <span>Spent: <span style={{ color: "#f97316", fontWeight: 600 }}>{me.session.total_spent} NC</span></span>
            )}
          </div>
        </div>
      )}

      {/* Check-in card */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>Check In</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ minWidth: 180, flex: "1 1 180px" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
          </select>
          <div style={{ display: "flex", gap: "0.35rem", flex: "1 1 160px" }}>
            <input
              placeholder="UID tag (optional)"
              value={uid}
              onChange={e => setUid(e.target.value)}
              style={{ flex: 1 }}
            />
            {nfcAvailable && (
              <button
                onClick={startNfcScan}
                className={`btn-press ${scanning ? "btn-danger" : "btn-secondary"}`}
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
              >
                {scanning ? "Stop" : "📡 NFC"}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          <button className="btn-primary btn-press" onClick={checkin} disabled={!venueId || loading}>
            {loading ? "..." : "Check In"}
          </button>
          <button className="btn-secondary btn-press" onClick={checkout} disabled={loading}>End Session</button>
          <button className="btn-press" onClick={clearSession} style={{ marginLeft: "auto" }}>Clear Local</button>
        </div>
      </div>

      {/* No session state */}
      {!me && (
        <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
          Not signed in. Check in to create a session.
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}
