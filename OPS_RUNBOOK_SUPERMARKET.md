# OPS Runbook — PWL Supermarket

## Backup

### Quick Backup (from VPS)
```bash
cd /opt/pwl-os
bash appmockup/scripts/40_backup_db.sh
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
0 4 * * * cd /opt/pwl-os && bash appmockup/scripts/40_backup_db.sh >> /var/log/pwl-backup.log 2>&1
```

## Restore

### Restore to separate DB (dry-run / validation)
```bash
# 1. Create test database
docker compose exec -T db psql -U pwlos -c "CREATE DATABASE pwlos_restore_test;"

# 2. Restore into it
gunzip -c /opt/pwl-os/backups/db_pwlos_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U pwlos -d pwlos_restore_test

# 3. Verify row counts
docker compose exec -T db psql -U pwlos -d pwlos_restore_test -c "
  SELECT 'venues' as tbl, count(*) FROM venues
  UNION ALL SELECT 'orders', count(*) FROM orders
  UNION ALL SELECT 'users', count(*) FROM users
  UNION ALL SELECT 'inventory', count(*) FROM inventory
  UNION ALL SELECT 'menu_items', count(*) FROM menu_items;
"

# 4. Cleanup
docker compose exec -T db psql -U pwlos -c "DROP DATABASE pwlos_restore_test;"
```

### Restore to production (DESTRUCTIVE)
```bash
# 1. Stop API
docker compose stop api os admin

# 2. Drop and recreate
docker compose exec -T db psql -U pwlos -c "DROP DATABASE pwlos;"
docker compose exec -T db psql -U pwlos -c "CREATE DATABASE pwlos;"

# 3. Restore
gunzip -c /opt/pwl-os/backups/db_pwlos_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U pwlos -d pwlos

# 4. Restart
docker compose up -d
```

## Load Testing

```bash
# Copy script into API container and run
docker cp /opt/pwl-os/appmockup/scripts/load-test.js pwl-os-api-1:/app/load-test.cjs

# Sequential (200 orders)
docker exec pwl-os-api-1 node /app/load-test.cjs --base http://localhost:4000 --pin 1111

# Parallel (5 lanes x 40 orders)
docker exec pwl-os-api-1 node /app/load-test.cjs --base http://localhost:4000 --pin 1111 --parallel
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
