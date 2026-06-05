# Servio — Field Test Report & Rectification Plan
**Date:** 1 June 2026  
**Conducted by:** Dr. Humayun Shahzad  
**Platform:** Web (Chrome) + Mobile (Samsung S23 Ultra, Android, Expo Preview APK)  
**Firebase Project:** servio-dev-55d2d  
**Production API:** https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api  
**Repo:** AwaizFatima08/servio_dev  

---

## 1. SESSION SUMMARY

Full end-to-end field test of Servio V1 across all built flows. Both web and mobile tested simultaneously where applicable. Supervisor, accounts, admin, manager, and employee roles all tested. 342 employees loaded in Employee Master from bulk upload.

**Update — 2 June 2026:** Batch 1 rectification session completed. Mobile booking pipeline fully operational. See Section 11 for full Batch 1 outcomes.

---

## 2. FLOWS TESTED & STATUS

| Flow | Web | Mobile | Status |
|------|-----|--------|--------|
| Login / Auth | ✅ | ✅ | Pass |
| Registration (self-signup) | ✅ | ✅ | Pass with Issue 13 (hyphen normalisation needed) |
| Pending Approval / Reject | ✅ | — | Pass |
| Employee Master — view/search/filter | ✅ | — | Pass |
| Employee Master — Add Employee | ✅ | — | Pass |
| Employee Master — Edit Employee | ✅ | — | **Bug 16 — view only, no edit** |
| User Management — Active Users | ✅ | — | Pass with Bug 12 (name dash) |
| User Management — Suspend/Activate | ✅ | — | Pass |
| User Management — Role change | ✅ | — | Pass |
| Menu Management — add/edit items | ✅ | — | Previously tested, PASS |
| Templates & Cycles | ✅ | — | Previously tested, PASS |
| Daily Menu display (home + book meal) | ✅ | ✅ | **Bug 1 — menu resolver data layer VERIFIED ✅. Bug 19 — web EmployeeDashboard weekly menu still shows dashes (frontend rendering)** |
| Book Meal — Single Day | ✅ | ✅ | **FIXED 2Jun2026** — Web pass, Mobile now PASS |
| Book Meal — Weekly | ✅ | ✅ | **FIXED 2Jun2026** — Web pass, Mobile now PASS |
| My Bookings — Active + History | ✅ | ✅ | Pass |
| Cancel Booking | ✅ | ✅ | Pass |
| My Bill | ✅ | ✅ | Web pass, Mobile Bug 6 (Rs. 0) — likely resolved with token fix, needs re-test |
| Feedback — Submit | ✅ | ✅ | Pass |
| Feedback — Pending list | ✅ | ❌ | Mobile Bug 8 (only today visible) |
| Issuance Dashboard | ✅ | — | Pass — confirmed booking appears correctly 2Jun2026 |
| Kitchen Dashboard — today | ✅ | — | Pass |
| Kitchen Dashboard — future dates | ✅ | — | **Bug 5 — date navigation disabled** |
| Rate Entry | ✅ | — | Pass |
| Billing Dashboard — Monthly Summary | ✅ | — | Pass |
| Billing Dashboard — Employee Statement | ✅ | — | **Bug 7 — access denied for accounts_supervisor** |
| Billing Dashboard — Pending Billing | ✅ | — | Pass |
| Official Accounts | ✅ | — | Pass |
| Events — Create/Publish/Return | ✅ | — | Pass |
| Events — Employee view + RSVP | ✅ | ✅ | Pass |
| Events — Attendance details | ✅ | ✅ | Pass |
| Notifications — display | ✅ | ✅ | Pass (old test notification visible) |
| Notifications — generation | ❌ | ❌ | **Bug 3 — not generating** |
| Reporting — Live Today headcount | ✅ | — | **Bug 10 — showing 0** |
| Reporting — Weekly Bookings snapshot | ✅ | — | Pass with Bug 4 (Invalid Date on snapshot timestamp) |
| Reporting — Feedback Trends | ✅ | — | **Bug 9 — rating shows 0.0** |
| Reporting — Admin Alerts | ✅ | — | Pass |
| My Profile — Contact Info edit | ✅ | — | Pass (save works) |
| My Profile — Display Name | ✅ | — | **Bug 18 — not persisting** |
| My Profile — HR pending change | ✅ | — | **Bug 17 — route not found** |
| App Settings | ✅ | — | **Bug 14 — FIXED 2Jun2026** (backend file replaced, contact fields now accepted) |
| Contact Us | ✅ | — | **Bug 15 — resolves once Bug 14 fix is field-tested** |
| Proxy Booking | — | — | **NOT BUILT — promoted to V1 scope** |
| Walk-in Booking | — | — | **NOT BUILT — promoted to V1 scope** |

