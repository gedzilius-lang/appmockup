export const metadata = { title: "Privacy Policy — PeopleWeLike" };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>Last updated: March 2026</p>

      <Section title="1. Data We Collect">
        When you use PWL we collect: account information (email, hashed password); usage data (check-ins, orders, XP events); vendor application data; analytics events (page views, interactions). We do not collect payment card details directly.
      </Section>

      <Section title="2. How We Use Your Data">
        We use your data to: operate the Platform; personalise your experience (rewards, quests); communicate service updates; improve the Platform through aggregated analytics; comply with legal obligations.
      </Section>

      <Section title="3. Data Sharing">
        We do not sell your personal data. We share data with: vendors only when you transact with them; service providers (hosting, monitoring) under data-processing agreements; authorities when required by law.
      </Section>

      <Section title="4. Cookies & Tracking">
        We use functional cookies (session tokens) and analytics. We do not use third-party advertising cookies. You can disable cookies in your browser, though some features may break.
      </Section>

      <Section title="5. Data Retention">
        Account data is retained while your account is active plus 2 years. Anonymised analytics may be retained indefinitely. You may request deletion at any time.
      </Section>

      <Section title="6. Your Rights">
        Under GDPR / Swiss nFADP you have rights to: access; rectification; erasure; portability; objection to processing. Submit requests to <a href="mailto:privacy@peoplewelike.club">privacy@peoplewelike.club</a>.
      </Section>

      <Section title="7. Security">
        We use TLS in transit and bcrypt for passwords. No system is 100% secure. Please report vulnerabilities to <a href="mailto:security@peoplewelike.club">security@peoplewelike.club</a>.
      </Section>

      <Section title="8. Contact">
        Data Controller: PeopleWeLike, Zurich, Switzerland. Email: <a href="mailto:privacy@peoplewelike.club">privacy@peoplewelike.club</a>
      </Section>

      <LegalNav />
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#06b6d4", marginBottom: "0.4rem" }}>{title}</h2>
      <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{children}</p>
    </section>
  );
}

function LegalNav() {
  return (
    <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #1e1e2e", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      {[
        { href: "/terms", label: "Terms of Service" },
        { href: "/returns", label: "Returns Policy" },
        { href: "/prohibited-items", label: "Prohibited Items" },
        { href: "/", label: "← Home" },
      ].map(({ href, label }) => (
        <a key={href} href={href} style={{ color: "#64748b", fontSize: "0.8rem" }}>{label}</a>
      ))}
    </div>
  );
}
