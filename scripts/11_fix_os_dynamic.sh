#!/usr/bin/env bash
set -euo pipefail

OS_DIR="/opt/pwl-os/os/app"

# 1) Force dynamic rendering so build won't fetch API
# 2) Add a safe API base fallback (uses deployed API domain)

# Patch Home page
cat > "${OS_DIR}/page.js" <<'PAGE'
export const dynamic = "force-dynamic";

const API_BASE = process.env.API_BASE_URL || "https://api.peoplewelike.club";

async function getEvents() {
  const res = await fetch(`${API_BASE}/events`, { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export default async function Home() {
  const events = await getEvents();
  return (
    <main>
      <h1 style={{marginTop:0}}>Tonight / Upcoming — Zurich</h1>
      <p style={{opacity:.8}}>Curated feed. OS mode lives inside venues.</p>
      <div style={{display:"grid", gap:12}}>
        {events.map(e => (
          <a key={e.id} href={`/event/${e.id}`} style={{border:"1px solid #ddd", borderRadius:12, padding:12, textDecoration:"none", color:"inherit"}}>
            <div style={{fontWeight:800}}>{e.title}</div>
            <div style={{opacity:.8}}>{new Date(e.starts_at).toLocaleString()} • {e.venue_name}</div>
            {e.genre ? <div style={{marginTop:6}}>{e.genre}</div> : null}
          </a>
        ))}
        {events.length===0 ? <div>No events yet. Create some in Admin.</div> : null}
      </div>
    </main>
  );
}
PAGE

# Patch Event detail page
mkdir -p "${OS_DIR}/event/[id]"
cat > "${OS_DIR}/event/[id]/page.js" <<'PAGE'
export const dynamic = "force-dynamic";

const API_BASE = process.env.API_BASE_URL || "https://api.peoplewelike.club";

async function getEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

export default async function EventPage({ params }) {
  const e = await getEvent(params.id);
  if (!e) return <div>Not found</div>;
  return (
    <main>
      <h1 style={{marginTop:0}}>{e.title}</h1>
      <div style={{opacity:.8}}>{new Date(e.starts_at).toLocaleString()} • {e.venue_name}</div>
      {e.description ? <p style={{marginTop:12}}>{e.description}</p> : null}
      <div style={{display:"flex", gap:14, marginTop:12}}>
        {e.ticket_url ? <a href={e.ticket_url} target="_blank" style={{fontWeight:800}}>Tickets</a> : null}
      </div>
      <hr style={{margin:"18px 0"}} />
      <h2>Enter Venue OS (Phase 1)</h2>
      <p style={{opacity:.8}}>Use venue PIN to simulate roles. NFC/UID later.</p>
      <a href="https://admin.peoplewelike.club" target="_blank">Ask admin for venue PIN</a>
    </main>
  );
}
PAGE

echo "✅ Patched OS pages to force-dynamic + safe API base."