---

## 3. BUG LIST — PRIORITISED FOR FIXING

### CRITICAL (system cannot go live without these)

---

**BUG 1 — Menu Resolver** ✅ DATA LAYER VERIFIED
- Data layer confirmed correct 2Jun2026 — `ffl_2026-06-02_lunch` and surrounding documents exist in Firestore with correct combo data
- Remaining issue: **Bug 19** — Web EmployeeDashboard weekly menu section still shows dashes. Frontend rendering bug — data is there, component not reading/rendering it correctly
- Files: `web/src/pages/EmployeeDashboard.jsx` — weekly menu rendering section

---

**BUG 2 — Mobile booking: Invalid token** ✅ FIXED 2Jun2026
- Root cause identified: Firebase ID token expired after 1 hour; mobile api.js was reading stale token from AsyncStorage
- Fix applied: `mobile/src/services/api.js` — replaced AsyncStorage token read with `auth.currentUser.getIdToken(false)` auto-refresh on every request
- **Booking confirmed E2E** — web Issuance Dashboard shows Dr. Humayun Shahzad / Qeema Karailay Combo / Combo 2 / Self / Dine-in / Pending

---

**BUG 19 (NEW) — Web EmployeeDashboard: weekly menu shows dashes**
- Data layer confirmed correct (Bug 1 resolved at Firestore level)
- Frontend not rendering combo names — showing "—" instead of dish names
- Priority: HIGH — fix before field deployment
- Files: `web/src/pages/EmployeeDashboard.jsx`

---

**BUG 3 — Notifications not generating**
- Symptom: No notification on meal booking, no event publish popup, no rate entry notification
- Root cause: `notificationDispatcher` Cloud Function not triggering, OR `notificationService.js` not writing correctly
- Fix: Check Firebase Cloud Function logs → verify trigger conditions → check notificationService.js Firestore write path
- Files: `functions/src/notifications/notificationService.js`

---

**BUG 17 — My Profile HR pending change: Route not found**
- Symptom: "Route not found: POST /profile/pending-change"
- Fix: Add or correct route for pending profile changes. Write `pendingGrade`, `pendingDesignation`, `pendingHouseNumber` to employees collection.
- Files: Backend profile routes file

---

**BUG 14 — App Settings: support contact fields rejected** ✅ FIXED 2Jun2026
- Root cause: Web appSettingsService.js (frontend) was accidentally placed in functions/src/appSettings/ replacing the backend file
- Fix applied: Correct backend appSettingsService.js restored. UPDATABLE_FIELDS list in backend already included contact fields — they were never blocked, the wrong file was the problem.
- Status: Deployed. Needs field test to confirm contact fields now save correctly.

**BUG 15 — Contact Us showing "Not set"**
- Direct consequence of Bug 14. Will resolve once Bug 14 fix is field-tested and values are saved.

---

### HIGH (operationally impactful)

---

**BUG 6 — Mobile My Bill showing Rs. 0**
- Root cause: Same auth token issue as Bug 2
- Bug 2 fix deployed — needs re-test. Expected to auto-resolve.
- Files: `mobile/src/services/` bill-related service (if still failing after token fix)

---

**BUG 7 — Employee Statement: accounts_supervisor access denied**
- Fix: Add `accounts_supervisor` to allowed roles for Employee Statement endpoint
- Files: Backend billing routes

---

