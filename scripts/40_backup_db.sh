#!/usr/bin/env bash
set -euo pipefail
cd /opt/pwl-os

set -a
source ./.env
set +a

TS="$(date +%Y%m%d_%H%M%S)"
OUT="/opt/pwl-os/backups/db_${POSTGRES_DB}_${TS}.sql"

echo "Creating DB dump: $OUT"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$OUT"

gzip -f "$OUT"
echo "✅ Done: ${OUT}.gz"
ls -lah /opt/pwl-os/backups | tail -n 5
