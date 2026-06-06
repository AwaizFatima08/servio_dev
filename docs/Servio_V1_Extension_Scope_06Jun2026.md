# Servio V1 — Extension Scope
*New service modules: Family, Café, Tea Bar, Tuck Shop, Bakery, BBQ, and associated dashboards*

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Client | FFL Management Club (tenantId: ffl) |
| Scope Type | V1 Extension — new service modules on top of stable V1 + V1 Enhancement |
| Scope Status | **LOCKED — 6 June 2026. No additions until Extension complete and field-tested.** |
| Prerequisite | V1 Enhancement complete, field-tested, and stable |
| Document Date | 6 June 2026 |

---

## Scope Governance Rule

> This scope is frozen. Any new feature identified during development goes to a backlog only. No item enters V1 Extension scope until V1 Enhancement field test is complete and a formal scope review is conducted.

---

## Extension Version Summary

| Version | Scope | Design Status | Dependency |
|---------|-------|---------------|------------|
| V1.1 | Family Member CRUD | LOCKED | None — standalone |
| V1.2 | Café + basic kitchen dashboard | LARGELY LOCKED | V1.1 |
| V1.3 | Tea Bar (locked) + Tuck Shop (pending) | TEA BAR LOCKED / TUCK SHOP PENDING | V1.1 |
| V1.4 | Bakery + supervisor view | PENDING DISCUSSION | V1.1 |
| V1.5 | Full dashboards + analytics + reporting + billing alignment | PENDING DISCUSSION | V1.2, V1.3, V1.4 |
| V1.6 | Notifications + reporting alignment | PENDING DISCUSSION | V1.5 |
| Mobile Ext. | Admin/Manager/Supervisor/Accounts mobile dashboards (F9–F12) | DEFERRED FROM V1 ENHANCEMENT | Post V1 Extension stable |

---

## Universal Principles — Locked for All Extension Versions

### Rate Entry Model
One unified rate entry model applies to Mess, Café, Tea Bar, Tuck Shop, Bakery, BBQ, and all future services. Accounts supervisor opens rate entry screen for a specific date and service. Full list of consumed items displayed with previous day's rate pre-filled. Supervisor changes variances only. Cloud Function batch-updates all matching orders via `rateTargetKey`.

| Service | rateTargetKey Format |
|---------|---------------------|
| Mess | `{date}_{mealType}_{menuOptionKey}` |
| Café | `{date}_cafe_{itemId}` |
| Tea Bar | `{date}_teabar_{itemId}` |
| Tuck Shop | `{date}_tuckshop_{itemId}` |
| Bakery | `{date}_bakery_{itemId}` |
| BBQ | `{date}_bbq_{itemId}` |

### Official Meal / Service Governance
Applies to Mess, Café, Tea Bar, and all services where official entertaining occurs.

- Supervisor or manager initiates official order — service provided immediately
- Charge parked pending admin approval — post-service approval model
- Admin approves → cost centre charged. Admin rejects → sponsoring employee contactable
- `sponsoringEmployeeNumber` mandatory for all official transactions
- `sponsoringEmployeeName` denormalised alongside number
- No family member tagging on official transactions

### Order Model — Café, Tea Bar, Tuck Shop
- Single item per document. `bookingGroupId` groups items from same session
- Employee or attendant selects multiple items with variable quantities before submitting
- One submission creates multiple order documents atomically under shared `bookingGroupId`
- Restaurant-style order building experience on screen

### Billing Model
Employee personal account, retrospective monthly cycle, 15th–15th billing, salary deduction. Rates entered by accounts supervisor. Automated rate calculation deferred to V4.

---

## V1.1 — Family Member CRUD

| | |
|---|---|
| Status | LOCKED |
| Dependency | None — standalone feature |
| Enables | Consumer tagging in V1.2 Café, V1.3 Tuck Shop, V1.4 Bakery |

### Purpose
Allows management employees to maintain a list of entitled dependents — spouse and children — under their profile. Required before any service module can tag consumption to a family member.

### Key Design Decisions
- Relationships: `spouse`, `son`, `daughter` only. All others treated as guests.
- Maximum 12 members per employee. Configurable in `appSettings` (`maxFamilyMembersPerEmployee = 12`)
- DOB required for son and daughter. Optional for spouse.
- Employee manages freely: add, edit name/DOB, activate, deactivate. No admin approval for additions or deactivations.

