"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const TYPE_COLORS = {
  SELL: "cyan",
  LOW_STOCK: "orange",
  INCIDENT: "red",
  CHECK_IN: "green",
  QUEST_COMPLETE: "purple",
  ORDER_UNDO: "orange",
  RULE_TRIGGERED: "cyan",
};

export default function LogsPage() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  async function loadVenues() {
    try {
      const data = await apiFetch("/venues");
      setVenues(data);
      if (data.length > 0 && !venueId) {
        setVenueId(String(data[0].id));
      }
    } catch {}
    setLoading(false);
  }

  async function loadLogs() {
    if (!venueId) return;
    try {
      const url = typeFilter ? `/logs/${venueId}?type=${typeFilter}` : `/logs/${venueId}`;
      const data = await apiFetch(url);
      setLogs(data);
    } catch {}
  }

  useEffect(() => { loadVenues(); }, []);
  useEffect(() => { if (venueId) loadLogs(); }, [venueId, typeFilter]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  const types = [...new Set(logs.map(l => l.type))].sort();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Logs</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ width: "auto" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="">All types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={loadLogs} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No logs found.</div>
        ) : (
          logs.map(l => {
            const tagColor = TYPE_COLORS[l.type] || "purple";
            return (
              <div key={l.id} style={{
                padding: "0.6rem 1rem",
                borderBottom: "1px solid #1e1e2e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.85rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                  <span className={`tag tag-${tagColor}`} style={{ flexShrink: 0 }}>{l.type}</span>
                  <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.payload?.text || l.payload?.item || l.payload?.title || JSON.stringify(l.payload).slice(0, 60)}
                  </span>
                </div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", flexShrink: 0 }}>
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
