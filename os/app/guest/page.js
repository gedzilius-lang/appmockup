"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export default function GuestPanel() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [uid, setUid] = useState("");
  const [status, setStatus] = useState("");
  const [me, setMe] = useState(null);

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
    setStatus("Checking in...");
    const res = await fetch(`${API_BASE}/guest/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: Number(venueId), uid_tag: uid || null })
    });
    const j = await res.json();
    if (!res.ok) { setStatus(j.error || "Failed"); return; }
    localStorage.setItem("pwl_guest_token", j.token);
    setStatus(`Checked in. Points awarded: ${j.points_awarded}`);
    await track("checkin_ui", { points_awarded: j.points_awarded });
    await loadMe();
  }

  async function checkout() {
    const token = localStorage.getItem("pwl_guest_token");
    if (!token) return;
    const res = await fetch(`${API_BASE}/guest/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Failed"); return; }
    setStatus("Checked out.");
    await track("checkout_ui", {});
    await loadMe();
  }

  function clearSession() {
    localStorage.removeItem("pwl_guest_token");
    setMe(null);
    setStatus("Cleared local session.");
  }

  useEffect(() => {
    loadVenues();
    loadMe();
    track("pageview", { page: "/guest" });
  }, []);

  return (
    <main>
      <h1 style={{marginTop:0}}>Guest Panel</h1>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, marginBottom:14}}>
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
          <select value={venueId} onChange={e=>setVenueId(e.target.value)}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
          </select>
          <input placeholder="UID (optional, simulates NFC)" value={uid} onChange={e=>setUid(e.target.value)} />
          <button onClick={checkin} disabled={!venueId}>Check in</button>
          <button onClick={checkout}>End session</button>
          <button onClick={clearSession}>Clear local</button>
        </div>
        {status ? <p style={{marginTop:10}}>{status}</p> : null}
      </div>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12}}>
        <h2 style={{marginTop:0}}>My status</h2>
        {!me ? (
          <div style={{opacity:.8}}>Not signed in. Check in to create a session.</div>
        ) : (
          <>
            <div><b>Role:</b> {me.user.role}</div>
            <div><b>Venue ID:</b> {me.user.venue_id}</div>
            <div><b>Points:</b> {me.user.points}</div>
            <div style={{marginTop:8, opacity:.9}}>
              <b>Session:</b>{" "}
              {me.session ? `active since ${new Date(me.session.started_at).toLocaleString()}` : "none"}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
