# Tea Bar — Web Frontend Screen Map & History Filter Design Lock
**HomiLabs Solutions SMC Pvt Ltd — Servio (Club Management Platform)**
**Date:** 05 July 2026
**Status:** SUBSTANTIALLY LOCKED — see §7 for the one small remaining item, and §6 for two newly-found backend risks to check before trusting Screens 1 and 8

---

## 0. Why this document exists

Tea Bar's backend (V1.3) was fully field-tested and closed on 05-Jul-2026, per the
Command Board. This document captures the frontend screen map discussion that
followed, plus a detailed design for one specific piece — the shared History
screen's filters — which turned out to require new backend work, not just
frontend layout, and so deserved its own explicit decision trail.

This document does not authorize any code to be written. It is a paper record,
per project rule: design locked on paper before any code.

---

## 1. Final Screen List (8 screens)

Confirmed by direct comparison against café's already-built, already-tested
screens and routes (`App.jsx`, `Sidebar.jsx`), and against Tea Bar's own
already-tested backend functions (`teabarOrderService.js`).

| # | Screen | Backend function it calls | Backend test status |
|---|---|---|---|
| 1 | Self-order (employee picks location + items) | `createSelfOrderBatch` | Tested ✅ |
| 2 | My order history (employee's own self/proxy orders only) | `getEmployeeTeabarHistory` | Tested ✅ |
| 3 | Live dashboard (today's pending orders, "Handed over" action) | `getTeabarDashboard`, `issueTeabarOrderGroup` | Tested ✅ |
| 4 | Proxy-order (attendant orders on someone's behalf) | `createProxyOrderBatch` | Tested ✅ |
| 5 | Official-order placement | `createOfficialTeabarOrderBatch` | Tested ✅ |
| 6 | Shared History (attendant / manager / admin) | `getTeabarHistory` | Tested ✅ (base version — filter additions are new work, see §3) |
| 7 | Official approval queue | `approveOfficialTeabarOrderGroup`, `rejectOfficialTeabarOrderGroup`, `listOfficialPendingGroups` | Tested ✅ |
| 8 | Location management (create/edit locations, assign/unassign attendant) | `teabarLocationService` (create, edit, assign, unassign) | Backend exists (built weeks earlier); no frontend screen exists yet on disk, confirmed via `web/src` tree — this is a new build, not a gap-fill |

Two screens originally drafted (a separate "attendant location history" and a
separate "admin history") were merged into the single Screen 6 above, once
café's `CafeHistoryPage.jsx` confirmed the working pattern: one file, multiple
roles, backend decides what each role is allowed to see — not the screen.

### 1a. Screen 1 (Self-order) — Additional Design Notes

**Menu display:** flat list (confirmed launch menu is around 20 items —
Homi, 06-Jul-2026). Items are **silently sorted by food type** (e.g. teas
together, cold drinks together) using the existing `foodTypeCode` already
present on each menu item — but with **no visible section headers**. This
gives related items natural proximity without adding the visual weight of
grouped headings. (Homi, 06-Jul-2026.)

*Technical note for whoever builds this (not a decision, a thing to check
first):* confirm whether the Tea Bar menu already arrives pre-sorted by food
type from the backend resolver, or whether the screen itself needs to
perform this sort. If already sorted, this costs nothing extra to build.

**Post-order confirmation:** copies café's existing confirmation pattern
exactly (Homi, 06-Jul-2026) — a full-screen swap (not a toast) showing a
checkmark, an itemized list of what was ordered with quantities, a total,
a note that rates are entered by accounts the next day and the bill updates
then (verified true for Tea Bar as well — same retrospective rate model,
`rateStatus: pending` at order time), and two actions: a link to Screen 2
(My order history) and an "Order again" button that resets back to the
ordering step.

**"Order again" behaviour (Homi, 06-Jul-2026):** performs a **full reset**,
including clearing the just-used location — matching café's "Order again"
exactly, which also does a full reset (café never had a location to begin
with, so this keeps both modules following one single rule: "Order again
always means start completely fresh," rather than Tea Bar needing its own
special exception). Traded off knowingly: an employee ordering a second
time from the same counter will need to re-pick their location.

---

## 2. Access Matrix

| Screen | Employee | Attendant | Manager | Admin / Super Admin |
|---|:---:|:---:|:---:|:---:|
| 1. Self-order | ✅ | — | — | — |
| 2. My order history | ✅ (own only) | — | — | — |
| 3. Live dashboard | — | ✅ | ❌ | — |
| 4. Proxy-order | — | ✅ | ❌ | — |
| 5. Official-order placement | — | ✅ | ❌ | — |
| 6. Shared History | — | ✅ (own location only) | ✅ (all locations, read-only) | ✅ (all locations, read-only) |
| 7. Official approval queue | — | — | — | ✅ |
| 8. Location management | — | — | ✅ create, edit, assign, unassign | ✅ same as Manager, plus granting/revoking the `teabar_attendant` role itself (a separate User Management action, not part of this screen) |

Confirmed decisions behind this table:
- Manager's Tea Bar involvement is **read-only History only** — explicitly
  excluded from issuance, proxy booking, cancellation, and official-order
  placement (Homi, 05-Jul-2026).
- Attendant's History view is locked to their own assigned location — same
  rule already tested for proxy orders (location is never accepted from the
  client for an attendant; always resolved server-side from their assignment).
- **Correction to an earlier draft of this document:** Manager can assign
  and unassign attendants to/from locations, not just create/edit location
  records — confirmed directly from `teabarLocationService.js` and its
  route file. Only granting/revoking the `teabar_attendant` role itself
  stays Admin-only, and that happens in User Management, not here.
- No location label or indicator is shown to the attendant on the History
  screen — Homi confirmed this is not needed.
- Screen 6 is **read-only for every role** — no Cancel button anywhere on
  History, matching café's own History screen exactly, and matching the
  Command Board's explicit note that a Cancel button on Tea Bar's admin
  history view was "intentionally deferred, not built this session."
- **Cancel button ownership (Homi, 06-Jul-2026):** lives on **Screen 2**
  for an employee (their own orders only, matching the backend rule that an
  employee can never cancel an official order), and on **Screen 3** for an
  attendant (any order at their own location, today's pending orders,
  matching the backend rule that an attendant may cancel self/proxy/official
  alike at their own counter). Not present on Screen 6 (read-only, see
  above). Admin/super_admin's unrestricted cancel authority does not yet
  have an assigned screen — not needed until an admin-facing cancel UI is
  actually requested; today's auto-cancel job (17:15 PKT) already acts as
  the safety net for stuck orders in the meantime.
- **Screen 5 sequencing (Homi, 06-Jul-2026):** the attendant serves the item
  immediately and logs it as official in the same action — there is no
  "wait for approval before serving" step, since Tea Bar has no advance
  ordering and therefore no future point in time for an approval to precede.
  Admin's approval (Screen 7) is a back-office billing decision made
  afterward, not a gate on service.

---

## 3. Screen 6 (Shared History) — Filter Design

### 3.1 Filters are NOT combinable — one at a time

Decision: a person filters by Location, **or** a specific Day, **or** an
Employee Number — never two at once. (Homi, 05-Jul-2026, choosing simplicity
over café's fully-combinable model.)

**Reason recorded:** combinable filters (café's model) would likely require
several new pre-sorted database indexes to support every combination.
One-at-a-time filtering avoids nearly all new index work — see §4.

**Known limitation, accepted deliberately:** a person cannot ask "show me
Workshop's orders on July 2nd" in a single search. They would need to pick
Location and browse, or pick Day and browse. This was seen and accepted, not
overlooked.

### 3.2 Location filter

- Available to: Manager, Admin, Super Admin only.
- Not available to: Attendant (their location is always their own, fixed,
  with no control and no on-screen label).
- Not applicable to: Employee (Screen 2 has no location filter — it is
  already scoped to one employee's own orders).
- Backend behaviour: unchanged from what was already built and tested
  05-Jul-2026 (`getTeabarHistory`'s optional `locationId` parameter, with the
  attendant's own route always overriding it server-side).

### 3.3 Specific Day filter

- A **single day**, not a date range (Homi, 05-Jul-2026 — "single specific
  day will be simple").
- Technical note for future reference: a single-day search can reuse the
  same kind of database query Tea Bar's existing 30-day window already uses
  (both are "on or after a date" range queries — a single day is simply a
  one-day-wide version of the same shape). This means **no new database
  index is expected to be required** for this filter, only a change to what
  `getTeabarHistory` accepts as input.
- **Capped at 30 days — confirmed by Homi, 05-Jul-2026, after being shown
  that this is stricter than café's own Day filter (café's has no such
  cap).** Reason recorded: Tea Bar's order volume is expected to be low
  enough that anything older than 30 days is not expected to matter
  operationally. This is a deliberate simplicity choice, not a technical
  limitation — flagged here explicitly so it is not mistaken for a bug by
  anyone (including future-Homi) revisiting this later.
- **Confirmed (Homi, 06-Jul-2026):** the Day filter's date-picker control
  will refuse to let anyone select a date older than 30 days ago (those
  dates shown greyed out / disabled), so nobody submits a search that is
  guaranteed to return nothing without understanding why. Frontend-only
  safeguard, no backend cost.

### 3.4 Employee Number filter

- For Manager / Admin / Super Admin: a real, server-side search — reusing
  the same kind of already-tested, already-indexed query that
  `getEmployeeTeabarHistory` uses today (search by employee number, sorted
  newest first, within the 30-day window). No new index expected.
- For Attendant: **not** a new server request at all. Their location's
  30 days of orders are already being fetched for the plain History view;
  searching by employee number for an attendant is a search *within that
  already-loaded list*, done in the browser, not a new database query. This
  mirrors the reasoning already written into the existing
  `getEmployeeTeabarHistory` code ("order volume per employee is tiny,
  filtering in memory costs nothing meaningful").
- Also capped at 30 days, per §3.3's reasoning (kept consistent across both
  Day and Employee searches, so the rule is one rule, not two).

### 3.5 Cancelled-orders toggle

- **Hidden by default, revealed by a checkbox** — matching café's pattern
  exactly (Homi, 05-Jul-2026, "cafe style").
- Backend behaviour: **no backend change at all.** `getTeabarHistory`
  already returns cancelled orders mixed in with placed orders on every
  call, distinguished only by the `orderStatus` field already present on
  each row. Hiding them is a pure frontend display decision on data already
  received — no new request, no new index.

---

## 4. Backend Impact Summary (plain language, no code)

For whoever picks this up next (Homi, or Awaiz):

`getTeabarHistory` needs to accept two new *optional* inputs it does not
accept today: a specific day, and an employee number. Only one of
(location / day / employee) will ever be sent at a time — never combined —
so the function's internal logic should branch on "which one, if any, was
asked for" rather than try to support every combination together.

Based on the reasoning in §3.3 and §3.4, **no brand-new Firestore composite
index is currently expected to be required** for either new input — but this
is a reasoned expectation, not a guarantee, and must be verified for real
once the change is actually written (attempt the query, see if Firestore
complains, build an index only if it does — same discipline as every prior
Tea Bar slice).

This is a small but real backend change to code that was marked closed on
05-Jul-2026. Per project rule, it should get its own short test pass before
the Screen 6 frontend is built to depend on it — not be assumed correct
just because the reasoning above sounds sound on paper.

---

## 5. Future Compatibility Note — Rate Entry, Billing, Feedback

Not built now. Recorded here so the reasoning is not lost, and so nobody
later mistakes this gap for an oversight.

- **Rate hook:** already exists in Tea Bar's order documents today —
  `rateTargetKey`, `unitRate` (null until entered), `rateStatus` (starts
  `'pending'`) — in the identical shape café already uses for its own
  orders. No backend change needed; this was built in from the start.
- **Café is not actually ahead of Tea Bar here, contrary to how this was
  first framed.** Checked directly: café's own rate field has never been
  read by anything — no Rate Entry screen or rate-applying function was
  ever built for café either. Only **mess** has a genuinely working Rate
  Entry system today. Café and Tea Bar are in the same position: a hook,
  not a working feature.
- **Feedback hook:** does not exist in Tea Bar's schema, and does not exist
  for café either — there is no separate feedback collection for either
  module. This is not a Tea Bar-specific gap; it matches the project's own
  already-locked roadmap (V1.6, feedback for café/tuck shop/Tea Bar/bakery
  together, after V1.4 is complete).
- **Confirmed decision (Homi, 06-Jul-2026):** Rate Entry, Billing, and
  Feedback functions will be built for **all** flows — café, Tea Bar, BBQ,
  Tuck Shop, and Bakery — together, at the closure of all module builds.
  This matches, and makes explicit, the Command Board's existing V1.5
  (billing) / V1.6 (feedback) scope — Tea Bar is not an exception to it.
- **Resolved (Homi, 06-Jul-2026):** Tea Bar will not be deployed to
  production — not even for a trial period — until V1.5 (billing) is
  complete. This fully removes the original risk (real, unbilled service
  running indefinitely): no real Tea Bar order will ever exist without
  billing already available to act on it, since Tea Bar simply won't be
  live for real use before that point.
- **Resolved, full scope confirmed (Homi, 06-Jul-2026):** this is the full
  chain, not a Tea Bar-specific shortcut. Build order going forward:
  finish café's small remaining cleanup tail, build Tea Bar's frontend
  (this document's subject), then Tuck Shop's and Bakery's full operational
  flows. **Only once all operational flows are complete** does billing,
  rate entry, and feedback get built — added into each flow one module at
  a time, not all at once as a single mega-feature.
- **Resolved (Homi, 06-Jul-2026):** BBQ is included in the same group.
  The full list of operational flows that must be complete before billing,
  rate entry, and feedback work begins is: café (small cleanup tail
  remaining), Tea Bar, Tuck Shop, Bakery, and BBQ — matching the project's
  already-locked roadmap (V1.5 depends on V1.3 and V1.4 both) exactly, with
  no change to what was already written down before today.

## 6. Screen 8 (Location Management) — Backend Reference

Read directly from `teabarLocationService.js`, 06-Jul-2026. Not yet
translated into a screen design — that is the next session's first task.
Recorded here so that work starts from verified fact, not memory.

### Available actions
| Function | What it does | Who (per route file) |
|---|---|---|
| `createLocation` | Add a new location. Takes just a name. | Manager, Admin, Super Admin |
| `listLocations` | List all locations (active-only by default; can include inactive) | Broad — any authenticated user (employees need this for Screen 1's dropdown) |
| `getLocationById` | Fetch one location | Internal use by other services |
| `updateLocation` | Edit name and/or active flag. Does **not** touch attendant assignment. | Manager, Admin, Super Admin |
| `assignAttendant` | Assign/reassign one attendant to one location | Manager, Admin, Super Admin |
| `unassignAttendant` | Remove attendant coverage, leaving the spot empty | Manager, Admin, Super Admin |
| `getLocationForAttendant` | "Where am I assigned?" — used internally by other screens, not by Screen 8 itself | Internal |

### Fields (locked list, nothing beyond this)
`locationId`, `locationName`, `assignedAttendantUid`, `isActive`,
`tenantId`, `createdAt`, `updatedAt`. No address, no description, no other
fields — deliberately minimal.

### A safety behaviour worth knowing before designing the Assign action
`assignAttendant` does not just write the new assignment — it first checks
whether that attendant is already covering some *other* location, and
clears that old assignment automatically, in the same atomic write. This
means Screen 8 does **not** need its own "unassign from the old spot first"
step in the UI — the backend guarantees one-attendant-one-location on its
own. The screen only needs to let someone pick a location and pick an
attendant; the rest is handled underneath.

### Issues found in this file, flagged 06-Jul-2026 — not yet fixed
1. **Bug:** `createLocation`'s duplicate-name check claims to be
   case-insensitive in its own comment, but the actual comparison is exact
   (`==`), with no lowercasing on either side. "CCR I" and "ccr i" would
   currently be treated as different locations. Small, but a real
   disagreement between comment and code — worth fixing whenever this file
   is next touched.
2. **Potentially blocking, needs checking first:** `listLocations`'
   own comment states it needs a Firestore composite index (it filters on
   two fields and sorts) and that this index **has not yet been created**.
   `listLocations` is very likely the same function behind
   `GET /teabar/locations` — the endpoint Screen 1's location dropdown
   depends on, which this document currently marks "backend tested ✅."
   **This must be checked (and the index built, if missing) before trusting
   either Screen 1 or Screen 8 to work for real** — not a frontend decision,
   but a real risk to close before building either screen's UI.

### Open question for next session — not yet answered
`assignAttendant` requires `attendantUid` — an internal technical ID, not
something a Manager would recognise by looking at a person. Screen 8 needs
some way to search for a person by something human-readable (most likely
employee number, matching the pattern used elsewhere in this app) and
resolve that to a `uid` before calling this function. Unknown yet: does a
reusable lookup like this already exist elsewhere in the app (e.g. the
pattern used by café's proxy-order screen), or does this need to be built
fresh for Tea Bar?

---

## 7. Open Items — Deliberately NOT Yet Decided

All screen-map and filter design questions are now resolved. One small
technical check remains:

1. **Technical check, not a decision:** confirm whether the Tea Bar menu
   arrives from the backend already sorted by food type, or whether Screen
   1 needs to perform that sort itself. Whoever builds Screen 1 should check
   this first — it changes nothing about the design, only where the sorting
   logic lives.

---

## 8. Next Steps

1. Screen map and design questions are now fully locked — only the one
   small technical check in §7 remains, and it costs nothing to resolve
   whenever Screen 1 is actually built.
2. **Two backend items now queued, not one:** the `getTeabarHistory` filter
   change (§4), and — newly found, 06-Jul-2026 — checking/building the
   missing `listLocations` composite index (§6, Issue 2), which may already
   be silently blocking Screen 1's location dropdown as well as Screen 8.
   Both should be verified/built in the backend-focused session, following
   the same discipline as every other Tea Bar slice, before their
   dependent frontend screens are built or trusted.
3. Agreed build order (Homi, 06-Jul-2026): **Screen 8 (Location management)
   first**, since it is the one hard blocking dependency — Screen 1's
   location dropdown has nothing to show without it, and no other screen
   can be meaningfully field-tested until real locations exist. Detailed
   design of Screen 8 begins next, using the backend reference in §6 —
   starting with the open attendant-lookup question there.
4. Rate Entry, Billing, and Feedback for Tea Bar (and every other V1.3/V1.4
   module) are explicitly out of scope until all module builds close — see
   §5.