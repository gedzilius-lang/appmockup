import "./globals.css";
import { AuthProvider } from "./lib/auth";

export const metadata = { title: "PeopleWeLike OS" };

function NavInner() {
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      padding: "0.75rem 1.5rem",
      background: "#14141f",
      borderBottom: "1px solid #1e1e2e",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      <a href="/" style={{
        fontWeight: 800,
        fontSize: "1.1rem",
        color: "#a855f7",
        textDecoration: "none",
        letterSpacing: "-0.02em",
      }}>
        PWL
        <span style={{ color: "#64748b", fontWeight: 400, fontSize: "0.8rem", marginLeft: "0.4rem" }}>Zurich</span>
      </a>
      <div style={{ display: "flex", gap: "1rem", marginLeft: "auto", alignItems: "center" }}>
        <a href="/radio" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", padding: "0.25rem 0", borderBottom: "2px solid transparent", transition: "all 0.2s" }}>Radio</a>
        <a href="/ops" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", padding: "0.25rem 0", borderBottom: "2px solid transparent", transition: "all 0.2s" }}>Ops</a>
        <a href="/guest" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", padding: "0.25rem 0", borderBottom: "2px solid transparent", transition: "all 0.2s" }}>Guest</a>
        <a href="https://admin.peoplewelike.club" target="_blank" style={{ fontSize: "0.75rem", color: "#0a0a0f", textDecoration: "none", background: "#a855f7", padding: "0.3rem 0.75rem", borderRadius: "0.375rem", fontWeight: 600 }}>Admin</a>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#e2e8f0" }}>
        <AuthProvider>
          <NavInner />
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem" }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
