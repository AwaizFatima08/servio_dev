# Servio V1 — Extension Scope & Design Reference
*Service modules: Family CRUD, Café, Outdoor Mini Café, Tea Bar, Tuck Shop, BBQ*

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Client | FFL Management Club (tenantId: ffl) |
| Scope Type | V1 Extension — new service modules on top of stable V1 + V1 Enhancement |
| Scope Status | **V1.1 through V1.4 LOCKED — 9 June 2026** |
| Prerequisite | V1 Enhancement complete, field-tested, and stable |
| Document Date | 9 June 2026 |
| Replaces | Servio_V1_Extension_Scope_06Jun2026.md |

---

## Scope Governance Rule

> This scope is frozen. Any new feature identified during development goes to a backlog only. No item enters V1 Extension scope until V1 Enhancement field test is complete and a formal scope review is conducted.

---

## Extension Version Summary

| Version | Scope | Design Status | Dependency |
|---------|-------|---------------|------------|
| V1.1 | Family Member CRUD | **LOCKED** | None — standalone |
| V1.2 | Café + Outdoor Mini Café + basic kitchen dashboard | **LOCKED** | V1.1 |
| V1.3 | Tea Bar + Tuck Shop (bakery absorbed) | **LOCKED** | V1.1 |
| V1.4 | BBQ | **LOCKED** | None |
| V1.5 | Full dashboards + analytics + reporting + billing alignment | **DESIGN AFTER V1.4 BUILD** | V1.2, V1.3, V1.4 stable |
| V1.6 | Notifications + reporting alignment | **DESIGN AFTER V1.4 BUILD** | V1.5 |
| Mobile Ext. | Admin/Manager/Supervisor/Accounts mobile dashboards (F9–F12) | DEFERRED | Post V1 Extension stable |

---

## Universal Principles — Locked for All Extension Versions

### Rate Entry Model
One unified rate entry model across Mess, Café, Tea Bar, Tuck Shop, Bakery, BBQ, and all future services.

Accounts supervisor opens rate entry screen for a specific date and service. Full list of consumed items displayed with previous day's rate pre-filled. Supervisor changes variances only. Submits once. Cloud Function batch-updates all matching orders via `rateTargetKey`.

| Service | rateTargetKey Format |
|---------|---------------------|
| Mess | `{date}_{mealType}_{itemId}` |
| Café | `{date}_cafe_{itemId}` |
| Tea Bar | `{date}_teabar_{itemId}` |
| Tuck Shop | `{date}_tuckshop_{itemId}` |
| Bakery | `{date}_bakery_{itemId}` |
| BBQ | `{date}_bbq_{itemId}` |

### Official Meal / Service Governance
Applies to all services where official entertaining occurs.

- Supervisor or manager initiates — service provided immediately
- Charge parked pending admin approval — post-service model
- Admin approves → cost centre charged. Admin rejects → sponsoring employee contactable
- `sponsoringEmployeeNumber` + `sponsoringEmployeeName` mandatory on all official transactions
- No family member tagging on official transactions
- OG number holders (Type 2 official guests) transact in real time — same as regular employees
- Type 1 occasional guests — manual slip, manager enters next day as proxy

### Official Guest Model — Two Types
**Type 1 — Occasional vendors / one-off visitors**
Meal only, handled by mess supervisor. Manual slip for rare café/tuck shop/BBQ needs. No system account.

**Type 2 — OG Number Holders**
HO employees visiting regularly + long-stay vendors. Registered in `employees` with `employeeType: official_guest`. Users account created. All transactions `billingDestination: official_account` always. Admin approves all charges. `sponsoringEmployeeNumber` mandatory. OG charging boundary and guest house billing deferred to V2.

### Order Building Model — All Services
- Single item per document. `bookingGroupId` groups items from same session.
- Employee or attendant selects multiple items with variable quantities before submitting.
- One submission creates multiple order documents atomically under shared `bookingGroupId`.
- Restaurant-style order building experience on screen.
- No restriction on multiple orders per employee per session.

### Billing Model
Employee personal account, retrospective monthly cycle, 15th–15th billing, salary deduction. Official cost centre for official transactions. Automated rate calculation deferred to V4.

### Manager Authority
Manager has full cross-service authority across all operational roles — can proxy-book, issue, enter official transactions, and access all supervisor-level dashboards across all services.

---

## V1.1 — Family Member CRUD

