# Servio V1 — Enhancement Scope
*Improvements and missing flows within the existing Mess module*

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Client | FFL Management Club (tenantId: ffl) |
| Scope Type | V1 Enhancement — improvements within existing Mess module. No new service modules. |
| Scope Status | **LOCKED — 6 June 2026. No additions until Enhancement complete and field-tested.** |
| Prerequisite | All V1 bugs resolved. APK rebuilt. Internal team field test passed. |
| Document Date | 6 June 2026 |

---

## Scope Governance Rule

> This scope is frozen. Any new feature identified during development goes to a backlog only. No item enters V1 Enhancement or V1 Extension scope until the respective field test is complete and a formal scope review is conducted.

---

## Feature Summary

| # | Feature | Priority | Platform | Status |
|---|---------|----------|----------|--------|
| F1 | Employee self-serve BF ala carte (multi-item) | HIGH | Web + Mobile | Not started |
| F2 | Supervisor proxy/walk-in BF ala carte (multi-item) | HIGH | Web | Not started |
| F3 | Official guest walk-in mess booking — schema gap fix | MEDIUM | Backend + Web | Not started |
| F4 | Supervisor proxy/walk-in special lunch/dinner | MEDIUM | Web | Not started |
| F5 | Event banner on employee home screen | MEDIUM | Web | Not started |
| F6 | Accounts Supervisor home dashboard | MEDIUM | Web | Not started |
| F7 | Booking cutoff as editable field in App Settings | LOW | Backend + Web | Not started |
| F8 | Individual feedback review for admin | LOW | Web | Not started |
| F13 | Node.js 20 → 22 upgrade | DEADLINE OCT 2026 | Infrastructure | Not started |

---

## F1 — Employee Self-Serve Breakfast Ala Carte (Multi-Item)

| | |
|---|---|
| Priority | HIGH |
| Platform | Web + Mobile |
| Who | Employee role — self booking |

### Problem
Employees can book breakfast combos but cannot book ala carte breakfast items. Breakfast ala carte is a defined part of the mess operation — employees who want individual items (egg, paratha, etc.) alongside or instead of the combo have no way to book them.

### Expected Behaviour
- Employee goes to Book a Meal → Breakfast
- Sees two sections: Combo and Ala Carte
- Can select multiple ala carte items in one session
- Each item creates one `messReservations` document
- All documents from the same session share a `bookingGroupId`
- Combo and ala carte can coexist for the same meal slot — no duplicate block between them
- Booking confirmation shows all items booked in the session

### Technical Note
Booking endpoint already handles individual docs. Frontend needs multi-item selection UI. No backend schema changes required.

---

## F2 — Supervisor Proxy / Walk-in Breakfast Ala Carte (Multi-Item)

| | |
|---|---|
| Priority | HIGH |
| Platform | Web |
| Who | Mess Supervisor — proxy and walk-in flows |

### Problem
When supervisor does a proxy booking or walk-in for breakfast, only combos are available. Ala carte breakfast items are not accessible to the supervisor in either flow.

### Expected Behaviour
- Supervisor selects employee (proxy) or employee/guest (walk-in)
- Breakfast selected → sees both Combo and Ala Carte sections
- Can select multiple ala carte items
- Same one-doc-per-item, shared `bookingGroupId` pattern as F1
- Walk-in creates document with `issueStatus: 'issued'` immediately — same as existing combo walk-in

### Technical Note
Same pattern as F1. Supervisor booking UI extended to show ala carte section for breakfast.

---

## F3 — Official Guest Walk-in Mess Booking (Schema Gap Fix)

| | |
|---|---|
| Priority | MEDIUM |
| Platform | Backend + Web |
| Who | Mess Supervisor |

### Problem
The `messReservations` schema does not include fields for official guest walk-ins. Without these fields, official guest meals cannot be properly attributed or billed to a cost centre.

### Expected Behaviour
When `subjectType === 'official_guest'`, the reservation must carry:
- `bookingSource: 'official_guest_walkin'`
- `sponsoringEmployeeNumber` — the employee hosting the guest
- `sponsoringEmployeeName` — denormalised name
- `billingDestination: 'official_account'`
- `costCentreCode` — the relevant cost centre
- Charge parked pending admin approval — same governance as existing official meals

### Technical Note
Additive schema fields only — no existing fields touched. UI to collect sponsoring employee at booking time.

---

## F4 — Supervisor Proxy / Walk-in Special Lunch / Dinner (Multi-Item)

| | |
|---|---|
| Priority | MEDIUM |
| Platform | Web |
| Who | Mess Supervisor |

### Problem
Supervisor cannot book a special meal (non-menu items) for an employee at lunch or dinner. Special meals handle medical diet, VIP guests, or specific requests.

