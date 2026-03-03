"use client";
import { useState } from "react";

const CATEGORIES = [
  "Food & Drink",
  "Fashion & Accessories",
  "Art & Prints",
  "Music & Merch",
  "Beauty & Wellness",
  "Electronics & Tech",
  "Vinyl & Collectibles",
  "Other",
];

export default function ApplyPage() {
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    category: "",
    description: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <main style={{ maxWidth: 560, margin: "4rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e", marginBottom: "0.5rem" }}>Application Received</h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          Thanks for applying! We review applications within 3–5 business days and will email you at <strong style={{ color: "#e2e8f0" }}>{form.email}</strong>.
        </p>
        <a href="/" style={{
          display: "inline-block", marginTop: "1.5rem",
          background: "#a855f7", color: "#fff", padding: "0.6rem 1.5rem",
          borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
        }}>
          Back to Home
        </a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.4rem" }}>
          Become a <span style={{ color: "#a855f7" }}>PWL Vendor</span>
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Sell your products to Zurich's nightlife community. Applications reviewed within 3–5 business days.
        </p>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FieldGroup label="Business Name *">
              <input
                value={form.business_name}
                onChange={set("business_name")}
                placeholder="Your brand or business"
                required
              />
            </FieldGroup>
            <FieldGroup label="Contact Name *">
              <input
                value={form.contact_name}
                onChange={set("contact_name")}
                placeholder="Your full name"
                required
              />
            </FieldGroup>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FieldGroup label="Email *">
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="hello@yourbrand.com"
                required
              />
            </FieldGroup>
            <FieldGroup label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+41 79 000 0000"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Category">
            <select value={form.category} onChange={set("category")}>
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Tell us about your business">
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="What do you sell? What makes your brand special? Any existing online presence?"
              rows={4}
              style={{ resize: "vertical" }}
            />
          </FieldGroup>

          {status === "error" && (
            <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: "0.5rem", padding: "0.75rem 1rem", color: "#ef4444", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={status === "submitting"}
            style={{ marginTop: "0.25rem", padding: "0.75rem" }}
          >
            {status === "submitting" ? "Submitting…" : "Submit Application"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <p style={{ color: "#64748b", fontSize: "0.8rem", lineHeight: 1.6 }}>
          By applying you agree to our{" "}
          <a href="/terms">Terms of Service</a>,{" "}
          <a href="/prohibited-items">Prohibited Items policy</a>, and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>{label}</label>
      {children}
    </div>
  );
}
