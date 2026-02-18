#!/usr/bin/env bash
set -euo pipefail

# PWL Backup Script — pg_dump custom format with gzip
# Usage: bash scripts/backup.sh
# Output: backups/db_<DBNAME>_<TIMESTAMP>.sql.gz

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Load env
if [ -f .env ]; then
  set -a; source .env; set +a
elif [ -f /opt/pwl-os/.env ]; then
  set -a; source /opt/pwl-os/.env; set +a
else
  echo "ERROR: No .env found"; exit 1
fi

BACKUP_DIR="${REPO_DIR}/backups"
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
DB="${POSTGRES_DB:-pwlos}"
USER="${POSTGRES_USER:-pwlos}"
OUTFILE="${BACKUP_DIR}/db_${DB}_${TS}.sql"

echo "═══════════════════════════════════════"
echo "  PWL Backup"
echo "  Database: $DB"
echo "  Output: ${OUTFILE}.gz"
echo "═══════════════════════════════════════"

# Dump
echo "[1/3] Running pg_dump..."
docker compose exec -T db pg_dump -U "$USER" -d "$DB" > "$OUTFILE"

# Compress
echo "[2/3] Compressing..."
gzip -f "$OUTFILE"

# Verify
SIZE=$(ls -lh "${OUTFILE}.gz" | awk '{print $5}')
echo "[3/3] Done: ${OUTFILE}.gz ($SIZE)"

# List recent backups
echo ""
echo "Recent backups:"
ls -lht "$BACKUP_DIR"/*.gz 2>/dev/null | head -5

# Cleanup old backups (keep last 30)
TOTAL=$(ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
if [ "$TOTAL" -gt 30 ]; then
  echo ""
  echo "Cleaning old backups (keeping last 30)..."
  ls -1t "$BACKUP_DIR"/*.gz | tail -n +31 | xargs rm -f
  echo "Removed $((TOTAL - 30)) old backup(s)"
fi