### Marital Status Model
- New field `maritalStatus` on `employees` — values: `single`, `married`
- New field `pendingMaritalStatus` — null until married-to-single change submitted
- `single → married`: employee changes freely, immediate effect. Non-blocking popup prompts family member entry.
- `married → single`: pending model. Admin approval required. Family members remain accessible during pending. On approval all active family members auto-deactivate.
- My Family tab hidden until married status declared.

### Profile Completion Nudge
Smart home screen banner — not a bell notification. Checks four conditions:
1. Display name filled
2. Phone number filled
3. Marital status set
4. If married — at least one active family member exists

Banner clears automatically when all applicable conditions met. Single employees clear after first three conditions only.

### Deletion Flow
- Employee taps Delete → `isActive = false` + `deletionRequested = true`
- Entry dims with distinct indicator — visually different from simple deactivation
- Dimmed members cannot be selected in any service
- Admin verifies zero transactions → approves (permanent deletion) or rejects (record returns with explanation note)

### Schema Changes

**`employees` collection — new fields:**
- `maritalStatus` — `single` or `married`
- `pendingMaritalStatus` — null until married-to-single submitted

**`familyMembers` collection — new fields:**
- `deletionRequested` — boolean, default false
- `deletionRequestedAt` — timestamp
- `deletionRequestReason` — string
- `deletionRequestNote` — admin response on rejection
- `createdByUid` — UID of creator

**`appSettings` collection — new fields:**
- `maxFamilyMembersPerEmployee` — default 12
- `familyMemberFeatureActive` — boolean toggle

---

## V1.2 — Café + Basic Kitchen Dashboard

| | |
|---|---|
| Status | LARGELY LOCKED — cafeOrders field list confirmed, full field detail pending documentation |
| Dependency | V1.1 Family Member CRUD |

### Service Windows
- Café hours: 1800 to 2300 — dine-in and takeaway
- Anytime takeaway: 0800 to 2230 — takeaway only
- Hard close: 2230 to breakfast window

### Order Types

**Café Hours Order (`cafe_hours`)**
- Dine-in or takeaway
- 30 minute preparation guideline — soft advisory only, not system-enforced
- No cancellation once placed — charged regardless
- Pickup time required for takeaway. Not required for dine-in.
- Consumer: self or family member
- Billing: employee personal account or official cost centre

**Anytime Takeaway (`anytime_takeaway`)**
- Takeaway only — no dine-in outside café hours
- 2 hour minimum lead time — system enforced through time picker
- 1 hour cancellation window from order time — locked after that
- Pickup time mandatory — structured time picker shows valid times only
- Consumer: self or family member
- Billing: employee personal account only — no official meals outside café hours

### Order Paths
- Path 1: Employee self-order on own phone — primary intended path
- Path 2: Supervisor proxy on café tablet — verbal dine-in orders
- Path 3: Phone call to supervisor — escape window, mechanically identical to Path 2

### Kitchen Dashboard — Ships With V1.2
Replaces existing manual announcement board.
- Dine-in orders sorted by order time
- Takeaway orders sorted by requested pickup time
- Acknowledgement action per order
- Unacknowledged order counter badge as supervisor nudge
- No table numbers — deferred to commercial version

### Schema Changes

**New collection — `cafeOrders`:**
Mirrors `messReservations` minus: `menuOptionKey`, `optionLabel`, `issueStatus`, `menuSnapshot`, `cutoffWaived`, `overrideReason`, `overrideByUid`, `isSpecialMeal`, `allowAnyMenuItem`.
Adds: `orderType` (`cafe_hours` / `anytime_takeaway`), `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`.

---

## V1.3 — Tea Bar (Locked) + Tuck Shop (Pending)

### V1.3 Tea Bar — LOCKED

| | |
|---|---|
| Status | LOCKED |
| Dependency | V1.1 Family Member CRUD |

#### Locations
Six at launch: CCR I, CCR II, HSE Building, Workshop, L&DC, Admin. Admin-extensible — new locations added without deployment.

#### Operating Hours
0730 to 1715. Lunch break 1300 to 1400 — system enforces closed window. Tea bar screen shows closed status outside operating hours.

#### Role
- `teabar_attendant` — new controlled value in `users.role`
- One attendant assigned to one location via `assignedLocationId` on `users`
- Mobile APK required — no fixed terminals at plant site
- Can only see their own assigned location's orders and widget

