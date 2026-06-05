# Servio — V1 Extended Scope Model
## Post-V1 Release Plan: V1.1 through V1.6

**Product:** Servio — Club Management Platform
**Company:** HomiLabs Solutions SMC Private Ltd.
**Tenant:** FFL Management Club
**Document Date:** 4 June 2026
**Status:** In Progress — V1.1, V1.2 (Café), V1.3 (Tea Bar) Locked. V1.3 (Tuck Shop), V1.4, V1.5, V1.6 Pending Discussion.

---

## Prerequisites Before V1 Extended Begins

### V1 Gap Fix — Complete Before Real User Deployment
Official guest walk-in flow missing from V1 mess module. Must be fixed before real users are onboarded.

**Scope of fix:**
- New `bookingSource` value: `official_guest_walkin` added to `messReservations`
- Two new fields on `messReservations`: `sponsoringEmployeeNumber` + `sponsoringEmployeeName` (denormalised)
- Supervisor initiates at point of service — no advance booking
- Charge parked pending admin approval — same governance as existing official meals
- Admin approval queue updated to include official guest walk-in charges
- No new collections. No structural schema changes. No impact on existing V1 flows.

---

## Universal Principles Across All V1 Extended Releases

### Rate Entry Model — Locked for All Services
One unified rate entry model applies to Mess, Café, Tea Bar, Tuck Shop, Bakery, BBQ, and all future services.

Accounts supervisor opens rate entry screen for a specific date and service. Full list of consumed items displayed with previous day's rate pre-filled. Supervisor changes only variances. Submits once. Cloud Function batch-updates all matching orders via `rateTargetKey`.

**rateTargetKey formats:**
- Mess: `{date}_{mealType}_{menuOptionKey}`
- Café: `{date}_cafe_{itemId}`
- Tea Bar: `{date}_teabar_{itemId}`
- Tuck Shop: `{date}_tuckshop_{itemId}`
- Bakery: `{date}_bakery_{itemId}`
- BBQ: `{date}_bbq_{itemId}`

### Official Meal / Service Model — Locked for All Services
Applies to Mess, Café, Tea Bar, and all services where official entertaining occurs.

- Supervisor or manager initiates official order
- Service provided immediately — no waiting for approval
- Charge parked pending admin approval
- Admin approves → cost centre charged
- Admin rejects → sponsoring employee contactable for resolution
- `sponsoringEmployeeNumber` mandatory for all official transactions
- `sponsoringEmployeeName` denormalised alongside number
- No family member tagging on official transactions

### Order Model — Locked for Café, Tea Bar, Tuck Shop
Single item per document. `bookingGroupId` groups items from same session. Employee or attendant selects multiple items with variable quantities before submitting. One submission creates multiple order documents atomically under shared `bookingGroupId`. Restaurant-style order building experience on screen.

### Billing Model — Locked for All Services
Employee personal account, retrospective monthly cycle, 15th–15th billing. Salary deduction. Rates entered by accounts supervisor. Automated rate calculation deferred to V4.

---

## V1.1 — Family Member CRUD
**Status: LOCKED**
**Dependency:** None. Standalone identity-layer feature.
**Enables:** Consumer tagging in V1.2 Café, V1.3 Tuck Shop, V1.4 Bakery.

### Purpose
Allows management employees to maintain a list of entitled dependents — spouse and children — under their profile. Required before any service module can tag consumption to a family member.

### Who Uses It
Employee — self-service management of own family list.
Admin — deletion requests only, on employee request.

### Key Design Decisions
- Relationships: `spouse`, `son`, `daughter` only. All others treated as guests.
- Maximum 12 members per employee. Configurable in `appSettings`.
- DOB required for son and daughter. Optional for spouse.
- Employee manages freely: add, edit name/DOB, activate, deactivate.
- No admin approval for additions or deactivations.

### Marital Status Model
- New field `maritalStatus` on `employees` — values: `single`, `married`.
- New field `pendingMaritalStatus` on `employees` — null until married-to-single change submitted.
- `single → married`: employee changes freely, immediate effect. Non-blocking popup prompts family member entry. Add Now or Later options.
- `married → single`: pending model. Admin approval required. Employee remains married during pending period. Family members remain accessible during pending. On approval all active family members auto-deactivate.
- My Family tab hidden until married status declared.

### Profile Completion Nudge
Smart home screen banner — not a bell notification. Checks four conditions:
1. Display name filled
2. Phone number filled
3. Marital status set
4. If married — at least one active family member exists

Banner clears automatically when all applicable conditions are met. Single employees clear after first three conditions only.

### Deletion Flow
Employee taps Delete on a family member. `isActive = false` + `deletionRequested = true`. Entry dims with distinct indicator — visually different from simple deactivation. Dimmed members cannot be selected in any service. Admin verifies zero transactions before approving. Admin approves → permanent deletion. Admin rejects → record returns to normal with explanation note to employee.

### Employee Deactivation Impact
On resignation or retirement, all active family members auto-deactivate. On reactivation family members remain deactivated — employee reviews and restores manually. Home screen nudge reappears.