**BUG 5 — Kitchen Dashboard: future date navigation disabled**
- Operationally critical: Kitchen needs next-day numbers for prep
- Fix: Enable date picker, allow forward navigation up to 7 days. Query messReservations for selected date.
- Files: `web/src/pages/` Kitchen Dashboard component

---

**BUG 18 — Display Name not persisting**
- Symptom: Saves but reverts on reload. Greeting truncates at "Dr."
- Fix part 1: Verify `displayName` written to users document (not employees)
- Fix part 2: Profile load — read `displayName` from users first, fall back to `fullName`
- Fix part 3: Greeting — do not split on period character
- Files: Web profile service + EmployeeDashboard greeting logic

---

**BUG 8 — Mobile feedback: only today's pending visible**
- Fix: Query by issueStatus = "issued" AND feedbackStatus = "pending" AND issuedAt within 24hr window — not date = today
- Files: `mobile/src/services/` feedback service

---

### MEDIUM (quality and completeness)

---

**BUG 4 — Invalid Date throughout web**
- Fix: Create `web/src/utils/dateUtils.js` shared utility. Pattern: `new Date(timestamp.seconds * 1000)`
- Apply across all web components showing dates

---

**BUG 9 — Feedback Trends: average rating showing 0.0**
- Fix: In reportingSnapshotEngine — sum `rating` field values and divide by count
- Files: `functions/src/` reporting snapshot engine

---

**BUG 10 — Live Today headcount showing 0**
- Fix: Use PKT date string for today's query. Verify tenantId = "ffl" in query.
- Files: Web reporting dashboard service

---

**BUG 12 — Employee name showing "—" in User Management**
- Fix: Join users with employees on `officialEmployeeNumber` to resolve `fullName`
- Files: Web User Management component or service

---

**BUG 16 — Employee Master: no edit capability**
- Fix: Add Edit button. Direct edit: fullName, phoneNumber, department, employeeType, isActive.
- Files: Web Employee Master component

---

## 4. NEW FEATURES TO BUILD (promoted to V1 scope)

---

### FEATURE A — Proxy Booking (Supervisor books on behalf of employee)

**Screen:** Web only — mess_supervisor role, Proxy Booking sidebar item (already in sidebar, not built)

**Flow:**
1. Supervisor opens Proxy Booking screen
2. Selects employee by name or number (search)
3. Selects date from booking window
4. Selects meal type
5. Daily menu loads for that date/meal
6. Supervisor selects combo (Combo 1 or Combo 2) or Ala Carte intent for breakfast
7. Selects dining mode (Dine In / Takeaway)
8. Confirms booking

**Backend fields to set:**
- `bookingSource: "proxy"`
- `createdByRole: "mess_supervisor"`
- `createdByEmployeeNumber`: supervisor's number
- `employeeNumber`: target employee's number
- `subjectType: "self"`
- `cutoffWaived: true` (supervisor exempt from cutoff)
- `proxyOverrideUsed: true`

**Schema:** All fields already exist in messReservations — no schema change needed.

---

### FEATURE B — Walk-in Booking (Supervisor records unbooked employee who arrives at mess)

**Screen:** Web only — mess_supervisor role, Walk-in sidebar item (already in sidebar, not built)

**Flow:**
1. Supervisor opens Walk-in screen
2. Selects today's date and meal type (defaults to current active meal)
3. Searches employee by name or number
4. Daily menu loads
5. Supervisor selects item
6. Confirms

**Backend fields to set:**
- `bookingSource: "walk_in"`
- `createdByRole: "mess_supervisor"`
- `issueStatus: "issued"` — walk-in means served immediately, no pending state
- `issuedAt`: current timestamp
- `cutoffWaived: true`

**Note:** Walk-in bypasses the pending → issued lifecycle. Booking and issuance happen in one step.

---

### FEATURE C — Employee Number Normalisation on Registration

**Decision locked:** Accept both FFL-00100 and FFL00100. Strip hyphen silently before validation.

**Fix:** In web registration form and mobile LoginScreen signup — before calling the validation API, strip any hyphens from the employee number field using `.replace(/-/g, '')`.

**Files:** Web registration component + mobile `LoginScreen.js`

---

## 5. DESIGN DECISIONS LOCKED THIS SESSION