| | |
|---|---|
| Status | **LOCKED** |
| Dependency | None — standalone feature |
| Enables | Consumer tagging in V1.2, V1.3, V1.4 |

### Purpose
Allows management employees to maintain a list of entitled dependents — spouse and children — under their profile.

### Key Design Decisions
- Relationships: `spouse`, `son`, `daughter` only. All others treated as guests.
- Maximum 12 members per employee. Configurable via `appSettings.maxFamilyMembersPerEmployee`.
- DOB required for son and daughter. Optional for spouse.
- Employee manages freely: add, edit name and DOB, activate, deactivate. No admin approval needed.
- No family member tagging at tea bar — plant site, working hours only.
- Family tagging applicable at café, outdoor mini café, tuck shop, BBQ.

### Marital Status Model
- New field `maritalStatus` on `employees` — values: `single`, `married`.
- New field `pendingMaritalStatus` — null until married-to-single change submitted.
- `single → married`: employee changes freely, immediate effect. Non-blocking popup prompts family member entry (Add Now or Later).
- `married → single`: pending model. Admin approval required. Family members remain accessible during pending period. On admin approval all active family members auto-deactivate.
- My Family tab hidden entirely until married status declared.
- Employee deactivation (resignation/retirement) auto-deactivates all family members. On reactivation family members remain deactivated — employee reviews and restores manually.

### Profile Completion Nudge
Smart home screen banner — not a bell notification. Checks four conditions:
1. Display name filled
2. Phone number filled
3. Marital status set
4. If married — at least one active family member exists

Banner clears automatically when all applicable conditions met.

### Activation and Deactivation
- Employee freely activates and deactivates own family members. No approval needed.
- Deactivated members cannot be selected in any service transaction.
- Deactivation and simple deactivation are visually distinct on screen.

### Deletion Flow
- Employee taps Delete → `isActive = false` + `deletionRequested = true`
- Entry dims with distinct indicator — visually different from simple deactivation
- Dimmed/deletion-pending members cannot be selected in any service
- Admin verifies zero transactions exist → approves (permanent deletion) or rejects (record returns to normal with explanation note to employee)
- Deletion only permitted for wrong entries where no services were received

### V3 Review Point
DOB editing remains with employee in V1.1. When V3 sports module is designed, revisit whether DOB should be locked after initial entry. Risk accepted deliberately.

### Schema Changes

**`employees` collection — new fields:**
- `maritalStatus` — `single` or `married`
- `pendingMaritalStatus` — null until married-to-single submitted

**`familyMembers` collection — new fields added to existing collection:**
- `deletionRequested` — boolean, default false
- `deletionRequestedAt` — timestamp, null until request submitted
- `deletionRequestReason` — string, employee-provided
- `deletionRequestNote` — string, admin response on rejection
- `createdByUid` — UID of creator

**`appSettings` collection — new fields:**
- `maxFamilyMembersPerEmployee` — default 12
- `familyMemberFeatureActive` — boolean toggle

---

## V1.2 — Café + Outdoor Mini Café + Basic Kitchen Dashboard

| | |
|---|---|
| Status | **LOCKED** |
| Dependency | V1.1 Family Member CRUD |

---

### Café Indoor

#### Service Windows
- Café hours: 1800 to 2300 — dine-in and takeaway
- Anytime takeaway: 0800 to 2230 — takeaway only
- Hard close: 2230 to breakfast window

#### Menu
Dinner-specific items. Stable ala carte menu managed via `serviceMenuConfigs`.

#### Order Types

**Café Hours Order (`cafe_hours`)**
- Dine-in or takeaway
- 30 minute preparation guideline — soft advisory only, not system-enforced
- No cancellation once placed — charged regardless
- Pickup time required for takeaway. Not required for dine-in.
- Consumer: self or family member
- Billing: employee personal account or official cost centre (OG numbers real-time, Type 1 manual next day)

**Anytime Takeaway (`anytime_takeaway`)**
- Takeaway only
- 2 hour minimum lead time — system enforced through time picker
- 1 hour cancellation window from order time — locked after that
- Pickup time mandatory — structured time picker, valid times only
- Consumer: self or family member
- Billing: employee personal account only — no official meals outside café hours

#### Order Paths
- Path 1: Employee self-order on own phone — primary
- Path 2: Café supervisor proxy on tablet — verbal dine-in orders
- Path 3: Phone call to supervisor — escape window, mechanically identical to Path 2

