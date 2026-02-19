# STATUS — PeopleWeLike Layer 1

## Last Updated
2026-02-18

## VPS Verification Evidence (2026-02-18)

### Routing + Headers
| Endpoint | Status | Cache-Control | Security Headers |
|----------|--------|---------------|------------------|
| os.peoplewelike.club/ | 200 | private, no-cache, no-store | X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| admin.peoplewelike.club/ | 200 | s-maxage=31536000 (static page) | same |
| api.peoplewelike.club/health | 200 | (none, JSON) | same |
| os.../api/health | 200 `{"ok":true}` | — | — |
| admin.../api/health | 200 `{"ok":true}` | — | — |

### Auth Flows
| Flow | Result |
|------|--------|
| PIN login BAR (os domain) | token OK, uid=22, venue_id=2 |
| PIN login SECURITY (os domain) | token OK, uid=14, venue_id=2 |
| Admin email login (admin domain) | token OK, uid=1, role=MAIN_ADMIN |
| GET /me (all tokens) | Correct user data returned |

### Menu Create → Fetch → Order (Step 1 E2E)
- Admin POST /menu → created id=14 "VerifyShot-*" (Shots, 5 NC, venue 2)
- OS GET /menu/2 → 12 items total, new item found=True
- Bar POST /orders with menu_item_id=14 → Order #9, 5 NC, success
- Cleanup: DELETE /menu/14 → deactivated

### Feature Gates
| Endpoint | Expected | Actual |
|----------|----------|--------|
| GET /config | feature_layer=1 | `{"feature_layer":1}` |
| GET /quests/2 | FEATURE_LOCKED | `{"error":"FEATURE_LOCKED","required_layer":2}` |
| GET /rules/2 | FEATURE_LOCKED | `{"error":"FEATURE_LOCKED","required_layer":2}` |
| GET /analytics/2 | FEATURE_LOCKED | `{"error":"FEATURE_LOCKED","required_layer":3}` |
| POST /actions/sell | 410 Gone | `{"error":"GONE","message":"Use POST /orders instead"}` |

### Inventory (max_qty check)
All 12 Supermarket items have max_qty populated. Sample:
- Beer: qty=93, max=100, pct=93%
- Rum: qty=22, max=30, pct=73%
- Total: 12 items, missing_max_qty=0

### DB Integrity Checks
| Check | Count | Status |
|-------|-------|--------|
| users.points < 0 | 0 | PASS |
| inventory.qty < 0 | 0 | PASS |
| menu_items WHERE venue_id IS NULL | 0 | PASS |
| orders bad (null venue/staff, neg total) | 0 | PASS |
| inventory.max_qty IS NULL | 0 | PASS (was 4, fixed) |
| Idempotency duplicates | 0 | PASS |
| Order total != items sum | 0 | PASS |
| users_points_non_negative CHECK | exists | PASS |

### DB Fixes Applied
- SET max_qty = qty for 4 non-Supermarket inventory rows (venues 1, 3)
- ALTER inventory.max_qty SET NOT NULL DEFAULT 0

### Observability Additions
- X-Request-Id header on all API responses (crypto.randomUUID)
- /debug/dbpool already exists (ADMIN-only)
- inventory POST now sets max_qty = qty automatically

### Verdict
**All VPS-verifiable checks PASS.** Remaining: real browser/device testing (see claude/BROWSER_TEST_SCRIPT.md).

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

## P0.2 — Venue PIN display (deployed 2026-02-18)
- PIN masked by default with bullet chars, Show/Hide toggle + Copy button
- Role-guarded: GET /venues requires ADMIN_ROLES (already enforced)

## P0.3 — Admin mobile responsive (deployed 2026-02-18)
- Viewport meta tag (`width=device-width, initial-scale=1, maximum-scale=1`)
- Input font-size 16px (prevents iOS auto-zoom)
- `table-scroll` class for horizontal scroll on narrow screens
- `form-grid` responsive class (stacks on mobile)
- Mobile breakpoint: smaller card padding, compact table cells

