import "./globals.css";
import { AuthProvider } from "./lib/auth";

export const metadata = { title: "PWL Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#e2e8f0" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