#### Order Acknowledgement
- Employee places order → status: `placed`
- Supervisor acknowledges on kitchen dashboard → status: `accepted`
- Employee receives notification on acceptance
- Manual acknowledgement always — no auto-accept
- Unacknowledged order counter badge on kitchen dashboard as supervisor nudge

#### Official Café Meals
- OG number holders: real-time supervisor proxy, cost centre billing, admin approves post-service
- Type 1 occasional guests: manual slip, manager enters next day
- `sponsoringEmployeeNumber` mandatory
- No family tagging on official orders

#### No Table Numbers
Deferred to commercial version.

---

### Outdoor Mini Café

Operationally an extension of café with outdoor seating. Inherits all café flows, rules, and principles.

#### What Is Different
- Physical location: 6 outdoor tables, no table numbers
- Menu: evening snack items — snack-focused, not dinner menu
- `diningMode: outdoor_seating` in `cafeOrders` — no new collection needed
- Role: `cafe_waiter` handles outdoor tables (peer to `cafe_supervisor`, same authorities)
- Takeaway snacks also available from outdoor area

#### Operating Hours
1800 to 2300 on paper. Physically from 1700 informally — system enforces official hours.

#### Official Orders
Same as café indoor — OG real-time, Type 1 manual next day.

---

### Kitchen Dashboard — Ships With V1.2
Replaces existing manual announcement board at café.
- Shows café indoor and outdoor mini café orders together with source label
- Dine-in orders sorted by order time
- Takeaway orders sorted by requested pickup time
- Acknowledgement action per order
- Unacknowledged order counter badge

---

### Roles Introduced in V1.2
- `cafe_supervisor` — café indoor management, proxy ordering, order acknowledgement, official meal initiation, kitchen dashboard
- `cafe_waiter` — outdoor mini café, proxy ordering, order issuance, own dashboard view. Peer to `cafe_supervisor`, same operational authorities.

---

### Schema Changes

**New collection — `cafeOrders`:**
Mirrors `messReservations` structure.
- Removed: `menuOptionKey`, `optionLabel`, `issueStatus`, `menuSnapshot`, `cutoffWaived`, `overrideReason`, `overrideByUid`, `isSpecialMeal`, `allowAnyMenuItem`
- Added: `orderType` (`cafe_hours` / `anytime_takeaway`), `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`, `diningMode` (`dine_in` / `takeaway` / `outdoor_seating`)

**`users.role` — new values:**
`cafe_supervisor`, `cafe_waiter`

---

## V1.3 — Tea Bar + Tuck Shop

### V1.3 Tea Bar

| | |
|---|---|
| Status | **LOCKED** |
| Dependency | None — no family tagging at tea bar |

#### Service Overview
Multiple plant site locations. Real-time only. Beverages, packaged snacks. No advance ordering. No family tagging.

#### Locations
Six at launch: CCR I, CCR II, HSE Building, Workshop, L&DC, Admin. Admin-extensible without deployment.

#### Operating Hours
0730 to 1715. Official lunch break 1300 to 1400 — system enforces closed window.

#### Role
- `teabar_attendant` — one attendant per location
- `assignedLocationId` field on `users` links attendant to their location
- Mobile APK required — no fixed terminals at plant site
- Attendant sees only their own location's orders and widget

#### Order Paths
- Path 1: Employee self-order on own phone — selects location from dropdown, builds order, submits
- Path 2: Attendant proxy — employee approaches verbally, attendant selects employee number, builds and submits

#### Key Rules
- No family tagging — plant site, working hours only
- No advance orders, no cancellation window — real-time only
- No dine-in concept
- Official tea: `sponsoringEmployeeNumber` mandatory, admin approves post-service
- Rich notification to employee on every transaction — self-order and proxy

#### Attendant Widget
Basic order visibility screen. Incoming self-placed orders at assigned location only. Employee name, items, quantities, time placed. Simple served confirmation action.

#### Schema Changes

**New collection — `teabarLocations`:**
`locationId`, `locationName`, `isActive`, `tenantId`, `createdAt`, `updatedAt`

**New field on `users`:**
`assignedLocationId` — null for all roles except `teabar_attendant`

**New collection — `teabarOrders`:**
Same as `cafeOrders` minus: `orderType`, `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`, `diningMode`.
Adds: `locationId`, `locationName`.

**`users.role` — new value:** `teabar_attendant`

---

### V1.3 Tuck Shop

| | |
|---|---|
| Status | **LOCKED** |
| Dependency | V1.1 Family Member CRUD |