## P1.1 — NFC scan button (deployed 2026-02-18)
- `os/app/lib/nfc.js` — Web NFC capability detection + single-tag scan
- NFC button on /ops/security (top-up UID input) and /guest (check-in UID input)
- Graceful fallback: button hidden when Web NFC unavailable, info note shown

## P1.2 — UID history lookup (deployed 2026-02-18)
- `GET /uid/:uid_tag/history` — sessions, active status, balance (SECURITY/DOOR/ADMIN)
- Privacy: non-MAIN_ADMIN only sees same-venue data
- Security page: cyan "Lookup UID" panel with NFC scan, IN/OUT badge, visits table
- Index: `venue_sessions(uid_tag, started_at DESC)`

## P1.3 — Runner full stock + progress bars (deployed 2026-02-18)
- `inventory.max_qty` nullable column (idempotent ALTER)
- Seeded max_qty from original inventory seed quantities
- Runner tabs: "Alerts" (low-stock logs) + "All Stock" (all items with progress bars)
- Progress bar: purple fill on black, orange when low, red when empty
- Threshold marker on each bar, % label

## P2 — Guest Layer 2 profile (deployed 2026-02-18, GATED OFF)
- Profile UI on /guest: Stats (level badge, XP bar, wallet, visits), Quests, History tabs
- Only renders when `feature_layer >= 2` (currently 1 in production)
- Layer 1 guest page unchanged

## All Deployed Commits (2026-02-18)
| Commit | Description |
|--------|-------------|
| facc69e | P0.1: proxy cache fix |
| e03bdb6 | P0.2: venue PIN display |
| 209f742 | P0.3: admin mobile responsive |
| 5517651 | P1.1: NFC scan button |
| a8cfb62 | P1.2: UID history lookup |
| bb4c106 | P1.3: runner stock + progress bars |
| a9661ea | P2: guest Layer 2 profile (gated) |

## Current State Snapshot (2026-02-19)

| Item | Value |
|------|-------|
| **Latest deployed commit** | `d96d650` (Policy: enforce NFC-required payer for BAR orders) |
| **NFC policy** | Enforced — Bar POS requires wristband tap before payment |
| **Backup location** | `backups/db_pwlos_20260219_011632.sql.gz` (11K, verified restore) |
| **Deploy command** | `cd /opt/pwl-os/appmockup && bash scripts/deploy.sh` |
| **Monitoring** | `GET /status` (MAIN_ADMIN auth required) |
| **Health check** | `GET /health` → `{"ok":true}` |
| **Feature layer** | 1 (Layer 2 gated off) |

### Role Permissions Summary

| Role | Capabilities |
|------|-------------|
| MAIN_ADMIN | All venues, all endpoints, /status, /debug/dbpool, wallet top-up |
| VENUE_ADMIN | Own venue management, menu/inventory CRUD, wallet top-up |
| BAR | Own venue POS orders (NFC required), menu read |
| SECURITY | Own venue check-in/out, UID history lookup |
| DOOR | Own venue check-in/out, UID history lookup |
| RUNNER | Own venue inventory view, restock action |

## Next Steps
1. **Simulation night** — full end-to-end test with real devices
2. Bugfix-only phase — fixes from simulation only
3. Uptime monitoring — external alerting
4. First real venue validation

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

## COMMIT 3 — Poor-Network UX (deployed 2026-02-18)

### Changes
- **`os/app/lib/useNetworkStatus.js`** (new): Hook polls `/api/health` every 10s with 5s timeout. Returns boolean `online`. Silent — no console spam or toasts on poll failure.
- **`os/app/api/health/route.js`** (new): Static Next.js route returning `{"ok":true}`. Pre-rendered at build time (zero server cost).
- **`os/app/ops/bar/page.js`**: Red offline banner with "Retry Last Order" button when `lastFailedOrder` exists. Confirm buttons disabled when offline. `submitOrder()` early-returns with toast if offline. Failed orders saved to `lastFailedOrder` state for retry.
- **`os/app/ops/security/page.js`**: Red offline banner at top when offline. Top Up button disabled when offline. `topUp()` early-returns with toast if offline.

