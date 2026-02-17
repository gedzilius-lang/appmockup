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

## Phase D — External Reachability (verified 2026-02-17)

### Fix Applied
- **nginx stale DNS**: os/admin containers rebuilt → new IPs, but nginx (running 4 days) cached old IPs → 502. Fix: `docker compose restart nginx`.

### External Reachability (via Cloudflare, from VPS --resolve)
| URL | Status |
|---|---|
| os.peoplewelike.club/ | 200 |
| os.peoplewelike.club/api/health | 200 `{"ok":true}` |
| admin.peoplewelike.club/ | 200 |
| admin.peoplewelike.club/api/health | 200 `{"ok":true}` |
| api.peoplewelike.club/health | 200 `{"ok":true}` |

### Origin TLS
- Self-signed cert (CN=peoplewelike.club), valid 2026-02-11 → 2027-02-11
- Cloudflare SSL mode = Full (accepts self-signed origin cert)

### VERIFY_LAYER1 API Checks (all via Cloudflare)
- [x] PIN login SECURITY → token, venue_id 2
- [x] Wallet topup 100 NC → new_balance 110
- [x] Max topup >5000 → `MAX_TOPUP_EXCEEDED`
- [x] PIN login BAR → token, venue_id 2
- [x] Place order Beer x2 → total 10 NC, order created
- [x] `/config` → `{"feature_layer":1}`
- [x] `/quests/2` → `FEATURE_LOCKED` (layer 2)
- [x] `/rules/2` → `FEATURE_LOCKED` (layer 2)
- [x] `/analytics/2` → `FEATURE_LOCKED` (layer 3)
- [x] POST `/actions/sell` → 410 Gone

### Earlier Verifications (still valid)
- [x] Transactional order: server-side price, FOR UPDATE lock, stock decrement
- [x] Idempotency: same key returns same order
- [x] PIN auth reuses staff user (uid 22 both logins)
- [x] CHECK constraint `users_points_non_negative` active in DB

## Known Issues
- **Local machine (company proxy)** — curl from dev machine fails with "Connection was reset" (company firewall, not a server issue)
- **Wallet topup via uid_tag** — not yet tested from browser UI
- **FEATURE_LAYER env** — not in VPS `.env` yet (defaults to 1, which is correct)

## Phase E — UI Polish (deployed 2026-02-17)

### Changes
1. **OS theme + ui helpers**: CSS variables already existed; added `.tile`, `.chip`, `.cart-sticky`, `.submit-overlay`, `.btn-confirm`, `.btn-press`, `.qty-badge`, `.input-error` classes. Created `os/app/lib/ui.js` with className helpers.
2. **POS (/ops/bar)**: Tiles with `:active` scale feedback, quantity badges on selected items, sticky bottom cart on mobile, full-width confirm button showing total, submit overlay during order, order ID in success toast.
3. **Security (/ops/security)**: Top-up panel with gradient background + purple glow, quick amount chips (+20/50/100/200), input validation red highlights, persistent success message, friendly "slow down" on 429 rate limit.
4. **Guest (/guest)**: Wallet balance moved to top (large 2.5rem purple number), active session panel with venue name + start time + spend, refresh button.
5. **Admin login**: Subtle purple glow on card, button shadow, input focus transition.
6. **Ops login (/ops)**: Press feedback on sign-in button.

### Needs Browser Verification
- [ ] /ops/bar: fast ordering with big tap targets on mobile
- [ ] /ops/bar: qty badges visible on tiles, sticky cart stays at bottom
- [ ] /ops/bar: submit overlay appears, order ID in success toast
- [ ] /ops/security: quick amount chips fill the amount field
- [ ] /ops/security: validation red highlight on empty UID + amount
- [ ] /ops/security: success message persists after top-up
- [ ] /guest: wallet balance large at top, session panel shows venue
- [ ] /guest: refresh button re-fetches and updates

## Next Steps
1. Browser verification of Phase E changes (mobile + desktop)
2. Fix any regressions found during verification
3. Phase 2 planning
