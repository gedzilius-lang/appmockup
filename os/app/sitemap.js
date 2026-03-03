const BASE_URL = process.env.SITE_URL || "https://os.peoplewelike.club";
const API_BASE = process.env.INTERNAL_API_URL || process.env.API_BASE_URL || "https://api.peoplewelike.club";

export default async function sitemap() {
  const staticRoutes = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/apply`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/returns`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/prohibited-items`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  let eventRoutes = [];
  try {
    const res = await fetch(`${API_BASE}/events`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const events = await res.json();
      eventRoutes = events.map(e => ({
        url: `${BASE_URL}/event/${e.id}`,
        lastModified: new Date(e.created_at || Date.now()),
        changeFrequency: "weekly",
        priority: 0.7,
      }));
    }
  } catch {}

  let vendorRoutes = [];
  try {
    const res = await fetch(`${API_BASE}/marketplace/vendors`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const vendors = await res.json();
      vendorRoutes = vendors.map(v => ({
        url: `${BASE_URL}/vendor/${v.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      }));
    }
  } catch {}

  return [...staticRoutes, ...eventRoutes, ...vendorRoutes];
}
