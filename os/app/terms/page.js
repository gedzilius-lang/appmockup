export const metadata = { title: "Terms of Service — PeopleWeLike" };

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>Terms of Service</h1>
      <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>Last updated: March 2026</p>

      <Section title="1. Acceptance">
        By accessing or using PeopleWeLike ("PWL", "the Platform"), you agree to be bound by these Terms. If you do not agree, do not use the Platform.
      </Section>

      <Section title="2. Description of Service">
        PWL is a nightlife discovery, venue check-in, and community marketplace platform operating in Zurich and expanding internationally. We connect guests with venues and independent vendors.
      </Section>

      <Section title="3. User Accounts">
        You are responsible for maintaining the confidentiality of your credentials. You must be at least 18 years old to register. You may not share accounts or impersonate others.
      </Section>

      <Section title="4. Marketplace & Vendors">
        Vendors operate independently. PWL acts as a platform intermediary and is not a party to transactions between vendors and buyers. Vendors are solely responsible for their listings, pricing, and fulfilment. See our <a href="/prohibited-items">Prohibited Items</a> list.
      </Section>

      <Section title="5. Prohibited Conduct">
        You may not use PWL to: distribute spam or malware; circumvent security controls; engage in fraudulent transactions; list prohibited items; violate applicable laws.
      </Section>

      <Section title="6. Intellectual Property">
        PWL and its licensors own all content on the Platform. You grant PWL a non-exclusive licence to display content you submit (reviews, listings) for the purpose of operating the Platform.
      </Section>

      <Section title="7. Limitation of Liability">
        To the maximum extent permitted by law, PWL is not liable for indirect, incidental, or consequential damages arising from your use of the Platform.
      </Section>

      <Section title="8. Governing Law">
        These Terms are governed by the laws of Switzerland (Canton of Zurich). Disputes shall be subject to the exclusive jurisdiction of the courts of Zurich.
      </Section>

      <Section title="9. Changes">
        We may update these Terms. Continued use of the Platform after changes constitutes acceptance. Material changes will be communicated via email or in-app notice.
      </Section>

      <Section title="10. Contact">
        Questions? Email <a href="mailto:legal@peoplewelike.club">legal@peoplewelike.club</a>
      </Section>

      <LegalNav />
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#a855f7", marginBottom: "0.4rem" }}>{title}</h2>
      <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{children}</p>
    </section>
  );
}

function LegalNav() {
  return (
    <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #1e1e2e", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      {[
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/returns", label: "Returns Policy" },
        { href: "/prohibited-items", label: "Prohibited Items" },
        { href: "/", label: "← Home" },
      ].map(({ href, label }) => (
        <a key={href} href={href} style={{ color: "#64748b", fontSize: "0.8rem" }}>{label}</a>
      ))}
    </div>
  );
}
