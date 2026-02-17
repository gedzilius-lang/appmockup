# STATUS — PeopleWeLike Layer 1

## Last Updated
2026-02-17

## Services
- **API** — Fastify on port 4000 (server.js)
- **OS** — Next.js 14 on port 3000 (os/)
- **Admin** — Next.js 14 on port 3001 (admin/)
- **NGINX** — reverse proxy for os/admin/api subdomains
- **DB** — Postgres 16 via Docker

## What Changed (this session)
- OS API proxy route created (`os/app/api/[...path]/route.js`)
- All OS client-side pages switched to `/api` proxy (no more cross-domain)
- `POST /wallet/topup` endpoint with atomic DB transaction (SECURITY/BAR/DOOR/ADMIN roles)
- Wallet top-up UI panel on security page (UID tag or Session ID + amount)
- `POST /orders` now atomic: order insert + inventory decrement + wallet deduct in one DB txn
- Idempotency key on orders (unique constraint, client generates key per submit)
- Bar POS confirm button disabled during submission + idempotency key sent
- Supermarket seed: venue + 12 inventory items + 11 menu items (idempotent)
- `idempotency_key` column + unique index added to orders table (idempotent migration)

## What Was Verified
- [x] No hardcoded external API URLs in client-side OS code
- [x] Server-side pages use INTERNAL_API_URL (correct for Docker)
- [x] Wallet topup resolves session_id > uid_tag > user_id
- [x] Orders are transactional (ROLLBACK on any failure)
- [x] Idempotency key prevents duplicate orders
- [x] Seed is idempotent (checks existence before insert)

## Known Issues
- **Feature gates not implemented** — no FEATURE_LAYER env var enforcement yet
- **Guest wallet display** — guest page shows points but could be more prominent
- **No local Node.js** — cannot build-test locally, relies on Docker build on VPS

## Next Steps
1. Commit + push + deploy to VPS
2. Verify all flows on VPS (security topup, bar POS, guest wallet, admin login)
3. Feature gates (FEATURE_LAYER env enforcement)
4. Admin login debug if broken (P0)
5. UI polish (underground rave theme) after stability confirmed
