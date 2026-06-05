# Servio — Project Command Board

**Product:** Servio — Club Management Platform
**Company:** HomiLabs Solutions SMC Pvt Ltd
**Client:** FFL Management Club
**Stack:** Node.js + Express (Firebase Cloud Functions) | React/Vite (web) | Expo React Native (mobile) | Firebase Firestore + Auth
**Firebase:** servio-dev-55d2d
**GitHub:** AwaizFatima08/servio_dev
**NAS Path:** /mnt/storage/projects/servio_dev/
**Last Updated:** 4 June 2026
**Last Backup:** pending — run before next session

---

## CURRENT STATUS

**ALL BUGS 1–19 CLOSED ✅**
**BACKEND: DEPLOYED ✅**
**WEB: BUILT + DEPLOYED ✅**
**APK BUILD: IN PROGRESS** (EAS build triggered 4 Jun 2026)
**NEXT ACTION: Live test Feature A + B → Bug 16 (Employee Master edit)**

---

## NEXT SESSION — STARTING POINT

**Before anything:** `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh`

**Task 1 — Feature A: Proxy Booking (web)**
Supervisor books a meal on behalf of an employee. Exempt from cutoff.
- Select employee from dropdown → date + meal → combo → dining mode → confirm
- Creates `messReservations` with: `bookingSource: 'proxy'`, `createdByRole: 'mess_supervisor'`, `subjectType: 'self'`, `employeeNumber: selected`, `cutoffWaived: true`

**Task 2 — Feature B: Walk-in Booking (web)**
Supervisor records walk-in. Booking + issuance in one step. No cutoff check.
- Select date (today default) + meal → employee or guest name → combo → confirm
- Creates `messReservations` with: `bookingSource: 'walk_in'`, `issueStatus: 'issued'`, `issuedAt: now`, `cutoffWaived: true`

**Backlog (after A + B):**
- Bug 16 — Employee Master edit panel (LOW)
- Atomic booking dupe-check — deterministic doc ID, copy `eventService` pattern
- Node.js 20 → 22 upgrade (before 30 Oct 2026)

---

## OPEN ITEMS

| # | Item | Priority | Notes |
|---|------|----------|-------|
| A | Feature A — Proxy Booking (web) | DONE — pending live test |
| B | Feature B — Walk-in (web)       | DONE — pending live test |
| 16 | Bug 16 — Employee Master edit panel | LOW | View-only currently |
| — | Atomic booking dupe-check | MEDIUM | Deterministic doc ID |
| — | Node.js 20 → 22 upgrade | MEDIUM | Deadline 30 Oct 2026 |

### Pre-existing structural bugs (fix before heavy usage)

| # | Issue |
|---|-------|
| S1 | Booking duplicate-check not atomic — copy `eventService` deterministic doc ID pattern |
| S2 | `employeeService` + `menuService` `.limit()` then in-memory filter — breaks at 50+ employees |
| S3 | `notificationService` 500-op batch on ALL_EMPLOYEES fanout — needs chunking |
| S4 | Node.js 20 deprecated — upgrade to 22 before 30 Oct 2026 |

---

## BUG HISTORY — ALL CLOSED

### Web UI Bugs — Fixed 4 Jun 2026
| Bug | Description |
|-----|-------------|
| W1 | Arrow corruption after "Book your first meal" |
| W2 | Greeting name truncated + last char stripped by regex |
| W3 | Hardcoded trailing dot in greeting JSX |
| W4 | Weekly menu separator corruption (Â·) |
| W5 | Weekly menu text truncated (CSS nowrap) |
| W6 | Ala carte items visible to employee in Book Meal |
| W7 | CTA mentioned "ala carte" after W6 fix |
| W8 | Â· in reservation card mode separator |
| W9 | Timing dashes showed â |
| W10 | Loading ellipsis showed â¦ |