### Expected Behaviour
- Supervisor selects employee → date + meal (lunch/dinner) → toggles "Special Meal"
- Can select any item from the full menu catalogue — not restricted to daily menu
- `isSpecialMeal: true`, `allowAnyMenuItem: true` on the reservation document
- Multiple items allowed, one doc per item, shared `bookingGroupId`
- Special meal is supervisor-only — not available to employee self-booking

### Technical Note
`isSpecialMeal` and `allowAnyMenuItem` fields already exist in schema. Backend to allow full catalogue access when `isSpecialMeal` is true. Frontend toggle to activate special meal mode.

---

## F5 — Event Banner on Employee Home Screen

| | |
|---|---|
| Priority | MEDIUM |
| Platform | Web |
| Who | Employee role |

### Problem
When an event is published requiring attendance response, there is no persistent banner on the web home screen. Employees miss events — only discoverable by manually navigating to Events. This will result in low response rates in real operation. Mobile already has the event popup — this is the web equivalent.

### Expected Behaviour
- If published events exist with `requiresAttendance: true` and employee has not yet responded (or response is pending), show a banner on home screen
- Banner text: "You have [N] event(s) requiring your response"
- Tapping the banner navigates to Events list
- Banner disappears once all pending responses are submitted

### Technical Note
No backend changes. Frontend reads existing active events data already available on the home screen.

---

## F6 — Accounts Supervisor Home Dashboard

| | |
|---|---|
| Priority | MEDIUM |
| Platform | Web |
| Who | Accounts Supervisor role |

### Problem
Accounts Supervisor home screen is currently a placeholder. The role has real operational needs: pending rate entry, outstanding billing, and quick navigation to their core screens.

### Expected Behaviour
- Cards showing: Pending Rate Entries (count), Monthly Billing Status, Total Amount This Month
- Quick action buttons: Go to Rate Entry, Go to Billing Dashboard
- No complex analytics — operational summary only

### Technical Note
Reads from existing rate entry and billing endpoints. No new backend work.

---

## F7 — Booking Cutoff as Editable Field in App Settings

| | |
|---|---|
| Priority | LOW |
| Platform | Backend + Web |
| Who | Admin |

### Problem
Booking cutoff time (3 hours before meal) is hardcoded in the backend. Committee changes require a code change and redeployment.

### Expected Behaviour
- `cutoffHoursBeforeMeal` field added to `appSettings` document (already defined in schema)
- Admin can edit this value from the App Settings screen
- Backend reads from `appSettings` instead of hardcoded constant

### Technical Note
Schema already supports this. Backend + frontend wiring task only.

---

## F8 — Individual Feedback Review for Admin

| | |
|---|---|
| Priority | LOW |
| Platform | Web |
| Who | Admin role |

### Problem
Feedback dashboard shows aggregate trends but does not allow admin to open and review individual submissions. Admin cannot acknowledge feedback or mark it reviewed.

### Expected Behaviour
- Feedback list view: individual submissions with meal, date, area, rating
- Admin opens a submission and marks as Reviewed or Action Taken
- `status` field on `mealFeedback` already supports: `open`, `reviewed`, `resolved`

### Technical Note
Status update endpoint may need adding. All read queries already exist.

---

## F13 — Node.js 20 → 22 Upgrade

| | |
|---|---|
| Priority | DEADLINE OCTOBER 2026 |
| Platform | Infrastructure — Backend only |
| Who | HomiLabs technical |

### Problem
Backend Cloud Functions run on Node.js 20. Active support ends October 2026. After that date, security patches stop.

### Expected Behaviour
- Upgrade Firebase Cloud Functions runtime from `nodejs20` to `nodejs22`
- Update `package.json` engines field
- Test all deployed endpoints after upgrade
- Redeploy functions

### Technical Note
No application code changes expected. Runtime upgrade only. Must be done before October 2026.

---

## Appendix — Notification Generation Matrix (Mess Bookings)

Locked before NB2 and NB3 fixes. Governs all notification generation for mess booking events.

| Trigger | Who Gets Notified | Type | Message Summary |
|---------|-------------------|------|-----------------|
| Employee self-books | Employee only | `booking_confirmed` | Booking confirmed |
| Supervisor proxy-books | Employee (whose meal was booked) | `booking_confirmed` | Booked on your behalf by [supervisor] |
| Supervisor proxy-books | Admin | None | No notification needed |
| Supervisor walk-in (employee) | Employee | `booking_confirmed` | Walk-in recorded by supervisor |
| Supervisor walk-in (guest) | No one | None | Guest has no account |
| Supervisor cancels on employee request | Employee | `booking_cancelled_proxy` | Booking cancelled by supervisor |
| Employee self-cancels | Employee only | `booking_cancelled_self` | Booking cancelled |
| Meal issued | Employee | `booking_issued` | Meal issued |
| Rate entry completed | Admin | `rate_entry_pending` cleared | Admin alert — pending rate cleared |
