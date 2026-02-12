"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [venues, events] = await Promise.all([
        apiFetch("/venues"),
        apiFetch("/events"),
      ]);
      setStats({
        venueCount: venues.length,
        eventCount: events.length,
      });

      // Load logs from first venue if available
      if (venues.length > 0) {
        try {
          const logs = await apiFetch(`/logs/${venues[0].id}`);
          setRecentLogs(logs.slice(0, 10));
        } catch {}
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 800 }}>Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#a855f7" }}>{stats?.venueCount ?? 0}</div>
          <div className="stat-label">Venues</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#06b6d4" }}>{stats?.eventCount ?? 0}</div>
          <div className="stat-label">Events</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        <a href="/dashboard/venues" className="card card-interactive" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700, color: "#a855f7" }}>Venues</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>Create and manage venues</div>
        </a>
        <a href="/dashboard/events" className="card card-interactive" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700, color: "#06b6d4" }}>Events</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>Schedule and edit events</div>
        </a>
        <a href="/dashboard/inventory" className="card card-interactive" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700, color: "#22c55e" }}>Inventory</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>Stock levels and restocking</div>
        </a>
        <a href="/dashboard/logs" className="card card-interactive" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700, color: "#f97316" }}>Logs</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>View venue activity</div>
        </a>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Recent Activity</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {recentLogs.map(l => (
              <div key={l.id} style={{
                padding: "0.6rem 1rem",
                borderBottom: "1px solid #1e1e2e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`tag tag-${l.type === "INCIDENT" ? "red" : l.type === "LOW_STOCK" ? "orange" : l.type === "SELL" ? "cyan" : "purple"}`}>
                    {l.type}
                  </span>
                  <span style={{ color: "#cbd5e1" }}>
                    {l.payload?.item || l.payload?.text || l.payload?.title || JSON.stringify(l.payload).slice(0, 40)}
                  </span>
                </div>
                <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
