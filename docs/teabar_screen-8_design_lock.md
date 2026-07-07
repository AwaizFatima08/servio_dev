# Tea Bar — Screen 8 (Location Management) — Design Lock
**HomiLabs Solutions SMC Pvt Ltd — Servio (Club Management Platform)**
**Date:** 06 July 2026
**Status:** LOCKED — ready for a build session, pending two backend fixes queued
below (§6). No code has been written yet, per project rule: design on paper
before any code.

---

## 0. Why this document exists

This closes out the one open item left in
`TeaBar_Frontend_Screen_Map_and_History_Filters_05Jul2026.md` §6 — Screen 8's
detailed design, starting from the open "how does a Manager identify an
attendant by employee number" question. That question turned out to require
checking three real files (`CafeProxyOrderPage.jsx`, `UserManagementPage.jsx`
+ `userManagementService.js`, `authRoutes.js`, `authService.js`,
`teabarLocationService.js`) before an honest answer was possible — see §1 for
what was actually found, since two earlier guesses (by Claude) turned out to
be wrong and were corrected mid-session.

---

## 1. The core problem, and what was actually found (not guessed)

`assignAttendant` needs an internal ID (`uid`), but a Manager only knows a
person by their employee number. Checked three candidate places for a
reusable "employee number → uid" pattern before deciding anything new was
needed:

1. **Café's proxy-order screen** (`CafeProxyOrderPage.jsx`) — does NOT solve
   this. Its search resolves an employee number to a name only; the created
   order is sent with `targetEmployeeNumber`, never a `uid`. Café's backend
   never needed a `uid` on the client side at all. Nothing to copy here.
2. **User Management's `getUsers()`** — DOES already carry both
   `officialEmployeeNumber` and `uid` together, on every user record, in one
   list. But checked against `authRoutes.js` and confirmed: this endpoint is
   locked to `admin` / `super_admin` only. Manager is excluded. Since your
   own access matrix requires Manager to be able to assign attendants, this
   cannot be reused as-is.
3. **Conclusion:** a small, new, purpose-built lookup is needed. Decided:
   **Option A** — build one narrow new function, not reuse `getUsers()`
   (which would have needed loosening Admin-only access to the entire staff
   directory just for this one small task) and not a backend change to
   `assignAttendant` itself (unnecessary once a proper lookup exists).

---

## 2. New backend addition required

### `getUserByEmployeeNumber` (working name)

| | |
|---|---|
| Lives in | `auth` module (`authService.js` + `authRoutes.js`) — an identity question, not a Tea Bar-specific one, matching where `registerEmployee` and `listUsers` already live |
| Input | one employee number |
| Output, if found | `fullName`, `officialEmployeeNumber`, `uid`, `role` — nothing else (no email, no status) |
| Output, if not found | plain "no user account found for employee number X" message |
| Allowed roles | `manager`, `admin`, `super_admin` (this is the new part — no existing identity function allows Manager today) |

**Why this is small, not a from-scratch build:** this file already contains
both halves of it, built for other purposes:
- The "find the `users` doc matching this employee number" query already
  exists verbatim in `registerEmployee` (used there to check for duplicate
  signups).
- The "attach the person's real name from the `employees` collection"
  step already exists verbatim in `listUsers`.

This function is those two pieces, recombined, scoped to one person instead
of "check existence" / "list everyone."

**Firestore index — not yet verified, flagged honestly:** this query is two
equality checks (`officialEmployeeNumber ==`, `tenantId ==`) with no sorting.
Best guess: no new composite index needed, based on how Firestore normally
handles equality-only queries. This is a guess, not a confirmed fact — per
your own project rule, attempt the query for real and let Firestore say so
if it disagrees, rather than assuming.

**Frontend counterpart:** propose adding the matching client-side call to
`userManagementService.js` (frontend) — it already owns the other
`/auth/users...` calls, so this keeps client-side file boundaries mirroring
the backend's. Flagged as a placement choice, easy to move if you'd rather
keep it elsewhere.

---

## 3. Confirmed: the backend already protects against a bad assignment

Checked `teabarLocationService.js` directly. Before `assignAttendant` saves
anything, its `_getAttendantUser` helper already verifies, in this order:
1. the account exists,
2. it belongs to the same tenant,
3. **it actually holds the `teabar_attendant` role**,
4. the account is active (not suspended).

If any check fails, the whole assignment is rejected with a clear message,
before any write happens. **This was raised as an open risk earlier in
design — it is not a risk.** It is already correctly enforced at the layer
that actually writes to the database, not only in whatever the screen
happens to check. Screen 8 does not need to re-implement this safety check
to be safe — it only needs to display whatever error message the backend
sends back, same as every other screen in this app already does.

