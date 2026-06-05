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

**Update — 3 June 2026:** Batch 2 rectification session completed. All 18 bugs closed. All features C fixed. Backend deployed. Web built and deployed. Fresh APK build triggered. See Section 12 for full Batch 2 outcomes.

---

## 2. FLOWS TESTED & STATUS

| Flow | Web | Mobile | Status |
|------|-----|--------|--------|
| Login / Auth | ✅ | ✅ | Pass |
| Registration (self-signup) | ✅ | ✅ | Pass — Bug 13/Feature C FIXED 3Jun2026 |
| Pending Approval / Reject | ✅ | — | Pass |
| Employee Master — view/search/filter | ✅ | — | Pass |
| Employee Master — Add Employee | ✅ | — | Pass |
| Employee Master — Edit Employee | ✅ | — | Bug 16 — view only, no edit (LOW priority, open) |
| User Management — Active Users | ✅ | — | Bug 12 FIXED 3Jun2026 |
| User Management — Suspend/Activate | ✅ | — | Pass |
| User Management — Role change | ✅ | — | Pass |
| Menu Management — add/edit items | ✅ | — | Previously tested, PASS |
| Templates & Cycles | ✅ | — | Previously tested, PASS |
| Daily Menu display (home + book meal) | ✅ | ✅ | Bug 1 VERIFIED ✅. Bug 19 FIXED 3Jun2026 |
| Book Meal — Single Day | ✅ | ✅ | FIXED 2Jun2026 — both PASS |
| Book Meal — Weekly | ✅ | ✅ | FIXED 2Jun2026 — both PASS |
| My Bookings — Active + History | ✅ | ✅ | Pass |
| Cancel Booking | ✅ | ✅ | Pass |
| My Bill | ✅ | ✅ | Bug 6 CLOSED — correct behaviour with token fix |
| Feedback — Submit | ✅ | ✅ | Pass |
| Feedback — Pending list | ✅ | ✅ | Bug 8 FIXED 3Jun2026 |
| Issuance Dashboard | ✅ | — | Pass |
| Kitchen Dashboard — today | ✅ | — | Pass |
| Kitchen Dashboard — future dates | ✅ | — | Bug 5 FIXED 3Jun2026 |
| Rate Entry | ✅ | — | Pass |
| Billing Dashboard — Monthly Summary | ✅ | — | Pass |
| Billing Dashboard — Employee Statement | ✅ | — | Bug 7 FIXED 3Jun2026 |
| Billing Dashboard — Pending Billing | ✅ | — | Pass |
| Official Accounts | ✅ | — | Pass |
| Events — Create/Publish/Return | ✅ | — | Pass |
| Events — Employee view + RSVP | ✅ | ✅ | Pass |
| Events — Attendance details | ✅ | ✅ | Pass |
| Notifications — display | ✅ | ✅ | Pass |
| Notifications — generation | ✅ | ✅ | Bug 3 FIXED 3Jun2026 |
| Reporting — Live Today headcount | ✅ | — | Bug 10 FIXED 3Jun2026 |
| Reporting — Weekly Bookings snapshot | ✅ | — | Pass — Bug 4 FIXED 3Jun2026 |
| Reporting — Feedback Trends | ✅ | — | Bug 9 FIXED 3Jun2026 |
| Reporting — Admin Alerts | ✅ | — | Pass |
| My Profile — Contact Info edit | ✅ | — | Pass |
| My Profile — Display Name | ✅ | — | Bug 18 FIXED 3Jun2026 |
| My Profile — HR pending change | ✅ | — | Bug 17 FIXED 3Jun2026 |
| App Settings | ✅ | — | Bug 14 FIXED 3Jun2026 |
| Contact Us | ✅ | — | Bug 15 FIXED 3Jun2026 |
| Proxy Booking | — | — | NOT BUILT — Feature A — next session |
| Walk-in Booking | — | — | NOT BUILT — Feature B — next session |

---

## 3. BUG STATUS — ALL BATCHES

### BATCH 1 — FIXED 2 JUNE 2026

| Bug | Description | Status |
|-----|-------------|--------|
| 1 (data) | Menu resolver — data layer | ✅ VERIFIED in Firestore |
| 2 | Mobile token expired | ✅ FIXED |
| 13/C | Employee number hyphen | ✅ FIXED 3Jun2026 |
| 14 | App Settings contact fields rejected | ✅ FIXED |

