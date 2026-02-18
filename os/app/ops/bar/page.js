"use client";
import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../lib/useNetworkStatus";
import { apiFetch as sharedApiFetch } from "../../lib/api";
import { isNfcSupported, scanUidOnce } from "../../lib/nfc";
import { useWakeLock } from "../../lib/useWakeLock";

export default function BarPOS() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastFailedOrder, setLastFailedOrder] = useState(null);
  const networkOnline = useNetworkStatus();
  useWakeLock();

  // NFC payment state
  const nfcAvailable = typeof window !== "undefined" && isNfcSupported();
  const [payState, setPayState] = useState("normal"); // normal | waitingForTap | submitting
  const [scannedUid, setScannedUid] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const venueId = typeof window !== "undefined" ? localStorage.getItem("pwl_venue_id") : null;

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function apiFetch(path, opts = {}) {
    return sharedApiFetch(path, opts);
  }

  async function loadMenu() {
    if (!token || !venueId) return;
    try { setMenu(await apiFetch(`/menu/${venueId}`)); } catch {}
    setLoading(false);
  }

  async function loadOrders() {
    if (!token || !venueId) return;
    try { setOrders(await apiFetch(`/orders/${venueId}`)); } catch {}
  }

  async function loadSummary() {
    if (!token) return;
    try { setSummary(await apiFetch("/shift/summary")); } catch {}
  }

  // ── Cart ──
  function addToCart(item) {
    if (payState !== "normal") return;
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, qty: 1, icon: item.icon, inventory_item_id: item.inventory_item_id }];
    });
  }

  function updateCartQty(menuItemId, delta) {
    if (payState !== "normal") return;
    setCart(prev => prev.map(c => c.menu_item_id === menuItemId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  }

  function clearCart() { setCart([]); setPayState("normal"); setScannedUid(null); }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartQtyMap = {};
  cart.forEach(c => { cartQtyMap[c.menu_item_id] = c.qty; });

  // ── NFC Payment Flow ──
  function startNfcPayment() {
    if (!nfcAvailable) {
      showToast("NFC required. Use an NFC-enabled device.", "error");
      return;
    }
    if (cart.length === 0) return;
    if (!networkOnline) { showToast("Cannot submit — network unavailable", "error"); return; }
    setPayState("waitingForTap");
    scanUidOnce({
      onUid: (uid) => {
        setScannedUid(uid);
        submitOrderWithUid(uid);
      },
      onError: (err) => {
        showToast(err.message || "NFC scan failed", "error");
        setPayState("normal");
      },
    });
  }

  function cancelNfcWait() {
    setPayState("normal");
    setScannedUid(null);
  }

  async function submitOrderWithUid(uid) {
    setPayState("submitting");
    setSubmitting(true);
    try {
      // Re-validate stock before submitting
      const freshMenu = await apiFetch(`/menu/${venueId}`);
      setMenu(freshMenu);
      for (const c of cart) {
        const item = freshMenu.find(m => m.id === c.menu_item_id);
        if (item && item.stock_qty != null && item.stock_qty < c.qty) {
          showToast(`Out of stock: ${c.name}`, "error");
          setPayState("normal");
          setSubmitting(false);
          return;
        }
      }

      const orderItems = cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, price: c.price, qty: c.qty, inventory_item_id: c.inventory_item_id }));
      const idempotency_key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const result = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          venue_id: Number(venueId),
          items: orderItems,
          payment_method: "wallet",
          uid_tag: uid,
          idempotency_key,
        }),
      });
      const orderId = result?.id || result?.order_id || "?";
      showToast(`Order #${orderId} confirmed — ${cartTotal} NC`, "success");
      clearCart();
      loadOrders();
      loadSummary();
      loadMenu();
    } catch (err) {
      const d = err.data || {};
      const msg = d.error === "OUT_OF_STOCK" ? `Out of stock: ${d.item}` :
                  d.error === "INSUFFICIENT_FUNDS" ? `Insufficient funds (need ${d.required} NC, have ${d.balance} NC)` :
                  d.error === "NO_ACTIVE_SESSION" ? "Guest must check in first" :
                  err.message || "Order failed";
      showToast(msg, "error");
      setLastFailedOrder([...cart]);
      setPayState("normal");
    } finally {
      setSubmitting(false);
    }
  }

  async function undoOrder(orderId) {
    try {
      await apiFetch(`/orders/${orderId}`, { method: "DELETE" });
      showToast("Order undone", "success");
      loadOrders(); loadSummary(); loadMenu();
    } catch (err) { showToast(err.message, "error"); }
  }

  function retryLastOrder() {
    if (!lastFailedOrder) return;
    setCart(lastFailedOrder);
    setLastFailedOrder(null);
    showToast("Cart restored from last failed order", "info");
  }

  // ── Derived ──
  const categories = ["All", ...Array.from(new Set(menu.map(m => m.category).filter(Boolean))).sort()];
  const filteredMenu = activeCategory === "All" ? menu : menu.filter(m => m.category === activeCategory);

  // ── Effects ──
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
    loadMenu(); loadOrders(); loadSummary();
    const t = setInterval(() => { loadMenu(); loadOrders(); }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Guards ──
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

  // ── NFC Not Supported Guard ──
  if (!nfcAvailable) {
    return (
      <main>
        <div className="card" style={{
          textAlign: "center", padding: "3rem",
          border: "1px solid #ef444440", background: "#ef444410",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>&#x26A0;</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.5rem" }}>
            NFC Required
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
            This device must support NFC to take payments. Use an NFC-enabled Android phone with Chrome.
          </div>
          <button onClick={() => { window.location.href = "/ops"; }} className="btn-secondary btn-press">
            Back to Ops
          </button>
        </div>
      </main>
    );
  }

  // ── Cart Panel ──
  const cartPanel = cart.length > 0 && (
    <div className={isMobile ? "cart-sticky" : "card"} style={!isMobile ? { alignSelf: "start", position: "sticky", top: "1rem" } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
          Cart <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>({cartCount})</span>
        </h2>
        {payState === "normal" && (
          <button onClick={clearCart} className="btn-press" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "#ef4444", border: "1px solid #ef444440", background: "transparent", borderRadius: "0.375rem", cursor: "pointer" }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {cart.map(c => (
          <div key={c.menu_item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.icon || "\uD83C\uDF79"} {c.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{c.price} x {c.qty} = {c.price * c.qty} NC</div>
            </div>
            {payState === "normal" && (
              <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => updateCartQty(c.menu_item_id, -1)} className="btn-press" style={qtyBtnStyle}>&minus;</button>
                <span style={{ width: "24px", textAlign: "center", fontSize: "0.85rem", fontWeight: 700 }}>{c.qty}</span>
                <button onClick={() => updateCartQty(c.menu_item_id, 1)} className="btn-press" style={qtyBtnStyle}>+</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #1e293b", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
        {payState === "normal" && (
          <button onClick={startNfcPayment} disabled={!networkOnline} className="btn-confirm">
            Confirm Order &mdash; {cartTotal} NC
          </button>
        )}
        {payState === "waitingForTap" && (
          <div>
            <div style={{
              padding: "1rem", marginBottom: "0.5rem", borderRadius: "0.75rem",
              background: "#06b6d410", border: "1px solid #06b6d440",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem", animation: "pulse 1.5s infinite" }}>&#x1F4F1;</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#06b6d4" }}>Guest tap NFC tag to pay</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Waiting for NFC tap...</div>
            </div>
            <button onClick={cancelNfcWait} className="btn-secondary btn-press" style={{ width: "100%" }}>
              Cancel
            </button>
          </div>
        )}
        {payState === "submitting" && (
          <div style={{ textAlign: "center", padding: "0.5rem" }}>
            <div className="spinner" style={{ width: "1.5rem", height: "1.5rem", margin: "0 auto 0.5rem" }} />
            <div style={{ fontSize: "0.85rem", color: "#a855f7" }}>Processing payment...</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──
  return (
    <main style={{ paddingBottom: isMobile && cart.length > 0 ? "220px" : "1rem" }}>
      {/* Submitting overlay */}
      {submitting && (
        <div className="submit-overlay">
          <div style={{ textAlign: "center" }}>
            <div className="spinner" style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto 1rem" }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#a855f7" }}>Processing payment...</div>
          </div>
        </div>
      )}

      {/* Offline banner */}
      {!networkOnline && (
        <div style={{
          marginBottom: "0.75rem", padding: "0.6rem 1rem", borderRadius: "0.5rem",
          background: "#ef444420", border: "1px solid #ef444460", color: "#ef4444",
          fontSize: "0.85rem", fontWeight: 700, textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
        }}>
          <span>Network unavailable</span>
          {lastFailedOrder && (
            <button onClick={retryLastOrder} className="btn-press" style={{
              padding: "0.3rem 0.7rem", fontSize: "0.75rem", fontWeight: 700,
              border: "1px solid #ef444460", borderRadius: "0.375rem",
              background: "#ef444430", color: "#ef4444", cursor: "pointer",
            }}>
              Retry Last
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Bar POS</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setShowStats(!showStats)} className="btn-secondary btn-press" style={headerBtnStyle}>
            {showStats ? "Hide Stats" : "Stats"}
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary btn-press" style={headerBtnStyle}>
            {showHistory ? "Hide" : "Orders"}
          </button>
          <button onClick={() => { window.location.href = "/ops"; }} className="btn-press" style={headerBtnStyle}>Back</button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && summary && (
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
                  <span key={t.name} className="tag tag-purple" style={{ fontSize: "0.7rem" }}>{t.name} x{t.count}</span>
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
            className="btn-press"
            style={{
              padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontWeight: 600,
              borderRadius: "9999px", whiteSpace: "nowrap",
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

      {/* Drink Grid + Cart */}
      <div style={{
        display: "grid",
        gridTemplateColumns: !isMobile && cart.length > 0 ? "1fr 280px" : "1fr",
        gap: "0.75rem",
      }}>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", alignContent: "start" }}>
          {filteredMenu.map(item => {
            const outOfStock = item.stock_qty != null && item.stock_qty <= 0;
            const lowStock = item.stock_qty != null && item.stock_qty > 0 && item.stock_qty <= (item.low_threshold || 5);
            const inCart = cartQtyMap[item.id];
            return (
              <button
                key={item.id}
                onClick={() => !outOfStock && addToCart(item)}
                disabled={outOfStock || payState !== "normal"}
                className="tile"
                style={outOfStock ? { opacity: 0.35, cursor: "not-allowed" } : payState !== "normal" ? { opacity: 0.6 } : {}}
              >
                {inCart > 0 && <span className="qty-badge">{inCart}</span>}
                <span style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>{item.icon || "\uD83C\uDF79"}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: outOfStock ? "#ef4444" : "#e2e8f0", lineHeight: 1.2 }}>{item.name}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a855f7", marginTop: "0.15rem" }}>{item.price} NC</span>
                {item.stock_qty != null && (
                  <span style={{
                    fontSize: "0.6rem", marginTop: "0.2rem",
                    color: outOfStock ? "#ef4444" : lowStock ? "#f97316" : "#64748b",
                  }}>
                    {outOfStock ? "OUT OF STOCK" : `${item.stock_qty} left`}
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
        {!isMobile && cartPanel}
      </div>
      {isMobile && cartPanel}

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
                      {(o.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(", ")}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {createdAt.toLocaleTimeString()} &middot; {o.total} NC &middot; #{o.id}
                    </div>
                  </div>
                  {canUndo && (
                    <button onClick={() => undoOrder(o.id)} className="btn-danger btn-press" style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "0.5rem" }}>
                      Undo ({60 - secondsAgo}s)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </main>
  );
}

const headerBtnStyle = { padding: "0.35rem 0.65rem", fontSize: "0.75rem" };
const statLabel = { fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" };
const qtyBtnStyle = {
  width: "32px", height: "32px", fontSize: "1.1rem", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "0.375rem", border: "1px solid #334155",
  background: "transparent", color: "#e2e8f0", cursor: "pointer",
};