### Batch 2 — Fixed 3 Jun 2026
| Bug | Description |
|-----|-------------|
| 19 | EmployeeDashboard weekly menu showed dashes |
| 3 | Notifications not generating |
| 15 | Contact Us showed "Not set" |
| 17 | Profile HR pending-change route not found |
| 18a | Display Name not persisting |
| 18b | Greeting truncated at "Dr." |
| 6 | Mobile My Bill Rs. 0 (correct behaviour — closed) |
| 7 | Employee Statement: accounts_supervisor denied |
| 4 | Invalid Date — dateUtils.js created, applied to 4 web pages |
| 5 | Kitchen Dashboard future date nav disabled |
| 8 | Mobile feedback: only today's meals visible |
| 9 | Feedback Trends rating showed 0.0 |
| 10 | Live today headcount showed 0 |
| 12 | Employee name showed "—" in User Management |
| C | Employee number hyphen normalisation |

### Batch 1 — Fixed 2 Jun 2026
| Bug | Description |
|-----|-------------|
| 2 | Mobile token expired after 1hr |
| PKT | Android Hermes NaN dates — 9 mobile screens |
| mess | messReservationService todayStr UTC bug + isCutoffBreached PKT fix |
| misc | appSettingsService.js misplaced, WeeklyBookingScreen combo chips, booking E2E |
| 14 | appSettings contact fields rejected |
| 1 | dailyMenus data layer verified |

---

## V1 BACKEND — ALL FLOWS DEPLOYED

| Flow | Description | Status |
|------|-------------|--------|
| 01 | Identity — register, approve, profile, user management | COMPLETE |
| 02 | Employee Master — add, list, get, status | COMPLETE |
| 03 | Menu Catalogue — foodTypes, mealTypes, menuItems CRUD | COMPLETE |
| 04 | Templates + Cycles | COMPLETE |
| 05 | Reservation Settings | COMPLETE |
| 06 | Mess Reservations + Issuance | COMPLETE |
| 07 | Rate Entry | COMPLETE |
| 08 | Feedback | COMPLETE |
| 09 | Notifications | COMPLETE |
| 10 | Events + Attendance | COMPLETE |
| 11 | Reporting Dashboard | COMPLETE |
| 14 | Billing Dashboard | COMPLETE |
| 15 | Kitchen Dashboard | COMPLETE |
| — | Profile (get, update pending model) | COMPLETE |
| — | App Settings (get, update) | COMPLETE |
| — | menuResolver — nightly CF, 23:50 PKT, 7-day generation | DEPLOYED |

**Deferred:** Flow 12 (Café/TuckShop/Bakery/TeaBar) → V1.1 | Flow 13 (BBQ) → V1.2

---

## V1 WEB FRONTEND — ALL 20 SCREENS COMPLETE

Deployed at: https://servio-dev-55d2d.web.app

| # | Screen | Role |
|---|--------|------|
| 1 | Login + Registration + Password Reset | All |
| 2 | Employee Home Dashboard + Book a Meal | Employee |
| 3 | Supervisor — Issuance Dashboard | Mess Supervisor |
| 4 | Supervisor — Kitchen Dashboard | Mess Supervisor |
| 5 | Accounts — Rate Entry | Accounts Supervisor |
| 6 | Accounts — Billing Dashboard | Accounts Supervisor |
| 7 | Admin — Employee Master | Admin |
| 8 | Admin — Menu Management | Admin/Manager |
| 9 | Admin — Templates + Cycles | Admin/Manager |
| 10+11 | Events — Management + Employee Response | Admin/Manager/Employee |
| 12 | Admin — Reporting Dashboard | Manager/Admin |
| 13 | Admin — User Management + Approvals | Admin |
| 14 | Admin — Notification Centre | Admin |
| 15 | Employee — My Bookings + History | Employee |
| 16 | Employee — My Bill | Employee |
| 17 | Employee — Feedback | Employee |
| 18 | Employee — Notifications | Employee |
| 19 | Admin — App Settings | Admin |
| 20 | All Roles — My Profile | All |

---

## V1 MOBILE APP — ALL SCREENS COMPLETE

