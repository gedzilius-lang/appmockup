# VERIFY_LAYER1 — Browser Verification Checklist

Run each test in a real browser at `https://os.peoplewelike.club`.
Mark pass/fail after each.

## 1. Security Login + Top-Up
- [ ] Navigate to `/ops` -> enter PIN 1234 -> select SECURITY -> lands on security page
- [ ] Top-up panel visible: UID Tag input + NFC button (Android only), Session ID, Amount fields
- [ ] Enter User ID (from DB), Amount 100 -> Submit -> success toast, balance increases
- [ ] Enter Amount > 5000 -> should error `MAX_TOPUP_EXCEEDED`
- [ ] Rapid double-click submit -> second request returns 429 `TOO_MANY_REQUESTS`

## 2. Security UID Lookup
- [ ] UID Lookup panel visible below top-up (cyan themed)
- [ ] Enter UID tag -> click Lookup -> shows IN/OUT status, balance, visit history
- [ ] NFC scan button visible on Android Chrome, hidden on other browsers

## 3. Bar Login + Order Flow
- [ ] Navigate to `/ops` -> enter PIN 1234 -> select BAR -> lands on bar POS
- [ ] Menu shows 11+ items with categories (Drinks, Shots, Cocktails, Soft)
- [ ] Add Beer x2 to cart -> shows total 10 NC
- [ ] Confirm order -> success toast, cart clears
- [ ] Menu stock updates (Beer qty decreases by 2)
- [ ] Order appears in history panel
- [ ] Double-click confirm (rapid) -> only one order created (idempotency)

## 4. Admin Menu -> Bar POS
- [ ] Admin: create new menu item (e.g. "Test Shot", Shots, 5 NC)
- [ ] OS /ops/bar: refresh -> new item appears in menu grid
- [ ] Order the new item -> order succeeds

## 5. Negative Balance Guard
- [ ] Create a guest with 0 NC balance
- [ ] Attempt wallet order -> should fail with `INSUFFICIENT_FUNDS`
- [ ] DB: `SELECT points FROM users WHERE id=$guest_id` -> still 0 (no negative)

## 6. Out of Stock Guard
- [ ] Set an inventory item qty to 0 in DB
- [ ] Attempt to order that item -> should fail with `OUT_OF_STOCK`
- [ ] Inventory qty still 0 (not negative)

## 7. Feature Gates
- [ ] `/api/config` returns `{"feature_layer":1}`
- [ ] `/api/quests/2` returns `FEATURE_LOCKED`
- [ ] `/api/rules/2` returns `FEATURE_LOCKED`
- [ ] `/api/analytics/2` returns `FEATURE_LOCKED`

## 8. Legacy Endpoint
- [ ] `POST /api/actions/sell` returns 410 Gone

## 9. Admin Dashboard
- [ ] Navigate to `https://admin.peoplewelike.club`
- [ ] Login -> lands on dashboard
- [ ] Venues page: PIN masked by default, Show/Hide toggle works, Copy button copies
- [ ] Tables scroll horizontally on mobile
- [ ] Forms stack to single column on narrow screens
- [ ] No iOS zoom on input focus (16px font-size)

## 10. Runner
- [ ] Navigate to `/ops` -> PIN 1234 -> select RUNNER
- [ ] Alerts tab: shows low-stock items (or empty if all stocked)
- [ ] All Stock tab: every inventory item with progress bar
- [ ] Progress bars show correct fill %, threshold marker visible

## 11. Guest Flow
- [ ] Navigate to `/guest` -> guest check-in page loads
- [ ] Check in -> wallet balance, session info displayed
- [ ] No Layer 2 UI visible (no quests/XP bar/profile tabs)
- [ ] NFC button next to UID input on Android Chrome

## DB Integrity Checks (VPS)

### Menu items match admin creates
```sql
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active) AS active FROM menu_items;
```
Expected: active >= 11 (seeded).

### Inventory never negative
```sql
SELECT id, item, qty FROM inventory WHERE qty < 0;
```
Expected: 0 rows.

### Users points never negative
```sql
SELECT id, email, points FROM users WHERE points < 0;
```
Expected: 0 rows.

### Orders consistent (total matches items sum)
```sql
SELECT o.id, o.total,
  (SELECT SUM((i->>'price')::int * (i->>'qty')::int) FROM jsonb_array_elements(o.items) i) AS computed
FROM orders o
WHERE o.total != (SELECT SUM((i->>'price')::int * (i->>'qty')::int) FROM jsonb_array_elements(o.items) i);
```
Expected: 0 rows.

### Inventory max_qty populated
```sql
SELECT id, item, max_qty FROM inventory WHERE max_qty IS NULL;
```
Expected: 0 rows for seeded venue.

## Status
- [ ] ALL PASS -> production ready
- [ ] FAILURES -> fix before next phase
