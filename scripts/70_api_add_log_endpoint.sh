#!/usr/bin/env bash
set -euo pipefail

API="/opt/pwl-os/api/server.js"

# Add endpoint before initDb() call
perl -0777 -i -pe 's/await initDb\(\);\n/app.post("\\/logs", { preHandler: requireRole(["SECURITY","MAIN_ADMIN","VENUE_ADMIN"]) }, async (req, reply) => {\n  const { venue_id, type, payload } = req.body || {};\n  if (!venue_id || !type) return reply.code(400).send({ error: "venue_id and type required" });\n  const r = await pool.query(\n    "insert into logs (venue_id, type, payload) values ($1,$2,$3) returning *",\n    [venue_id, type, payload ?? {}]\n  );\n  return r.rows[0];\n});\n\nawait initDb();\n/s' "$API"

echo "✅ API: added POST /logs endpoint."
