# PeopleWeLike — Real-Time Venue Operating System

## Official Product Blueprint v1.0

---

## Table of Contents

1. [Product Definition](#1-product-definition)
2. [Core Philosophy](#2-core-philosophy)
3. [System Architecture](#3-system-architecture)
4. [The Chameleon Principle — Adaptive Mode Switching](#4-the-chameleon-principle--adaptive-mode-switching)
5. [Identity and Presence](#5-identity-and-presence)
6. [Guest Experience](#6-guest-experience)
7. [Staff POS — Bar View](#7-staff-pos--bar-view)
8. [Runner Operations](#8-runner-operations)
9. [Security and Door Staff](#9-security-and-door-staff)
10. [Event Host View](#10-event-host-view)
11. [Admin Command Center](#11-admin-command-center)
12. [NFC and Cashless Economy](#12-nfc-and-cashless-economy)
13. [Wallet and Nitecoin Economy](#13-wallet-and-nitecoin-economy)
14. [Leveling and XP System](#14-leveling-and-xp-system)
15. [Quest Engine](#15-quest-engine)
16. [Automation Rule Engine](#16-automation-rule-engine)
17. [Real-Time Data Flow](#17-real-time-data-flow)
18. [User Profile](#18-user-profile)
19. [Data Model](#19-data-model)
20. [API Surface](#20-api-surface)
21. [Infrastructure and Deployment](#21-infrastructure-and-deployment)
22. [Monetization Model](#22-monetization-model)
23. [Ethical Constraints](#23-ethical-constraints)
24. [Current Implementation Status](#24-current-implementation-status)
25. [Development Roadmap](#25-development-roadmap)

---

## 1. Product Definition

PeopleWeLike is a **real-time operating system for physical venues** that connects entry, identity, spending, staff operations, and guest engagement into a single adaptive system.

It is not a POS system. It is not a loyalty app. It is not a ticketing tool. It is not a marketing platform. Those are components within the product. The product itself is a **real-time behavioral operating system for physical spaces** that guides behavior through incentives, not manipulation — creating value for guests, venues, and operators simultaneously.

### One-Sentence Definition

> A single web application that replaces POS terminals, loyalty cards, NFC wristbands, walkie-talkies, and management spreadsheets with one real-time system where every transaction is a signal that makes the entire venue smarter.

### The Core Proposition

Every tap on the bar POS is simultaneously a transaction, a behavioral signal, a stock event, a quest trigger, an XP award, and a data point for the automation engine — all flowing through one identity, one app, one real-time loop.

---

## 2. Core Philosophy

### The Problem with Venues Today

Venues are chaotic systems. People arrive unpredictably. Staff reacts too late. Prices are static. Marketing is blind. Decisions are made after the night is over. Most software tries to observe this chaos. This system is built to orchestrate it — in real time.

### The Ethical Foundation

Behavior is influenced through incentives, not manipulation. This is the non-negotiable operating constraint.

- Users are never punished for inactivity
- Users are never locked out of value
- Users are rewarded for participation, not coerced
- Data is used to improve experience, not exploit individuals
- No personal data is sold
- No experience is degraded without consent

### The North Star

If at any point the product feels extractive to users, controlling to venues, or opaque to operators — it is drifting from its core. The correct direction is always: **more clarity, more reward, more autonomy — in real time.**

---

## 3. System Architecture

### Service Overview

The system runs as a multi-service Docker Compose stack behind an NGINX reverse proxy, with Cloudflare providing DNS and edge SSL.

```
                    Cloudflare (DNS + SSL)
                           |
                         NGINX
                      (port 80)
                     /    |    \
                    /     |     \
    os.peoplewelike.club  |  admin.peoplewelike.club
         (OS :3000)       |       (Admin :3001)
                          |
              api.peoplewelike.club
                    (API :4000)
                          |
                     PostgreSQL 16
                      (db_data)
```

### Services

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **API** | Node.js / Fastify | 4000 | REST backend, business logic, auth, automation |
| **OS** | Next.js 14 | 3000 | Public-facing app for all roles (guest, bar, runner, security) |
| **Admin** | Next.js 14 | 3001 | Staff admin dashboard for venue management |
| **NGINX** | nginx:alpine | 80 | Reverse proxy, subdomain routing |
| **DB** | PostgreSQL 16 | 5432 | Persistent data store |

### Domain Routing

- `os.peoplewelike.club` — Main app (all guest and operational roles)
- `admin.peoplewelike.club` — Admin interface (venue management, analytics)
- `api.peoplewelike.club` — Backend API

### Key Design Decisions

- Docker Compose for orchestration (simple, reproducible deployments)
- PostgreSQL over SQLite for concurrent access and JSON support
- Next.js for server-side rendering on public pages (SEO for events) and client-side interactivity for operational views
- Fastify over Express for schema validation support and performance
- JWT-based auth with role encoding for zero-database-hit authorization on every request

---

## 4. The Chameleon Principle — Adaptive Mode Switching

The defining architectural concept of PeopleWeLike. A person does not change apps. The app changes reality.

### How It Works

The same application renders a completely different experience based on four contextual dimensions:

| Dimension | Values | Effect |
|-----------|--------|--------|
| **Who you are** | Guest, Bar Staff, Runner, Security, Door Staff, Event Host, Venue Admin, Main Admin | Determines visible features and permissions |
| **Where you are** | Which venue (by venue_id) | Determines menu, inventory, pricing, quests, automation rules |
| **When you are** | Before event, during event, after event, time of night | Activates time-based automation rules, adjusts pricing, triggers quests |
| **What is happening** | Crowded, empty, emergency, peak, low stock | Triggers real-time adaptations via the automation engine |

### Role Views

```
Guest          →  Wallet, XP bar, quests, rewards, event feed, radio
Bartender      →  Drink grid POS, order cart, NFC charge, shift stats
Runner         →  Low-stock alerts, restock tasks, acknowledgment
Security       →  NFC check-in circle, headcount, incident log, capacity alerts
Door Staff     →  Card activation, balance top-up, card history, notifications
Event Host     →  Newsletter sign-up, guestlist management, guest balance check
Venue Admin    →  Live dashboard, pricing rules, quest creation, automation config
Main Admin     →  Multi-venue overview, user management, system-wide analytics
```

### Implementation

Role is determined at login (PIN-based for operational roles, email/password for admins, NFC/check-in for guests) and encoded in the JWT. The frontend reads the token and renders the appropriate view. No separate apps, no separate URLs — one surface, many realities.

---

## 5. Identity and Presence

### Identity

Every user has one global identity that persists across venues and events. Identity is lightweight and frictionless — it can exist anonymously (NFC card with just a UID) or be enriched over time (add email, name, preferences). The system never forces identity disclosure.

### Venue Sessions

When a user enters a venue, a **Venue Session** opens. All actions during the night — drinks purchased, quests completed, XP earned, incidents logged — attach to that session. When the user leaves, the session closes.

This creates a complete, truthful picture of every night:

```
entry → behavior → spend → sentiment → exit
```

### Session Fields

| Field | Type | Purpose |
|-------|------|---------|
| user_id | int | Links to global identity |
| venue_id | int | Which venue |
| uid_tag | text | NFC card UID (optional) |
| started_at | timestamp | Check-in time |
| ended_at | timestamp | Check-out time (null if active) |
| total_spend | int | Accumulated spend in this session |
| interactions_count | int | Number of actions taken |

### Cross-Venue Continuity

A guest who visits Venue A on Friday and Venue B on Saturday carries the same identity, the same level, the same wallet balance, the same XP. No venue sees another venue's data, but the user's experience is continuous. This is the network effect that no competitor has.

---

## 6. Guest Experience

### What the Guest Sees

From the guest's perspective, the system is invisible. They experience:

- **Fast entry** — NFC tap or QR scan at the door, session opens automatically
- **Easy payment** — Tap NFC card at bar, balance deducts, no cash handling
- **Fun interaction** — Quests appear ("Order a cocktail before 23:00 for bonus XP"), rewards feel earned
- **Fair rewards** — Points accumulate through participation, not just spending
- **A living night** — Notifications, quests, and pricing adapt to what is happening right now

The user is not "using software." They are participating in a living environment.

### Guest Flow

```
1. Arrive at venue
2. NFC card scanned at door → session opens → check-in XP awarded
3. Browse active quests on phone (via os.peoplewelike.club/guest)
4. Order drinks at bar → bartender taps POS → guest taps NFC card
5. Balance deducts, XP earned, quest progress updates
6. Receive notification: "Quest complete! +200 XP"
7. Level up → new features unlock
8. Leave venue → session closes → night summary available
```

### Guest Panel Features

- **Wallet balance** — Current Nitecoin balance, top-up options
- **XP and level** — Progress bar, current level, next unlock preview
- **Active quests** — Available and in-progress quests for this venue/night
- **Session status** — Current venue, duration, spend so far
- **Visit history** — Past venues, total visits, spend history
- **Notifications** — Real-time alerts (quest available, drink ready, reward earned)

---

## 7. Staff POS — Bar View

The Bar View is the operational heart of the system. It is designed to **replace traditional POS terminals** with a mobile-first, touch-optimized, dark-themed interface that any bartender can operate in under 3 seconds per transaction — in the dark, with wet hands.

### Design Principles

1. **Grid of drink tiles, not a list** — Large square tiles (minimum 80x80px), 3 columns on phone, 4-5 on tablet
2. **One-tap ordering** — Tap a tile to add one unit. Tap again for another. Long-press for quantity picker
3. **Running order at bottom** — Cart-style bar pinned to screen bottom, shows items and quantities inline
4. **One-tap confirm** — Giant confirm button with total price, haptic feedback, auto-clears for next customer
5. **Dark theme mandatory** — High contrast, neon accents, readable at 2AM
6. **No typing, no scrolling** — Everything is large tap targets

### Screen Layout (Mobile Portrait)

```
+------------------------------+
| BAR - Zurich Demo     21:47  |  <- venue name + clock
| Active  -  CHF 342 tonight   |  <- shift stats
+------------------------------+
|                              |
| [Beer  ] [Shot  ] [Cock-  ] |
| [ CHF5 ] [CHF4  ] [tail   ] |
| [  24  ] [  48  ] [ CHF12 ] |
| [      ] [      ] [  18   ] |
|                              |
| [Wine  ] [Water ] [Soda   ] |
| [ CHF8 ] [CHF3  ] [ CHF4  ] |
| [  12  ] [  inf ] [  36   ] |
|                              |
+------------------------------+
| CURRENT ORDER           [x] |
| 2x Beer    1x Cocktail      |
|                              |
| [     CONFIRM - CHF 22     ]|  <- green, full-width
| [  POINTS  ] [  CASH / NFC ]|  <- payment method
+------------------------------+
```

### Tile States

| State | Visual | Meaning |
|-------|--------|---------|
| Normal | Default color with category accent | Available for sale |
| Low stock | Amber/orange border | Below threshold, runner notified |
| Out of stock | Greyed out, disabled | Cannot sell |
| Selected | Highlighted, count badge | In current order |

### Category Organization

Drinks are organized into swipeable category tabs when the menu exceeds one screen:

```
[ Spirits ] [ Beer ] [ Cocktails ] [ Soft ] [ Food ]
```

### Payment Methods

| Method | Flow | Status |
|--------|------|--------|
| **NFC Card** | Guest taps card to bartender's device → balance deducts | Primary (from NEA concept) |
| **Nitecoin/Points** | Guest pays with earned points → wallet deducts | Differentiator vs traditional POS |
| **Cash** | Logged as cash sale, no balance interaction | Fallback |
| **Tab** | Linked to guest session, settled at checkout | Future phase |

### What Happens on Confirm

A single tap on the confirm button triggers the following cascade:

1. Order recorded in `orders` table with items, total, payment method, staff ID
2. Inventory quantities decremented for each item sold
3. If guest NFC card was tapped: wallet balance deducted
4. XP awarded to guest (1 XP per Nitecoin spent, capped per session)
5. Active quests checked for progress ("Order 3 cocktails" → increment)
6. If any item falls below low_threshold → LOW_STOCK log created → runner notified
7. Automation rules evaluated (time-based pricing, quest triggers)
8. Analytics event recorded for admin dashboard
9. Order cart clears, ready for next customer

**Total time from first tap to cleared screen: under 3 seconds.**

### Shift Summary

Accessible from the header, shows:

- Shift start time and duration
- Total orders processed
- Total revenue
- Top-selling items
- Low stock alerts triggered
- Average order value

### Order History and Undo

Slide-up panel showing recent orders for this shift. The last order has a 60-second undo window for mistakes.

---

## 8. Runner Operations

### Purpose

The Runner is the restocking staff. Their single job: see what is running low and resupply it. The system does not wait for the runner to check — it pushes alerts the moment stock drops below threshold.

### Runner View

```
+------------------------------+
| RUNNER ALERTS        Zurich  |
| 3 active   Last: 12s ago    |
+------------------------------+
|                              |
| [!] Vodka                    |
|     Qty: 3  Threshold: 5    |
|     2 min ago                |
|     [ ACKNOWLEDGE ]          |
|                              |
| [!] Gin                      |
|     Qty: 1  Threshold: 5    |
|     8 min ago                |
|     [ ACKNOWLEDGE ]          |
|                              |
| [ok] Beer                    |
|     Restocked 15 min ago     |
|                              |
+------------------------------+
```

### Alert Logic

```
IF inventory.qty <= inventory.low_threshold
   → Create LOW_STOCK log entry
   → Runner view updates within seconds (polling every 5s, WebSocket in future)
   → Alert persists until acknowledged or stock is replenished
```

### Runner Actions

- **Acknowledge** — Marks alert as seen, logs the acknowledgment
- **Mark restocked** — Updates inventory quantity, clears alert
- **Escalate** — Flags to admin that restock is not possible

---

## 9. Security and Door Staff

### Security View

Security operates the door. Their interface is minimal and purpose-built for one action: check people in and out.

```
+------------------------------+
|     SECURITY - Zurich        |
|     Headcount: 147 / 200     |
+------------------------------+
|                              |
|         +----------+         |
|        /            \        |
|       |   CHECK-IN   |       |  <- large circular NFC tap target
|        \            /        |
|         +----------+         |
|                              |
+------------------------------+
| [Call Admin]  [Notifications]|
+------------------------------+
| Recent:                      |
| 23:41 - Card #A7F2 IN       |
| 23:40 - Card #B3E1 IN       |
| 23:38 - INCIDENT logged     |
+------------------------------+
```

### Security Features

- **NFC Check-In/Out** — Large circular tap target. Security presses button, guest taps card. Session opens/closes
- **Live headcount** — Real-time count of active sessions (people currently inside)
- **Capacity alerts** — Visual warning when approaching capacity limit, ability to push notification to team
- **Incident logging** — Categorized incident types (noise, altercation, medical, ejection, other) with timestamp
- **Card status detection** — Shows if a card is inactive/new (about to be activated for first time)
- **Call Admin** — Direct communication channel to venue admin
- **Push Notifications** — One-way broadcast to all staff ("Capacity reached", "VIP arriving")

### Security Permissions

Security has no access to financial data, inventory, or guest spending history. Their scope is strictly: entry, exit, headcount, incidents.

### Door Staff View

Door Staff has slightly elevated permissions compared to Security:

- **Card History** — View a guest's balance and visit history (for guest inquiries)
- **Balance Top-Up** — Accept cash deposits and add Nitecoin to a guest's NFC card on the spot
- **Card Activation** — Activate new NFC cards for first-time guests
- **Push Notifications** — Communicate with the rest of the team

---

## 10. Event Host View

The Event Host is a front-of-house role focused on guest relations and data collection.

### Features

- **Newsletter Sign-Up** — Quick-capture guest email for mailing list
- **Guestlist Management** — Import (Excel/CSV), add, or remove guests in real time
- **Guest Balance Check** — Look up a guest's card balance and history by request
- **Membership Requests** — Queue guest sign-ups for membership cards/waiting list
- **Push Notifications** — Broadcast to staff or targeted notifications

### Purpose

The Event Host bridges the gap between the venue and the guest. Every interaction is an opportunity to capture a future relationship — without being intrusive.

---

## 11. Admin Command Center

The Admin Dashboard is the nerve center. It provides a **real-time operational overview** that updates within seconds, not the next morning.

### Live Dashboard Panels

```
+------------------+------------------+
|  ACTIVE SESSIONS |  TOTAL REVENUE   |
|       147        |    CHF 4,231     |
|  +12 last hour   |  +CHF 380/hr    |
+------------------+------------------+
|  STOCK ALERTS    |  ORDERS TONIGHT  |
|     3 active     |       287        |
|  Vodka, Gin, Rum |  Avg: CHF 14.73 |
+------------------+------------------+
|                                     |
|  LIVE EVENT LOG                     |
|  23:41 SELL Gin&Tonic x2 [Bar #1]  |
|  23:41 CHECK_IN Card #A7F2         |
|  23:40 LOW_STOCK Vodka (qty: 3)    |
|  23:39 QUEST_COMPLETE User #412    |
|  23:38 INCIDENT noise complaint    |
|                                     |
+-------------------------------------+
```

### Admin Capabilities

| Category | Actions |
|----------|---------|
| **Venues** | Create, edit, delete venues. Set PIN codes. Configure capacity limits |
| **Events** | Create, edit, delete events. Set date/time, venue, genre, description, ticket URL, images |
| **Menu & Pricing** | Create menu items with categories, prices, icons. Link to inventory. **Change prices live** (takes effect on next order) |
| **Inventory** | Add items, set quantities, set low-stock thresholds. View stock levels across all venues |
| **Quests** | Create quests with conditions, XP rewards, time windows. Activate/deactivate in real time |
| **Automation Rules** | Configure IF/THEN rules (see Section 16). Enable/disable per venue |
| **Notifications** | Push notifications to individual devices, roles, or venue-wide broadcast |
| **Users** | View guest profiles, staff accounts. Lock/unlock NFC cards remotely. Assign roles |
| **Analytics** | Arrival flow over time, revenue by hour, top products, quest completion rates, staff efficiency |
| **Logs** | Complete audit trail of every action in the system, filterable by type, venue, time |

### Admin Philosophy

The venue manager becomes a **composer, not an operator**. They define pricing logic, reward logic, quest logic, notification rules, and staff permissions. Then they observe, intervene only when needed, and learn. The system runs the night.

---

## 12. NFC and Cashless Economy

### Overview

NFC (Near-Field Communication) is the physical bridge between the digital system and the real world. Every guest receives an NFC card (or uses their NFC-enabled phone) that serves as their identity, wallet, and access credential.

### Card Flow

```
Guest arrives
    |
    v
[Entrance] ──> Card issued or existing card presented
    |
    v
[Door Staff] ──> Card activated (if new)
    |               Balance topped up (cash or online)
    v
[Security] ──> NFC tap ──> Session opens ──> Check-in XP awarded
    |
    v
[Bar] ──> Guest orders ──> Bartender taps POS
    |       Guest taps card ──> Balance deducted
    |       Inventory updated ──> XP awarded
    v
[Exit] ──> NFC tap ──> Session closes ──> Night summary generated
```

### Top-Up Methods

| Method | Flow |
|--------|------|
| **Cash at entrance** | Door Staff accepts cash, tops up card via app |
| **Online (Zahls.ch / Twint)** | Guest tops up via web before arriving |
| **In-app** | Guest links payment method, tops up from phone |

### Card Data

Each NFC card stores only the **unique identifier (UID)**. All balance, history, and identity data lives server-side. The card is a key, not a vault. This means:

- Lost cards can be deactivated and balance transferred
- Cards work offline for identity (UID read), but transactions require connectivity
- No sensitive data on the physical card

---

## 13. Wallet and Nitecoin Economy

### Nitecoin (NC)

Nitecoin is the closed-loop currency of the PeopleWeLike ecosystem. 1 NC = the venue's defined monetary unit (e.g., 1 NC = 1 CHF, configurable per venue).

### Earning Nitecoin

| Action | NC Earned | Cap |
|--------|-----------|-----|
| Check-in (entry) | Configurable (default: 10 NC) | Once per venue per day |
| Quest completion | 50-500 NC (quest-defined) | Per quest |
| Early arrival bonus | Configurable | Time-window based |
| Feedback submission | Small amount | Quality-gated |

### Spending Nitecoin

- Purchase drinks at the bar (NFC tap)
- Redeem for venue-specific rewards (configured by admin)
- Future: cross-venue spending at any PeopleWeLike venue

### Wallet Rules

- Balance is persistent across sessions and venues
- No expiration (users are never punished)
- No negative balance allowed
- Top-ups are one-way (no cash-out in beta)
- Full transaction history available to user and admin

---

## 14. Leveling and XP System

### XP Curve

The system uses a **Hybrid Progressive Curve (Soft Exponential)** designed for long-term engagement without pay-to-win mechanics.

**Formula:**
```
XP_to_next_level = round(100 * level ^ 1.35)
```

**Progression table:**

| Level | XP Required | Cumulative Nights (est.) |
|-------|------------|-------------------------|
| 2 | ~130 XP | 1-2 nights |
| 5 | ~440 XP | 3-4 nights |
| 10 | ~560 XP | 6-8 nights |
| 15 | ~1,300 XP | ~15 nights |
| 25 | ~2,100 XP | ~30 nights |
| 40 | ~4,800 XP | ~60 nights |
| 55 | ~8,500 XP | ~100+ nights |

### XP Sources

| Action | XP | Notes |
|--------|-----|-------|
| Venue check-in | 50 XP | Once per venue per day |
| Time spent in venue | 10 XP / 15 min | Caps at 2-3 hours (80-120 XP max) |
| Quest completion | 100-500 XP | **Primary XP driver** |
| Spending Nitecoin | 1 XP per 1 NC | Soft cap per session |
| Early arrival | Bonus XP | Behavior shaping |
| Feedback submission | Small XP | Quality-gated |

### Anti-Abuse Rules

- Spending XP capped per session (cannot buy levels)
- Time XP capped (cannot AFK farm)
- Quest XP is dominant by design
- No repeat quest farming (cooldowns)

**Core principle: Spending helps, but cannot dominate. Participation is king.**

### Level-Gated Features

| Level | Tier Name | Unlocks |
|-------|-----------|---------|
| 1-4 | **Onboarding** | Wallet, basic quests, public notifications |
| 5 | **Social Awareness** | See friends who are checked in (opt-in only, no tracking outside venues) |
| 10 | **Exclusive Quests** | Access to limited/time-based quests, sponsored quests |
| 15 | **Faster Flow** | Faster bar pickup notification, priority order queue (soft), "Fast Lane Active" indicator |
| 25 | **Recognition** | Subtle staff indicator (icon on POS when their order comes in), surprise rewards, higher-value quests |
| 35 | **Influence** | Vote on quests, unlock group quests, squad bonuses |
| 40 | **VIP Eligibility** | Venue-controlled: VIP area access, early entry, invite-only events. Level unlocks eligibility, venue decides access |
| 55 | **Prestige** | Drink-ready pickup notification, no-queue signals, personal offers. This level should feel rare, visible, respected |
| 55+ | **Legacy** | Profile flair, historical stats, global ranking (opt-in). Status, not additional power |

### Level Cap Strategy

No hard cap. Soft prestige zones with diminishing XP gains after level 55. Social status matters more than unlocks at high levels. This avoids "I finished the game," forced resets, and power imbalance.

### Non-Negotiable Rule

**Levels must never make other users feel punished. They should feel inspired.** If a feature causes resentment, it should be moved to a higher level or softened.

---

## 15. Quest Engine

### What Quests Are

Quests are venue-defined challenges that guide guest behavior through reward. They are the primary XP driver and the main tool for ethical behavior shaping.

### Quest Types

| Type | Example | Trigger |
|------|---------|---------|
| **Time-based** | "Check in before 22:00" | Clock |
| **Behavior-based** | "Order 3 different cocktails tonight" | Order events |
| **Social** | "Arrive with 3+ friends" | Simultaneous check-ins |
| **Exploration** | "Visit 3 different venues this month" | Cross-venue sessions |
| **Venue-specific** | "Try the new seasonal drink" | Menu item linked |
| **Sponsored** | "Order [Brand] tonight" | Partnered with sponsor |

### Quest Lifecycle

```
Admin creates quest (conditions, reward, time window)
    |
    v
Quest appears in eligible guests' quest panel
    |
    v
Guest takes actions → system evaluates conditions in real time
    |
    v
Conditions met → quest_completion recorded
    |
    v
XP and/or NC reward credited → notification sent to guest
    |
    v
Quest may have cooldown before it can be repeated
```

### Quest Data Model

| Field | Type | Purpose |
|-------|------|---------|
| id | serial | Primary key |
| venue_id | int | Which venue (null = global) |
| title | text | Display name |
| description | text | What the guest must do |
| conditions | jsonb | Machine-readable conditions |
| xp_reward | int | XP awarded on completion |
| nc_reward | int | Nitecoin awarded on completion |
| min_level | int | Minimum user level required |
| starts_at | timestamp | When quest becomes available |
| ends_at | timestamp | When quest expires |
| max_completions | int | Total completions allowed (null = unlimited) |
| cooldown_hours | int | Hours before same user can repeat |
| active | boolean | Admin toggle |

---

## 16. Automation Rule Engine

### Purpose

The automation engine transforms the venue manager from an operator into a composer. Rules are configured once and the system executes them continuously based on real-time signals.

### Rule Format

Rules are stored as JSON and evaluated on every relevant event:

```json
{
  "id": "early-bird-pricing",
  "trigger": "time",
  "condition": { "before": "22:00" },
  "action": { "type": "price_modifier", "modifier": 0.8 },
  "venue_id": 1,
  "active": true
}
```

### Standard Rules (Minimum Viable)

| Rule | Trigger | Condition | Action |
|------|---------|-----------|--------|
| Low stock alert | Inventory update | `qty < threshold` | Notify runner, log LOW_STOCK |
| Early bird pricing | Time | `before 22:00` | Apply price modifier (e.g., 20% off) |
| Peak pricing | Occupancy | `sessions > 80% capacity` | Apply price modifier (e.g., +10%) |
| Empty venue incentive | Occupancy | `sessions < 20% capacity` | Activate bonus quest |
| Quest reward | Quest completion | `quest_completed` | Award XP and NC |
| Capacity warning | Check-in | `headcount > 90% capacity` | Notify security, push to admin |
| VIP arrival | Check-in | `user.level >= 40` | Subtle staff notification |

### Evaluation Flow

```
Event occurs (sell, check-in, time tick, inventory change)
    |
    v
Rule engine loads active rules for this venue
    |
    v
Each rule's condition is evaluated against current state
    |
    v
Matching rules fire their actions
    |
    v
Actions execute (notify, log, adjust price, activate quest)
    |
    v
Results logged for audit trail
```

### Future Expansion

- Visual rule builder in admin (drag-and-drop conditions and actions)
- Rule templates (pre-built rule sets for common scenarios)
- A/B testing rules (apply to percentage of guests)
- Machine learning suggestions ("Based on last 30 nights, consider...")

---

## 17. Real-Time Data Flow

### The Signal Loop

Every action in the system produces a signal. Signals flow through the system in real time:

```
[Action] → [API] → [Database] → [Rule Engine] → [Notifications]
                                       |
                                       v
                              [Admin Dashboard]
                              [Staff Views]
                              [Guest Views]
```

### Current Implementation

- **Polling** — Runner page polls every 5 seconds for LOW_STOCK alerts
- **Server-side rendering** — OS homepage fetches events at request time
- **Client-side refresh** — Manual refresh buttons on operational views

### Target Implementation

- **WebSockets** — Real-time push for admin dashboard, runner alerts, guest notifications
- **Server-Sent Events (SSE)** — Lightweight alternative for one-way updates (stock levels, headcount)
- **Polling as fallback** — For environments where WebSockets are not available

### Latency Requirements

| View | Max Update Delay |
|------|-----------------|
| Admin dashboard | 2 seconds |
| Runner alerts | 3 seconds |
| Security headcount | 2 seconds |
| Guest notifications | 5 seconds |
| Bar POS inventory | Immediate (on confirm) |

---

## 18. User Profile

### Guest Profile (accessible at `/profile`)

```
+------------------------------+
|  [Avatar / NFC Icon]         |
|  Guest #1042                 |
|  Member since Jan 2026       |
+------------------------------+
|  Level 15 — Faster Flow      |
|  [=====>............] 72%    |
|  1,847 / 2,100 XP           |
+------------------------------+
|  Wallet: 230 NC              |
|  Venue: Zurich Demo          |
|  Session: active (2h 15m)    |
+------------------------------+
|  Visit History               |
|  - Zurich Demo    x 12      |
|  - Bar XYZ        x 3       |
|  Total: 15 venues visited    |
+------------------------------+
|  Recent Activity             |
|  - Quest completed: +200 XP  |
|  - Drink purchased: -12 NC   |
|  - Checked in: +50 XP        |
+------------------------------+
|  [ CHECK OUT ]               |
+------------------------------+
```

### Profile Elements

| Element | Source | Visibility |
|---------|--------|-----------|
| Level and XP progress | `users.xp`, calculated from XP curve | User only |
| Wallet balance | `users.points` / wallet table | User only |
| Visit history | `venue_sessions` grouped by venue | User only |
| Activity feed | `analytics_events` + `venue_sessions` | User only |
| Current session | Active `venue_session` | User + staff (if NFC tapped) |
| Profile flair | Level-based (L55+ gets special badge) | Public (opt-in) |
| Friends at venue | Active sessions of friends | Level 5+ (opt-in) |

### Staff Profile (Bar/Runner/Security)

Minimal — shows role, assigned venue, and shift duration. Staff profiles are ephemeral (PIN-based), displayed as a compact header bar:

```
BAR @ Zurich Demo | Shift: 3h 12m | 87 orders | CHF 1,247
```

---

## 19. Data Model

### Core Tables

```sql
-- Users: one global identity per person
users (
  id serial PRIMARY KEY,
  email text UNIQUE,
  password_hash text,
  role text NOT NULL,          -- MAIN_ADMIN, VENUE_ADMIN, GUEST, BAR, RUNNER, SECURITY
  venue_id int REFERENCES venues(id),
  points int DEFAULT 0,        -- Nitecoin wallet balance
  xp int DEFAULT 0,            -- Total XP earned
  level int DEFAULT 1,         -- Current level (calculated)
  created_at timestamptz DEFAULT now()
)

-- Venues: physical locations
venues (
  id serial PRIMARY KEY,
  name text NOT NULL,
  city text DEFAULT 'Zurich',
  pin text NOT NULL,            -- Hashed PIN for staff login
  capacity int,                 -- Max occupancy
  created_at timestamptz DEFAULT now()
)

-- Events: public event listings
events (
  id serial PRIMARY KEY,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  venue_name text NOT NULL,
  address text,
  genre text,
  description text,
  ticket_url text,
  image_url text,
  created_at timestamptz DEFAULT now()
)

-- Venue Sessions: tracks presence
venue_sessions (
  id serial PRIMARY KEY,
  venue_id int NOT NULL REFERENCES venues(id),
  user_id int NOT NULL REFERENCES users(id),
  uid_tag text,                 -- NFC card UID
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_spend int DEFAULT 0,
  interactions_count int DEFAULT 0
)

-- Menu Items: drink/product catalog (separate from raw inventory)
menu_items (
  id serial PRIMARY KEY,
  venue_id int NOT NULL REFERENCES venues(id),
  name text NOT NULL,
  category text,                -- spirits, beer, cocktails, soft, food
  price int NOT NULL,           -- Price in NC
  icon text,                    -- Emoji or icon identifier
  color text,                   -- Hex color for tile
  inventory_item_id int REFERENCES inventory(id),
  display_order int DEFAULT 0,
  active boolean DEFAULT true
)

-- Inventory: stock levels
inventory (
  id serial PRIMARY KEY,
  venue_id int NOT NULL REFERENCES venues(id),
  item text NOT NULL,
  qty int NOT NULL,
  low_threshold int DEFAULT 5,
  updated_at timestamptz DEFAULT now()
)

-- Orders: complete transaction records
orders (
  id serial PRIMARY KEY,
  venue_id int NOT NULL REFERENCES venues(id),
  staff_user_id int REFERENCES users(id),
  guest_session_id int REFERENCES venue_sessions(id),
  items jsonb NOT NULL,         -- [{item, qty, price}]
  total int NOT NULL,
  payment_method text,          -- 'nfc', 'points', 'cash', 'tab'
  created_at timestamptz DEFAULT now()
)

-- Quests: venue-defined challenges
quests (
  id serial PRIMARY KEY,
  venue_id int REFERENCES venues(id),
  title text NOT NULL,
  description text,
  conditions jsonb NOT NULL,
  xp_reward int DEFAULT 0,
  nc_reward int DEFAULT 0,
  min_level int DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_completions int,
  cooldown_hours int,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Quest Completions: tracks who completed what
quest_completions (
  id serial PRIMARY KEY,
  quest_id int REFERENCES quests(id),
  user_id int REFERENCES users(id),
  venue_session_id int REFERENCES venue_sessions(id),
  completed_at timestamptz DEFAULT now()
)

-- Notifications: push-like messages
notifications (
  id serial PRIMARY KEY,
  venue_id int REFERENCES venues(id),
  target_role text,             -- null = all, or specific role
  target_user_id int REFERENCES users(id),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- Automation Rules: venue-configured logic
automation_rules (
  id serial PRIMARY KEY,
  venue_id int NOT NULL REFERENCES venues(id),
  name text NOT NULL,
  trigger_type text NOT NULL,   -- 'time', 'inventory', 'occupancy', 'event'
  conditions jsonb NOT NULL,
  actions jsonb NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Logs: complete audit trail
logs (
  id serial PRIMARY KEY,
  venue_id int REFERENCES venues(id),
  type text NOT NULL,           -- SELL, LOW_STOCK, INCIDENT, CHECK_IN, QUEST_COMPLETE, etc.
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- Analytics Events: behavioral tracking
analytics_events (
  id serial PRIMARY KEY,
  name text NOT NULL,
  venue_id int REFERENCES venues(id),
  user_id int REFERENCES users(id),
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
)
```

### Indexes (Required for Performance)

```sql
CREATE INDEX idx_venue_sessions_active ON venue_sessions(venue_id) WHERE ended_at IS NULL;
CREATE INDEX idx_logs_venue_time ON logs(venue_id, created_at DESC);
CREATE INDEX idx_inventory_venue ON inventory(venue_id);
CREATE INDEX idx_orders_venue_time ON orders(venue_id, created_at DESC);
CREATE INDEX idx_analytics_venue_time ON analytics_events(venue_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(target_user_id) WHERE read = false;
```

---

## 20. API Surface

### Authentication

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/login` | POST | None | Admin login (email + password) → JWT |
| `/auth/pin` | POST | None | Staff login (venue PIN + role) → JWT |
| `/guest/checkin` | POST | None | Guest check-in (venue_id + optional uid_tag) → JWT |
| `/guest/checkout` | POST | Bearer | Close active session |
| `/me` | GET | Bearer | Current user info + active session |
| `/me/profile` | GET | Bearer | Full profile with XP, level, visit history |
| `/me/history` | GET | Bearer | Paginated visit history |

### Venues

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/venues` | GET | Admin | List all venues |
| `/venues` | POST | Admin | Create venue |
| `/venues/:id` | PUT | Admin | Update venue |
| `/venues/:id` | DELETE | Admin | Delete venue |
| `/public/venues` | GET | None | Public venue list (name, city only) |

### Events

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/events` | GET | None | Public event feed |
| `/events/:id` | GET | None | Single event detail |
| `/events` | POST | Admin | Create event |
| `/events/:id` | PUT | Admin | Update event |
| `/events/:id` | DELETE | Admin | Delete event |

### Menu and Orders

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/menu/:venue_id` | GET | Bearer | Drink menu with categories, prices, stock |
| `/orders` | POST | BAR | Submit order (items, payment method, guest link) |
| `/orders/:id` | DELETE | BAR | Undo order (within 60s window) |
| `/shift/summary` | GET | BAR | Current shift stats |

### Inventory

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/inventory/:venue_id` | GET | Bearer | Stock levels for venue |
| `/inventory/:venue_id` | POST | Admin | Add inventory item |
| `/inventory/:venue_id/:id` | PUT | Admin | Update item (qty, threshold) |

### Quests

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/quests/:venue_id` | GET | Bearer | Active quests for venue (filtered by user level) |
| `/quests` | POST | Admin | Create quest |
| `/quests/:id` | PUT | Admin | Update/deactivate quest |
| `/quests/:id/complete` | POST | Bearer | Mark quest as completed (server validates conditions) |

### Automation

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/rules/:venue_id` | GET | Admin | List automation rules |
| `/rules` | POST | Admin | Create rule |
| `/rules/:id` | PUT | Admin | Update rule |
| `/rules/:id` | DELETE | Admin | Delete rule |

### Logs and Analytics

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/logs/:venue_id` | GET | Bearer | Venue logs (filterable by type, since timestamp) |
| `/logs` | POST | Bearer | Create log entry (for security incidents) |
| `/analytics/:venue_id` | GET | Admin | Aggregated analytics (sessions, revenue, top items) |
| `/track` | POST | Optional | Record analytics event |

### Notifications

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/notifications` | GET | Bearer | Unread notifications for current user |
| `/notifications` | POST | Admin/Staff | Push notification to role or user |
| `/notifications/:id/read` | PUT | Bearer | Mark as read |

---

## 21. Infrastructure and Deployment

### Current Stack

- **VPS**: Ubuntu with Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: NGINX (subdomain-based routing)
- **SSL**: Cloudflare (edge SSL), origin HTTP behind proxy
- **Database**: PostgreSQL 16 with persistent Docker volume
- **Process Management**: Docker restart policies (`unless-stopped`)

### Recommended Improvements

| Area | Current | Target |
|------|---------|--------|
| **HTTPS** | Cloudflare edge only | Add Cloudflare Origin Certificates for full end-to-end encryption |
| **Compression** | None | Enable gzip in NGINX for text/html/json/js/css |
| **Caching** | None | Cache-Control headers for Next.js static assets (`/_next/static/`) |
| **Security headers** | None | X-Content-Type-Options, X-Frame-Options, CSP, HSTS |
| **Rate limiting** | None | NGINX `limit_req_zone` on auth endpoints |
| **Default server** | None | Catch-all for unknown Host headers → return 444 |
| **Database** | CREATE TABLE IF NOT EXISTS on boot | Proper migrations (node-pg-migrate) |
| **Monitoring** | None | Health check endpoints, uptime monitoring |
| **Backups** | Manual scripts | Automated daily PostgreSQL backups |

### Environment Variables

```env
# Domains
OS_DOMAIN=os.peoplewelike.club
ADMIN_DOMAIN=admin.peoplewelike.club
API_DOMAIN=api.peoplewelike.club

# Radio
RADIO_IFRAME_SRC=https://radio.peoplewelike.club

# Postgres
POSTGRES_DB=pwlos
POSTGRES_USER=pwlos
POSTGRES_PASSWORD=<strong_random>

# Auth
JWT_SECRET=<strong_random_64_chars>
MAINADMIN_EMAIL=admin@peoplewelike.club
MAINADMIN_PASSWORD=<strong_random>
```

---

## 22. Monetization Model

Monetization is **venue-side, never user-side**. Users always receive value for free.

### Revenue Streams (to be finalized)

| Stream | Description | Phase |
|--------|-------------|-------|
| **Venue subscription** | Monthly fee for access to platform features and automation | Phase 2 |
| **Performance-based fees** | Small percentage of transaction volume processed through the system | Phase 3 |
| **Hardware-as-a-service** | NFC readers, branded NFC cards, supplied and managed | Phase 2 |
| **Sponsored quests** | Brands pay to create quests ("Order [Brand] tonight, earn 200 XP") | Phase 3 |
| **Aggregated insights** | Anonymized, aggregated nightlife data sold to industry (no individual data) | Phase 4 |

### The Rule

**Users receive value. Venues pay because value is created.** The system must always demonstrate clear ROI to venues: increased early arrivals, reduced staff overhead, real-time stock management, guest retention without discounts.

---

## 23. Ethical Constraints

These are non-negotiable operating constraints, not features to be toggled.

### System Must

- Reward participation through positive incentives only
- Allow users to exist anonymously or enrich identity gradually
- Give users full control over their identity depth and visibility
- Keep venue data isolated (no venue sees another venue's data)
- Ensure levels inspire, never punish non-participants
- Log every action for full transparency and auditability

### System Must Not

- Punish inactivity or non-participation
- Sell personal data to any third party
- Force participation or degrade experience for non-participants
- Allow pay-to-win mechanics (spending helps but cannot dominate progression)
- Track users outside of venue sessions
- Share individual user data between venues without consent

### The Test

If at any point the product feels extractive to users, controlling to venues, or opaque to operators — it has drifted from its core. The correct direction is always: **more clarity, more reward, more autonomy — in real time.**

---

## 24. Current Implementation Status

### What Is Built and Working

| Component | Status | Location |
|-----------|--------|----------|
| Docker Compose stack (API + OS + Admin + NGINX + DB) | Working | `docker-compose.yml` |
| PostgreSQL schema (users, venues, events, inventory, logs, venue_sessions, analytics_events) | Working | `api/server.js` |
| Admin login (email + password → JWT) | Working | `POST /auth/login` |
| Staff PIN login (venue PIN + role → JWT) | Working | `POST /auth/pin` |
| Venue CRUD (create + list) | Working | `POST /GET /venues` |
| Event CRUD (create + list + detail) | Working | `/events` endpoints |
| Inventory management (create + list per venue) | Working | `/inventory/:venue_id` |
| Sell action (deduct inventory, log SELL, detect LOW_STOCK) | Working | `POST /actions/sell` |
| Runner alerts (LOW_STOCK polling every 5s) | Working | `os/app/ops/runner/page.js` |
| Security incident logging | Working | `os/app/ops/security/page.js` |
| Guest check-in with points award | Working | `POST /guest/checkin` |
| Guest checkout (close session) | Working | `POST /guest/checkout` |
| Analytics event tracking | Working | `POST /track` |
| Radio embed (iframe) | Working | `os/app/radio/page.js` |
| Event feed (public, SSR) | Working | `os/app/page.js` |
| Cloudflare DNS + NGINX routing | Working | `nginx/nginx.conf` |

### What Is Not Yet Built

| Component | Priority | Complexity |
|-----------|----------|-----------|
| Bar POS drink grid (touch-optimized tile interface) | **Critical** | Medium |
| Menu items table (separate from raw inventory, with prices/categories) | **Critical** | Low |
| Orders table (full transaction records) | **Critical** | Low |
| NFC card integration (Web NFC API or hardware readers) | **High** | High |
| Wallet top-up flow (cash at door + online) | **High** | Medium |
| XP and leveling system | **High** | Medium |
| Quest engine (create, evaluate, complete, reward) | **High** | Medium |
| Automation rule engine (JSON rules, evaluated on events) | **High** | Medium |
| Admin live dashboard (real-time stats panels) | **High** | Medium |
| WebSocket / SSE real-time updates | **Medium** | Medium |
| Proper page routing in Admin (venues, events, inventory, analytics pages) | **Medium** | Low |
| Auth context (persistent JWT across pages, route guards) | **Medium** | Low |
| Dark theme for staff views | **Medium** | Low |
| Mobile-responsive layouts | **Medium** | Low |
| Database migrations (replace CREATE TABLE IF NOT EXISTS) | **Medium** | Low |
| Input validation on all API endpoints | **Medium** | Low |
| Rate limiting on auth endpoints | **Medium** | Low |
| NGINX security headers + gzip | **Low** | Low |
| Offline PWA support (queue orders when connection drops) | **Low** | High |
| Event host view (newsletter, guestlist, membership) | **Low** | Medium |

---

## 25. Development Roadmap

### Phase 1.5 — POS Foundation (Next)

**Goal:** Transform the bar view from a debug tool into a functional POS.

- Create `menu_items` table with categories, prices, icons, linked to inventory
- Create `orders` table for complete transaction records
- Build touch-optimized drink grid with category tabs
- Implement order cart with confirm and clear
- Add order history with 60-second undo
- Add shift summary panel
- Dark theme for all staff views
- Add `PUT/DELETE` endpoints for venues, events, inventory

### Phase 2.0 — Identity and Economy

**Goal:** Implement the closed-loop Nitecoin economy and user progression.

- Add `xp` and `level` fields to users table
- Implement XP curve calculation (`100 * level ^ 1.35`)
- Award XP on check-in, time spent, spending, quest completion
- Build guest profile page with level, XP bar, wallet, history
- Implement Nitecoin wallet with top-up (cash at door via door staff)
- NFC card UID reading (Web NFC API for Android, manual input fallback)
- Payment via NFC tap at bar (deduct wallet, link to order)
- Auth context with persistent JWT, route guards, role-based nav

### Phase 2.5 — Quests and Automation

**Goal:** Activate behavioral shaping through quests and rules.

- Create `quests` and `quest_completions` tables
- Build quest creation UI in admin
- Build quest display in guest panel
- Implement server-side quest condition evaluation
- Create `automation_rules` table
- Implement rule engine (evaluate on sell, check-in, time tick)
- Default rules: low stock alert, early bird pricing, empty venue incentive
- Build rule configuration UI in admin

### Phase 3.0 — Real-Time and Scale

**Goal:** Replace polling with real-time updates and harden for production.

- WebSocket server for admin dashboard, runner alerts, guest notifications
- Admin live dashboard with real-time panels (sessions, revenue, stock, logs)
- Notification system (push-like via polling/WebSocket)
- Database migrations (node-pg-migrate)
- Input validation on all endpoints (Fastify JSON Schema)
- Rate limiting on auth endpoints
- NGINX hardening (gzip, security headers, origin certs, default server)
- Performance indexes on database

### Phase 4.0 — Network Effects

**Goal:** Enable cross-venue identity and sponsored content.

- Cross-venue user profiles (one identity, many venues)
- Sponsored quests (brands create and fund quests)
- Aggregated analytics dashboard (anonymized, multi-venue)
- Event host view (newsletter capture, guestlist, membership)
- Advanced rule engine (visual builder, A/B testing)
- Hardware integration (dedicated NFC readers, branded cards)
- Offline PWA mode (queue and sync)

---

## Appendix: Why This Is Unprecedented

| Existing Solution | What It Does | What It Cannot Do |
|-------------------|-------------|-------------------|
| Square / Lightspeed / Toast | Records transactions | No guest identity, no behavior shaping, no real-time automation |
| Festival NFC wristbands | Cashless payments | No persistence, no cross-event identity, no intelligence |
| Loyalty stamp cards / apps | Passive point collection | No real-time effect, no operational integration, no staff awareness |
| Venue management software | Scheduling, booking | No live operations, no guest-facing features, no POS |

**PeopleWeLike is the first system where the staff POS and the guest experience are two faces of the same real-time engine.** One transaction simultaneously processes payment, updates inventory, awards XP, evaluates quests, triggers automation rules, updates the admin dashboard, and enriches the guest's permanent identity — all within the same application, the same data loop, in real time.

---

*Document version: 1.0*
*Last updated: February 2026*
*Prepared for: PeopleWeLike development team, investors, and technical partners*
