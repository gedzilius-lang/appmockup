#!/usr/bin/env bash
set -euo pipefail

VPS="nite-core"
REMOTE="/opt/pwl-os"
LOCAL="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deploying PWL OS overhaul to $VPS:$REMOTE ==="

# Upload all modified files via rsync (excludes node_modules, .next, etc)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude 'backups' \
  --exclude 'diagnostics' \
  --exclude 'claude' \
  --exclude 'deploy.sh' \
  "$LOCAL/os/app/" "$VPS:$REMOTE/os/app/"

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  "$LOCAL/os/tailwind.config.js" "$VPS:$REMOTE/os/tailwind.config.js"

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  "$LOCAL/admin/app/" "$VPS:$REMOTE/admin/app/"

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  "$LOCAL/admin/tailwind.config.js" "$VPS:$REMOTE/admin/tailwind.config.js"

rsync -avz --progress \
  --exclude 'node_modules' \
  "$LOCAL/api/server.js" "$VPS:$REMOTE/api/server.js"

echo ""
echo "=== Files uploaded. Building containers... ==="
ssh "$VPS" "cd $REMOTE && docker compose up -d --build"

echo ""
echo "=== Checking container status... ==="
ssh "$VPS" "cd $REMOTE && docker compose ps"

echo ""
echo "=== Done! Verify at: ==="
echo "  https://os.peoplewelike.club"
echo "  https://admin.peoplewelike.club"
echo "  https://api.peoplewelike.club/health"
