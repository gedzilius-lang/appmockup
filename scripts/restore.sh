#!/usr/bin/env bash
set -euo pipefail

# PWL Restore Script
# Usage:
#   bash scripts/restore.sh backups/db_pwlos_20260218_120000.sql.gz          # dry-run to test DB
#   bash scripts/restore.sh backups/db_pwlos_20260218_120000.sql.gz --force  # restore to production

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

DB="${POSTGRES_DB:-pwlos}"
USER="${POSTGRES_USER:-pwlos}"
BACKUP_FILE="${1:-}"
FORCE="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bash scripts/restore.sh <backup-file.sql.gz> [--force]"
  echo ""
  echo "Without --force: restores to '${DB}_restore_test' (dry-run)"
  echo "With --force:    restores to '${DB}' (PRODUCTION — DESTRUCTIVE)"
  echo ""
  echo "Available backups:"
  ls -lht backups/*.gz 2>/dev/null | head -10
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

if [ "$FORCE" = "--force" ]; then
  # ── Production restore (DESTRUCTIVE) ──
  TARGET_DB="$DB"
  echo "══════════════════════════════════════════════"
  echo "  PRODUCTION RESTORE — DESTRUCTIVE"
  echo "  File: $BACKUP_FILE"
  echo "  Target DB: $TARGET_DB"
  echo "══════════════════════════════════════════════"
  echo ""
  read -p "Type 'YES' to confirm production restore: " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted."
    exit 1
  fi

  echo "[1/5] Stopping services..."
  docker compose stop api os admin

  echo "[2/5] Dropping database..."
  docker compose exec -T db psql -U "$USER" -c "DROP DATABASE IF EXISTS $TARGET_DB;"

  echo "[3/5] Creating database..."
  docker compose exec -T db psql -U "$USER" -c "CREATE DATABASE $TARGET_DB;"

  echo "[4/5] Restoring..."
  gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$USER" -d "$TARGET_DB"

  echo "[5/5] Restarting services..."
  docker compose up -d

  echo ""
  echo "Production restore complete."
else
  # ── Dry-run restore to test DB ──
  TARGET_DB="${DB}_restore_test"
  echo "══════════════════════════════════════════════"
  echo "  DRY-RUN RESTORE"
  echo "  File: $BACKUP_FILE"
  echo "  Target DB: $TARGET_DB (temporary)"
  echo "══════════════════════════════════════════════"

  echo "[1/4] Creating test database..."
  docker compose exec -T db psql -U "$USER" -c "DROP DATABASE IF EXISTS $TARGET_DB;"
  docker compose exec -T db psql -U "$USER" -c "CREATE DATABASE $TARGET_DB;"

  echo "[2/4] Restoring..."
  gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$USER" -d "$TARGET_DB"

  echo "[3/4] Verifying row counts..."
  docker compose exec -T db psql -U "$USER" -d "$TARGET_DB" -c "
    SELECT 'venues' as tbl, count(*) FROM venues
    UNION ALL SELECT 'users', count(*) FROM users
    UNION ALL SELECT 'orders', count(*) FROM orders
    UNION ALL SELECT 'inventory', count(*) FROM inventory
    UNION ALL SELECT 'menu_items', count(*) FROM menu_items;
  "

  echo "[4/4] Cleaning up test database..."
  docker compose exec -T db psql -U "$USER" -c "DROP DATABASE $TARGET_DB;"

  echo ""
  echo "Dry-run restore complete. Data looks good."
fi