### How to Test Offline
1. SSH to VPS: `ssh nite-core`
2. Stop API: `docker compose -f /opt/pwl-os/appmockup/docker-compose.yml stop api`
3. In browser on `/ops/bar`:
   - Banner "Network unavailable" appears within 10s
   - Confirm button disabled
   - Attempt submit → toast "Cannot submit — network unavailable"
4. On `/ops/security`:
   - Banner "Network unavailable" appears within 10s
   - Top Up button disabled
5. Restore API: `docker compose -f /opt/pwl-os/appmockup/docker-compose.yml start api`
   - Banners clear within 10–20s
6. Failed order retry:
   - With API down, attempt order → fails → banner shows "Retry Last Order"
   - Click → cart restored
   - Bring API back → submit succeeds

### Verification (VPS, 2026-02-18)
- [x] Health endpoint responds `{"ok":true}` inside container
- [x] Health endpoint responds through nginx (`curl -sk https://localhost/api/health -H 'Host: os.peoplewelike.club'`)
- [x] Build output shows `/api/health` as `○` (static, prerendered)
- [x] OS container running, build succeeded with 0 errors
- [ ] Browser offline simulation (USER ACTION NEEDED)

## COMMIT 4 — Minimal Monitoring (deployed 2026-02-18)

### Changes
- **In-memory metrics** in `api/server.js`: request/error counts, last 5 errors (capped), order latencies (capped 100), 5-min rolling window with auto-reset
- **Fastify hooks**: `onRequest` (count + start time), `onResponse` (5xx tracking), `onError` (error capture — method/url/status/message only, no secrets)
- **Order latency**: measured around `withTx` in POST /orders, SLOW_ORDER log inserted if >500ms (try/catch wrapped, never breaks orders)
- **GET /status** (MAIN_ADMIN only): uptime, window, rates, error list, avg/p95 latency, recent latencies, config flags, db pool stats

### Verification (VPS, 2026-02-18)
- [x] `GET /health` → `{"ok":true}`
- [x] `GET /status` without auth → 401 Missing token
- [x] `GET /status` as BAR → 403 Forbidden
- [x] `GET /status` as MAIN_ADMIN → full metrics JSON
- [x] After placing order: `avg_order_latency_ms: 8`, `recent_order_latencies: [8]`
- [x] Request count incrementing correctly (6 → 11 after test calls)
- [x] DB pool stats: totalCount=1, idleCount=1, waitingCount=0
- [x] No sensitive data in response (no tokens, passwords, secrets)

## COMMIT 5 — Permission Tightening (deployed 2026-02-18)

### Changes
- **`canAccessVenue(user, venueId)`** helper: MAIN_ADMIN accesses all venues, everyone else restricted to own `venue_id`
- **Venue-scoped reads**: GET /menu/:vid, /inventory/:vid, /orders/:vid, /logs/:vid, /headcount/:vid — cross-venue returns 403
- **Venue-scoped writes**: POST/PUT/DELETE /menu, /inventory — VENUE_ADMIN can only modify own venue
- **PUT /venues/:id** — VENUE_ADMIN restricted to own venue
- **POST /logs** — upgraded from `requireAuth` to `requireRole(staff roles)` + venue scope
- **PUT /notifications/:id/read** — ownership check added (target_user_id must match or MAIN_ADMIN)

### Verification (VPS, 2026-02-18)
- [x] BAR (venue 2) GET /menu/2 → 11 items (own venue: OK)
- [x] BAR (venue 2) GET /menu/1 → 403 Forbidden (cross-venue: BLOCKED)
- [x] BAR (venue 2) GET /orders/2 → 10 orders (own venue: OK)
- [x] BAR (venue 2) GET /orders/1 → 403 Forbidden (cross-venue: BLOCKED)
- [x] BAR (venue 2) GET /logs/2 → 18 logs (own venue: OK)
- [x] BAR (venue 2) GET /logs/1 → 403 Forbidden (cross-venue: BLOCKED)
- [x] MAIN_ADMIN GET /menu/2 → 11 items (cross-venue: OK, admin retains access)
- [x] All containers running, no errors

