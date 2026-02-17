"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", starts_at: "", venue_name: "", address: "", genre: "", description: "", ticket_url: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const data = await apiFetch("/events");
      setEvents(data);
    } catch {}
    setLoading(false);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (editId) {
        await apiFetch(`/events/${editId}`, { method: "PUT", body: JSON.stringify(body) });
        showToast("Event updated");
      } else {
        await apiFetch("/events", { method: "POST", body: JSON.stringify(body) });
        showToast("Event created");
      }
      resetForm();
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
    setSaving(false);
  }

  function resetForm() {
    setForm({ title: "", starts_at: "", venue_name: "", address: "", genre: "", description: "", ticket_url: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(ev) {
    setForm({
      title: ev.title || "",
      starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : "",
      venue_name: ev.venue_name || "",
      address: ev.address || "",
      genre: ev.genre || "",
      description: ev.description || "",
      ticket_url: ev.ticket_url || "",
    });
    setEditId(ev.id);
    setShowForm(true);
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    try {
      await apiFetch(`/events/${id}`, { method: "DELETE" });
      showToast("Event deleted");
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
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Events</h1>
        <button className="btn-primary" onClick={() => { showForm ? resetForm() : setShowForm(true); }}>
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>
            {editId ? "Edit Event" : "Create Event"}
          </h2>
          <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Event title" />
            </div>
            <div className="form-group">
              <label>Date & Time</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Venue Name</label>
              <input value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} required placeholder="Venue name" />
            </div>
            <div className="form-group">
              <label>Genre</label>
              <input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder="e.g. Techno, House" />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Ticket URL</label>
              <input value={form.ticket_url} onChange={e => setForm({ ...form, ticket_url: e.target.value })} placeholder="Optional" />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional description" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Event" : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-scroll" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Venue</th>
              <th>Date</th>
              <th>Genre</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td style={{ fontWeight: 600 }}>{ev.title}</td>
                <td><span className="tag tag-purple">{ev.venue_name}</span></td>
                <td style={{ fontSize: "0.8rem" }}>{new Date(ev.starts_at).toLocaleString()}</td>
                <td>{ev.genre ? <span className="tag tag-cyan">{ev.genre}</span> : "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button onClick={() => startEdit(ev)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                    <button className="btn-danger" onClick={() => deleteEvent(ev.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
