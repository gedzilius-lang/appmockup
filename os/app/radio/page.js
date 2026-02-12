export default function Radio() {
  const src = process.env.RADIO_IFRAME_SRC;
  return (
    <main>
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 800 }}>
        <span style={{ color: "#a855f7" }}>PWL</span> Radio
      </h1>
      <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Live stream from PeopleWeLike Radio
      </p>
      <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #a855f740" }}>
        {src ? (
          <iframe
            src={src}
            style={{
              width: "100%",
              height: 200,
              border: "none",
              display: "block",
            }}
            allow="autoplay"
          />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            Radio stream is not available right now. Check back later.
          </div>
        )}
      </div>
    </main>
  );
}
