# Browser Test Script (~10 minutes)

Run on **Android Chrome** (for NFC) + **Desktop Chrome**.

## 1. Admin Login (Desktop, 1 min)

1. Open `https://admin.peoplewelike.club`
2. Login with your admin credentials
3. **Expected:** Dashboard loads, shows venue/event/session counts
4. Navigate to **Venues** tab
5. **Expected:** Supermarket venue listed, PIN masked with bullets
6. Click **Show** next to PIN -> PIN revealed
7. Click **Copy** -> paste somewhere to confirm clipboard
8. **Expected:** PIN = `1234`

**Screenshot if failing:** login page or dashboard

---

## 2. Admin Menu Create (Desktop, 1 min)

1. Navigate to **Menu Items** tab
2. Select **Supermarket** in venue dropdown
3. **Expected:** 11 items listed (Beer, Wine, Vodka Shot, etc.)
4. Click **+ Add Item**
5. Fill: Name=`Browser Test`, Category=`Shots`, Price=`7`, Icon=`🔬`
6. Click **Add Item**
7. **Expected:** Toast "Menu item created", item appears in table
8. Keep this tab open (you'll verify it appears in Bar POS next)

---

## 3. Bar POS — Order Flow (Phone or Desktop, 2 min)

1. Open `https://os.peoplewelike.club/ops`
2. Enter PIN `1234`, select **BAR**
3. **Expected:** Bar POS loads, menu grid with drink tiles
4. **Expected:** "Browser Test" item visible in Shots category
5. Tap **Beer** x2 -> cart shows Beer x2 = 10 NC
6. Tap **Confirm Order**
7. **Expected:** Spinner overlay, then success toast "Order #X confirmed — 10 NC"
8. Cart clears, Beer stock decreases by 2
9. Click **Orders** -> most recent order shows "2x Beer"
10. If within 60s, **Undo** button visible

**Screenshot if failing:** menu grid or cart area

---

## 4. Security Top-up (Phone or Desktop, 2 min)

1. Go back to `https://os.peoplewelike.club/ops`
2. Enter PIN `1234`, select **SECURITY**
3. **Expected:** Top-up panel visible with UID Tag input, Session ID, Amount
4. Quick amount chips visible: +20, +50, +100, +200

### UID Lookup (below top-up)
5. Scroll down to **Lookup UID** panel (cyan themed)
6. Enter a UID tag that has sessions (or skip if none)
7. **Expected:** IN/OUT badge, balance, visit history

### NFC (Android Chrome only)
8. **Expected:** NFC scan button visible next to UID input
9. Tap it -> browser asks for NFC permission
10. Hold NFC tag near phone -> UID fills automatically

**On desktop/iOS:** NFC button should NOT appear, info note visible instead.

**Screenshot if failing:** top-up panel or NFC button area

---

## 5. Runner Stock View (Phone or Desktop, 1 min)

1. Go to `https://os.peoplewelike.club/ops`
2. Enter PIN `1234`, select **RUNNER** (if available, otherwise skip)
3. **Expected:** Two tabs: **Alerts** and **All Stock**
4. Click **All Stock**
5. **Expected:** Every inventory item with progress bar showing fill %
6. Beer should show ~91-93% (some orders placed)
7. Threshold markers visible on bars

**Screenshot if failing:** stock list or progress bars

---

## 6. Guest Check-in (Phone, 1 min)

1. Open `https://os.peoplewelike.club/guest`
2. **Expected:** Check-in form with venue selector + UID input
3. NFC button visible on Android Chrome (hidden elsewhere)
4. Check in to Supermarket
5. **Expected:** Wallet balance displayed (large purple number), session info
6. **NO** Layer 2 UI visible (no quests tab, no XP bar, no profile tabs)

**Screenshot if failing:** guest page after check-in

---

## 7. Mobile Responsive (Phone, 1 min)

Test these on phone (narrow screen):

1. Admin login page: card centered, no horizontal scroll
2. Admin venues table: scrollable horizontally within card
3. Bar POS: tiles smaller but tappable, cart sticky at bottom
4. Security: chips + inputs stack cleanly
5. All inputs: no auto-zoom on focus (font-size 16px)

---

## 8. Cleanup (Desktop, 30 sec)

1. Go back to Admin -> Menu Items
2. Find "Browser Test" item
3. Click **Del** to deactivate it
4. Confirm deactivation

---

## Result Summary

| # | Test | Pass/Fail |
|---|------|-----------|
| 1 | Admin login + PIN display | |
| 2 | Admin menu create | |
| 3 | Bar POS order flow | |
| 4 | Security top-up + UID lookup | |
| 5 | Runner stock view | |
| 6 | Guest check-in (no L2 UI) | |
| 7 | Mobile responsive | |
| 8 | Cleanup | |

**NFC tested?** [ ] Yes / [ ] No (device: _______)

If any test fails, screenshot the page and note which step number.
