#!/usr/bin/env bash
set -euo pipefail

cd /opt/pwl-os

# Clean partial builds
docker compose down --remove-orphans

# Rebuild everything
docker compose up -d --build

docker compose ps
