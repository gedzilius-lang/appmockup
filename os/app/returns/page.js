export const metadata = { title: "Returns Policy — PeopleWeLike" };

export default function ReturnsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>Returns & Refunds Policy</h1>
      <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>Last updated: March 2026</p>

      <Section title="Platform vs Vendor Sales">
        PWL operates a marketplace. Returns and refunds for vendor products are subject to each vendor's own policy, displayed on their storefront. Platform fees (NiteCoins, top-ups) are non-refundable once consumed.
      </Section>

      <Section title="Vendor Responsibility">
        Vendors must offer at least a 14-day return window for physical goods under Swiss consumer law. Vendors set their own policies beyond this minimum. Contact the vendor directly using the message link on their storefront.
      </Section>

      <Section title="Faulty or Misdescribed Goods">
        If goods are faulty or materially misdescribed, you are entitled to a repair, replacement, or refund regardless of vendor policy. Report disputes to <a href="mailto:support@peoplewelike.club">support@peoplewelike.club</a> within 30 days of receipt.
      </Section>

      <Section title="Digital Goods & Event Tickets">
        Digital downloads and event tickets are non-refundable unless the event is cancelled or the download is defective. If an event is cancelled by the venue, credit will be issued within 7 business days.
      </Section>

      <Section title="NiteCoin Wallet">
        NiteCoins (points) earned through activity cannot be converted to cash. Purchased top-ups are non-refundable after coins are applied to an order. Disputed top-ups must be reported within 72 hours.
      </Section>

      <Section title="How to Initiate a Return">
        <ol style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.7 }}>
          <li>Contact the vendor via their storefront page</li>
          <li>If unresolved in 3 business days, email <a href="mailto:support@peoplewelike.club">support@peoplewelike.club</a></li>
          <li>PWL mediates disputes at its sole discretion</li>
        </ol>
      </Section>

      <LegalNav />
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#22c55e", marginBottom: "0.4rem" }}>{title}</h2>
      <div style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

function LegalNav() {
  return (
    <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #1e1e2e", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      {[
        { href: "/terms", label: "Terms of Service" },
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/prohibited-items", label: "Prohibited Items" },
        { href: "/", label: "← Home" },
      ].map(({ href, label }) => (
        <a key={href} href={href} style={{ color: "#64748b", fontSize: "0.8rem" }}>{label}</a>
      ))}
    </div>
  );
}