#### Service Overview
Pure counter service. No kitchen dependency. No service area. Takeaway only. Two categories — counter items and bakery items.

Bakery has no dedicated frontend. Tuck shop is the dispensing point for all bakery items. Bakery backend (inventory, recipes, costing) deferred to V4.

#### Operating Hours
1700 to 2300.

#### Role
`tuckshop_supervisor` — counter management, proxy ordering, stock availability, bakery production report, returns processing.

#### Two Tab Order Model

**Tab 1 — Counter Items**
Packaged goods, cold drinks, bottled water, tetrapack milk, eggs, cigarettes, packaged snacks, packaged juices. Immediate pickup. No wait time. No kitchen involvement. Supervisor marks items out of stock via `isAvailable` flag — hidden from ordering screen until restocked.

**Tab 2 — Bakery Items**
- Daily fixed: 2 items (1 sweet + 1 salty per circulated menu). Immediately available. First come first served.
- Pre-order: Special items from managed list — cakes, special breads etc. Same day orders not accepted. Cutoff 2200 — no orders or changes after 2200 for next day. Pickup date + time picker (1700–2300 window). 24-hour minimum between order and pickup enforced by same-day rule not rolling window.

Manager manages pre-order available items list — disables unavailable items.

#### Input Methods at Counter Terminal
- **Barcode scanning** — tabletop scanner for packaged items. `barcodeId` on `menuItems`.
- **4-digit numeric codes** — for non-barcoded items (bakery, eggs). `numericCode` on `menuItems`. Manager assigns codes.
- **Manual list selection** — fallback.

#### Ordering Paths
- Path 1: Employee self-order on phone — primary
- Path 2: Tuck shop supervisor proxy at terminal

#### Family Member Tagging
Applicable for personal orders.

#### Supervisor Widget
Live order list sorted by order time. Supervisor marks each order ready for pickup. Employee notification: "Your tuck shop order is ready for pickup."

#### Bakery Production Report
Manager and tuck shop supervisor generate pre-order report before 2200 daily. Lists all next-day bakery pre-orders — item, quantity, employee, pickup time. Printed on thermal printer for bakery team. After 2200 orders lock — report is final.

#### Go Green — No Physical Customer Receipts
Rich digital notification replaces receipt. Sent to employee on every transaction:
- Order reference (Servio orderId)
- Date and time
- Items — name, quantity, rate, value
- Total amount
- Served by
- Consumer — self or family member
- Same day return policy note

Thermal printer retained for bakery production report only.

#### Sale Return Policy
- Same day return within operating window only
- Packaged counter items only — not applicable to pre-order bakery
- Supervisor locates original transaction, selects returned item
- System creates return record linked to original — charge debited back to account
- No exchange transaction — fresh order if replacement needed
- After operating window closes (2300) — no system returns, offline handling

#### Official Orders
OG numbers transact normally. Type 1 manual slip, manager entry next day.

#### Rate Entry
Universal model. `rateTargetKey: {date}_tuckshop_{itemId}`.

#### Schema Changes

**`menuItems` collection — new fields:**
- `barcodeId` — string, null if not applicable
- `numericCode` — 4-digit string, null if not applicable
- `isAvailable` — boolean, default true, supervisor-controlled

**New collection — `tuckshopOrders`:**
Same pattern as `cafeOrders` with differences:
- Removed: `orderType`, `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`, `diningMode`
- Added: `orderSubType` (`counter_immediate` or `bakery_preorder`), `pickupDate`, `pickupTime` (null for counter items)

**New collection — `tuckshopReturns`:**

| Field | Type | Notes |
|-------|------|-------|
| `returnId` | string | Document ID |
| `originalOrderId` | string | Links to tuckshopOrders |
| `tenantId` | string | ffl |
| `employeeNumber` | string | |
| `employeeName` | string | Denormalised |
| `returnedItemId` | string | Specific item returned |
| `returnedItemName` | string | Denormalised |
| `quantity` | integer | How many returned |
| `unitRate` | integer | From original order |
| `returnAmount` | integer | Negative — reduces monthly bill |
| `returnedAt` | timestamp | |
| `processedByUid` | string | Tuck shop supervisor |
| `processedByName` | string | Denormalised |
| `reason` | string | Optional free text |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**`users.role` — new value:** `tuckshop_supervisor`

---

## V1.4 — BBQ

