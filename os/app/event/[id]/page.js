export const dynamic = "force-dynamic";

const API_BASE = process.env.INTERNAL_API_URL || process.env.API_BASE_URL || "https://api.peoplewelike.club";

async function getEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }) + " at " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function EventPage({ params }) {
  const e = await getEvent(params.id);
  if (!e) {
    return (
      <main>
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          Event not found
        </div>
        <div style={{ marginTop: "1rem" }}>
          <a href="/" style={{ fontSize: "0.85rem" }}>&larr; Back to events</a>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/" style={{ fontSize: "0.85rem", color: "#64748b" }}>&larr; Back to events</a>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <span className="tag tag-purple">{e.venue_name}</span>
          {e.genre && <span className="tag tag-cyan">{e.genre}</span>}
        </div>

        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          {e.title}
        </h1>

        <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1rem" }}>
          {formatDate(e.starts_at)}
        </div>

        {e.address && (
          <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {e.address}
          </div>
        )}

        {e.description && (
          <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: "1rem 0", whiteSpace: "pre-wrap" }}>
            {e.description}
          </p>
        )}

        {e.ticket_url && (
          <div style={{ marginTop: "1.5rem" }}>
            <a
              href={e.ticket_url}
              target="_blank"
              className="btn-primary"
              style={{
                display: "inline-block",
                padding: "0.65rem 1.5rem",
                textDecoration: "none",
                borderRadius: "0.5rem",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Get Tickets
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
