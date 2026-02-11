#!/usr/bin/env bash
set -euo pipefail

FILE="/opt/pwl-os/admin/app/page.js"

# Add state
perl -i -pe 's/(const \[venues, setVenues\] = useState\(\[\]\);\n)/$1  const [analytics, setAnalytics] = useState(null);\n/;' "$FILE"

# Add loader function after loadVenues
perl -i -pe 's/(async function loadVenues\(\) \{[\s\S]*?\}\n\n)/$1  async function loadAnalytics() {\n    const res = await fetch(`${API}\/admin\/analytics\/summary`, { headers:{ Authorization:`Bearer ${token}` }});\n    const j = await res.json();\n    if (!res.ok) return alert(j.error || \"failed\");\n    setAnalytics(j);\n  }\n\n/;' "$FILE"

# Insert UI block after Venues block (find the venues pre section)
perl -i -pe 's/(<pre style=\{\{whiteSpace:\"pre-wrap\"\}\}>\{JSON\.stringify\(venues, null, 2\)\}<\/pre>\n      <\/div>\n)/$1\n      <div style={{border:\"1px solid #ddd\", borderRadius:12, padding:12, marginBottom:14}}>\n        <h2>Analytics (last 24h)</h2>\n        <button onClick={loadAnalytics} disabled={!token}>Refresh Analytics</button>\n        <pre style={{whiteSpace:\"pre-wrap\"}}>{JSON.stringify(analytics, null, 2)}</pre>\n      </div>\n/;' "$FILE"

echo "✅ Admin: analytics panel added."