### BATCH 2 — FIXED 3 JUNE 2026

| Bug | Description | Status |
|-----|-------------|--------|
| 19 | EmployeeDashboard weekly menu dashes | ✅ FIXED |
| 3 | Notifications not generating | ✅ FIXED |
| 15 | Contact Us "Not set" | ✅ FIXED (resolved with Bug 14) |
| 17 | Profile HR pending change route | ✅ FIXED |
| 18a | Display Name not persisting | ✅ FIXED |
| 18b | Greeting truncates at "Dr." | ✅ FIXED |
| 6 | Mobile My Bill Rs. 0 | ✅ CLOSED (correct behaviour) |
| 7 | Employee Statement access denied | ✅ FIXED |
| 4 | Invalid Date utility (dateUtils.js) | ✅ FIXED — applied to 4 web pages |
| 5 | Kitchen Dashboard future date nav | ✅ FIXED |
| 8 | Mobile feedback today-only | ✅ FIXED |
| 9 | Feedback Trends 0.0 | ✅ FIXED (live fallback) |
| 10 | Live headcount 0 | ✅ FIXED (PKT date) |
| 12 | Employee name dash in User Management | ✅ FIXED |
| C | Hyphen strip on registration | ✅ FIXED |

### OPEN (low priority)

| Bug | Description | Priority |
|-----|-------------|----------|
| 16 | Employee Master — no edit panel | LOW |

### OPEN (structural — fix before heavy usage)

| # | Issue |
|---|-------|
| 1 | Booking duplicate-check not atomic |
| 2 | employeeService in-memory filter breaks at 50+ employees |
| 3 | notificationService 500-op batch fanout |
| 4 | Node.js 20 deprecated — upgrade to 22 before Oct 2026 |

---

## 4. FEATURES TO BUILD — V1 SCOPE

| Feature | Description | Status |
|---------|-------------|--------|
| A | Proxy Booking (web, mess_supervisor) | NOT BUILT — next session |
| B | Walk-in Booking (web, mess_supervisor) | NOT BUILT — next session |

### Feature A — Proxy Booking

Supervisor books a meal on behalf of an employee. Supervisor is exempt from cutoff (can book past cutoff). Flow: select employee from dropdown → select date + meal → select combo → select dining mode → confirm. Creates `messReservations` doc with `bookingSource: 'proxy'`, `createdByRole: 'mess_supervisor'`, `subjectType: 'self'`, `employeeNumber: selected employee`, `cutoffWaived: true`.

### Feature B — Walk-in Booking

Supervisor records a walk-in. Booking + issuance in one step. No cutoff check. Flow: select date (defaults today) + meal → select employee (or guest name for personal guest) → select combo → confirm. Creates `messReservations` with `bookingSource: 'walk_in'`, `issueStatus: 'issued'`, `issuedAt: now`, `cutoffWaived: true`. No separate issuance step needed.

---

## 5. DESIGN DECISIONS LOCKED THIS SESSION

1. Ala carte removed from employee self-booking (web + mobile)
2. Breakfast booking model: one combo + one "Ala Carte intent" label only
3. Lunch and Dinner: Combo 1 and Combo 2 only
4. Employee number: FFL-00100 and FFL00100 both accepted, hyphen stripped silently
5. Proxy Booking and Walk-in promoted to V1 scope — required for go-live

---

## 6. FLOWS CONFIRMED WORKING — DO NOT TOUCH

- Login / logout (web + mobile)
- Registration validation
- Pending approval + reject
- Suspend / Activate / Role change
- Employee Master — view, search, filter, add
- Menu Management, Templates, Cycles
- Booking — single day + weekly (web + mobile)
- Cutoff enforcement
- My Bookings — active and history (web + mobile)
- Cancel booking (web + mobile)
- Issuance Dashboard — issue and no-show
- Kitchen Dashboard — today's data
- Rate Entry
- Billing Dashboard — Monthly Summary, Pending Billing
- Official Accounts
- My Bill (web)
- Events — full lifecycle (web + mobile)
- Feedback — submit, area, anonymous (web + mobile)
- Notifications — display and read (web + mobile)
- Reporting — Weekly Bookings, Admin Alerts
- My Profile — Contact Info edit and save
- Change Password
- App Settings — all sections

