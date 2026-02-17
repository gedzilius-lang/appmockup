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
- OS API proxy route (`os/app/api/[...path]/route.js`)
- All OS client-side pages switched to `/api` proxy
- `POST /wallet/topup` endpoint (SECURITY/BAR/DOOR/ADMIN roles)
- Wallet top-up UI panel on security page
- `POST /orders` with idempotency key (unique constraint)
- Bar POS: submit button disabled during send + idempotency key
- Supermarket seed: venue + 12 inventory items + 11 menu items
- **Fixed:** `requireAuth`/`requireRole` made async (was hanging all preHandler POST routes)
- **Fixed:** Removed `pool.connect()` usage (caused connection pool hangs)

## Verified on VPS
- [x] API health (`/health` → `{"ok":true}`)
- [x] Supermarket venue seeded with inventory + menu
- [x] Security login (PIN auth) works
- [x] Bar login (PIN auth) works
- [x] Admin login (email/password) works
- [x] Wallet topup via `user_id` works (balance updated correctly)
- [x] Order creation works (Beer x2, inventory 100→98)
- [x] Idempotency key prevents duplicate orders
- [x] Menu endpoint returns all 11 items with stock levels
- [x] No cross-domain API calls from OS frontend

## Known Issues
- **Feature gates not implemented** — no FEATURE_LAYER env enforcement
- **Wallet topup via uid_tag** — not yet tested from browser UI
- **OS/Admin containers** — not yet rebuilt in this session (only API rebuilt)

## Next Steps
1. Rebuild OS container on VPS (has proxy route + API_BASE changes)
2. Test full browser flows: security topup UI, bar POS, guest wallet
3. Feature gates (FEATURE_LAYER env enforcement)
4. Admin login flow verification (if broken, fix immediately)
5. UI polish (underground rave theme) after stability confirmed