1. **Ala carte removed from employee self-booking** — both web and mobile, Single Day and Weekly
2. **Breakfast employee booking model:** One combo option + one "Ala Carte" intent label (no item selection). Employee taps Ala Carte to register intent only. Supervisor handles actual ala carte at counter.
3. **Lunch and Dinner:** Combo 1 and Combo 2 only shown to employee
4. **Employee number input:** Both XXX-00000 and XXX00000 accepted. Hyphen stripped silently before validation.
5. **Proxy booking and Walk-in promoted to V1 scope** — required for go-live

---

## 6. FLOWS CONFIRMED WORKING — DO NOT TOUCH

- Login / logout (web + mobile)
- Registration validation (correct and incorrect data)
- Pending approval + reject (web)
- Suspend / Activate user (web)
- Employee Master — view, search, filter, add employee (web)
- Menu Management — add/edit/deactivate items (web)
- Templates and Cycles management (web)
- Booking confirmation flow (web + **mobile as of 2Jun2026**)
- Cutoff enforcement (web)
- My Bookings — active and history (web + mobile)
- Cancel booking (web + mobile)
- Issuance Dashboard — issue and no-show (web)
- Kitchen Dashboard — today's data (web)
- Rate Entry — enter, fill from history, save all (web)
- Billing Dashboard — Monthly Summary, Pending Billing (web)
- Official Accounts (web)
- My Bill — itemised with Applied/Pending status (web)
- Events — create, pending review, publish, return (web admin)
- Events — employee view, RSVP, attendance details (web + mobile)
- Feedback — submit, area selection, anonymous flag (web + mobile)
- Notifications — display and read (web + mobile)
- Reporting — Weekly Bookings, Feedback Trends count, Admin Alerts (web)
- My Profile — Contact Info edit and save (web)
- Change Password (web)
- App Settings — system settings section (web, support contacts fix deployed 2Jun2026 — pending field test)

---

## 7. RECTIFICATION SEQUENCE (updated 2Jun2026)

Fix in this order to avoid dependency conflicts:

1. ~~**Bug 2**~~ ✅ FIXED — Mobile token fix
2. ~~**Bug 1 data layer**~~ ✅ VERIFIED — dailyMenus documents confirmed in Firestore
3. **Bug 19** — Web EmployeeDashboard weekly menu dashes (frontend rendering)
4. **Bug 3** — Notifications not generating
5. ~~**Bug 14**~~ ✅ FIXED — App Settings backend file restored. Field test pending.
6. **Bug 15** — Will auto-resolve after Bug 14 field test confirms save works
7. **Bug 17** — Profile pending change route
8. **Bug 18** — Display Name persistence + greeting truncation
9. **Bug 4** — Invalid Date utility function across web
10. **Bug 7** — Employee Statement role fix
11. **Bug 5** — Kitchen Dashboard date navigation
12. **Bug 12** — Employee name in User Management
13. **Bug 8** — Mobile feedback pending list
14. **Bug 9** — Feedback Trends rating aggregation
15. **Bug 10** — Live Today headcount
16. **Bug 16** — Employee Master edit panel
17. **Feature A** — Proxy Booking screen
18. **Feature B** — Walk-in Booking screen
19. **Feature C** — Employee number normalisation (quick fix)

---

## 8. FILES TO READ BEFORE EACH FIX (GDrive)

Before touching any file, read from GDrive first using `download_file_content`:

| Fix | File to read first |
|-----|--------------------|
| Bug 19 | web/src/pages/EmployeeDashboard.jsx |
| Bug 3 | functions/src/notifications/notificationService.js |
| Bug 14/15 field test | functions/src/appSettings/ service file |
| Bug 17 | Backend profile routes file |
| Bug 18 | Web profile service + EmployeeDashboard.jsx |
| Bug 4 | Create new dateUtils.js — read any one component using dates first |
| Bug 7 | Backend billing routes |
| Bug 5 | Web Kitchen Dashboard component |
| Feature A/B | messRoutes.js + messReservationService.js |

GDrive dev folder ID: `1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI`  
GDrive src folder ID: `1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0`

