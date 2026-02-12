"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "Zurich", pin: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const data = await apiFetch("/venues");
      setVenues(data);
    } catch {}
    setLoading(false);
  }

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/venues", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          pin: form.pin,
          capacity: form.capacity ? Number(form.capacity) : null,
        }),
      });
      setForm({ name: "", city: "Zurich", pin: "", capacity: "" });
      setShowForm(false);
      showToast("Venue created");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  async function deleteVenue(id, name) {
    if (!confirm(`Delete venue "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/venues/${id}`, { method: "DELETE" });
      showToast("Venue deleted");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Venues</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Venue"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Create Venue</h2>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Venue name" />
            </div>
            <div className="form-group">
              <label>City</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Zurich" />
            </div>
            <div className="form-group">
              <label>PIN</label>
              <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} required placeholder="Staff access PIN" />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="Optional" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating..." : "Create Venue"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>PIN</th>
              <th>Capacity</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {venues.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 600 }}>{v.name}</td>
                <td>{v.city}</td>
                <td style={{ fontFamily: "monospace", color: "#64748b" }}>{"*".repeat(Math.max(v.pin?.length || 4, 4))}</td>
                <td>{v.capacity || "—"}</td>
                <td style={{ color: "#64748b", fontSize: "0.8rem" }}>{new Date(v.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-danger" onClick={() => deleteVenue(v.id, v.name)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {venues.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No venues yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
