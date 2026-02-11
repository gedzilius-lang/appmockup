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
      <h1 style={{marginTop:0}}>PeopleWeLike • Zurich</h1>
      <p style={{opacity:.8}}>Nightlife feed + venue OS demo. NFC later. Points now.</p>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, marginBottom:14}}>
        <h2 style={{marginTop:0}}>Guest check-in (Phase 1.2)</h2>
        <p style={{opacity:.8, marginTop:6}}>Select venue, optional UID (simulates NFC tag UID), check-in → points + session.</p>
        <a href="/guest" style={{fontWeight:800}}>Open Guest Panel</a>
      </div>

      <h2>Tonight / Upcoming</h2>
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
