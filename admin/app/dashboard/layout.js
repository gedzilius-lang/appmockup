"use client";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "\u25A3" },
  { href: "/dashboard/venues", label: "Venues", icon: "\u2302" },
  { href: "/dashboard/events", label: "Events", icon: "\u2606" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "\u25A4" },
  { href: "/dashboard/menu", label: "Menu", icon: "\u2637" },
  { href: "/dashboard/quests", label: "Quests", icon: "\u2694" },
  { href: "/dashboard/rules", label: "Rules", icon: "\u26A1" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "\u2261" },
  { href: "/dashboard/logs", label: "Logs", icon: "\u25C9" },
];

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}

function DashboardInner({ children }) {
  const { token, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !token) {
      window.location.href = "/";
    }
  }, [ready, token]);

  if (!ready || !token) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: 220,
        background: "#0d0d14",
        borderRight: "1px solid #1e1e2e",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #1e1e2e" }}>
          <a href="/dashboard" style={{
            fontWeight: 800,
            fontSize: "1rem",
            color: "#a855f7",
            textDecoration: "none",
          }}>
            PWL Admin
          </a>
        </div>
        <nav style={{ flex: 1, padding: "0.5rem 0" }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 1rem",
                fontSize: "0.85rem",
                color: "#94a3b8",
                textDecoration: "none",
                transition: "all 0.15s",
                borderLeft: "2px solid transparent",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#14141f";
                e.currentTarget.style.color = "#e2e8f0";
                e.currentTarget.style.borderLeftColor = "#a855f7";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderLeftColor = "transparent";
              }}
            >
              <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid #1e1e2e", padding: "1rem" }}>
          <a
            href="https://os.peoplewelike.club"
            target="_blank"
            style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem", textDecoration: "none" }}
          >
            View OS Site &rarr;
          </a>
          <button
            onClick={() => { logout(); window.location.href = "/"; }}
            style={{
              background: "transparent",
              border: "1px solid #1e1e2e",
              color: "#64748b",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: "0.4rem 0.75rem",
              borderRadius: "0.375rem",
              width: "100%",
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto", background: "#0a0a0f" }}>
        {children}
      </main>
    </div>
  );
}
