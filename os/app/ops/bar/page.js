"use client";
import { useEffect, useState } from "react";

const API_BASE = "/api";

export default function BarPOS() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function apiFetch(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...opts.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  async function loadMenu() {
    if (!token || !venueId) return;
    try {
      const data = await apiFetch(`/menu/${venueId}`);
      setMenu(data);
    } catch {}
    setLoading(false);
  }

  async function loadOrders() {
    if (!token || !venueId) return;
    try {
      const data = await apiFetch(`/orders/${venueId}`);
      setOrders(data);
    } catch {}
  }

  async function loadSummary() {
    if (!token) return;
    try {
      const data = await apiFetch("/shift/summary");
      setSummary(data);
    } catch {}
  }

  // ── Cart ──────────────────────────────────────────────────────

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        icon: item.icon,
        inventory_item_id: item.inventory_item_id,
      }];
    });
  }

  function updateCartQty(menuItemId, delta) {
    setCart(prev =>
      prev
        .map(c => c.menu_item_id === menuItemId ? { ...c, qty: c.qty + delta } : c)
        .filter(c => c.qty > 0)
    );
  }

  function clearCart() { setCart([]); }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  // ── Orders ────────────────────────────────────────────────────

  const [submitting, setSubmitting] = useState(false);

  async function submitOrder() {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const orderItems = cart.map(c => ({
        menu_item_id: c.menu_item_id,
        name: c.name,
        price: c.price,
        qty: c.qty,
        inventory_item_id: c.inventory_item_id,
      }));
      const idempotency_key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ venue_id: Number(venueId), items: orderItems, payment_method: "cash", idempotency_key }),
      });
      showToast(`Order confirmed — ${cartTotal} NC`, "success");
      clearCart();
      loadOrders();
      loadSummary();
      loadMenu();
    } catch (err) {
      const d = err.data || {};
      const msg = d.error === "OUT_OF_STOCK" ? `Out of stock: ${d.item}` :
                  d.error === "INSUFFICIENT_FUNDS" ? `Insufficient funds (need ${d.required} NC, have ${d.balance} NC)` :
                  err.message || "Order failed";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function undoOrder(orderId) {
    try {
      await apiFetch(`/orders/${orderId}`, { method: "DELETE" });
      showToast("Order undone", "success");
      loadOrders();
      loadSummary();
      loadMenu();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ── Derived state ─────────────────────────────────────────────

  const categories = ["All", ...Array.from(new Set(menu.map(m => m.category).filter(Boolean))).sort()];
  const filteredMenu = activeCategory === "All" ? menu : menu.filter(m => m.category === activeCategory);

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token || !venueId) { setLoading(false); return; }
    loadMenu();
    loadOrders();
    loadSummary();
    const t = setInterval(() => { loadMenu(); loadOrders(); }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Guards ────────────────────────────────────────────────────

  if (!token || !venueId) {
    return (
      <main>
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#f97316" }}>
          Not logged in. <a href="/ops" style={{ color: "#a855f7" }}>Go to /ops</a>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main><div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div></main>;
  }

  // ── Cart Panel (shared between desktop sidebar & mobile bottom) ─

  const cartPanel = cart.length > 0 && (
    <div className="card" style={{ alignSelf: "start", ...(isMobile ? {} : { position: "sticky", top: "1rem" }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Cart</h2>
        <button
          onClick={clearCart}
          style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "#ef4444", border: "1px solid #ef444440", background: "transparent", borderRadius: "0.375rem", cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {cart.map(c => (
          <div key={c.menu_item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.icon || "🍹"} {c.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{c.price} × {c.qty} = {c.price * c.qty} NC</div>
            </div>
            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexShrink: 0 }}>
              <button onClick={() => updateCartQty(c.menu_item_id, -1)} style={qtyBtnStyle}>−</button>
              <span style={{ width: "24px", textAlign: "center", fontSize: "0.85rem", fontWeight: 700 }}>{c.qty}</span>
              <button onClick={() => updateCartQty(c.menu_item_id, 1)} style={qtyBtnStyle}>+</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #1e293b", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span style={{ fontWeight: 800, color: "#22c55e", fontSize: "1.1rem" }}>{cartTotal} NC</span>
        </div>
        <button onClick={submitOrder} disabled={submitting} className="btn-primary" style={{ width: "100%", padding: "0.65rem", fontSize: "0.9rem", fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Confirming..." : "Confirm Order"}
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <main style={{ paddingBottom: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Bar POS</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setShowSummary(!showSummary)} className="btn-secondary" style={headerBtnStyle}>
            {showSummary ? "Hide Stats" : "Shift Stats"}
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary" style={headerBtnStyle}>
            {showHistory ? "Hide History" : "Orders"}
          </button>
          <button onClick={() => { window.location.href = "/ops"; }} style={headerBtnStyle}>Back</button>
        </div>
      </div>

      {/* Shift Summary */}
      {showSummary && summary && (
        <div className="card" style={{ marginBottom: "0.75rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={statLabel}>Orders</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#a855f7" }}>{summary.total_orders}</div>
          </div>
          <div>
            <div style={statLabel}>Revenue</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#22c55e" }}>{summary.total_revenue} NC</div>
          </div>
          {summary.top_items?.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ ...statLabel, marginBottom: "0.25rem" }}>Top Items</div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {summary.top_items.slice(0, 5).map(t => (
                  <span key={t.name} className="tag tag-purple" style={{ fontSize: "0.7rem" }}>{t.name} ×{t.count}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "0.75rem", WebkitOverflowScrolling: "touch" }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "9999px",
              whiteSpace: "nowrap",
              border: activeCategory === cat ? "1px solid #a855f7" : "1px solid #334155",
              background: activeCategory === cat ? "#a855f720" : "transparent",
              color: activeCategory === cat ? "#a855f7" : "#94a3b8",
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main area: Drink Grid + Cart (desktop side-by-side) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: !isMobile && cart.length > 0 ? "1fr 280px" : "1fr",
        gap: "0.75rem",
      }}>
        {/* Drink Grid */}
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", alignContent: "start" }}>
          {filteredMenu.map(item => {
            const outOfStock = item.stock_qty != null && item.stock_qty <= 0;
            const lowStock = item.stock_qty != null && item.stock_qty > 0 && item.stock_qty <= (item.low_threshold || 5);
            return (
              <button
                key={item.id}
                onClick={() => !outOfStock && addToCart(item)}
                disabled={outOfStock}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.75rem 0.5rem",
                  background: outOfStock ? "#1a1a2e" : "#14141f",
                  border: "1px solid #1e293b",
                  borderRadius: "0.75rem",
                  cursor: outOfStock ? "not-allowed" : "pointer",
                  opacity: outOfStock ? 0.4 : 1,
                  transition: "border-color 0.15s, transform 0.1s",
                  minHeight: "100px",
                  textAlign: "center",
                }}
                onPointerDown={e => { if (!outOfStock) e.currentTarget.style.transform = "scale(0.95)"; }}
                onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <span style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>{item.icon || "🍹"}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2 }}>{item.name}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a855f7", marginTop: "0.15rem" }}>{item.price} NC</span>
                {item.stock_qty != null && (
                  <span style={{
                    fontSize: "0.6rem",
                    marginTop: "0.2rem",
                    color: outOfStock ? "#ef4444" : lowStock ? "#f97316" : "#64748b",
                  }}>
                    {outOfStock ? "OUT" : `${item.stock_qty} left`}
                  </span>
                )}
              </button>
            );
          })}
          {filteredMenu.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#64748b", padding: "2rem" }}>
              {menu.length === 0 ? "No menu items. Add items in Admin." : "No items in this category."}
            </div>
          )}
        </div>

        {/* Cart — desktop position (right sidebar) */}
        {!isMobile && cartPanel}
      </div>

      {/* Cart — mobile position (below grid) */}
      {isMobile && cart.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          {cartPanel}
        </div>
      )}

      {/* Order History */}
      {showHistory && (
        <div style={{ marginTop: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.5rem" }}>Recent Orders</h2>
          {orders.length === 0 && (
            <div className="card" style={{ color: "#64748b", textAlign: "center" }}>No orders yet.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {orders.map(o => {
              const createdAt = new Date(o.created_at);
              const secondsAgo = Math.floor((now - createdAt.getTime()) / 1000);
              const canUndo = secondsAgo < 60;
              return (
                <div key={o.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.85rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(o.items || []).map(i => `${i.qty || 1}× ${i.name}`).join(", ")}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {createdAt.toLocaleTimeString()} · {o.total} NC · #{o.id}
                    </div>
                  </div>
                  {canUndo && (
                    <button onClick={() => undoOrder(o.id)} className="btn-danger" style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "0.5rem" }}>
                      Undo ({60 - secondsAgo}s)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </main>
  );
}

// ── Shared style constants ──────────────────────────────────────

const headerBtnStyle = { padding: "0.35rem 0.65rem", fontSize: "0.75rem" };
const statLabel = { fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" };
const qtyBtnStyle = {
  width: "28px",
  height: "28px",
  fontSize: "1rem",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "0.375rem",
  border: "1px solid #334155",
  background: "transparent",
  color: "#e2e8f0",
  cursor: "pointer",
};
