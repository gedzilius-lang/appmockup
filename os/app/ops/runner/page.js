"use client";
import { useEffect, useState, useRef } from "react";
import { apiFetch as sharedApiFetch } from "../../lib/api";
import { useWakeLock } from "../../lib/useWakeLock";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RunnerPage() {
  const [logs, setLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [status, setStatus] = useState("");
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);
  const [toast, setToast] = useState(null);
  const [showTopProducts, setShowTopProducts] = useState(false);
  const [topProducts, setTopProducts] = useState([]);
  // Restock
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;
  useWakeLock();

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function apiFetch(path, opts) {
    return sharedApiFetch(path, opts);
  }

  async function load() {
    if (!token || !venueId) return setStatus("Not logged in. Go to /ops");
    try {
      const [logsData, invData] = await Promise.all([
        apiFetch(`/logs/${venueId}`),
        apiFetch(`/inventory/${venueId}`),
      ]);
      const alerts = logsData.filter(x => x.type === "LOW_STOCK");
      if (alerts.length > prevCountRef.current && prevCountRef.current > 0) {
        setNewCount(alerts.length - prevCountRef.current);
        setTimeout(() => setNewCount(0), 5000);
      }
      prevCountRef.current = alerts.length;
      setLogs(alerts);
      setInventory(invData);
      setStatus("");

      // Compute top products from SELL logs
      const sells = logsData.filter(x => x.type === "SELL");
      const productCounts = {};
      sells.forEach(s => {
        (s.payload?.items || []).forEach(i => {
          productCounts[i.name] = (productCounts[i.name] || 0) + (i.qty || 1);
        });
      });
      const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      setTopProducts(sorted);
    } catch (err) {
      setStatus(err.message || "Failed to load");
    }
  }

  async function doRestock(itemId) {
    const qty = Number(restockQty);
    if (!qty || qty <= 0) { showToast("Enter a positive quantity", "error"); return; }
    setRestockLoading(true);
    try {
      await apiFetch(`/inventory/${venueId}/${itemId}/restock`, {
        method: "POST",
        body: JSON.stringify({ add_qty: qty }),
      });
      showToast(`Restocked +${qty}`, "success");
      setRestockId(null);
      setRestockQty("");
      await load();
    } catch (err) {
      showToast(err.message || "Restock failed", "error");
    } finally {
      setRestockLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const maxProductCount = topProducts.length > 0 ? topProducts[0][1] : 1;

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>
            Runner
            {newCount > 0 && (
              <span className="pulse-neon" style={{
                display: "inline-block", marginLeft: "0.5rem",
                background: "#ef444430", color: "#ef4444",
                fontSize: "0.7rem", padding: "0.15rem 0.5rem",
                borderRadius: "9999px", border: "1px solid #ef444450",
                verticalAlign: "middle",
              }}>+{newCount} new</span>
            )}
          </h1>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>Auto-refresh 5s</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setShowTopProducts(!showTopProducts)} className="btn-secondary btn-press" style={{ padding: "0.4rem 0.65rem", fontSize: "0.75rem" }}>
            {showTopProducts ? "Hide Top" : "Top Products"}
          </button>
          <button onClick={() => { window.location.href = "/ops"; }} className="btn-press" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Logout</button>
        </div>
      </div>

      {status && <div className="card" style={{ marginBottom: "1rem", color: "#f97316" }}>{status}</div>}

      {/* Top Products Chart */}
      {showTopProducts && topProducts.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700 }}>Top Products (this session)</h2>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {topProducts.map(([name, count]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#cbd5e1", minWidth: 80, textAlign: "right" }}>{name}</span>
                <div style={{ flex: 1, height: "0.5rem", borderRadius: "0.25rem", background: "#0a0a0f", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "0.25rem",
                    width: `${Math.round((count / maxProductCount) * 100)}%`,
                    background: "linear-gradient(90deg, #a855f7, #06b6d4)",
                  }} />
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a855f7", minWidth: 24 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Left: Stock Alerts */}
        <div>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", color: "#f97316" }}>
            Alerts ({logs.length})
          </h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {logs.map(l => {
              const qty = l.payload?.qty ?? 0;
              const threshold = l.payload?.low_threshold ?? 5;
              const isCritical = qty <= 0;
              return (
                <div key={l.id} className="card" style={{ padding: "0.6rem 0.75rem", borderLeft: `3px solid ${isCritical ? "#ef4444" : "#f97316"}` }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{l.payload?.item || "Item"}</div>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    <span style={{ color: isCritical ? "#ef4444" : "#f97316", fontWeight: 700 }}>Qty: {qty}</span>
                    <span style={{ color: "#64748b" }}>Thr: {threshold}</span>
                    <span style={{ color: "#64748b", marginLeft: "auto" }}>{timeAgo(l.created_at)}</span>
                  </div>
                  {isCritical && <span className="tag tag-red" style={{ fontSize: "0.6rem", marginTop: "0.25rem" }}>OUT OF STOCK</span>}
                </div>
              );
            })}
            {logs.length === 0 && !status && (
              <div className="card" style={{ textAlign: "center", color: "#22c55e", padding: "1.5rem", fontSize: "0.85rem" }}>
                All stocked
              </div>
            )}
          </div>
        </div>

        {/* Right: All Stock */}
        <div>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>All Stock</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {inventory.map(item => {
              const max = item.max_qty || item.qty;
              const pct = max > 0 ? Math.min(100, Math.round((item.qty / max) * 100)) : 0;
              const isLow = item.qty <= item.low_threshold;
              const isEmpty = item.qty <= 0;
              const barColor = isEmpty ? "#ef4444" : isLow ? "#f97316" : "#a855f7";
              const isRestocking = restockId === item.id;

              return (
                <div key={item.id} className="card" style={{ padding: "0.6rem 0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{item.item}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isEmpty ? "#ef4444" : isLow ? "#f97316" : "#e2e8f0" }}>
                        {item.qty}/{max}
                      </span>
                      <button
                        onClick={() => { setRestockId(isRestocking ? null : item.id); setRestockQty(""); }}
                        className="btn-press"
                        style={{
                          fontSize: "0.6rem", padding: "0.15rem 0.4rem", borderRadius: "0.25rem",
                          border: "1px solid #22c55e40", color: "#22c55e", background: isRestocking ? "#22c55e15" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        +Restock
                      </button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: "0.4rem", borderRadius: "0.2rem", background: "#0a0a0f", overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", borderRadius: "0.2rem", width: `${pct}%`, background: barColor, transition: "width 0.3s ease" }} />
                    {max > 0 && (
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${Math.round((item.low_threshold / max) * 100)}%`, width: "1px", background: "#f9731680" }} />
                    )}
                  </div>
                  {/* Restock form */}
                  {isRestocking && (
                    <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.4rem" }}>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={restockQty}
                        onChange={e => setRestockQty(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && doRestock(item.id)}
                        min="1"
                        style={{ flex: 1, fontSize: "0.8rem", padding: "0.3rem 0.5rem" }}
                        autoFocus
                      />
                      <button
                        onClick={() => doRestock(item.id)}
                        disabled={restockLoading}
                        className="btn-confirm btn-press"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        {restockLoading ? "..." : "Add"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {inventory.length === 0 && (
              <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "1.5rem", fontSize: "0.85rem" }}>
                No inventory items.
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </main>
  );
}
