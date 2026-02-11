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
