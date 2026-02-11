#!/usr/bin/env bash
set -euo pipefail

FILE="/opt/pwl-os/admin/app/page.js"

# Insert state variables
perl -i -pe 's/(const \[eventTime.*\n)/$1  const [invVenueId, setInvVenueId] = useState("");\n  const [invItem, setInvItem] = useState("Vodka");\n  const [invQty, setInvQty] = useState("20");\n  const [invLow, setInvLow] = useState("5");\n\n/;' "$FILE"

# Insert function to create inventory
perl -i -pe 's/(async function createEvent\(\)[\s\S]*?\}\n\n)/$1  async function createInventoryItem() {\n    const res = await fetch(`${API}\/inventory\/${invVenueId}`, {\n      method:\"POST\",\n      headers:{ \"Content-Type\":\"application\/json\", Authorization:`Bearer ${token}` },\n      body: JSON.stringify({ item: invItem, qty: Number(invQty), low_threshold: Number(invLow) })\n    });\n    const j = await res.json();\n    if (!res.ok) return alert(j.error || \"failed\");\n    alert(`Created inventory item #${j.id}`);\n  }\n\n/;' "$FILE"

# Add UI block before Create Event block
perl -i -pe 's/(<div style=\{\{border:\"1px solid #ddd\", borderRadius:12, padding:12\}\}>\n        <h2>Create Event<\/h2>)/<div style={{border:\"1px solid #ddd\", borderRadius:12, padding:12, marginBottom:14}}>\n        <h2>Inventory<\/h2>\n        <p style={{opacity:.8}}>Create inventory items per venue_id (Phase 1.1).</p>\n        <div style={{display:\"flex\", gap:8, flexWrap:\"wrap\"}}>\n          <input placeholder=\"venue_id\" value={invVenueId} onChange={e=>setInvVenueId(e.target.value)} />\n          <input value={invItem} onChange={e=>setInvItem(e.target.value)} />\n          <input value={invQty} onChange={e=>setInvQty(e.target.value)} />\n          <input value={invLow} onChange={e=>setInvLow(e.target.value)} />\n          <button onClick={createInventoryItem} disabled={!token}>Add Item</button>\n        </div>\n      </div>\n\n      $1/;' "$FILE"

echo "✅ Admin: added Inventory UI block."
