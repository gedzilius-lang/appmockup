# Project Timeline — PeopleWeLike (Layer 1)

## 1. Origin

**Goal:** Build a Supermarket-style Layer 1 POS revenue engine for nightlife venues — cashless wallet, NFC wristbands, real-time inventory, role-based ops panels.

**Architecture:**
- **API** — Fastify + Postgres (port 4000)
- **OS** — Next.js 14 staff/guest frontend (port 3000)
- **Admin** — Next.js 14 venue management (port 3001)
- **NGINX** — reverse proxy for os/admin/api subdomains
- **Postgres 16** — Docker container
- **Cloudflare** — DNS + SSL proxy (Full mode, self-signed origin cert)
- **VPS** — Single node at 31.97.126.86 (`nite-core`)

## 2. Major Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | OS/Admin proxy routing (Next.js API routes → Fastify) | DONE |
| 2 | Transactional orders + idempotency (withTx, FOR UPDATE, CHECK constraint) | DONE |
| 3 | Feature gating (FEATURE_LAYER env, requireLayer middleware) | DONE |
| 4 | Venue scoping + permission hardening (canAccessVenue, cross-venue 403) | DONE |
| 5 | UI polish — POS tiles, security top-up chips, guest wallet, admin glow | DONE |
| 6 | Poor-network UX — offline banner, retry last order, health polling | DONE |
| 7 | Minimal monitoring — /status endpoint, request/error counts, order latency | DONE |
| 8 | UID history + runner dashboard (stock progress bars, restock action) | DONE |
| 9 | Admin wallet restriction — top-up moved to ADMIN_ROLES only | DONE |
| 10 | Mandatory NFC payment enforcement at Bar POS | DONE |
| 11 | Security door flow — NFC scan preview before check-in | DONE |
| 12 | Load testing (200 parallel orders, deadlock fix, 100% success) | DONE |
| 13 | Backup & restore automation (pg_dump + gzip, dry-run restore) | DONE |
| 14 | Deploy script hardening (auto-backup, commit echo, set -e) | DONE |

## 3. Current State

- **Layer 1 pilot-ready** — all POS, wallet, inventory, and ops flows functional
- **NFC required** — Bar POS enforces wristband tap before payment
- **Top-up admin-only** — wallet loading restricted to MAIN_ADMIN / VENUE_ADMIN
- **Observability active** — /status (MAIN_ADMIN), request counts, order latency, error tracking
- **Backup verified** — automated pg_dump with restore dry-run confirmed
- **Permissions hardened** — venue-scoped reads/writes, cross-venue blocked
- **Deployed commit:** `d96d650`

## 4. Next Stage (Strict Order)

1. **Simulation night** — full end-to-end test with real devices and roles
2. **Bugfix-only phase** — no new features, only fixes from simulation findings
3. **Uptime monitoring** — external health check alerting
4. **First real venue validation** — controlled live deployment
5. **Only then Layer 2** — quests, profiles, gamification (currently gated off)
