LAYER 1 — SUPERMARKET EXECUTION ROADMAP
Revenue Engine Only

Status: Mandatory Scope Lock

0. Purpose

Layer 1 exists to prove one thing:

The system increases revenue per hour and reduces operational friction in a real nightclub environment.

Nothing else matters at this stage.

No gamification.
No cross-venue logic.
No prestige mechanics.
No network vision.

This layer must be ugly, fast, reliable, measurable.

Supermarket nightclub is the laboratory.

1. Scope Lock (Non-Negotiable)

The only components allowed in Layer 1:

A. Core POS

Touch-optimized drink grid

3-second transaction target

Category tabs

Order cart

Confirm button

60-second undo

B. Orders System

Orders table

Full transaction record

Staff ID attached

Session ID attached

Payment method logged

Inventory auto-decrement

C. Inventory Engine

Real-time quantity tracking

Low stock threshold detection

Runner alert generation

Admin stock visibility

D. Venue Sessions

Check-in (NFC)

Check-out

Live headcount

Total spend per session

E. Wallet (Minimal)

Balance stored server-side

NFC tap → deduct

No refunds flow yet

No cross-venue logic

No leveling logic

F. Admin Metrics (Operational Only)

Revenue per hour

Orders per hour

Avg order value

Low-stock frequency

Headcount vs capacity

Everything else is forbidden.

2. Definition of “Ship Ugly”

Ship Ugly means:

UI may be visually raw

Styling minimal

No animations

No micro-interactions

No branding polish

No gamification

No onboarding flows

But:

No crashes

No double-charges

No data loss

No race conditions

No broken inventory logic

Reliability > beauty.

3. NFC Architecture (Mandatory Decisions)

We are NOT using Web NFC.

We will:

Use professional USB NFC readers for bar terminals

Use native mobile app (Android + iOS)

Use phone-based NFC reader in app

UID only read from card

All balance and session logic server-side

Engineering rules:

NFC read must be idempotent

Duplicate scans within 2 seconds ignored

Every scan logged

UID must map to one user

Lost card must be deactivatable instantly

No offline logic in Phase 1.
Connectivity required.

4. Performance Targets (Measured in Supermarket)

These are not aspirational.

These are required.

Transaction speed

≤ 3 seconds average from first tap to cleared screen

Error rate

0 double charges

0 negative balances

0 orphan orders

Inventory accuracy

100% alignment with bar test count during test night

Stability

System must survive 6 continuous hours peak load

5. Engineering Discipline Rules
5.1 No Feature Drift

If a feature does not directly increase:

speed

revenue

inventory accuracy

operational clarity

It is rejected.

No discussion.

5.2 No Premature Abstractions

Do NOT:

Build quest tables

Build XP logic

Add automation rule engine

Add cross-venue user logic

Build sponsorship framework

Add future-proof architecture layers

We are building a revenue engine, not a universe.

5.3 Database Integrity First

Before UI polish:

Proper constraints

Foreign keys

Transactions for order + inventory + wallet deduction

Rollback on failure

Unique constraints on UID

Index on active sessions

Index on orders by venue + time

Orders must be atomic.

Either:

Wallet deducted

Inventory decremented

Order recorded

Or none of them happen.

6. Supermarket Deployment Plan
Phase A — Internal Simulation

Simulate 500 fake orders

Simulate stock depletion

Simulate wallet deduction

Test duplicate NFC taps

Test network drop mid-order

System must not corrupt state.

Phase B — Controlled Night (Soft Launch)

1 bar only

1 runner

Manual stock count before and after

Dedicated engineer on-site

Live DB monitoring

Collect metrics:

Avg transaction time

Peak concurrency

Staff friction points

Inventory mismatches

Phase C — Full Night

All bars use system

Manual fallback POS available

Observe revenue/hour delta

Observe staff complaints

Observe queue length difference

If system slows staff down → Layer 1 fails.

7. Metrics That Decide Success

Supermarket must show improvement in at least 2 of:

+10% revenue per hour

+8% average order value

Reduced queue time

Reduced stockouts

Reduced staff communication overhead

If not achieved in 8 weeks:

System must be simplified further.

8. Code Quality Requirements

Even in Ship Ugly state:

Clear folder structure

No dead code

No commented-out abandoned experiments

No untyped critical logic

No console.log spam in production

Ugly UI is allowed.
Ugly architecture is not.

9. What We Explicitly Delay

The following are banned in Layer 1:

XP

Levels

Quests

Prestige tiers

Social visibility

Sponsored content

Cross-venue identity

Automation engine

Machine learning

PWA offline queue

If you find yourself building these, stop.

10. Exit Criteria for Layer 1

Layer 1 is complete when:

Supermarket runs entire night on system

No critical failures

Wallet + POS + inventory stable

Admin can see live revenue metrics

Venue owner sees measurable operational benefit

Only then do we unlock Layer 2.

11. Founder Discipline Clause

If Supermarket does not adopt this system after live demo, we:

Do not expand features

Do not add gamification

Do not pivot conceptually

We fix revenue engine.

Layer 1 must become indispensable before anything else.

12. Engineering Culture for This Phase

Think like:

Payment processor engineers

Air traffic control engineers

Exchange engine engineers

Not like startup feature hackers.

This system handles money.
Money demands rigor.

END OF LAYER 1 DOCUMENT