| Screen | File | Status |
|--------|------|--------|
| Login | auth/LoginScreen.js | COMPLETE |
| Employee Home | employee/EmployeeHomeScreen.js | COMPLETE |
| Book Meal | employee/BookMealScreen.js | COMPLETE |
| Weekly Booking | employee/WeeklyBookingScreen.js | COMPLETE |
| My Bookings | employee/MyBookingsScreen.js | COMPLETE |
| More | employee/MoreScreen.js | COMPLETE |
| Notifications | employee/NotificationsScreen.js | COMPLETE |
| Feedback | employee/FeedbackScreen.js | COMPLETE |
| My Bill | employee/MyBillScreen.js | COMPLETE |
| Events | employee/EventsScreen.js | COMPLETE |
| Event Attendance | employee/EventAttendanceScreen.js | COMPLETE |
| Profile | employee/ProfileScreen.js | COMPLETE |
| Contact Us | employee/ContactUsScreen.js | COMPLETE |
| Supervisor Home | supervisor/SupervisorHomeScreen.js | COMPLETE |
| Accounts Home | accounts/AccountsHomeScreen.js | COMPLETE |
| Manager Home | manager/ManagerHomeScreen.js | COMPLETE |
| Admin Home | admin/AdminHomeScreen.js | COMPLETE |

**Proxy Booking + Walk-in screens: NOT YET BUILT — Feature A + B, next session**

---

## DEPLOYMENT STATUS

| Item | Status | Detail |
|------|--------|--------|
| Backend — Cloud Functions | DEPLOYED | asia-south1, Node.js 20 |
| Backend — menuResolver | DEPLOYED | 23:50 PKT nightly |
| Web App | DEPLOYED | https://servio-dev-55d2d.web.app |
| Firestore Security Rules | DEPLOYED | allow read, write: if false |
| Firestore Indexes | DEPLOYED | 16 composite indexes |
| Mobile Dev APK | INSTALLED | S23 Ultra |
| Mobile Production APK | NOT BUILT | After Feature A+B + sign-off |

---

## INFRASTRUCTURE

| Resource | Value |
|----------|-------|
| NAS dev path | /mnt/storage/projects/servio_dev/ |
| Backup script | bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh |
| GDrive dev folder | 1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI |
| GDrive src folder | 1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0 |
| GDrive 3Jun backup | 1pp64Zai8ocuF30ZA4maVY8gIjsDoMkTx |
| GDrive mobile services | 1PRuSAVgn8wefZCS1mCNbvjo56f7OtRvg |
| Firebase project | servio-dev-55d2d |
| Web API key | AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o |
| Production API | https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api |
| Emulator | http://127.0.0.1:5001/servio-dev-55d2d/asia-south1/api |
| Mobile build | eas build --platform android --profile preview |
| Web deploy | npm run build (in web/) → firebase deploy --only hosting |
| Functions deploy | firebase deploy --only functions (in core/functions/) |

---

