"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function MenuPage() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [items, setItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", price: "", icon: "", inventory_item_id: "", display_order: "0", active: true });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setForm({ name: "", category: "", price: "", icon: "", inventory_item_id: "", display_order: "0", active: true });
    setShowForm(false);
    setEditId(null);
  }

  async function loadVenues() {
    try {
      const data = await apiFetch("/venues");
      setVenues(data);
      if (data.length > 0 && !venueId) setVenueId(String(data[0].id));
    } catch {}
    setLoading(false);
  }

  async function loadMenu() {
    if (!venueId) return;
    try {
      const data = await apiFetch(`/menu/${venueId}`);
      setItems(data);
    } catch {}
  }

  async function loadInventory() {
    if (!venueId) return;
    try {
      const data = await apiFetch(`/inventory/${venueId}`);
      setInventoryItems(data);
    } catch {}
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        venue_id: Number(venueId),
        name: form.name,
        category: form.category || null,
        price: Number(form.price),
        icon: form.icon || null,
        inventory_item_id: form.inventory_item_id ? Number(form.inventory_item_id) : null,
        display_order: Number(form.display_order) || 0,
        active: form.active,
      };
      if (editId) {
        await apiFetch(`/menu/${editId}`, { method: "PUT", body: JSON.stringify(body) });
        showToast("Menu item updated");
      } else {
        await apiFetch("/menu", { method: "POST", body: JSON.stringify(body) });
        showToast("Menu item created");
      }
      resetForm();
      await loadMenu();
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  function startEdit(item) {
    setForm({
      name: item.name || "",
      category: item.category || "",
      price: String(item.price ?? ""),
      icon: item.icon || "",
      inventory_item_id: item.inventory_item_id ? String(item.inventory_item_id) : "",
      display_order: String(item.display_order ?? 0),
      active: item.active !== false,
    });
    setEditId(item.id);
    setShowForm(true);
  }

  async function deleteItem(id) {
    if (!confirm("Deactivate this menu item?")) return;
    try {
      await apiFetch(`/menu/${id}`, { method: "DELETE" });
      showToast("Menu item deactivated");
      await loadMenu();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  useEffect(() => { loadVenues(); }, []);
  useEffect(() => { if (venueId) { loadMenu(); loadInventory(); } }, [venueId]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Menu Items</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ width: "auto" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => { showForm ? resetForm() : setShowForm(true); }}>
            {showForm ? "Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>
            {editId ? "Edit Menu Item" : "Add Menu Item"}
          </h2>
          <form onSubmit={save} className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Pilsner" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beer, Wine, Cocktails" />
            </div>
            <div className="form-group">
              <label>Price (NC)</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="5" min="0" />
            </div>
            <div className="form-group">
              <label>Icon (emoji)</label>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🍺" />
            </div>
            <div className="form-group">
              <label>Linked Inventory</label>
              <select value={form.inventory_item_id} onChange={e => setForm({ ...form, inventory_item_id: e.target.value })}>
                <option value="">— None —</option>
                {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.item} (qty: {inv.qty})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label title="Controls the order shown in the POS grid (lower number appears first)">Display Order <span style={{ cursor: "help", color: "#64748b", fontSize: "0.7rem" }}>[?]</span></label>
              <input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} placeholder="0" />
            </div>
            {editId && (
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
                <label style={{ margin: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                  Active
                </label>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Item" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-scroll" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Inventory Link</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id}>
                <td style={{ fontSize: "1.2rem" }}>{x.icon || "—"}</td>
                <td style={{ fontWeight: 600 }}>{x.name}</td>
                <td>{x.category ? <span className="tag tag-cyan">{x.category}</span> : "—"}</td>
                <td style={{ fontWeight: 700 }}>{x.price} NC</td>
                <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {x.inventory_item_id ? `#${x.inventory_item_id} (${x.stock_qty ?? "?"} in stock)` : "—"}
                </td>
                <td style={{ color: "#64748b" }}>{x.display_order}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button onClick={() => startEdit(x)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                    <button className="btn-danger" onClick={() => deleteItem(x.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No menu items for this venue.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
