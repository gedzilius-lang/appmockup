# Installation & Operations Guide — PeopleWeLike

## 1. VPS Requirements

- Ubuntu 22.04+ (or Debian 12+)
- Docker Engine 24+ and Docker Compose v2
- 2 GB RAM minimum, 4 GB recommended
- Git, bash, gzip
- Open ports: 80, 443 (behind Cloudflare proxy)
- SSH access configured

## 2. Initial Setup

```bash
# Clone repo
cd /opt/pwl-os
git clone <repo-url> appmockup
cd appmockup

# Create .env (required variables)
cat > .env <<'EOF'
POSTGRES_USER=pwlos
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=pwlos
JWT_SECRET=<random-64-char>
FEATURE_LAYER=1
EOF

# Start all services
docker compose up -d

# Verify
docker compose ps
curl -s http://localhost:4000/health
```

## 3. Deploy

```bash
cd /opt/pwl-os/appmockup
bash scripts/deploy.sh              # all services (auto-backup first)
bash scripts/deploy.sh api          # API only
bash scripts/deploy.sh api os       # API + OS only
SKIP_BACKUP=1 bash scripts/deploy.sh  # skip pre-deploy backup
```

Deploy does: git pull → backup → docker compose build → up -d → verify containers.

## 4. Backup & Restore

### Create backup
```bash
bash scripts/backup.sh
# Output: backups/db_pwlos_<TIMESTAMP>.sql.gz
```

### Dry-run restore (verify backup integrity)
```bash
bash scripts/restore.sh backups/db_pwlos_20260219_011632.sql.gz
# Restores to temporary DB, checks row counts, cleans up
```

### Production restore (DESTRUCTIVE)
```bash
bash scripts/restore.sh backups/db_pwlos_20260219_011632.sql.gz --force
# Stops services, drops DB, restores, restarts
# Requires typing 'YES' to confirm
```

### Automated backups
```bash
# Add to crontab (daily at 3 AM)
crontab -e
0 3 * * * cd /opt/pwl-os/appmockup && bash scripts/backup.sh >> /var/log/pwl-backup.log 2>&1
```

Retention: last 30 backups kept automatically.

## 5. Log Inspection

```bash
# All container logs
docker compose logs --tail=50

# Specific service
docker compose logs --tail=100 api
docker compose logs --tail=100 os
docker compose logs --tail=100 admin
docker compose logs --tail=100 nginx

# Follow logs in real time
docker compose logs -f api

# Check for errors
docker compose logs api 2>&1 | grep -i error | tail -20
```

## 6. Health Checks

| URL | Expected | Access |
|-----|----------|--------|
| `http://localhost:4000/health` | `{"ok":true}` | Internal |
| `https://api.peoplewelike.club/health` | `{"ok":true}` | Public |
| `https://os.peoplewelike.club/api/health` | `{"ok":true}` | Public |
| `https://admin.peoplewelike.club/api/health` | `{"ok":true}` | Public |

### Quick health check from VPS
```bash
curl -s http://localhost:4000/health | jq .
```

## 7. Monitoring Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | None | Basic liveness |
| `GET /status` | MAIN_ADMIN token | Full metrics: uptime, request/error counts, order latency, DB pool |
| `GET /debug/dbpool` | ADMIN role | Database connection pool stats |
| `GET /config` | None | Feature layer config |

### Check /status
```bash
curl -s http://localhost:4000/status \
  -H "Authorization: Bearer <MAIN_ADMIN_TOKEN>" | jq .
```

## 8. SSH Keepalive

Add to `~/.ssh/config` on your local machine:
```
Host nite-core
  HostName 31.97.126.86
  User root
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

## 9. Emergency Rollback

### Option A: Rollback to previous commit
```bash
cd /opt/pwl-os/appmockup
git log --oneline -5            # find the good commit
git checkout <commit-hash>      # detach HEAD to known-good commit
docker compose build api os admin
docker compose up -d
docker compose ps               # verify containers healthy
```

### Option B: Restore database from backup
```bash
cd /opt/pwl-os/appmockup
ls -lht backups/*.gz | head -5  # find recent backup
bash scripts/restore.sh backups/<file>.sql.gz --force
# Type 'YES' when prompted — this drops and recreates the DB
```

### Option C: Full restart
```bash
cd /opt/pwl-os/appmockup
docker compose down
docker compose up -d
sleep 5
docker compose ps
curl -s http://localhost:4000/health
```

## 10. Container Management

```bash
# Status
docker compose ps

# Restart single service
docker compose restart api

# Rebuild single service (no cache)
docker compose build --no-cache api && docker compose up -d api

# Stop everything
docker compose down

# Nuclear reset (removes volumes — DATA LOSS)
# docker compose down -v   # DO NOT run unless you intend to lose all data
```