### V3 Review Point
DOB editing remains with employee in V1.1. When V3 sports module is designed, revisit whether DOB should be locked after initial entry. Risk accepted deliberately.

### Schema Changes

**`employees` collection — new fields:**
- `maritalStatus` — `single` or `married`
- `pendingMaritalStatus` — null until married-to-single submitted

**`familyMembers` collection — activated, new fields added:**
- `deletionRequested` — boolean, default false
- `deletionRequestedAt` — timestamp
- `deletionRequestReason` — string
- `deletionRequestNote` — string, admin response on rejection
- `createdByUid` — UID of creator

**`appSettings` collection — new fields:**
- `maxFamilyMembersPerEmployee` — default 12
- `familyMemberFeatureActive` — boolean toggle

---

## V1.2 — Café
**Status: LARGELY LOCKED — cafeOrders field list confirmed, full field detail pending documentation**
**Dependency:** V1.1 Family Member CRUD (for consumer tagging).

### Purpose
Digitises café ordering flow. Replaces manual slip system. Introduces real-time order tracking, employee self-service ordering, supervisor proxy, and basic kitchen dashboard.

### Service Windows
- Café hours: 1800 to 2300 — dine-in and takeaway
- Anytime takeaway: 0800 to 2230 — takeaway only
- Hard close: 2230 to breakfast window

### Order Types

**Café Hours Order (`cafe_hours`)**
- Dine-in or takeaway
- 30 minute preparation guideline — soft advisory message only, not system-enforced
- No cancellation once placed — charged regardless
- Pickup time required for takeaway. Not required for dine-in.
- Consumer: self or family member
- Billing: employee personal account or official cost centre

**Anytime Takeaway (`anytime_takeaway`)**
- Takeaway only — no dine-in outside café hours
- 2 hour minimum lead time — system enforced through time picker
- 1 hour cancellation window from order time — locked after that
- Pickup time mandatory — structured time picker only shows valid times (minimum 2 hours ahead)
- Consumer: self or family member
- Billing: employee personal account only — no official meals outside café hours

### Order Paths
- Path 1: Employee self-order on own phone — primary intended path
- Path 2: Supervisor proxy on café tablet — verbal dine-in orders
- Path 3: Phone call to supervisor — escape window only, mechanically identical to Path 2

### Order Acknowledgement
- Employee places order — status: `placed`
- Supervisor acknowledges on kitchen dashboard — status: `accepted`
- Employee receives notification on acceptance
- No auto-accept — manual always
- Unacknowledged order counter badge on kitchen dashboard as supervisor nudge

### Official Café Meals
- Initiated by supervisor or manager only
- Served immediately without waiting for approval
- Charge parked pending admin approval — post-service approval model
- Admin approves → cost centre charged. Admin rejects → sponsoring employee contactable
- `sponsoringEmployeeNumber` and `sponsoringEmployeeName` mandatory
- No family member consumer tagging for official meals

### Kitchen Dashboard — Ships With V1.2
Replaces existing manual announcement board. Basic, not full analytics.
- Dine-in orders sorted by order time
- Takeaway orders sorted by requested pickup time
- Acknowledgement action per order
- Unacknowledged order counter badge

### No Table Numbers
Table management deferred to commercial version. Not in V1.2 scope.

### Schema Changes

**New collection — `cafeOrders`:**
Mirrors `messReservations` pattern with these differences:
- Removed: `menuOptionKey`, `optionLabel`, `issueStatus`, `menuSnapshot`, `cutoffWaived`, `overrideReason`, `overrideByUid`, `isSpecialMeal`, `allowAnyMenuItem`
- Added: `orderType` (`cafe_hours` or `anytime_takeaway`), `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`

---

## V1.3 — Tuck Shop + Tea Bar
**Status: TEA BAR LOCKED. TUCK SHOP PENDING DISCUSSION.**
**Dependency:** V1.1 Family Member CRUD (for tuck shop consumer tagging).

---

### V1.3 Tea Bar — LOCKED

### Purpose
Digitises plant site tea bar transactions. Replaces signed slip system. Multiple locations served by dedicated attendants.

### Locations
Six at launch: CCR I, CCR II, HSE Building, Workshop, L&DC, Admin.
Admin-extensible — new locations added without deployment.

### Operating Hours
0730 to 1715. Lunch break 1300 to 1400 — system enforces official closed window. Tea bar screen shows closed status outside operating hours.

### What Is Served
Tea, coffee, cold drinks, packaged juices, light packaged snacks. No prepared food items in V1.3. Future snack menu possible without schema changes.

### Role
`teabar_attendant` — new controlled value in `users.role`.
- One attendant assigned to one location via `assignedLocationId` on `users`
- Mobile APK required — no fixed terminals at plant site
- Most restricted operational role in system
- Can only see their own assigned location's orders and widget

### Order Paths
- Path 1: Employee self-order on own phone — selects location, selects items, submits
- Path 2: Attendant proxy — employee approaches verbally, attendant selects employee number, builds and submits order

