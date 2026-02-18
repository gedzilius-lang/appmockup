"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export default function WalletPage() {
  const [uid, setUid] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);
  const [pendingHighValue, setPendingHighValue] = useState(false);
  const [errors, setErrors] = useState({});

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function validate() {
    const e = {};
    const amt = Number(amount);
    if (!amt || amt <= 0) e.amount = true;
    if (!uid.trim() && !sessionId.trim()) { e.uid = true; e.session = true; }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function topUp() {
    if (!validate()) return;
    const amt = Number(amount);
    if (amt >= 200 && !pendingHighValue) {
      setPendingHighValue(true);
      showToast(`High value: ${amt} NC. Press again to confirm.`, "error");
      return;
    }
    setPendingHighValue(false);
    setLoading(true);
    setResult(null);
    try {
      const body = { amount: amt };
      if (sessionId.trim()) body.session_id = Number(sessionId);
      else if (uid.trim()) body.uid_tag = uid.trim();
      const j = await apiFetch("/wallet/topup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult({ amount: amt, balance: j.new_balance });
      showToast(`+${amt} NC. New balance: ${j.new_balance} NC`, "success");
      setAmount("");
      setUid("");
      setSessionId("");
      setErrors({});
    } catch (err) {
      showToast(err.message || "Top-up failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 800 }}>Wallet Top-Up</h1>

      <div className="card" style={{
        maxWidth: 480,
        border: "1px solid #a855f740",
        boxShadow: "0 0 20px #a855f715",
        background: "linear-gradient(135deg, #14141f 0%, #1a1028 100%)",
        padding: "1.5rem",
      }}>
        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
              UID Tag
            </label>
            <input
              placeholder="Scan or type UID"
              value={uid}
              onChange={e => { setUid(e.target.value); setErrors(p => ({ ...p, uid: false, session: false })); }}
              className={errors.uid ? "input-error" : ""}
              style={{ width: "100%", fontSize: "0.9rem", padding: "0.5rem 0.65rem" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
              Session ID <span style={{ color: "#475569" }}>(alternative to UID)</span>
            </label>
            <input
              placeholder="Session ID"
              value={sessionId}
              onChange={e => { setSessionId(e.target.value); setErrors(p => ({ ...p, uid: false, session: false })); }}
              className={errors.session ? "input-error" : ""}
              style={{ width: "100%", fontSize: "0.9rem", padding: "0.5rem 0.65rem" }}
            />
          </div>
        </div>

        <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
          Amount (NC)
        </label>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          {QUICK_AMOUNTS.map(a => (
            <button
              key={a}
              className="chip"
              onClick={() => { setAmount(String(a)); setErrors(p => ({ ...p, amount: false })); setPendingHighValue(false); }}
              style={amount === String(a) ? { borderColor: "#a855f7", background: "#a855f720", color: "#a855f7" } : {}}
            >
              +{a}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            placeholder="Custom amount"
            min="1"
            value={amount}
            onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: false })); setPendingHighValue(false); }}
            onKeyDown={e => e.key === "Enter" && topUp()}
            className={errors.amount ? "input-error" : ""}
            style={{ flex: 1, fontSize: "1.1rem", fontWeight: 700, padding: "0.6rem 0.75rem" }}
          />
          <button
            onClick={topUp}
            disabled={loading}
            className={`${pendingHighValue ? "btn-danger" : "btn-confirm"} btn-press`}
            style={{ padding: "0.6rem 1.5rem", fontSize: "0.95rem", whiteSpace: "nowrap" }}
          >
            {loading ? "..." : pendingHighValue ? `Confirm ${amount} NC` : "Top Up"}
          </button>
        </div>

        {pendingHighValue && (
          <div style={{
            marginTop: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
            background: "#f9731615", border: "1px solid #f9731640", color: "#f97316",
            fontSize: "0.85rem", fontWeight: 600,
          }}>
            High-value top-up ({amount} NC). Press confirm to proceed.
          </div>
        )}

        {result && (
          <div style={{
            marginTop: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
            background: "#22c55e15", border: "1px solid #22c55e40", color: "#22c55e",
            fontSize: "0.9rem", fontWeight: 600,
          }}>
            +{result.amount} NC. New balance: {result.balance} NC
          </div>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