| | |
|---|---|
| Status | **LOCKED** |
| Dependency | None — no family tagging constraint. V1.1 needed for family consumer tagging. |

### Service Overview
Weekly Friday evening food event. Live cooking. Vibrant atmosphere. Variable menu per event. No fixed configuration or recurring template.

### When
Every Friday. Service 1900 to 2300.

### Menu Creation Flow
1. Manager selects items from `menuItems` catalogue (`serviceCategories: bbq`) — Thursday
2. Manager sets `proposedRate` per item — display only, not billing rate
3. Manager marks special items `isPreorderOnly: true` — any number allowed per event
4. Manager submits for admin validation
5. Admin publishes — pre-ordering opens immediately on publication
6. Employees pre-order until 1700 Friday cutoff

### Proposed Rates
Displayed on menu screen with note: *"Rates may vary ±10% on actual"*. Set by manager at creation. Not the billing rate — actual rates entered by accounts supervisor next day via universal model.

### Order Types

**Pre-order**
- Available after menu published until 1700 Friday cutoff
- Available for all items including `isPreorderOnly` items
- No cancellation after 1700 cutoff
- Collected after 1900

**Walk-in**
- From 1900 on the night
- Dine-in or takeaway
- `isPreorderOnly` items blocked from walk-in orders

### Pre-order Only Items
- Manager marks `isPreorderOnly: true` on selected menu items — any count, no system limit
- Purpose: cost management — exact quantity produced matches pre-orders, no leftover burden
- Not available for walk-in orders

### Order Building
Restaurant-style. Employee builds consolidated order — multiple items, variable quantities, single submission. No restriction on multiple orders per employee per Friday evening. No restriction on reordering same item. Family groups can order separately — fully supported.

### Order Paths
- Path 1: Employee self-order on app — primary
- Path 2: BBQ supervisor manual entry at terminal — for verbal orders

### Family Member Tagging
Applicable. Consumer: self or family member. Separate orders for separate family groups supported.

### Official Orders
OG number holders transact normally. Type 1 occasional guests — manual slip, manager entry next day.

### No Table Numbers, No Table Reservation
Informal seating only.

### BBQ Supervisor Dashboard
Unified real-time view on floor terminal at cooking area. Pre-orders and walk-in orders together. Pre-orders visible from publication — gives kitchen advance demand picture. Walk-in orders as they arrive.

### Rate Entry
Universal model. Accounts supervisor enters actual rates next day. `rateTargetKey: {date}_bbq_{itemId}`.

### Schema Changes

**New collection — `bbqEvents`:**

| Field | Type | Notes |
|-------|------|-------|
| `bbqEventId` | string | Document ID |
| `tenantId` | string | ffl |
| `eventDate` | string | YYYY-MM-DD — always Friday |
| `status` | string | `draft`, `pending_review`, `published`, `closed` |
| `menuItems` | array | Selected items — see structure below |
| `preorderCutoffTime` | string | `17:00` — stored not hardcoded |
| `serviceStartTime` | string | `19:00` |
| `serviceEndTime` | string | `23:00` |
| `createdByUid` | string | Manager |
| `publishedByUid` | string | Admin, null until published |
| `publishedAt` | timestamp | When pre-ordering opens |
| `closedAt` | timestamp | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**`bbqEvents.menuItems` array item structure:**

| Field | Type | Notes |
|-------|------|-------|
| `itemId` | string | Links to menuItems |
| `itemName` | string | Denormalised |
| `baseUnit` | string | Denormalised |
| `proposedRate` | integer | Display only — not billing rate |
| `isPreorderOnly` | boolean | Blocks walk-in ordering if true |
| `sortOrder` | integer | Display sequence |

**New collection — `bbqOrders`:**
Same pattern as `cafeOrders` with differences:
- Added: `bbqEventId` (links to bbqEvents), `orderSubType` (`preorder` or `walkin`)
- Removed: `orderType`, `requestedPickupTime`, `cancellationWindowExpiresAt`, `acceptedAt`, `acceptedByUid`
- Kept: `diningMode` (`dine_in` or `takeaway`), family consumer fields, `sponsoringEmployeeNumber`

**`users.role` — new value:** `bbq_supervisor`

---

## V1.5 — Full Dashboards, Analytics, Reporting, Billing Alignment

| | |
|---|---|
| Status | **DESIGN DEFERRED — after V1.4 build complete** |
| Dependency | V1.2, V1.3, V1.4 all stable and field-tested |

