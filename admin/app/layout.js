export const metadata = { title: "PWL Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <a href="/" style={{ fontWeight: 800, textDecoration: "none" }}>Admin</a>
            <a href="https://os.peoplewelike.club" target="_blank">OS</a>
            <a href="https://api.peoplewelike.club/health" target="_blank">API</a>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
