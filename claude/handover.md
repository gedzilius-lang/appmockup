
# PWL-OS Project Handover

**Project:** People We Like – OS / Admin / API Stack
**Environment:** Ubuntu 22.04 LTS VPS + Docker Compose + Nginx + Cloudflare
**Authoring Phase:** Phase 1 → Phase 16
**Status:** Production-running, origin HTTPS enabled, routing standardized

---

# 1. High-Level Architecture

## Infrastructure Overview

```
Cloudflare (DNS + SSL Full Strict)
        ↓
VPS (Ubuntu 22.04)
        ↓
Docker Compose Stack
        ├── nginx (reverse proxy, TLS termination)
        ├── os (Next.js 14 frontend, port 3000)
        ├── admin (Next.js 14 frontend, port 3001)
        ├── api (Node/Fastify server, port 4000)
        └── db (Postgres 16)
```

---

# 2. Core Services

## 2.1 OS (Frontend)

* Framework: Next.js 14.2.5
* Port: 3000
* Host binding: `0.0.0.0`
* Routes:

  * `/`
  * `/ops`
  * `/promoter`
  * `/ops/nfc`
* Uses API via internal Docker DNS:

  ```
  http://api:4000
  ```

---

## 2.2 Admin (Frontend)

* Framework: Next.js 14.2.5
* Port: 3001
* Used for internal operational controls
* Same API connection method

---

## 2.3 API

* Node.js + Fastify
* Port: 4000
* JWT-based authentication
* Core endpoints:

```
/health
/auth/pin
/inventory/:id
/venue_sessions/:id/recent
/track
```

Returns 401 without token → expected behavior.

---

## 2.4 Database

* PostgreSQL 16
* Runs inside Docker
* Internal network only
* No external exposure

---

# 3. Reverse Proxy (Nginx)

## Location

```
/opt/pwl-os/nginx/default.conf
```

## Responsibilities

* HTTP → HTTPS redirect
* TLS termination (Origin Certificate)
* Proxy routing by hostname
* Forwarding correct headers

---

## Current Working Routing Configuration

### HTTP (port 80)

Redirects:

* os.peoplewelike.club → HTTPS
* admin.peoplewelike.club → HTTPS
* api.peoplewelike.club → HTTPS

---

### HTTPS (port 443)

