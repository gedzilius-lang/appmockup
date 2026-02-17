# STATUS — PeopleWeLike Layer 1

## Last Updated
2026-02-17

## Services (all running on VPS)
- **API** — Fastify on port 4000 (server.js)
- **OS** — Next.js 14 on port 3000 (os/)
- **Admin** — Next.js 14 on port 3001 (admin/)
- **NGINX** — reverse proxy for os/admin/api subdomains
- **DB** — Postgres 16 via Docker

## What Changed (this session)
### Phase A — Money Flows Safe
- `withTx` helper: atomic transactions via `pool.connect()` with BEGIN/COMMIT/ROLLBACK/release
- `POST /orders` fully transactional: server-side price resolution from menu_items, `FOR UPDATE` wallet lock, `INSUFFICIENT_FUNDS` check, `OUT_OF_STOCK` guard (inventory `WHERE qty >= $n`), idempotency, LOW_STOCK logs — all in single tx
- `CHECK (points >= 0)` constraint on users table (DB-level negative balance prevention)
- `/debug/dbpool` endpoint for ADMIN (pool.totalCount/idleCount/waitingCount)

### Phase B — Feature Gates
- `FEATURE_LAYER` env var (default 1), `requireLayer(n)` middleware
- Quests/rules endpoints gated behind Layer 2
- Analytics gated behind Layer 3
- `/config` endpoint returns `{ feature_layer: N }`

### Phase C — Attack Surface
- Legacy `/actions/sell` → 410 Gone ("Use POST /orders instead")
- Rate limit on `/wallet/topup` (1 req/sec per staff, in-memory)
- Max topup amount 5000 NC
- PIN auth reuses existing staff user (same venue_id + role)
- Bar POS sends `menu_item_id`, shows specific OUT_OF_STOCK/INSUFFICIENT_FUNDS errors

### Earlier (still active)
- OS API proxy route (`os/app/api/[...path]/route.js`)
- All OS client-side pages use `/api` proxy
- `POST /wallet/topup` endpoint (SECURITY/BAR/DOOR/ADMIN roles)
- Wallet top-up UI panel on security page
- Supermarket seed: venue + 12 inventory items + 11 menu items
- `requireAuth`/`requireRole` made async (fixed preHandler hang)

## Verified on VPS
- [x] API health (`/health` → `{"ok":true}`)
- [x] `/config` returns `{"feature_layer":1}`
- [x] Transactional order: Beer x2 → total 10 NC (server-side price), stock 98→96
- [x] Idempotency: same key returns same order (no duplicate)
- [x] Feature gate: `/quests/1` returns `FEATURE_LOCKED` (layer 1 < required 2)
- [x] Legacy `/actions/sell` returns 410 Gone
- [x] PIN auth reuses staff user (uid 22 both logins)
- [x] CHECK constraint `users_points_non_negative` active in DB
- [x] OS container rebuilt with bar page changes

## Known Issues
- **Wallet topup via uid_tag** — not yet tested from browser UI
- **Admin container** — not rebuilt this session (no changes needed)
- **FEATURE_LAYER env** — not in VPS `.env` yet (defaults to 1, which is correct)

## Next Steps
1. Phase D: Browser verification + VERIFY_LAYER1.md checklist
2. Phase E: UI polish (only after D passes)
