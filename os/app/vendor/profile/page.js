"use client";
import { useState, useEffect } from "react";

export default function VendorProfilePage() {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile"); // profile | products
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("pwl_vendor_token");
    if (!t) { window.location.href = "/vendor"; return; }
    setToken(t);
    loadData(t);
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function apiFetch(path, options = {}) {
    const t = localStorage.getItem("pwl_vendor_token");
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...options.headers },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) { localStorage.removeItem("pwl_vendor_token"); window.location.href = "/vendor"; }
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function loadData(t) {
    try {
      const [p, prods] = await Promise.all([
        fetch("/api/vendor/profile", { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
        fetch("/api/vendor/products", { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      ]);
      setProfile(p);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch {}
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem("pwl_vendor_token");
    window.location.href = "/vendor";
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><div className="spinner" /></div>;
  if (!profile || profile.error) return (
    <main style={{ maxWidth: 480, margin: "3rem auto", textAlign: "center" }}>
      <p style={{ color: "#64748b" }}>Vendor profile not found. Contact support.</p>
      <button onClick={logout} style={{ marginTop: "1rem", color: "#64748b", background: "transparent", border: "none", cursor: "pointer" }}>Sign out</button>
    </main>
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>{profile.business_name}</h1>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>/{profile.slug}</span>
          {!profile.active && <span style={{ marginLeft: "0.75rem", background: "#f9731620", color: "#f97316", padding: "0.1rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 600 }}>Inactive</span>}
        </div>
        <button onClick={logout} style={{ fontSize: "0.8rem", color: "#64748b", background: "transparent", border: "1px solid #1e1e2e", borderRadius: "0.375rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>Sign Out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #1e1e2e", paddingBottom: "0" }}>
        {["profile", "products"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "transparent", border: "none", padding: "0.5rem 1rem", cursor: "pointer",
            color: tab === t ? "#a855f7" : "#64748b", fontWeight: tab === t ? 700 : 400,
            borderBottom: tab === t ? "2px solid #a855f7" : "2px solid transparent",
            fontSize: "0.9rem", marginBottom: "-1px",
          }}>{t === "profile" ? "Profile" : `Products (${products.filter(p => p.active).length})`}</button>
        ))}
      </div>

      {tab === "profile" && <ProfileEditor profile={profile} setProfile={setProfile} apiFetch={apiFetch} showToast={showToast} />}
      {tab === "products" && <ProductsManager products={products} setProducts={setProducts} apiFetch={apiFetch} showToast={showToast} />}

      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", right: "1.5rem",
          background: toast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", padding: "0.75rem 1.25rem", borderRadius: "0.5rem",
          fontWeight: 600, fontSize: "0.9rem", zIndex: 999,
        }}>{toast.msg}</div>
      )}
    </main>
  );
}

function ProfileEditor({ profile, setProfile, apiFetch, showToast }) {
  const [form, setForm] = useState({
    description: profile.description || "",
    logo_url: profile.logo_url || "",
    website: profile.website || "",
    instagram: profile.instagram || "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch("/vendor/profile", { method: "PUT", body: JSON.stringify(form) });
      setProfile(updated);
      showToast("Profile saved");
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Edit Profile</h2>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Field label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Tell customers about your brand…" style={{ resize: "vertical", width: "100%" }} />
        </Field>
        <Field label="Logo URL">
          <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" style={{ width: "100%" }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Website">
            <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourbrand.com" />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
          </Field>
        </div>
        <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: "flex-start", padding: "0.5rem 1.5rem" }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function ProductsManager({ products, setProducts, apiFetch, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", image_url: "", stock: "" });
  const [saving, setSaving] = useState(false);

  async function addProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await apiFetch("/vendor/products", {
        method: "POST",
        body: JSON.stringify({ ...form, price: Math.round(Number(form.price) * 100), stock: form.stock ? Number(form.stock) : null }),
      });
      setProducts(prev => [p, ...prev]);
      setForm({ name: "", description: "", price: "", category: "", image_url: "", stock: "" });
      setShowForm(false);
      showToast("Product added");
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  async function toggleProduct(id, active) {
    try {
      const updated = await apiFetch(`/vendor/products/${id}`, { method: "PUT", body: JSON.stringify({ active: !active }) });
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      showToast(!active ? "Product activated" : "Product deactivated");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/vendor/products/${id}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("Product deleted");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Products</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
          <form onSubmit={addProduct} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Field label="Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Product name" /></Field>
              <Field label="Price (CHF) *"><input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required placeholder="0.00" /></Field>
            </div>
            <Field label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: "vertical", width: "100%" }} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Field label="Category"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Clothing" /></Field>
              <Field label="Stock (optional)"><input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Leave blank = unlimited" /></Field>
            </div>
            <Field label="Image URL"><input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" /></Field>
            <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: "flex-start", padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
              {saving ? "Adding…" : "Add Product"}
            </button>
          </form>
        </div>
      )}

      {products.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No products yet. Add your first product above.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", opacity: p.active ? 1 : 0.5 }}>
              {p.image_url && <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: "0.375rem", objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  CHF {(p.price / 100).toFixed(2)}{p.category && ` · ${p.category}`}{p.stock != null && ` · Stock: ${p.stock}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                <button onClick={() => toggleProduct(p.id, p.active)} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", background: "transparent", border: "1px solid #334155", borderRadius: "0.375rem", color: "#94a3b8", cursor: "pointer" }}>
                  {p.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => deleteProduct(p.id)} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", background: "transparent", border: "1px solid #ef4444", borderRadius: "0.375rem", color: "#ef4444", cursor: "pointer" }}>
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>{label}</label>
      {children}
    </div>
  );
}