### No Family Tagging
Plant site, working hours only. Family members not present at plant site. No consumer tagging.

### No Official Service Complexity
Official tea for guests and meeting sessions follows same governance as mess and café official meals. `sponsoringEmployeeNumber` mandatory. Admin approves post-service. No new concepts.

### Attendant Widget
Basic order visibility screen on attendant's device. Shows incoming self-placed employee orders at their assigned location only. Employee name, items, quantities, time placed. Simple served confirmation. Not a kitchen dashboard — no food preparation involved.

### Notifications
Both self-order and proxy order generate employee notification. Location, items, quantities, time. Real-time billing transparency.

### No Advance Orders, No Cancellation Window
Real-time only. No pickup time scheduling. No cancellation model needed.

### Schema Changes

**New collection — `teabarLocations`:**
- `locationId`, `locationName`, `isActive`, `tenantId`, `createdAt`, `updatedAt`

**New field on `users` collection:**
- `assignedLocationId` — null for all roles except `teabar_attendant`

**New role value — `users.role`:**
- `teabar_attendant`

**New collection — `teabarOrders`:**
Same as `cafeOrders` with these differences:
- Removed: `orderType`, `requestedPickupTime`, `acceptedAt`, `acceptedByUid`, `cancellationWindowExpiresAt`, `diningMode`
- Added: `locationId`, `locationName`

---

### V1.3 Tuck Shop — PENDING DISCUSSION

*Design discussion not yet started. To be documented after tuck shop discussion is complete.*

---

## V1.4 — Bakery
**Status: PENDING DISCUSSION**
**Dependency:** V1.1 Family Member CRUD.

*Design discussion not yet started. To be documented after bakery discussion is complete.*

---

## V1.5 — Full Dashboards, Analytics, Reporting, Billing Alignment
**Status: PENDING DISCUSSION**
**Dependency:** V1.2, V1.3, V1.4 all stable.

### Scope Overview (Preliminary)
- Full kitchen dashboards for all services — café, tuck shop, bakery
- Cross-service analytics — consumption patterns, spend by employee, service-wise trends
- Reporting snapshots — monthly billing summaries, feedback trends, event summaries
- Billing alignment across all new service modules
- Notifications depth — reminder flows, monthly bill available alerts, pending rate entry alerts
- Employee billing statement screen — self-service view of monthly charges across all services

*Detailed design to be discussed and locked after V1.4 is complete.*

---

## V1.6 — Notifications and Reporting Alignment
**Status: PENDING DISCUSSION**
**Dependency:** V1.5 complete.

### Scope Overview (Preliminary)
- Deep notifications alignment across all services
- Cross-service reporting consolidation
- Feedback flows for café, tuck shop, tea bar, bakery
- Performance optimisations for reporting layer

*Detailed design to be discussed and locked after V1.5 is complete.*

---

## Summary Table

| Version | Scope | Status | Dependency |
|---------|-------|--------|------------|
| V1 Gap Fix | Official guest walk-in mess | Ready to build | None — before V1 deployment |
| V1.1 | Family Member CRUD | Locked | None |
| V1.2 | Café + basic kitchen dashboard | Largely locked | V1.1 |
| V1.3 | Tuck Shop + Tea Bar | Tea Bar locked, Tuck Shop pending | V1.1 |
| V1.4 | Bakery + basic supervisor view | Pending discussion | V1.1 |
| V1.5 | Full dashboards + analytics + reporting + billing | Pending discussion | V1.2, V1.3, V1.4 |
| V1.6 | Notifications + reporting alignment | Pending discussion | V1.5 |

---

## New Collections Introduced in V1 Extended

| Collection | Introduced In | Purpose |
|------------|--------------|---------|
| `cafeOrders` | V1.2 | Café order transactions |
| `teabarLocations` | V1.3 | Tea bar location master list |
| `teabarOrders` | V1.3 | Tea bar order transactions |
| `tuckShopOrders` | V1.3 | Tuck shop transactions — pending design |
| `bakeryOrders` | V1.4 | Bakery order queue — pending design |

## Collections Modified in V1 Extended

| Collection | Version | Changes |
|------------|---------|---------|
| `employees` | V1.1 | `maritalStatus`, `pendingMaritalStatus` |
| `familyMembers` | V1.1 | `deletionRequested`, `deletionRequestedAt`, `deletionRequestReason`, `deletionRequestNote`, `createdByUid` |
| `appSettings` | V1.1 | `maxFamilyMembersPerEmployee`, `familyMemberFeatureActive` |
| `users` | V1.3 | `assignedLocationId`, new role value `teabar_attendant` |
| `messReservations` | V1 Gap Fix | `sponsoringEmployeeNumber`, `sponsoringEmployeeName`, new `bookingSource` value `official_guest_walkin` |

---

*Document to be updated as V1.3 Tuck Shop, V1.4 Bakery, V1.5, and V1.6 discussions are completed.*
*Next discussion: Tuck Shop — continue in new chat.*