A **friendly, optional** frontend nicety (not a safety requirement) is still
worth keeping: once the lookup in §2 returns a person's current role, if it
is not `teabar_attendant`, the screen can grey out "Confirm assignment" and
explain why — saving a Manager a round-trip to the server just to be told
the same thing. Cheap, since the role is already sitting in the lookup
response.

---

## 4. Two deliberate simplifications for v1 (Claude's recommendation, both accepted for the paper design — flag before build if either is wrong)

### 4a. Old-location naming on reassignment
`assignAttendant`'s current confirmation message is generic ("any previous
assignment was cleared") — it does not name which location lost its
attendant. **Decision: leave as-is for v1.** The location list itself will
show the change (the old location will show "Unassigned") immediately after
a Manager makes any change, so the information isn't hidden, just one glance
away. Not worth reopening a closed backend file for a wording improvement.
**Revisit if:** a real Manager gets genuinely confused by this in practice.

### 4b. No attendant name shown on the location list
A location record only stores `assignedAttendantUid` — never a name — and no
existing function in the app can translate a `uid` back into a name (this
only runs the *other* direction anywhere else in Servio today). Building
that translation would mean a second new backend function before Screen 8
even exists. **Decision: v1 shows only a "Covered" / "Unassigned" tag per
location, no name.** Every real task (assign, unassign, create, edit) is
still fully possible without it. **Revisit if:** this turns out to matter
in real day-to-day use — build a small, separate, dedicated lookup then,
rather than folding it into this build now.

---

## 5. Screen 8 — Final Flow (paper only, not yet built)

**Access:** Manager, Admin, Super Admin (per existing access matrix).

**Main view:** list of all Tea Bar locations, each showing: name, active/
inactive, and a Covered/Unassigned tag (§4b). Actions per row: Edit, Assign
attendant (or Reassign, if already covered), Unassign (if covered).
Separate action: "+ Add location."

**Create location:** one field — name. Server rejects an exact duplicate
name today (case-sensitivity bug noted in §6 — "CCR I" and "ccr i" are
currently NOT caught as duplicates despite the code comment claiming they
are; must be fixed before this screen ships, or it will silently allow
near-duplicate location names).

**Edit location:** name and/or active toggle. Does not touch attendant
assignment (unchanged from what was already confirmed in the earlier
design-lock document).

**Assign / Reassign attendant flow:**
1. Manager clicks "Assign attendant" on a location.
2. Small search box: "Enter employee number."
3. Manager types a number, searches — calls the new `getUserByEmployeeNumber`
   lookup (§2). Same shape and feel as café's existing proxy-order search.
4. **Not found:** plain error message, nothing else happens.
5. **Found:** show name, employee number, and current role.
   - Role is `teabar_attendant` → show "Confirm assignment" button.
   - Role is anything else → explain why (needs the role granted first, via
     User Management — Admin-only, separate from this screen), no confirm
     button shown. (Nicety, not a safety gate — see §3.)
6. On confirm: call `assignAttendant`. Show its message (generic wording,
   per §4a) on success, or its rejection message verbatim on failure (backend
   remains the single authority, same pattern as every other screen in this
   app).

**Unassign attendant flow:** one confirm click on a covered location, calls
`unassignAttendant`, location becomes "Unassigned."

---

## 6. Backend work still queued before this can be trusted or built against

Carried forward from the earlier design-lock document, plus one addition:

1. **Fix:** `createLocation`'s duplicate-name check — claims
   case-insensitive in its comment, is not in the actual code (`==` with no
   lowercasing either side).
2. **Check, build if missing:** `listLocations` needs a Firestore composite
   index (two `where()` clauses + an `orderBy()`) — comment in the file
   states it hasn't been created yet. This may already be silently blocking
   Screen 1's location dropdown as well as Screen 8.
3. **New, from this session:** build `getUserByEmployeeNumber` (§2) — new
   function, new route, in the `auth` module.

**Recommended:** do all three in one backend-focused session, following the
same discipline as every prior Tea Bar slice — index built and confirmed
Enabled before the function that needs it is deployed, then tested for real
before Screen 8's frontend code depends on any of it.

---

## 7. Open items — none left for Screen 8's paper design

Both remaining judgment calls (§4a, §4b) have a recorded decision and a
stated revisit trigger. Nothing about Screen 8's design is left undecided.
The only remaining work is the backend session in §6, followed by actually
building Screen 8's frontend against it.
