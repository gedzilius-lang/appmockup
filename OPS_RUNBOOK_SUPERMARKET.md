# OPS Runbook — PWL Supermarket

## Backup

### Quick Backup (from VPS)
```bash
cd /opt/pwl-os/appmockup
bash scripts/backup.sh
```

### Manual pg_dump
```bash
# From VPS host:
TS=$(date +%Y%m%d_%H%M%S)
docker compose exec -T db pg_dump -U pwlos -d pwlos > /opt/pwl-os/backups/db_pwlos_${TS}.sql
gzip /opt/pwl-os/backups/db_pwlos_${TS}.sql
```

### Scheduled (cron)
```bash
# Add to root crontab:
0 4 * * * cd /opt/pwl-os/appmockup && bash scripts/backup.sh >> /var/log/pwl-backup.log 2>&1
```

### Restore (dry-run)
```bash
cd /opt/pwl-os/appmockup
bash scripts/restore.sh backups/db_pwlos_YYYYMMDD_HHMMSS.sql.gz
```

### Restore (production — DESTRUCTIVE)
```bash
cd /opt/pwl-os/appmockup
bash scripts/restore.sh backups/db_pwlos_YYYYMMDD_HHMMSS.sql.gz --force
```
Prompts for confirmation. Stops services, drops DB, restores, restarts.

## Load Testing

```bash
# Copy script into API container and run
docker cp /opt/pwl-os/appmockup/scripts/load-test.js pwl-os-api-1:/app/load-test.cjs

# Sequential (200 orders)
docker exec pwl-os-api-1 node /app/load-test.cjs --base http://localhost:4000 --pin 1111

# Parallel (5 lanes x 40 orders)
docker exec pwl-os-api-1 node /app/load-test.cjs --base http://localhost:4000 --pin 1111 --parallel
```

## Deployment Source of Truth

The **only** docker-compose.yml is in the git repo (`appmockup/docker-compose.yml`).
All docker compose commands must run from the repo root.

```bash
# Standard deploy (VPS):
cd /opt/pwl-os/appmockup
bash scripts/deploy.sh            # all services
bash scripts/deploy.sh api        # api only
bash scripts/deploy.sh api os     # api + os

# Manual equivalent:
cd /opt/pwl-os/appmockup
git pull --ff-only
docker compose build api
docker compose up -d api
```

**Never** run `docker compose` from `/opt/pwl-os/` — that path has no compose file
and will not pick up code changes from the repo.

## Monitoring (/status)

```bash
# Get admin token
TOKEN=$(curl -s http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pwl.com","password":"admin"}' | jq -r .token)

# Fetch status
curl -s http://localhost:4000/status -H "Authorization: Bearer $TOKEN" | jq .
```

Returns: uptime, request/error rates, avg/p95 order latency, DB pool stats, last 5 errors.

## GitHub Authentication Setup (Windows)

### Option A — HTTPS + Credential Manager (simplest)
```bash
git config --global credential.helper manager
git pull   # sign in once via browser — token stored in Windows Credential Manager
```

### Option B — SSH (recommended, more stable)
```bash
# Check for existing key
ls ~/.ssh/id_ed25519.pub

# If none, generate:
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key and add to GitHub → Settings → SSH and GPG Keys
cat ~/.ssh/id_ed25519.pub

# Switch remote
git remote set-url origin git@github.com:gedzilius-lang/appmockup.git

# Test
ssh -T git@github.com
```

## Emergency

### API not responding
```bash
cd /opt/pwl-os
docker compose restart api
docker compose logs api --tail 20
```

### DB pool exhaustion
```bash
# Check active connections
docker compose exec -T db psql -U pwlos -d pwlos -c \
  "SELECT pid, state, wait_event, LEFT(query,60) FROM pg_stat_activity WHERE datname='pwlos';"

# Kill stuck queries
docker compose exec -T db psql -U pwlos -d pwlos -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='pwlos' AND state='idle in transaction' AND query_start < now() - interval '5 minutes';"
```
