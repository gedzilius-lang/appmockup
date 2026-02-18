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
  // Layer 2 profile
  const [featureLayer, setFeatureLayer] = useState(1);
  const [profile, setProfile] = useState(null);
  const [profileTab, setProfileTab] = useState("stats");

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const j = await res.json();
      if (!res.ok) { showToast(j.error || "Checkout failed", "error"); return; }
      showToast("Checked out successfully", "success");
      await track("checkout_ui", {});
      await loadMe();
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  }

  async function loadConfig() {
    try {
      const res = await fetch(`${API_BASE}/config`, { cache: "no-store" });
      const j = await res.json();
      setFeatureLayer(j.feature_layer || 1);
    } catch {}
  }

  async function loadProfile() {
    const token = localStorage.getItem("pwl_guest_token");
    if (!token || featureLayer < 2) return;
    try {
      const res = await fetch(`${API_BASE}/me/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setProfile(j);
    } catch {}
  }

  function clearSession() {
    localStorage.removeItem("pwl_guest_token");
    setMe(null);
    setProfile(null);
    showToast("Session cleared", "info");
  }

  useEffect(() => {
    loadVenues();
    loadMe();
    loadConfig();
    track("pageview", { page: "/guest" });
  }, []);

  useEffect(() => {
    if (featureLayer >= 2 && me) loadProfile();
  }, [featureLayer, me]);

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
          <button className="btn-secondary btn-press" onClick={checkout} disabled={loading || !me?.session}>End Session</button>
          <button className="btn-press" onClick={clearSession} style={{ marginLeft: "auto" }}>Clear Local</button>
        </div>
      </div>

      {/* Layer 2: Full Profile */}
      {featureLayer >= 2 && me && profile && (
        <div style={{ marginBottom: "1rem" }}>
          {/* Profile tabs */}
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
            {[["stats", "Stats"], ["quests", "Quests"], ["history", "History"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setProfileTab(key)}
                className="btn-press"
                style={{
                  padding: "0.4rem 0.8rem", fontSize: "0.8rem", fontWeight: 700,
                  background: profileTab === key ? "#a855f7" : "#14141f",
                  color: profileTab === key ? "#fff" : "#94a3b8",
                  border: `1px solid ${profileTab === key ? "#a855f7" : "#1e1e2e"}`,
                  borderRadius: "0.5rem",
                }}
              >{label}</button>
            ))}
          </div>

          {/* Stats tab */}
          {profileTab === "stats" && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem", fontWeight: 900, color: "#fff",
                }}>
                  {profile.user.level}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>Level {profile.user.level}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{profile.user.email}</div>
                </div>
              </div>
              {/* XP progress bar */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.2rem" }}>
                  <span>XP Progress</span>
                  <span>{profile.xp_progress.current} / {profile.xp_progress.needed}</span>
                </div>
                <div style={{ height: "0.4rem", borderRadius: "0.2rem", background: "#0a0a0f", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "0.2rem",
                    width: `${Math.min(100, Math.round((profile.xp_progress.current / Math.max(1, profile.xp_progress.needed)) * 100))}%`,
                    background: "linear-gradient(90deg, #a855f7, #06b6d4)",
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
                <MiniStat label="Total XP" value={profile.user.xp} color="#06b6d4" />
                <MiniStat label="Wallet" value={`${profile.user.points} NC`} color="#a855f7" />
                <MiniStat label="Visits" value={profile.visits.length} color="#22c55e" />
              </div>
            </div>
          )}

          {/* Quests tab */}
          {profileTab === "quests" && (
            <div className="card">
              {profile.quest_completions.length > 0 ? (
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  {profile.quest_completions.map((q, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.4rem 0", borderBottom: "1px solid #1e1e2e",
                      fontSize: "0.85rem",
                    }}>
                      <span style={{ color: "#cbd5e1" }}>Quest #{q.quest_id}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {new Date(q.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#64748b", padding: "1rem", fontSize: "0.85rem" }}>
                  No quests completed yet.
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {profileTab === "history" && (
            <div className="card" style={{ padding: 0, overflow: "auto" }}>
              {profile.visits.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.5rem", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e1e2e" }}>Date</th>
                      <th style={{ padding: "0.5rem", textAlign: "right", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e1e2e" }}>Spent</th>
                      <th style={{ padding: "0.5rem", textAlign: "right", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e1e2e" }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.visits.map(v => {
                      const dur = v.ended_at
                        ? Math.round((new Date(v.ended_at) - new Date(v.started_at)) / 60000)
                        : null;
                      return (
                        <tr key={v.id} style={{ borderBottom: "1px solid #1e1e2e10" }}>
                          <td style={{ padding: "0.4rem 0.5rem", color: "#cbd5e1" }}>{new Date(v.started_at).toLocaleDateString()}</td>
                          <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: "#f97316", fontWeight: 600 }}>{v.total_spend} NC</td>
                          <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: "#94a3b8" }}>
                            {dur != null ? `${dur}m` : <span style={{ color: "#22c55e" }}>Active</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", color: "#64748b", padding: "1rem", fontSize: "0.85rem" }}>
                  No visit history yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
