import "./globals.css";

export const metadata = { title: "PWL Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, background: "#0a0a0f", color: "#e2e8f0" }}>
        {children}
      </body>
    </html>
  );
}
