"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function GuestPanel() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [uid, setUid] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);

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

  return (
    <main>
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 800 }}>Guest Check-in</h1>

      {/* Check-in card */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ minWidth: 180, flex: "1 1 180px" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
          </select>
          <input
            placeholder="UID tag (optional)"
            value={uid}
            onChange={e => setUid(e.target.value)}
            style={{ flex: "1 1 160px" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          <button className="btn-primary" onClick={checkin} disabled={!venueId || loading}>
            {loading ? "..." : "Check In"}
          </button>
          <button className="btn-secondary" onClick={checkout} disabled={loading}>End Session</button>
          <button onClick={clearSession} style={{ marginLeft: "auto" }}>Clear Local</button>
        </div>
      </div>

      {/* Status card */}
      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>My Status</h2>
        {!me ? (
          <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Not signed in. Check in to create a session.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <StatusItem label="Role" value={me.user.role} />
              <StatusItem label="Points" value={`${me.user.points} NC`} color="#a855f7" />
              <StatusItem label="XP" value={me.user.xp} color="#06b6d4" />
              <StatusItem label="Level" value={me.user.level} color="#22c55e" />
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              {me.session ? (
                <span>
                  <span style={{ color: "#22c55e", marginRight: "0.4rem" }}>&#9679;</span>
                  Active since {new Date(me.session.started_at).toLocaleTimeString()}
                </span>
              ) : (
                <span style={{ color: "#64748b" }}>No active session</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}

function StatusItem({ label, value, color }) {
  return (
    <div style={{
      background: "#0f0f1a",
      border: "1px solid #1e1e2e",
      borderRadius: "0.5rem",
      padding: "0.5rem 0.75rem",
      minWidth: 80,
    }}>
      <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}
