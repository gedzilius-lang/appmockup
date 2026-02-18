#!/usr/bin/env bash
set -euo pipefail

# PWL Deploy Script — runs from repo root
# Usage: bash scripts/deploy.sh [service...]
#   bash scripts/deploy.sh          # rebuild + restart all
#   bash scripts/deploy.sh api      # rebuild + restart api only
#   bash scripts/deploy.sh api os   # rebuild + restart api + os

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Verify we're in the git repo (not /opt/pwl-os root)
if [ ! -f "docker-compose.yml" ] || [ ! -d "api" ] || [ ! -d "os" ]; then
  echo "ERROR: Must run from appmockup repo root (expected api/, os/, docker-compose.yml)"
  echo "Current dir: $(pwd)"
  exit 1
fi

SERVICES="${@:-api os admin}"

echo "═══════════════════════════════════════"
echo "  PWL Deploy"
echo "  Repo: $REPO_DIR"
echo "  Services: $SERVICES"
echo "═══════════════════════════════════════"

# Pull latest
echo "[1/4] git pull..."
git pull --ff-only

# Build
echo "[2/4] docker compose build $SERVICES..."
docker compose build $SERVICES

# Restart
echo "[3/4] docker compose up -d $SERVICES..."
docker compose up -d $SERVICES

# Verify
echo "[4/4] Verifying containers..."
sleep 3
docker compose ps

# Show commit hash in running API
COMMIT=$(git rev-parse --short HEAD)
echo ""
echo "Deployed commit: $COMMIT"
echo "Done."
