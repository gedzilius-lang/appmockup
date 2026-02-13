import "./globals.css";

export const metadata = { title: "PWL Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#e2e8f0" }}>
        {children}
      </body>
    </html>
  );
}
