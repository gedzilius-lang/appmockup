#!/usr/bin/env bash
set -euo pipefail
cd /opt/pwl-os

TS="$(date +%Y%m%d_%H%M%S)"
OUT="/opt/pwl-os/backups/pwlos_repo_${TS}.tar.gz"

# Exclude node_modules, .next, db volumes, backups, and .env
tar --exclude='./**/node_modules' \
    --exclude='./**/.next' \
    --exclude='./backups' \
    --exclude='./.git' \
    --exclude='./.env' \
    -czf "$OUT" .

echo "✅ Repo snapshot: $OUT"
ls -lah /opt/pwl-os/backups | tail -n 5
