# STATUS — PeopleWeLike Layer 1

## Last Updated
2026-02-18

## P0.1 — Fix admin menu items visible in bar POS (deployed 2026-02-18)

### Root Cause
Next.js 14 App Router API proxy routes (`/api/[...path]/route.js`) used `fetch()` without
`cache: 'no-store'`, allowing Next.js Data Cache to serve stale GET responses. After admin
created new menu items, the OS bar POS could receive cached responses missing the new items.

### Fix Applied
- Added `export const dynamic = "force-dynamic"` + `export const fetchCache = "force-no-store"` to both proxy routes
- Added `cache: "no-store"` to internal `fetch()` calls
- Added `Cache-Control: no-store` response header to prevent browser HTTP caching

### Verified (VPS, 2026-02-18)
- [x] Admin POST /menu → creates item (id=13) via admin proxy
- [x] OS GET /menu/2 immediately returns new item (12 items, Test Pilsner found)
- [x] `Cache-Control: no-store` header confirmed in response
- [x] Full Cloudflare chain: admin.peoplewelike.club/api/menu/2 → 11 items (after cleanup)
- [x] Build output confirms `/api/[...path]` is `ƒ` (Dynamic, not cached)

### Remaining
- User browser test needed: create item in admin → refresh bar POS → item appears

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

### Server-Side Verification (2026-02-17, via VPS curl)

**A) OS /ops — Role picker + PIN login**
- [x] Page loads (200, 7ms localhost, 70ms Cloudflare)
- [x] Role picker renders: Bar, Runner, Security buttons in SSR HTML
- [x] PIN input + Sign In button with `btn-press` class present
- [x] PIN login BAR → token, venue_id 2 (uid 22)
- [x] PIN login SECURITY → token, venue_id 2 (uid 14)
- [x] Dark mode styling: `#0a0a0f` bg, `#e2e8f0` text confirmed

**B) OS /ops/bar — POS**
- [x] Page loads (200, 8511 bytes SSR)
- [x] `.tile` class in CSS: min-height 90px (80px on mobile @640px breakpoint)
- [x] `.tile:active { transform: scale(0.96) }` — press feedback
- [x] `.qty-badge` positioned absolute top-right on tiles
- [x] `.cart-sticky` fixed bottom, z-index 90, max-height 55vh
- [x] `.btn-confirm` full-width purple, font-weight 800
- [x] `.submit-overlay` inset 0, z-index 200, backdrop-filter blur
- [x] Menu API returns 11 items with stock levels
- [x] Order API works: Beer x1 → Order #4, 5 NC, idempotency_key stored
- [x] Error handling code: OUT_OF_STOCK and INSUFFICIENT_FUNDS messages in source

**C) OS /ops/security — Top-up**
- [x] Page loads (200, 10572 bytes SSR)
- [x] `.chip` class rendered (quick amount buttons +20/50/100/200)
- [x] `.btn-confirm` rendered for Top Up button
- [x] `.input-error` class in CSS: red border + red glow
- [x] 429 handler in source: shows "Slow down — 1 top-up per second"
- [x] Success message renders inline (not just toast) with green styling
- [x] Topup API requires active session (correctly rejects without one)

**D) OS /guest**
- [x] Page loads (200, 8724 bytes via Cloudflare)
- [x] Wallet balance: 2.5rem font-size, purple #a855f7, centered at top
- [x] Active session panel with green dot, venue name, start time, spent
- [x] Refresh button: `btn-secondary btn-press`, calls loadMe()
- [x] No Layer 2 UI visible (no quests/XP bar in source)

**E) Admin /login**
- [x] Page loads (200, 5829 bytes via Cloudflare)
- [x] Purple glow on card: `box-shadow: 0 0 40px #a855f710`
- [x] Input focus transition in CSS
- [x] Login API responds (returns proper error for bad creds)

**F) CSS verification**
- [x] All Phase E classes present in built CSS: `.tile`, `.qty-badge`, `.btn-press`, `.cart-sticky`, `.submit-overlay`, `.btn-confirm`, `.chip`, `.input-error`
- [x] Mobile breakpoint `@media (max-width: 640px)` with `.tile { min-height: 80px }`

**G) Infrastructure**
- [x] All 5 containers running: db (4d), api (4h), os (8m), admin (8m), nginx (8m)
- [x] `/config` → `{"feature_layer":1}`
- [x] `/debug/dbpool` → correctly rejects non-ADMIN role (403)
- [x] Cloudflare routing works for all 3 subdomains

### Limitations of This Verification
- **No real browser test performed** — all checks are server-side (curl/HTML inspection)
- Cannot verify: JS hydration, actual touch/tap interaction, visual rendering, scroll behavior
- Cannot verify: toast animations, overlay z-index stacking, sticky cart positioning on real mobile
- **User must do real browser testing** on phone/desktop to confirm interactive behavior
- Tested from VPS only; company proxy blocks local machine access

## Next Steps
1. **USER ACTION NEEDED**: Real browser test on phone (Android Chrome) + desktop Chrome
   - Open `os.peoplewelike.club/ops`, log in as Bar with PIN, place an order
   - Open `/ops/security`, test quick chips + topup flow
   - Open `/guest`, check in, verify wallet display
   - Open `admin.peoplewelike.club/login`, verify form styling
2. Phase 1 hardening (nginx gzip/headers/cache, health endpoints, DB integrity checks)
3. Phase 2 planning (after verification + hardening)
