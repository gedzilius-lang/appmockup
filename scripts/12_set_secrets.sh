#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/opt/pwl-os/.env"

# Set strong secrets (edit MAINADMIN_PASSWORD if you want a different one)
sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=3c099c2b79e0f856dfa0f27fd24c4ee7119258eb8c1889c4/' "$ENV_FILE"
sed -i 's/^JWT_SECRET=.*/JWT_SECRET=c475f058b801d070af94ec15d88eb167b571bda231b25036f8bad1caebcdf056/' "$ENV_FILE"
sed -i 's/^MAINADMIN_PASSWORD=.*/MAINADMIN_PASSWORD=CHANGE_THIS_TO_YOUR_OWN_STRONG_PASSWORD/' "$ENV_FILE"

echo "✅ Secrets updated in .env (MAINADMIN_PASSWORD placeholder set; change it now)."
echo "Edit: nano /opt/pwl-os/.env"
