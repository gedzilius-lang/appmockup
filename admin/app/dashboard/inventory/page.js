"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

function qtyColor(qty, threshold) {
  if (qty <= 0) return "#ef4444";
  if (qty <= threshold) return "#f97316";
  return "#22c55e";
}

function qtyLabel(qty, threshold) {
  if (qty <= 0) return "OUT";
  if (qty <= threshold) return "LOW";
  return "OK";
}

export default function InventoryPage() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item: "", qty: "", low_threshold: "5" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  async function loadInventory() {
    if (!venueId) return;
    try {
      const data = await apiFetch(`/inventory/${venueId}`);
      setItems(data);
    } catch {}
  }

  async function addItem(e) {
    e.preventDefault();
    if (!venueId) return;
    setSaving(true);
    try {
      await apiFetch(`/inventory/${venueId}`, {
        method: "POST",
        body: JSON.stringify({
          item: form.item,
          qty: Number(form.qty),
          low_threshold: Number(form.low_threshold),
        }),
      });
      setForm({ item: "", qty: "", low_threshold: "5" });
      setShowForm(false);
      showToast("Item added");
      await loadInventory();
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  async function updateQty(id, newQty) {
    try {
      await apiFetch(`/inventory/${venueId}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ qty: newQty }),
      });
      await loadInventory();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function restockAll() {
    if (!confirm("Restock all items to 50?")) return;
    try {
      for (const item of items) {
        await apiFetch(`/inventory/${venueId}/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ qty: 50 }),
        });
      }
      showToast("All items restocked to 50");
      await loadInventory();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  useEffect(() => { loadVenues(); }, []);
  useEffect(() => { if (venueId) loadInventory(); }, [venueId]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Inventory</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ width: "auto" }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={restockAll} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Restock All</button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Add Item</h2>
          <form onSubmit={addItem} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Item Name</label>
              <input value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} required placeholder="e.g. Beer" />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} required placeholder="50" />
            </div>
            <div className="form-group">
              <label>Low Threshold</label>
              <input type="number" value={form.low_threshold} onChange={e => setForm({ ...form, low_threshold: e.target.value })} placeholder="5" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Adding..." : "Add Item"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => {
              const color = qtyColor(x.qty, x.low_threshold);
              const label = qtyLabel(x.qty, x.low_threshold);
              return (
                <tr key={x.id}>
                  <td style={{ fontWeight: 600 }}>{x.item}</td>
                  <td style={{ color, fontWeight: 700 }}>{x.qty}</td>
                  <td style={{ color: "#64748b" }}>{x.low_threshold}</td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      background: `${color}20`,
                      color: color,
                      border: `1px solid ${color}40`,
                    }}>
                      {label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button onClick={() => updateQty(x.id, x.qty + 10)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>+10</button>
                      <button onClick={() => updateQty(x.id, x.qty + 50)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>+50</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No inventory items for this venue.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