---

## 9. PRE-EXISTING KNOWN BUGS (from memory — not found in today's test but still open)

1. `messReservationService.isCutoffBreached` — **FIXED 2Jun2026** — UTC serviceWindowStart+5=PKT, subtract cutoffHours, compare PKT now vs PKT cutoff.
2. Booking duplicate-check not atomic — fix via deterministic doc ID (copy `eventService` attendance pattern). **Still open.**
3. `employeeService.getEmployees` + `menuService.getMenuItems` use `.limit()` then in-memory filter — will break at 50+ employees. **Still open.**
4. `notificationService` single 500-op batch on ALL_EMPLOYEES fanout. **Still open.**
5. Node.js 20 deprecated — upgrade to Node.js 22 before October 2026. **Still open.**

---

## 10. NEXT SESSION STARTING POINT

**Start with:** Bug 19 — web EmployeeDashboard weekly menu shows dashes despite correct Firestore data. Read `EmployeeDashboard.jsx` from GDrive → identify field being read → compare against actual dailyMenus document structure → fix rendering.

**Then:** Bug 3 (notifications) → Bug 14/15 field test → Bug 17 → continue sequence in Section 7.

**Backup before starting:** Run `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh`

---

## 11. BATCH 1 RECTIFICATION — 2 JUNE 2026

### What Was Fixed

**Bug 2 — Mobile token (FIXED)**
- Root cause: `api.js` read token from AsyncStorage. Firebase ID tokens expire after 1 hour.
- Fix: `auth.currentUser.getIdToken(false)` in Axios request interceptor. Auto-refreshes near expiry.
- Side effect: Bug 6 (mobile bill Rs. 0) expected to auto-resolve — needs re-test.

**PKT date bug — Android Hermes (FIXED across 9 mobile screens)**
- Root cause: Android Hermes JS engine produces Unicode characters from `toLocaleString()`. `new Date(that string)` returns Invalid Date. `getFullYear()` returns NaN → "NaN-NaN-NaN" → fails YYYY-MM-DD regex on backend.
- Fix: Replaced all `toLocaleString('en-US', { timeZone: 'Asia/Karachi' })` patterns with pure UTC+5 arithmetic: `new Date(date.getTime() + 5 * 60 * 60 * 1000)` then `getUTC*` getters.
- Files fixed: AccountsHomeScreen, AdminHomeScreen, WeeklyBookingScreen, EmployeeHomeScreen (×3 instances), BookMealScreen, EventsScreen, MyBookingsScreen, ManagerHomeScreen, SupervisorHomeScreen.

**messReservationService.js — backend date bugs (FIXED)**
- `todayStr` in `createSelfBooking`, `createProxyBooking`, `cancelReservation` — all used `toISOString()` (UTC). At midnight PKT, server thought it was still yesterday.
- Fix: `pktDateStr()` helper function added. Uses `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` then extracts components — safe on Node.js server (only Hermes has the Unicode issue).
- `isCutoffBreached` — `setHours` on UTC stored values. Fix: convert stored UTC `serviceWindowStart` to PKT (+5hrs), subtract `cutoffHours`, compare PKT now vs PKT cutoff.

**appSettingsService.js — misplaced web file (FIXED)**
- Web frontend file accidentally placed in `functions/src/appSettings/` — contained `import` ES module syntax, crashed Firebase Functions deployment.
- Fix: Correct backend `appSettingsService.js` restored (uses `require()`, `getFirestore('servio-dev')`).

**WeeklyBookingScreen — combo chip dish name (FIXED)**
- Combo chips showed "Combo 1" / "Combo 2" only.
- Fix: Added `combo.comboName` rendering below `combo.displayLabel` with `comboChipName` / `comboChipNameActive` styles.

### Booking Confirmed E2E
Web Issuance Dashboard — 2 Jun 2026 19:40 PKT:
- Employee: Dr. HUMAYUN SHAHZAD / FFL00100
- Item: Qeema Karailay Combo / Combo 2
- Type: Self | Mode: Dine-in | Status: Pending ✅

---

*Report updated: 2 June 2026 — Batch 1 rectification session*