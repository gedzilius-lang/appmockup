export const metadata = { title: "Prohibited Items — PeopleWeLike Marketplace" };

const CATEGORIES = [
  {
    title: "Illegal & Controlled Substances",
    color: "#ef4444",
    items: [
      "Illegal drugs and narcotics",
      "Prescription-only medications without valid prescription",
      "Drug paraphernalia",
      "Substances that are illegal in Switzerland or the destination country",
    ],
  },
  {
    title: "Weapons & Dangerous Goods",
    color: "#f97316",
    items: [
      "Firearms, ammunition, and components",
      "Knives with blade over 8cm (except kitchen/professional tools)",
      "Explosives, fireworks, and incendiary devices",
      "Chemical, biological, or radiological materials",
      "Tasers, stun guns, and tear gas (without permit)",
    ],
  },
  {
    title: "Counterfeit & Stolen Goods",
    color: "#f97316",
    items: [
      "Counterfeit branded goods",
      "Pirated software, music, or media",
      "Stolen property of any kind",
    ],
  },
  {
    title: "Adult & Sensitive Content",
    color: "#a855f7",
    items: [
      "Pornographic or sexually explicit material",
      "Content involving minors in any sexual context",
      "Content promoting hate, violence, or discrimination",
    ],
  },
  {
    title: "Regulated Goods",
    color: "#06b6d4",
    items: [
      "Tobacco products (requires age verification setup)",
      "Alcohol above 18% ABV (venue licence required)",
      "Financial instruments and securities",
      "Gambling services and lotteries",
      "Medical devices requiring regulatory approval",
    ],
  },
  {
    title: "Digital & Intangible",
    color: "#64748b",
    items: [
      "Account credentials, hacked data",
      "Malware, exploits, or cyberattack tools",
      "Pyramid or multi-level marketing schemes",
    ],
  },
];

export default function ProhibitedItemsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>Prohibited Items</h1>
      <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>Last updated: March 2026</p>
      <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
        The following items may not be listed or sold on the PeopleWeLike marketplace. Violations result in immediate removal of listings and may lead to permanent account suspension and reporting to authorities.
      </p>

      {CATEGORIES.map(cat => (
        <div key={cat.title} className="card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: cat.color, margin: "0 0 0.75rem" }}>
            {cat.title}
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {cat.items.map(item => (
              <li key={item} style={{ color: "#cbd5e1", fontSize: "0.875rem", lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "#14141f", borderRadius: "0.5rem", borderLeft: "3px solid #a855f7" }}>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.7 }}>
          This list is not exhaustive. PWL reserves the right to remove any listing that it deems harmful, offensive, or inconsistent with community standards. Report prohibited listings to{" "}
          <a href="mailto:trust@peoplewelike.club">trust@peoplewelike.club</a>.
        </p>
      </div>

      <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #1e1e2e", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {[
          { href: "/terms", label: "Terms of Service" },
          { href: "/privacy", label: "Privacy Policy" },
          { href: "/returns", label: "Returns Policy" },
          { href: "/apply", label: "Become a Vendor" },
          { href: "/", label: "← Home" },
        ].map(({ href, label }) => (
          <a key={href} href={href} style={{ color: "#64748b", fontSize: "0.8rem" }}>{label}</a>
        ))}
      </div>
    </main>
  );
}
