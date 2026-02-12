export const dynamic = "force-dynamic";

const API_BASE = process.env.API_BASE_URL || "https://api.peoplewelike.club";

async function getEvents() {
  const res = await fetch(`${API_BASE}/events`, { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

function formatDate(d) {
  const date = new Date(d);
  const now = new Date();
  const opts = { weekday: "short", month: "short", day: "numeric" };
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString("en-US", opts)} ${time}`;
}

function isTonight(d) {
  const date = new Date(d);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export default async function Home() {
  const events = await getEvents();
  const tonight = events.filter(e => isTonight(e.starts_at));
  const upcoming = events.filter(e => !isTonight(e.starts_at));

  return (
    <main>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "2.5rem 0 2rem" }}>
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          <span style={{ color: "#a855f7" }}>PeopleWeLike</span>
          <span style={{ color: "#64748b", fontWeight: 400, fontSize: "1.2rem", marginLeft: "0.5rem" }}>Zurich</span>
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Nightlife events, venue check-in, and community rewards
        </p>
      </div>

      {/* Tonight */}
      {tonight.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
              boxShadow: "0 0 8px #22c55e80", display: "inline-block",
            }} />
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Tonight</h2>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {tonight.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 700 }}>
          {tonight.length > 0 ? "Upcoming" : "Events"}
        </h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {upcoming.map(e => <EventCard key={e.id} event={e} />)}
        </div>
        {events.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            No events scheduled yet. Check back soon.
          </div>
        )}
      </section>
    </main>
  );
}

function EventCard({ event: e }) {
  return (
    <a href={`/event/${e.id}`} className="card card-interactive" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{e.title}</div>
          <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
            {formatDate(e.starts_at)}
          </div>
        </div>
        <span className="tag tag-purple">{e.venue_name}</span>
      </div>
      {e.genre && (
        <div style={{ marginTop: "0.6rem" }}>
          <span className="tag tag-cyan">{e.genre}</span>
        </div>
      )}
    </a>
  );
}
