"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const TYPE_COLORS = {
  SELL: "cyan",
  LOW_STOCK: "orange",
  INCIDENT: "red",
  CHECK_IN: "green",
  CHECKOUT: "green",
  TOPUP: "purple",
  RESTOCK: "cyan",
  QUEST_COMPLETE: "purple",
  ORDER_UNDO: "orange",
  RULE_TRIGGERED: "cyan",
  SLOW_ORDER: "orange",
};

function isHighValue(log) {
  if (log.type === "TOPUP" && log.payload?.amount >= 200) return true;
  if (log.type === "SELL" && log.payload?.total >= 200) return true;
  return false;
}

function formatPayload(payload) {
  if (!payload) return "";
  if (payload.text) return payload.text;
  if (payload.item) return `${payload.item} (qty: ${payload.qty ?? payload.qty_after ?? payload.add_qty ?? "?"})`;
  if (payload.order_id) return `Order #${payload.order_id} - ${payload.total} NC`;
  if (payload.amount) return `${payload.amount} NC`;
  if (payload.user_id) return `User #${payload.user_id}`;
  return JSON.stringify(payload).slice(0, 80);
}

export default function LogsPage() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadVenues() {
    try {
      const data = await apiFetch("/venues");
      setVenues(data);
      if (data.length > 0 && !venueId) setVenueId(String(data[0].id));
    } catch {}
    setLoading(false);
  }

  async function loadLogs() {
    if (!venueId) return;
    try {
      const url = typeFilter ? `/logs/${venueId}?type=${typeFilter}` : `/logs/${venueId}`;
      setLogs(await apiFetch(url));
    } catch {}
  }

  useEffect(() => { loadVenues(); }, []);
  useEffect(() => { if (venueId) loadLogs(); }, [venueId, typeFilter]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  const allTypes = [...new Set(logs.map(l => l.type))].sort();
  const filtered = search.trim()
    ? logs.filter(l => JSON.stringify(l.payload || {}).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Activity Log</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ width: "auto" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="">All types</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            placeholder="Search UID / payload..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 160, fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
          />
          <button onClick={loadLogs} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Refresh</button>
        </div>
      </div>

      <div className="card table-scroll" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No logs found.</div>
        ) : (
          filtered.map(l => {
            const tagColor = TYPE_COLORS[l.type] || "purple";
            const highValue = isHighValue(l);
            return (
              <div key={l.id} style={{
                padding: "0.6rem 1rem",
                borderBottom: "1px solid #1e1e2e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.85rem",
                background: highValue ? "#f9731608" : "transparent",
                borderLeft: highValue ? "3px solid #f97316" : "3px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                  <span className={`tag tag-${tagColor}`} style={{ flexShrink: 0 }}>{l.type}</span>
                  {highValue && <span className="tag tag-orange" style={{ flexShrink: 0, fontSize: "0.55rem" }}>HIGH</span>}
                  <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {formatPayload(l.payload)}
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
