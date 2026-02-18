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

## 3. Bar POS — NFC Payment Flow (Android Chrome, 3 min)

**Prerequisite:** Guest must be checked in (see section 6 first, or use Security door flow).

### NFC hard-block test (Desktop/iOS)
1. Open `https://os.peoplewelike.club/ops` on a **non-NFC device**
2. Enter PIN `1234`, select **BAR**
3. **Expected:** Full-screen error: "This device cannot take payments" with "Back to Ops" button
4. No menu grid visible, no way to build cart

### NFC payment test (Android Chrome)
1. Open `https://os.peoplewelike.club/ops` on **NFC-enabled Android + Chrome**
2. Enter PIN `1234`, select **BAR**
3. **Expected:** Bar POS loads, menu grid with drink tiles
4. Tap **Beer** x2 -> cart shows Beer x2 = 10 NC
5. Tap **Confirm Order**
6. **Expected:** Cart locks (no +/- buttons, no Clear), pulsing NFC prompt: "Guest tap NFC tag to pay"
7. **Expected:** Cancel button visible below NFC prompt
8. Hold guest's NFC tag near phone
9. **Expected:** Spinner "Processing payment...", then success toast "Order #X confirmed — 10 NC"
10. Cart clears, Beer stock decreases by 2

### Cancel mid-wait test
1. Build cart again (any item)
2. Tap **Confirm Order** -> NFC wait state
3. Tap **Cancel**
4. **Expected:** Returns to normal cart state, no order created

### No active session test
1. Use a UID tag that is NOT checked in
2. Build cart, Confirm, tap that tag
3. **Expected:** Error toast: "No active session — guest must check in at door first"
4. Cart preserved (can retry with correct tag)

### Bypass attempt (should fail)
- Orders submitted without uid_tag are rejected server-side with `NFC_REQUIRED`
- This cannot happen from the Bar POS UI (NFC scan always precedes API call)

**Screenshot if failing:** NFC wait screen, error toast, or hard-block page

---

## 4. Security Door Flow (Phone or Desktop, 2 min)

1. Go back to `https://os.peoplewelike.club/ops`
2. Enter PIN `1234`, select **SECURITY**
3. **Expected:** "Scan Tag" panel (green theme), incident form, activity log
4. **No** top-up UI visible (top-up is Admin-only now)

### Tag scan + preview
5. Enter a known UID tag (or tap NFC on Android)
6. Click **Lookup**
7. **Expected:** Preview card shows: CHECKED IN/NOT CHECKED IN status, balance, visit count, recent visits
8. If not checked in: green **Check In** button
9. If already in: "Already checked in" indicator

### NFC scan (Android Chrome only)
10. Tap **NFC** button -> browser asks for NFC permission
11. Hold NFC tag near phone -> UID fills + preview auto-loads

**Screenshot if failing:** scan panel or preview card

---

## 5. Runner Stock View (Phone or Desktop, 1 min)

1. Go to `https://os.peoplewelike.club/ops`
2. Enter PIN `1234`, select **RUNNER**
3. **Expected:** Two-panel layout: **Alerts** (left) + **All Stock** (right)
4. **Expected:** Every inventory item with progress bar, threshold marker, +Restock button
5. Click **+Restock** on any item -> inline qty input appears
6. Enter qty, click **Add** -> stock updates, toast "Restocked +N"
7. Click **Top Products** button -> bar chart of top-selling items
8. Auto-refresh every 5s (note in header)

**Screenshot if failing:** stock panels or restock form

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
| 3 | Bar POS NFC payment flow | |
| 3a| Bar NFC hard-block (non-NFC device) | |
| 3b| Bar cancel mid-wait | |
| 3c| Bar no-active-session error | |
| 4 | Security door flow + preview | |
| 5 | Runner stock view | |
| 6 | Guest check-in (no L2 UI) | |
| 7 | Mobile responsive | |
| 8 | Cleanup | |

**NFC tested?** [ ] Yes / [ ] No (device: _______)

If any test fails, screenshot the page and note which step number.
