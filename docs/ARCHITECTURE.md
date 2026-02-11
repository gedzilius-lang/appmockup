# Architecture

## Services (Docker Compose)
- nginx: routes by host header to the right upstream
- api: Fastify REST API on port 4000
- os: Next.js (public) on port 3000
- admin: Next.js (staff) on port 3001
- db: Postgres 16

## Routing
- os.peoplewelike.club -> os:3000
- admin.peoplewelike.club -> admin:3001
- api.peoplewelike.club -> api:4000

Cloudflare is currently used in front of OS/Admin/API domains.

## Data model (Phase 1)
- users: MAIN_ADMIN + ephemeral role users from PIN login
- venues: venue records + PIN
- events: public event feed
- inventory: per venue items + qty + low threshold
- logs: actions and alerts (SELL, LOW_STOCK)

## Why this structure
- One system, modular surfaces (OS/Admin/API)
- Easy to grow into "venue OS" without blocking event discovery
- Radio is independent (separate VPS) and embedded