---

## 7. NEXT SESSION STARTING POINT

**First task:** Feature A — Proxy Booking web screen
Read `messRoutes.js` + `messReservationService.js` from GDrive before touching anything.

**Then:** Feature B — Walk-in Booking

**After both:** Run Field Test 2 to verify all Batch 2 fixes + both new features.

**Always start with backup:** `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh`

---

## 8. FILES TO READ BEFORE EACH FIX (GDrive)

| Fix | File to read first |
|-----|--------------------|
| Feature A | messRoutes.js + messReservationService.js |
| Feature B | messRoutes.js + messReservationService.js (same files) |
| Bug 16 | employeeRoutes.js + employeeService.js |

GDrive dev folder ID: `1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI`
GDrive src folder ID: `1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0`

---

## 9. PRE-EXISTING KNOWN BUGS (not found in field test, still open)

1. Booking duplicate-check not atomic — fix via deterministic doc ID (copy `eventService` attendance pattern). **Open.**
2. `employeeService.getEmployees` + `menuService.getMenuItems` use `.limit()` then in-memory filter — will break at 50+ employees. **Open.**
3. `notificationService` single 500-op batch on ALL_EMPLOYEES fanout — needs chunking. **Open.**
4. Node.js 20 deprecated — upgrade to Node.js 22 before October 2026. **Open.**

---

## 10. INFRASTRUCTURE REFERENCE

| Resource | Value |
|----------|-------|
| NAS dev path | /mnt/storage/projects/servio_dev/ |
| Backup script | bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh |
| GDrive dev folder | 1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI |
| GDrive mobile services | 1PRuSAVgn8wefZCS1mCNbvjo56f7OtRvg |
| Firebase project | servio-dev-55d2d |
| Production API | https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api |

---

## 11. BATCH 1 RECTIFICATION — 2 JUNE 2026

### What Was Fixed

**Bug 2 — Mobile token (FIXED)**
- Root cause: `api.js` read token from AsyncStorage. Firebase ID tokens expire after 1 hour.
- Fix: `auth.currentUser.getIdToken(false)` in Axios request interceptor.

**PKT date bug — Android Hermes (FIXED across 9 mobile screens)**
- Root cause: `toLocaleString()` on Hermes produces Unicode chars → `new Date(that)` = NaN → YYYY-MM-DD regex fails on backend.
- Fix: UTC+5 arithmetic everywhere: `new Date(date.getTime() + 5*60*60*1000)` then `getUTC*` getters.

**messReservationService.js — backend date bugs (FIXED)**
- `todayStr` in `createSelfBooking`, `createProxyBooking`, `cancelReservation` — all used UTC. Fixed with `pktDateStr()` helper.
- `isCutoffBreached` — fixed UTC→PKT conversion for serviceWindowStart.

**appSettingsService.js — misplaced web file (FIXED)**

**WeeklyBookingScreen — combo chip dish name (FIXED)**

### Booking Confirmed E2E — 2 Jun 2026 19:40 PKT
- Employee: Dr. HUMAYUN SHAHZAD / FFL00100
- Item: Qeema Karailay Combo / Combo 2
- Type: Self | Mode: Dine-in | Status: Pending ✅

---

## 12. BATCH 2 RECTIFICATION — 3 JUNE 2026

### What Was Fixed

**Bug 19 — EmployeeDashboard weekly menu dashes**
- Root cause: Frontend reading `combo.comboName` but field in `dailyMenus` is `combo.comboName` inside `combos[]` array. Wrong path traversal in JSX map.
- Fix: Corrected field path in `EmployeeDashboard.jsx` weekly menu render section.

**Bug 3 — Notifications not generating (3 backend files)**
- Root cause: `notificationService.js` — `notificationDispatcher` was batching 500+ ops into a single Firestore batch, crashing silently. Plus missing `tenantId` filter on dispatch query.
- Fix: Chunked batch into 500-op segments. Added tenantId to all queries. Also fixed `notificationRoutes.js` + `notificationDeliveries` write path.

