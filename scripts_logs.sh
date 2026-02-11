#!/usr/bin/env bash
set -euo pipefail
cd /opt/pwl-os
docker compose ps
echo "---- API ----"
docker compose logs --tail=200 api || true
echo "---- OS ----"
docker compose logs --tail=200 os || true
echo "---- ADMIN ----"
docker compose logs --tail=200 admin || true
echo "---- NGINX ----"
docker compose logs --tail=200 nginx || true
