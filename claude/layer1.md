# Layer 1 — Revenue Engine (POS for Supermarket)

## Scope
Everything needed for a venue (Supermarket) to run a full night with digital POS.

## Features (Layer 1 only)
1. **Bar POS** — drink grid, categories, cart, confirm order (touch-first)
2. **Atomic transactions** — order insert + inventory decrement + wallet deduct in one DB transaction
3. **Wallet top-up** — `/wallet/topup` endpoint + security/door UI to add NC
4. **Low-stock alerts** — thresholds + runner view (polling every 5s)
5. **Idempotency** — prevent double-charge / duplicate confirm
6. **Logging** — SELL / TOPUP / LOW_STOCK / CHECK_IN events recorded
7. **Guest check-in/checkout** — session management, wallet display
8. **Ops login** — PIN-based auth for BAR / RUNNER / SECURITY roles
9. **Admin login + dashboard** — basic metrics and venue management
10. **60-second order undo** — safe rollback of last order

## Not in Layer 1
- Quests, XP/levels (schema exists but gated)
- Automation engine (code exists but gated)
- Cross-venue identity
- Sponsorships
- Real-time sockets
- ML suggestions
- Offline mode

## API Endpoints (Layer 1)
- `POST /auth/login` — admin login
- `POST /auth/pin` — ops staff login
- `GET /me` — current user + session
- `POST /guest/checkin` / `POST /guest/checkout`
- `GET /menu/:venue_id` — menu items with stock
- `POST /orders` — create order (BAR role)
- `GET /orders/:venue_id` — order history
- `DELETE /orders/:id` — undo (60s window)
- `GET /inventory/:venue_id` — stock levels
- `GET /logs/:venue_id` — activity logs
- `POST /logs` — log incident
- `GET /shift/summary` — bar shift stats
- `GET /headcount/:venue_id` — active sessions
- `GET /stats` — admin dashboard stats
- `GET /health` — API health check

## Definition of Done
- Fast POS (< 200ms order confirm)
- Correct wallet deductions
- Correct inventory decrements
- Top-ups working
- Low stock alerts visible to runners
- No double charges, no negative balances, no data corruption