| Host                    | Proxy Target                           |
| ----------------------- | -------------------------------------- |
| os.peoplewelike.club    | [http://os:3000](http://os:3000)       |
| admin.peoplewelike.club | [http://admin:3001](http://admin:3001) |
| api.peoplewelike.club   | [http://api:4000](http://api:4000)     |

---

# 4. Cloudflare Configuration

## Required Mode

```
SSL/TLS → Full (Strict)
```

## Origin Certificate

Stored at:

```
/opt/pwl-os/certs/origin.crt
/opt/pwl-os/certs/origin.key
```

Must match key + certificate pair.

---

# 5. Phases Completed

## Phase 1–4: Base Infrastructure

* Docker compose setup
* Postgres integration
* API server functional
* Next.js apps deployed
* Nginx reverse proxy

---

## Phase 5–7: Internal Networking Fix

Problem:

```
fetch failed ECONNREFUSED external IP:443
```

Cause:
Frontend calling public domain instead of internal service.

Fix:
Set environment:

```
API_BASE_URL=http://api:4000
```

Result:
Internal Docker DNS resolution.

---

## Phase 8–9: Port 80 Conflict

Problem:

```
failed to bind 0.0.0.0:80
```

Cause:
System nginx running outside Docker.

Fix:

```
systemctl stop nginx
systemctl disable nginx
```

---

## Phase 10–12: 502 Bad Gateway

Cause:

* Broken Nginx config
* Duplicate `location /`
* Invalid upstream
* Certificate mismatch

Fix:

* Rebuilt clean nginx config
* Standardized single location per server block
* Repaired certificate pair
* Validated via `nginx -t`

---

## Phase 13–14: Nginx Restart Loop

Error:

```
duplicate location "/"
SSL_CTX_use_PrivateKey key mismatch
```

Fix:

* Removed duplicate server blocks
* Regenerated correct self-signed fallback
* Standardized certificate paths
* Full recreate of nginx container

---

## Phase 15: Routing Validation

Script used:

```
219_validate_nginx_routes.sh
```

Validated:

* HTTP redirects
* HTTPS routing
* Upstream connectivity
* Internal container resolution

---

## Phase 16: Stability Validation

Confirmed:

* OS returns 200
* Admin returns 200
* API returns 200
* 401 without token = correct
* No upstream connection failures
* No Nginx crash loops

---

# 6. Current Known Issues

## 1. Invalid SSL Warning (Browser)

Cause:
Using self-signed or non-Cloudflare origin cert for direct access.

Important:
This is normal if accessing origin directly via IP.

Correct behavior:
Access only through Cloudflare domain.

---

## 2. Performance

Frontend loads slower due to:

* Possible server-side fetch at top-level
* No response caching
* No compression optimization

Improvement suggestions:

* Add `cache: 'force-cache'` or revalidate tags
* Enable gzip/brotli in nginx
* Audit large bundles in Next.js

---

## 3. UI/UX Inconsistencies

* Some buttons disabled incorrectly
* Inventory button state logic incomplete
* Frontend needs validation state sync with API

---

# 7. File Structure (Critical Paths)

```
/opt/pwl-os
    docker-compose.yml
    nginx/
        default.conf
    certs/
        origin.crt
        origin.key
    scripts/
        diagnostic scripts
        validation scripts
```

---

# 8. Docker Commands for Maintenance

Rebuild everything:

```
docker compose down
docker compose up -d --build
```

Rebuild only nginx:

```
docker compose up -d --force-recreate nginx
```

Logs:

```
docker compose logs --tail=200 nginx
docker compose logs --tail=200 os
docker compose logs --tail=200 admin
docker compose logs --tail=200 api
```

---

# 9. Critical Rules for Future Developer

1. NEVER expose Postgres publicly.
2. NEVER route API via public domain inside containers.
3. ALWAYS use `http://api:4000` internally.
4. NEVER duplicate `location /` in nginx.
5. ALWAYS validate with:

   ```
   nginx -t
   ```
6. When SSL fails, verify:

   ```
   openssl x509 -noout -modulus -in origin.crt | openssl md5
   openssl rsa -noout -modulus -in origin.key | openssl md5
   ```

   They must match.

---

# 10. Security Status

* API requires token
* No DB exposure
* HTTPS enforced
* Internal Docker networking only

Security level: **Production Safe (basic hardened)**

---

# 11. Next Logical Development Steps

1. Remove self-signed cert and replace with proper Cloudflare Origin Cert.
2. Add response compression in nginx.
3. Audit frontend server component fetch patterns.
4. Implement proper button state logic tied to API validation.
5. Add centralized error boundary UI.
6. Introduce structured logging aggregation.
7. Add rate limiting to API.

---

# 12. Current System Health Summary

| Component      | Status     |
| -------------- | ---------- |
| OS             | Running    |
| Admin          | Running    |
| API            | Running    |
| DB             | Running    |
| Nginx          | Stable     |
| HTTPS          | Functional |
| Docker Network | Healthy    |

---

# 13. Final State Summary

The system is:

* Dockerized
* Internally networked
* Reverse proxied
* HTTPS terminated
* Cloudflare-compatible
* Reproducible
* Diagnosable via scripts
* Fully container controlled

There are no infrastructure blockers remaining.

Remaining work is product-level (UX, logic, performance).

---

# END OF HANDOVER

If future issues arise, begin debugging in this order:

1. `docker compose ps`
2. `docker compose logs`
3. `nginx -t`
4. Validate internal upstream with curl from nginx container
5. Validate API health

---

This concludes the complete infrastructure + deployment + debugging history and operational manual.
