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