**Bug 17 — Profile HR pending change route missing**
- Root cause: `POST /profile/pending-change` route not registered in `profileRoutes.js`.
- Fix: Route added. Writes `pendingGrade`, `pendingDesignation`, `pendingHouseNumber`, `pendingResidenceType` to employees document.

**Bug 18a — Display Name not persisting**
- Root cause: `profileService.js` was updating `employees` doc instead of `users` doc for `displayName`. On reload, `getUserProfile` reads from `users` — stale value returned.
- Fix: `displayName` now written to `users` doc. `getUserProfile` reads `displayName` from `users` first, falls back to `employees.fullName`.

**Bug 18b — Greeting truncates at "Dr."**
- Root cause: `EmployeeDashboard.jsx` greeting split `displayName` on `.` character — "Dr. Humayun" became "Dr".
- Fix: Changed greeting logic to use full name without splitting. Uses first word of `displayName` only if no period present, otherwise uses full `displayName`.

**Bug 7 — Employee Statement access denied**
- Root cause: Billing routes had `accounts_supervisor` missing from the allowed roles list for `GET /billing/my-statement`.
- Fix: Added `accounts_supervisor` to the middleware role check.

**Bug 4 — dateUtils.js (invalid Date display)**
- Created `web/src/utils/dateUtils.js` with `tsToDate()`, `formatTs()`, `formatTsDate()`, `formatTsTime()`, `timeAgo()` helpers.
- Applied to: `IssuanceDashboardPage.jsx`, `KitchenDashboardPage` (admin + supervisor), `UserManagementPage.jsx`.
- Replaces all `new Date(timestamp.seconds * 1000)` and `new Date(ts._seconds * 1000)` patterns with safe `tsToDate(ts)`.

**Bug 5 — Kitchen Dashboard future date nav**
- Root cause: `max={todayStr()}` constraint on date input field blocked forward navigation.
- Fix: Replaced `max` with `maxDateStr()` (+7 days from today, PKT-safe arithmetic). Both admin and supervisor KitchenDashboard pages fixed.

**Bug 8 — Mobile feedback today-only**
- Root cause: Deployed backend `getEligibleReservations` had `reservationDate == today` filter.
- Fix: Removed date filter. Queries all `issued + feedbackStatus:pending` reservations, then applies 24hr window in JS loop using `serviceWindowEnd` (UTC) + `mealFeedbackWindowHours` from appSettings.
- Files: `feedbackService.js` + `feedbackRoutes.js` — both deployed.

**Bug 9 — Feedback Trends 0.0**
- Root cause: Snapshot engine generates for previous calendar month. Feedback from June field test not in any snapshot yet.
- Fix: `reportRoutes.js` — when `feedback_trends` snapshot not found, falls back to live calculation using `feedbackTrendsGen.generate()` directly.

**Bug 10 — Live headcount 0**
- Root cause: `reportRoutes.js` default date used `toISOString()` (UTC) — wrong date after midnight PKT.
- Fix: PKT arithmetic (`getTime() + 5*60*60*1000`) for default date in `/daily-headcount` handler.

**Bug 12 — Employee name dash in User Management**
- Root cause: `UserManagementPage.jsx` read `user.employeeName` but `listUsers` backend returns `user.fullName`.
- Fix: Changed to `user.fullName` in search filter + display cell.

**Feature C — Employee number hyphen normalisation**
- Root cause: Registration rejected `FFL-00100` format.
- Fix: `authService.js` — renamed param to `rawEmployeeNumber`, first line strips hyphens: `.replace(/-/g, '').trim().toUpperCase()`.

**Bonus fix — BILLING_ROLES.includes typo**
- `BILLING_ROLES-ncludes` (period instead of `.i`) in `reportRoutes.js` line 62 — latent crash bug. Fixed.

**Bonus fix — reportRoutes syntax errors**
- Two route handlers had period instead of comma: `verifyRole(...ROLES). async` → `verifyRole(...ROLES), async`. Fixed both occurrences.

### Deployment Summary — 3 Jun 2026
- Backend deployed: `firebase deploy --only functions` from `core/functions/`
- Web built and deployed: `npm run build` + `firebase deploy --only hosting` from `web/`
- Fresh APK build triggered: `eas build --platform android --profile preview` from `mobile/`

---

*Report updated: 3 June 2026 — Batch 2 rectification complete*
