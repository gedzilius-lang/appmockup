# VERIFY_LAYER1 — Browser Verification Checklist

Run each test in a real browser at `https://os.peoplewelike.club`.
Mark pass/fail after each.

## 1. Security Login + Top-Up
- [ ] Navigate to `/ops` → enter PIN 1234 → select SECURITY → lands on security page
- [ ] Top-up panel visible: UID Tag, Session ID, Amount fields
- [ ] Enter User ID (from DB), Amount 100 → Submit → success toast, balance increases
- [ ] Enter Amount > 5000 → should error `MAX_TOPUP_EXCEEDED`
- [ ] Rapid double-click submit → second request returns 429 `TOO_MANY_REQUESTS`

## 2. Bar Login + Order Flow
- [ ] Navigate to `/ops` → enter PIN 1234 → select BAR → lands on bar POS
- [ ] Menu shows 11 items with categories (Drinks, Shots, Cocktails, Soft)
- [ ] Add Beer x2 to cart → shows total 10 NC
- [ ] Confirm order → success toast, cart clears
- [ ] Menu stock updates (Beer qty decreases by 2)
- [ ] Order appears in history panel
- [ ] Double-click confirm (rapid) → only one order created (idempotency)

## 3. Negative Balance Guard
- [ ] Create a guest with 0 NC balance
- [ ] Attempt wallet order → should fail with `INSUFFICIENT_FUNDS`
- [ ] DB: `SELECT points FROM users WHERE id=$guest_id` → still 0 (no negative)

## 4. Out of Stock Guard
- [ ] Set an inventory item qty to 0 in DB
- [ ] Attempt to order that item → should fail with `OUT_OF_STOCK`
- [ ] Inventory qty still 0 (not negative)

## 5. Feature Gates
- [ ] `/api/config` returns `{"feature_layer":1}`
- [ ] `/api/quests/2` returns `FEATURE_LOCKED`
- [ ] `/api/rules/2` returns `FEATURE_LOCKED`
- [ ] `/api/analytics/2` returns `FEATURE_LOCKED`

## 6. Legacy Endpoint
- [ ] `POST /api/actions/sell` returns 410 Gone

## 7. Admin Login
- [ ] Navigate to `https://admin.peoplewelike.club`
- [ ] Login with test@test.lt / 1111 → lands on dashboard
- [ ] Can view venues, inventory, orders

## 8. Guest Flow
- [ ] Navigate to `/guest` → guest check-in page loads
- [ ] (Guest wallet + session flow — manual test if guest has balance)

## Status
- [ ] ALL PASS → proceed to Phase E (UI polish)
- [ ] FAILURES → fix before any UI work