## Phases 6–8 Final Results (2026-02-18)

### Phase 6 — Load & Stress Testing

| Test | Orders | Success | Error Rate | Throughput | Avg Latency | p95 |
|------|--------|---------|------------|------------|-------------|-----|
| Sequential (200) | 200/200 | 100% | 0% | 190.5 ord/s | 5ms | 8ms |
| Parallel (5×40) pre-fix | 176/200 | 88% | 12% | — | — | — |
| Parallel (5×40) post-fix | 200/200 | 100% | 0% | 245.1 ord/s | 19ms | 36ms |

- **Deadlock fix**: sorted inventory item locks by ID before `SELECT FOR UPDATE`
- **Network interruption**: API restarted mid-test — no corrupted orders, no negative inventory, no duplicate idempotency keys
- **Idempotency check**: PASS (duplicate key returns existing order)
- **Inventory non-negative**: PASS (no `stock_qty < 0` after test)
- **DB pool**: stable at totalCount=3, idleCount=2, waitingCount=0

### Phase 7 — Backup & Restore
- pg_dump: 47KB compressed backup created
- Restore dry-run to separate DB: verified all table row counts match
- Scripts: `scripts/backup.sh`, `scripts/restore.sh` (with --force safety)
- Cron schedule documented in OPS_RUNBOOK

### Phase 8 — Confidence Assessment
- **Confidence: HIGH** for live night
- Caveat: deployment pipeline now fixed (deploy.sh script, single compose file in repo)

### Commits
| Commit | Description |
|--------|-------------|
| f114cc0 | Add load test script |
| ce28ec7 | Fix load test: disable keep-alive, add timeout |
| d0f72c2 | Fix deadlock: sort inventory items by ID |
| 7ee6271 | Add OPS Runbook |

## Priority 0–6 Implementation (2026-02-18)

### Commits
| Hash | Description |
|------|-------------|
| af3039e | Fix: guest end-session 400 Bad Request |
| 5f89a38 | Fix: detect expired staff tokens + redirect to login |
| c3e98b8 | Move wallet top-up from Security to Admin only |
| fd25955 | Security door flow: scan preview before check-in |
| 7a58ee9 | Mandatory NFC payment at Bar POS |
| 31c4633 | Runner: two-panel layout, restock action, top products |
| b931d3e | Admin: inventory auto-refresh, activity log, display order tooltip |
| 715cb48 | Prevent screen sleep on ops pages (Wake Lock API) |

### Changes Summary
| Priority | Feature | Status |
|----------|---------|--------|
| 0.1 | Guest End Session fix (empty body → 400) | DONE |
| 0.2 | Staff token expiry → auto-redirect to login | DONE |
| 1 | Top-up moved to Admin only (MAIN_ADMIN/VENUE_ADMIN) | DONE |
| 2 | Security door flow: NFC scan → preview → Check In/Decline | DONE |
| 3 | Mandatory NFC payment at Bar POS (cart→confirm→tap→submit) | DONE |
| 4 | Runner: two-panel layout, restock, top products chart | DONE |
| 5 | Admin: inventory 10s polling, activity log search+highlights | DONE |
| 6 | Wake Lock API on all ops pages | DONE |

### Key API Changes
- `POST /orders` now accepts `uid_tag` → resolves active session → wallet payment
- `POST /wallet/topup` restricted to ADMIN_ROLES only
- `POST /inventory/:venue_id/:id/restock` new endpoint for RUNNER role
- `POST /guest/checkout` now logs CHECKOUT event

## Next Steps
1. **USER ACTION NEEDED**: Deploy to VPS (`bash scripts/deploy.sh`)
2. Browser-test NFC payment flow on Android Chrome
3. Verify security door preview with real NFC tags
4. Layer 2 planning (quests, profiles, gamification)
