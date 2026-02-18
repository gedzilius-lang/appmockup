# Ops Runbook — Supermarket Venue

## NFC Payment Policy

**Hard requirement:** Every bar order MUST identify the paying guest via NFC tag tap.

### How it works

1. Bartender builds cart in Bar POS (drink tiles).
2. Bartender taps **Confirm Order** — POS enters "waiting for NFC tap" state.
3. Guest holds NFC tag against bartender's phone.
4. Tag UID is read, resolved to guest's active session, wallet is charged.
5. If any step fails, the order is NOT created and no money is deducted.

### Enforcement layers

| Layer | Mechanism |
|-------|-----------|
| **UI** | Bar POS requires NFC-capable device. Non-NFC devices see full-screen block: "This device cannot take payments." |
| **UI** | "Confirm Order" triggers NFC scan — order is never sent to API until a UID is successfully read. |
| **API** | `POST /orders` rejects requests from BAR role without `uid_tag` (error: `NFC_REQUIRED`). |
| **API** | If `uid_tag` has no active session, returns `NO_ACTIVE_SESSION`. Guest must check in at door first. |

### Why no manual UID entry for BAR

Manual UID entry would let bartenders type arbitrary UIDs, charging the wrong guest. NFC tap is the only reliable way to confirm the guest is physically present and consenting to the charge.

Only **MAIN_ADMIN** can submit orders without NFC (for testing/corrections).

---

## Common Failure Scenarios

### Guest forgot their tag
- **Action:** Send guest to the door/admin desk to get a replacement tag or use their original.
- **Do NOT** let bartender type a UID manually.

### Tag unreadable (NFC read fails)
- **Symptom:** Error toast "NFC read failed — try again"
- **Action:** Try again — hold tag flat against phone's NFC antenna (usually top-back of phone). Remove phone case if thick. If tag is damaged, send guest to admin for replacement.

### NFC device unsupported (non-Android or old phone)
- **Symptom:** Full-screen block "This device cannot take payments. Use an NFC-enabled Android device with Chrome."
- **Action:** Use a different device. Only Android + Chrome supports Web NFC. iPhones, Firefox, Samsung Browser do NOT work.

### Web NFC permission prompt
- **Symptom:** Browser asks "Allow this site to use NFC?" on first scan.
- **Action:** Tap **Allow**. This is a one-time prompt per device. If accidentally denied, clear site permissions in Chrome settings > Site Settings.

### Network offline
- **Symptom:** Orange banner "Network unavailable", Confirm button disabled.
- **Action:** Wait for network. Orders cannot be queued offline — they require real-time wallet balance check and stock validation.

### "No active session" error
- **Symptom:** Toast "No active session — guest must check in at door first"
- **Action:** Send guest to security/door to check in with their tag before ordering.

### Insufficient funds
- **Symptom:** Toast "Insufficient funds (need X NC, have Y NC)"
- **Action:** Send guest to admin desk for wallet top-up, then retry.

---

## Role Reference

| Role | Can do | Cannot do |
|------|--------|-----------|
| BAR | Create orders (NFC required), undo orders (<60s) | Top-up wallets, check in guests, manual UID entry |
| SECURITY/DOOR | Scan tags, check in guests, log incidents, view activity | Create orders, top-up wallets |
| RUNNER | View stock alerts, restock inventory | Create orders, top-up wallets |
| MAIN_ADMIN | Everything including top-up, orders without NFC | — |