#### Order Paths
- Path 1: Employee self-order on own phone — selects location, items, submits
- Path 2: Attendant proxy — employee approaches verbally, attendant selects employee number, builds and submits order

#### Key Rules
- No family tagging — plant site, working hours only
- No advance orders, no cancellation window — real-time only
- Official tea: `sponsoringEmployeeNumber` mandatory, admin approves post-service

#### Schema Changes

**New collection — `teabarLocations`:**
`locationId`, `locationName`, `isActive`, `tenantId`, `createdAt`, `updatedAt`

**New field on `users`:**
`assignedLocationId` — null for all roles except `teabar_attendant`

**New role value — `users.role`:**
`teabar_attendant`

**New collection — `teabarOrders`:**
Same as `cafeOrders` minus: `orderType`, `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`, `diningMode`.
Adds: `locationId`, `locationName`.

---

### V1.3 Tuck Shop — PENDING DISCUSSION

Design discussion not yet started. To be documented and locked before V1.3 development begins.

---

## V1.4 — Bakery + Supervisor View

| | |
|---|---|
| Status | PENDING DISCUSSION |
| Dependency | V1.1 Family Member CRUD |

Design discussion not yet started. To be documented and locked before V1.4 development begins.

---

## V1.5 — Full Dashboards, Analytics, Reporting, Billing Alignment

| | |
|---|---|
| Status | PENDING DISCUSSION |
| Dependency | V1.2, V1.3, V1.4 all stable |

### Preliminary Scope
- Full kitchen dashboards for all services — café, tuck shop, bakery
- Cross-service analytics — consumption patterns, spend by employee, service-wise trends
- Reporting snapshots — monthly billing summaries, feedback trends, event summaries
- Billing alignment across all new service modules
- Notifications depth — reminder flows, monthly bill alerts, pending rate entry alerts
- Employee billing statement — self-service view of monthly charges across all services

Detailed design to be discussed and locked after V1.4 is complete.

---

## V1.6 — Notifications and Reporting Alignment

| | |
|---|---|
| Status | PENDING DISCUSSION |
| Dependency | V1.5 complete |

### Preliminary Scope
- Deep notifications alignment across all services
- Cross-service reporting consolidation
- Feedback flows for café, tuck shop, tea bar, bakery
- Performance optimisations for reporting layer

Detailed design to be discussed and locked after V1.5 is complete.

---

## Mobile Extension — F9–F12 (Deferred from V1 Enhancement)

| | |
|---|---|
| Status | DEFERRED FROM V1 ENHANCEMENT |
| Original Items | F9 Admin mobile dashboard, F10 Manager mobile dashboard, F11 Supervisor mobile dashboard, F12 Accounts Supervisor mobile dashboard |

Current mobile placeholder screens are sufficient for launch. Full mobile dashboards for admin, manager, supervisor, and accounts supervisor roles will be designed and built as part of or after V1 Extension when new service dashboards are being designed anyway.

---

## New Collections Introduced in V1 Extension

| Collection | Introduced In | Purpose |
|------------|--------------|---------|
| `cafeOrders` | V1.2 | Café order transactions |
| `teabarLocations` | V1.3 | Tea bar location master list |
| `teabarOrders` | V1.3 | Tea bar order transactions |
| `tuckShopOrders` | V1.3 | Tuck shop transactions — design pending |
| `bakeryOrders` | V1.4 | Bakery order queue — design pending |

---

## Collections Modified in V1 Extension

| Collection | Version | Changes |
|------------|---------|---------|
| `employees` | V1.1 | `maritalStatus`, `pendingMaritalStatus` |
| `familyMembers` | V1.1 | `deletionRequested`, `deletionRequestedAt`, `deletionRequestReason`, `deletionRequestNote`, `createdByUid` |
| `appSettings` | V1.1 | `maxFamilyMembersPerEmployee`, `familyMemberFeatureActive` |
| `users` | V1.3 | `assignedLocationId`, new role value `teabar_attendant` |
| `messReservations` | V1 Gap Fix (in V1 Enh. F3) | `sponsoringEmployeeNumber`, `sponsoringEmployeeName`, new `bookingSource` value `official_guest_walkin` |

---

*Document to be updated as V1.3 Tuck Shop, V1.4 Bakery, V1.5, and V1.6 discussions are completed.*
*Next design discussion: Tuck Shop — continue in new session.*
