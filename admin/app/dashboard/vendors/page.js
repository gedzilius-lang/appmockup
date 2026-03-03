"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const STATUS_COLORS = {
  pending: "#f97316",
  approved: "#22c55e",
  rejected: "#ef4444",
};

export default function VendorsPage() {
  const [tab, setTab] = useState("applications"); // applications | vendors
  const [statusFilter, setStatusFilter] = useState("pending");
  const [applications, setApplications] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // { application }
  const [approveForm, setApproveForm] = useState({ temp_password: "", notes: "" });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [working, setWorking] = useState(false);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadApplications() {
    try {
      const data = await apiFetch(`/admin/vendor-applications?status=${statusFilter}`);
      setApplications(data);
    } catch {}
  }

  async function loadVendors() {
    try {
      const data = await apiFetch("/admin/vendors");
      setVendors(data);
    } catch {}
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadApplications(), loadVendors()]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function approve() {
    if (!approveModal) return;
    if (!approveForm.temp_password) { showToast("Temporary password required", "error"); return; }
    setWorking(true);
    try {
      await apiFetch(`/admin/vendor-applications/${approveModal.id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ temp_password: approveForm.temp_password, notes: approveForm.notes }),
      });
      showToast(`${approveModal.business_name} approved — vendor account created`);
      setApproveModal(null);
      setApproveForm({ temp_password: "", notes: "" });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
    setWorking(false);
  }

  async function reject() {
    if (!rejectModal) return;
    setWorking(true);
    try {
      await apiFetch(`/admin/vendor-applications/${rejectModal.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ notes: rejectNotes }),
      });
      showToast(`Application rejected`);
      setRejectModal(null);
      setRejectNotes("");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
    setWorking(false);
  }

  async function toggleVendor(id) {
    try {
      const r = await apiFetch(`/admin/vendors/${id}/toggle`, { method: "PUT" });
      showToast(r.active ? "Vendor activated" : "Vendor deactivated");
      setVendors(prev => prev.map(v => v.id === id ? { ...v, active: r.active } : v));
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;

  const pendingCount = applications.filter(a => a.status === "pending").length;

  return (
    <div>
      <h1 style={{ margin: "0 0 1.25rem", fontSize: "1.5rem", fontWeight: 800 }}>Vendors</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid #1e1e2e" }}>
        {[
          { key: "applications", label: `Applications${statusFilter === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          { key: "vendors", label: `Active Vendors (${vendors.filter(v => v.active).length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "transparent", border: "none", padding: "0.5rem 1rem", cursor: "pointer",
            color: tab === t.key ? "#a855f7" : "#64748b", fontWeight: tab === t.key ? 700 : 400,
            borderBottom: tab === t.key ? "2px solid #a855f7" : "2px solid transparent",
            fontSize: "0.9rem", marginBottom: "-1px",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── Applications Tab ─────────────────── */}
      {tab === "applications" && (
        <div>
          {/* Status filter */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {["pending", "approved", "rejected", "all"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: "0.3rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600,
                border: `1px solid ${statusFilter === s ? "#a855f7" : "#1e1e2e"}`,
                background: statusFilter === s ? "#a855f720" : "transparent",
                color: statusFilter === s ? "#a855f7" : "#64748b",
                cursor: "pointer",
              }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>

          {applications.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
              No {statusFilter === "all" ? "" : statusFilter} applications.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {applications.map(a => (
                <div key={a.id} className="card" style={{ padding: "1rem 1.25rem" }}>
                  {/* Card layout: mobile-first flex column, row on wider */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{a.business_name}</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.1rem 0.5rem", borderRadius: "9999px", background: `${STATUS_COLORS[a.status]}20`, color: STATUS_COLORS[a.status] }}>
                          {a.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.2rem" }}>{a.contact_name} · <a href={`mailto:${a.email}`} style={{ color: "#06b6d4" }}>{a.email}</a>{a.phone && ` · ${a.phone}`}</div>
                      {a.category && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.15rem" }}>{a.category}</div>}
                      {a.description && <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}>{a.description.slice(0, 160)}{a.description.length > 160 ? "…" : ""}</p>}
                      {a.notes && <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#64748b", fontStyle: "italic" }}>Notes: {a.notes}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.72rem", color: "#475569" }}>{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => { setApproveModal(a); setApproveForm({ temp_password: "", notes: "" }); }}
                            style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem", background: "#22c55e20", border: "1px solid #22c55e", borderRadius: "0.375rem", color: "#22c55e", cursor: "pointer", fontWeight: 600 }}
                          >Approve</button>
                          <button
                            onClick={() => { setRejectModal(a); setRejectNotes(""); }}
                            style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem", background: "#ef444420", border: "1px solid #ef4444", borderRadius: "0.375rem", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}
                          >Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Vendors Tab ──────────────────────── */}
      {tab === "vendors" && (
        <div>
          {vendors.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
              No approved vendors yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {vendors.map(v => (
                <div key={v.id} className="card" style={{ padding: "1rem 1.25rem", opacity: v.active ? 1 : 0.6 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700 }}>{v.business_name}</span>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>/{v.slug}</span>
                        {!v.active && <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", background: "#f9731620", color: "#f97316", fontWeight: 600 }}>Inactive</span>}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                        <a href={`mailto:${v.email}`} style={{ color: "#06b6d4" }}>{v.email}</a>
                        {v.category && ` · ${v.category}`}
                        {` · ${v.product_count} product${v.product_count !== "1" ? "s" : ""}`}
                      </div>
                      {v.description && <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>{v.description.slice(0, 120)}{v.description.length > 120 ? "…" : ""}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.72rem", color: "#475569" }}>{new Date(v.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => toggleVendor(v.id)}
                        style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem", background: "transparent", border: `1px solid ${v.active ? "#ef4444" : "#22c55e"}`, borderRadius: "0.375rem", color: v.active ? "#ef4444" : "#22c55e", cursor: "pointer", fontWeight: 600 }}
                      >{v.active ? "Deactivate" : "Activate"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Approve Modal ────────────────────── */}
      {approveModal && (
        <Modal title={`Approve: ${approveModal.business_name}`} onClose={() => setApproveModal(null)}>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            This will create a vendor account for <strong style={{ color: "#e2e8f0" }}>{approveModal.email}</strong> with role VENDOR. Send them the temporary password separately.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Temporary Password *</label>
              <input
                type="text"
                value={approveForm.temp_password}
                onChange={e => setApproveForm(f => ({ ...f, temp_password: e.target.value }))}
                placeholder="e.g. Welcome2024!"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Internal Notes (optional)</label>
              <textarea
                value={approveForm.notes}
                onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Approved by team, met at market event…"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setApproveModal(null)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={approve} disabled={working} className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                {working ? "Approving…" : "Approve & Create Account"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Reject Modal ─────────────────────── */}
      {rejectModal && (
        <Modal title={`Reject: ${rejectModal.business_name}`} onClose={() => setRejectModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Reason / Notes (optional)</label>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Does not meet marketplace guidelines…"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={reject} disabled={working} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", background: "#ef444420", border: "1px solid #ef4444", borderRadius: "0.5rem", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>
                {working ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