## KEY TECHNICAL RULES (never break)

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`
2. **PKT mobile:** `new Date(date.getTime() + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` on mobile (Hermes → NaN)
3. **PKT backend:** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` safe on Node.js
4. **serviceWindowStart** stored as UTC in Firestore (e.g. "01:00" = 06:00 PKT)
5. **Read before writing:** always download from GDrive before editing; additive only
6. **Tenant isolation** on every Firestore operation
7. **camelCase throughout** — collections, fields, code
8. **verifyRole** is a factory: `verifyRole(ROLES.X)` — never direct middleware; sets `req.userRole`, `req.tenantId`, `req.officialEmployeeNumber`
9. **Route ordering:** specific before parameterised (e.g. `/cycles/active` before `/:id`)
10. **All responses:** `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`
11. **No `FieldValue.serverTimestamp()`** in services — use `new Date()`
12. **`db.settings()`** called once only in `index.js` — never in service files

---

## TEST USERS

| Employee # | Role | Name |
|------------|------|------|
| FFL00001 | admin | — (pendingDesignation set during testing — clear if unintended) |
| FFL00002 | employee | — |
| FFL00003 | employee | — |
| FFL00004 | mess_supervisor | Tasawwar Alam |
| FFL00005 | manager | Muhammad Jahangir |
| FFL00006 | employee | Qasim Ejaz |
| FFL00100 | employee | Dr. Humayun Shahzad |

**Token refresh (testing):**
```bash
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o" -H "Content-Type: application/json" -d '{"email":"admin@fatima-group.com","password":"1234@com","returnSecureToken":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

---

## FLOWS CONFIRMED WORKING — DO NOT TOUCH

- Login / logout (web + mobile)
- Registration + approval + reject
- Employee Master (view, search, add)
- User Management (suspend, activate, role change)
- Menu Management + Templates + Cycles
- Booking — single day + weekly (web + mobile)
- Cutoff enforcement
- My Bookings + cancel (web + mobile)
- Issuance Dashboard + Kitchen Dashboard
- Rate Entry + Billing Dashboard + My Bill
- Events — full lifecycle (web + mobile)
- Feedback (web + mobile)
- Notifications (web + mobile)
- Reporting (headcount, weekly, feedback trends, admin alerts)
- My Profile + Change Password
- App Settings + Contact Us

---

## ROLLOUT PLAN

| Phase | Who | Status |
|-------|-----|--------|
| Phase 1 | Internal team — Homi, Awaiz, Hadi | IN PROGRESS |
| Phase 2 | Controlled FFL employee group | After Feature A+B + sign-off |
| Phase 3 | Full FFL management club | After Phase 2 stable |

---

## PARKED / DEFERRED

- V1.1: Café, TuckShop, Bakery, TeaBar, family member flow
- V1.2: BBQ
- V2: Guest House, BOQ, Library, suggestion box
- V3: Sports, SMS/email/WhatsApp notifications, kiosk, interactive menu + dish photos
- V4: Recipe + Inventory + Procurement, automated rates
- Template deactivation — admin requested, not built
- Custom domain `servio.homilabs.org` — decision pending
- Play Store production APK — after Feature A+B + sign-off
- Weekly booking residenceType restriction removal — backend fix pending

---

## mealTypes UTC Times (Firestore)

| Meal | serviceWindowStart (UTC) | serviceWindowEnd (UTC) | Cutoff (3hrs before start) |
|------|--------------------------|------------------------|----------------------------|
| breakfast | 01:00 | 04:00 | 22:00 previous day |
| lunch | 08:00 | 10:00 | 05:00 |
| dinner | 14:00 | 17:00 | 11:00 |

---

## UPDATE LOG

### 4 Jun 2026 — Feature A + B + APK Rebuild (Session 2)

**Feature A — Proxy Booking (web) — COMPLETE**
- New page: ProxyBookingPage.jsx + ProxyBookingPage.module.css
- 4-step flow: Employee search → Date & Meal → Menu → Confirm
- Employee search: type-to-search on name + officialEmployeeNumber, 300ms debounce
- Combos only (no ala carte). cutoffWaived: true. bookingSource: 'proxy'
- Success screen with booking reference

**Feature B — Walk-in (web) — COMPLETE**
- New page: WalkInPage.jsx + WalkInPage.module.css
- Single-form flow: Date + Meal + Subject + Employee/Guest + Menu + Mode → Submit
- Subject toggle: Employee (search) or Guest (free-text name)
- Booking + issuance in one step: issueStatus: 'issued', bookingSource: 'walk_in', cutoffWaived: true
- Defaults to today + current meal slot (PKT time-based)
- Success screen confirms "Walk-in Issued"

**Other changes**
- messService.js: getEmployees() function added (GET /employees?search=&limit=30)
- App.jsx: ProxyBookingPage + WalkInPage imported, ComingSoon placeholders replaced
- Web built + deployed: https://servio-dev-55d2d.web.app
- APK rebuild triggered via EAS (preview profile)

**Status:** Web deployed. APK build in progress. Pending: live test on S23 Ultra.

### 4 Jun 2026 — Web UI Bug Fix Session
- 10 web character encoding + UI bugs fixed (W1–W10) in EmployeeDashboard.jsx, EmployeeDashboard.module.css, BookMealPage.jsx
- Ala carte removed from employee self-booking (web) — decision locked
- Web deployed; backup pending

### 3 Jun 2026 — Batch 2 Rectification
- Bugs 19, 3, 15, 17, 18a, 18b, 6, 7, 4, 5, 8, 9, 10, 12, C — all closed
- dateUtils.js created and applied across 4 web pages
- Backend deployed, web built + deployed, APK build triggered

### 2 Jun 2026 — Batch 1 Rectification
- Mobile booking pipeline operational — PKT date fix, token refresh, cutoff fix
- Bugs 2, 14 fixed; booking E2E confirmed

### 31 May 2026 — Full Mobile Build
- All mobile screens built and tested (all roles)
- menuResolver deployed

### 22–29 May 2026 — Initial Build
- All 20 web screens + all backend flows built and deployed