Design deferred deliberately. Dashboards, reporting, and analytics requirements will become clear from real data flowing through V1.2–V1.4 operational modules. Designing before build risks specifying the wrong things.

### Preliminary Scope (To Be Confirmed After V1.4 Build)
- Full kitchen dashboards for all services
- Cross-service analytics — consumption patterns, spend by employee, service trends
- Monthly billing statement — employee self-service view across all services
- Reporting snapshots — monthly billing summaries, feedback trends
- Billing alignment across all new service modules
- Employee billing statement screen

---

## V1.6 — Notifications and Reporting Alignment

| | |
|---|---|
| Status | **DESIGN DEFERRED — after V1.4 build complete** |
| Dependency | V1.5 complete |

Design deferred deliberately. Notification matrix for each service will be clearer after operational modules are built and tested. Basic transactional notifications ship with each service module. Deep alignment and cross-service notification design happens here.

### Preliminary Scope (To Be Confirmed After V1.4 Build)
- Deep notifications alignment across all services
- Cross-service reporting consolidation
- Feedback flows for café, tuck shop, tea bar, bakery, BBQ
- Performance optimisations for reporting layer

---

## Mobile Extension — F9–F12 (Deferred from V1 Enhancement)

| | |
|---|---|
| Status | DEFERRED |

Full mobile dashboards for admin, manager, supervisor, and accounts supervisor roles designed and built after V1 Extension when new service dashboards are being designed anyway.

---

## New Collections Introduced in V1 Extension

| Collection | Version | Purpose |
|------------|---------|---------|
| `cafeOrders` | V1.2 | Café and outdoor mini café order transactions |
| `teabarLocations` | V1.3 | Tea bar location master list |
| `teabarOrders` | V1.3 | Tea bar order transactions |
| `tuckshopOrders` | V1.3 | Tuck shop order transactions |
| `tuckshopReturns` | V1.3 | Tuck shop same-day returns |
| `bbqEvents` | V1.4 | Per-Friday BBQ event definition and menu |
| `bbqOrders` | V1.4 | BBQ order transactions |

---

## Collections Modified in V1 Extension

| Collection | Version | Changes |
|------------|---------|---------|
| `employees` | V1.1 | `maritalStatus`, `pendingMaritalStatus` |
| `employees` | OG Model | `costCentreCode`, `sponsoringEmployeeNumber`, `sponsoringDepartment` — mandatory for `official_guest` type only |
| `familyMembers` | V1.1 | `deletionRequested`, `deletionRequestedAt`, `deletionRequestReason`, `deletionRequestNote`, `createdByUid` |
| `appSettings` | V1.1 | `maxFamilyMembersPerEmployee`, `familyMemberFeatureActive` |
| `users` | V1.2 | New role values: `cafe_supervisor`, `cafe_waiter` |
| `users` | V1.3 | `assignedLocationId`, new role value: `teabar_attendant`, `tuckshop_supervisor` |
| `users` | V1.4 | New role value: `bbq_supervisor` |
| `menuItems` | V1.3 | `barcodeId`, `numericCode`, `isAvailable` |

---

## Complete New Role Values — V1 Extension

| Role Value | Service | Authorities |
|------------|---------|-------------|
| `cafe_supervisor` | Café indoor | Proxy ordering, acknowledgement, issuance, official meal initiation, kitchen dashboard |
| `cafe_waiter` | Outdoor mini café | Proxy ordering, issuance, outdoor dashboard — peer to cafe_supervisor |
| `tuckshop_supervisor` | Tuck shop | Counter management, proxy ordering, stock flags, returns, bakery report |
| `teabar_attendant` | Tea bar | Proxy ordering, attendant widget, own location only, mobile required |
| `bbq_supervisor` | BBQ | Manual order entry, BBQ dashboard, floor management |

---

## Deferred Items — Confirmed Out of V1 Extension Scope

| Item | Deferred To |
|------|------------|
| Bakery backend — inventory, recipes, costing | V4 |
| Home delivery service | Post V1 Extension |
| Table numbers and table management | Commercial version |
| Bakery items at tea bars for personal account | Post V1 Extension |
| OG billing boundary and guest house billing | V2 |
| Sports age bracket enforcement on DOB | V3 review point |
| Full mobile dashboards F9–F12 | Post V1 Extension stable |

---

*V1.5 and V1.6 to be designed after V1.4 build is complete and field-tested.*
*Next session: Begin V1.1 build.*
