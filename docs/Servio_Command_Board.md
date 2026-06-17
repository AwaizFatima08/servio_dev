# Servio — Project Command Board
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: ffl) |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Stack | Node.js + Express (Firebase Cloud Functions) \| React/Vite (Web) \| Expo React Native (Mobile) \| Firestore + Auth |
| Firebase (dev) | servio-dev-55d2d |
| Firebase (prod) | servio-prod-3a6de |
| GitHub | AwaizFatima08/servio_dev |
| NAS Path | /mnt/storage/projects/servio_dev/ |
| Last Updated | 15 June 2026 |
| Last Backup | Due — run before closing this session |

---

## 🎉 MILESTONE — 15 June 2026

**DEV / PROD SEPARATION COMPLETE — PROD STOOD UP AND FROZEN FOR 15-DAY TEST RUN**

A dedicated production Firebase project (`servio-prod-3a6de`) was created and fully stood up, separate from dev (`servio-dev-55d2d`). Web and mobile configs were made environment-based (`.env` driven). Backend functions and web hosting deployed to prod and verified on an empty system. Employees (343) and menuItems copied dev→prod. Custom domain `servio.homilabs.org` configured (CNAME in Hostinger, authorized domain added in Firebase) — awaiting DNS propagation/SSL, to be tested 16 June.

**Prod is now FROZEN at V1 (Enhancement web build) for a ~15-day test run.** Development continues on dev. V1 Extension build resumes on dev. See Section 15 for full detail and the carry-forward items.

---

## 🎉 MILESTONE — 9 June 2026

**V1 Core + V1 Enhancement — WEB COMPLETE AND FIELD TESTED**

All 20 web screens live. All V1 Enhancement features (F1–F8 + Guest Approvals) developed, deployed, and field tested. All bugs resolved. System stable and ready for Phase 2 controlled rollout.

**V1 Extension Design — V1.1 through V1.4 FULLY LOCKED**

Complete design discussion completed for Family CRUD, Café, Outdoor Mini Café, Tea Bar, Tuck Shop, and BBQ. All decisions locked. Ready to begin V1.1 build after mobile F1/F2 update complete.

---

## 1. Current Status

**PHASE: PROD frozen for 15-day test run · DEV continues → V1 Extension build resumes**

Dev and prod are now separated. **Prod (`servio-prod-3a6de`)** holds the frozen V1 build for a ~15-day test run with ~15 testers, running parallel to manual club operations. After the test run, prod data is wiped and prod relaunches as real production. **Dev (`servio-dev-55d2d`)** remains Homi's workbench — all development continues here.

**Immediate (16 June):** test the prod custom domain `servio.homilabs.org/login` once DNS/SSL has propagated.

**Then (dev onward):** resume V1 Extension — beginning with V1.1 Family CRUD build. The earlier "Mobile F1/F2" item is still open but is now sequenced alongside the test-run period; V1 Extension work proceeds on dev in parallel with the prod test run.

**Still deferred for prod (next prod session):** admin/super_admin bootstrap in prod, manager recreates menu cycle in prod (his test experience), 15 testers register fresh in prod.

---

## 2. Next Session — Starting Point

Always run backup before starting:

```bash
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh
```

### Immediate Work Order (Priority Order)

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | Test prod custom domain `servio.homilabs.org/login` | Prod (web) | After DNS propagation + SSL (16 June). Confirm loads + login reaches prod backend |
| 2 | Resume V1.1 Family CRUD build | Backend + Web + Mobile (dev) | Main development thread — proceeds on dev during prod test run |
| 3 | Mobile F1 — Employee BF ala carte self-serve | Mobile (Expo, dev) | BookMealScreen.js — matches web implementation |
| 4 | Mobile F2 — Supervisor proxy/walk-in BF ala carte | Mobile (Expo, dev) | After F1 mobile done and tested |
| 5 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Deadline Oct 2026. Do on DEV first, test, then roll to BOTH projects together |

### Deferred Prod Setup (next dedicated prod session)

| Task | Notes |
|------|-------|
| Admin / super_admin bootstrap in prod | First super_admin likely needs manual Auth-account creation + direct users-doc role set (chicken-and-egg). The delicate step. |
| Manager recreates menu cycle in prod | His test experience — templates + cycle NOT copied deliberately |
| 15 testers register fresh in prod | Full real signup experience — no user copy from dev |
| Move utility scripts out of `core/functions` | `copy_dev_to_prod.js`, `export_to_csv.js`, `import_from_csv.js` currently live in core/functions and would ride along in deploys — relocate or add to functions `ignore` |

---

## 3. Feature Lists

### 3.1 V1 Enhancement — SCOPE LOCKED — WEB COMPLETE ✅

| # | Feature | Platform | Status |
|---|---------|----------|--------|
| F1 | Employee self-serve BF ala carte (multi-item) | Web + Mobile | ✅ Web DONE + field tested. Mobile pending. |
| F2 | Supervisor proxy/walk-in BF ala carte (multi-item) | Web + Mobile | ✅ Web DONE + field tested. Mobile pending. |
| F3 | Official guest walk-in + sponsor search | Web | ✅ DONE + field tested |
| F4 | Supervisor special meal walk-in catalogue | Web | ✅ DONE + field tested |
| F5 | Event banner on employee home screen | Web | ✅ DONE + field tested |
| F6 | Accounts Supervisor home dashboard | Web | ✅ DONE + field tested |
| F7 | Booking cutoff as editable in App Settings | Web | ✅ DONE + field tested |
| F8 | Individual feedback review for admin | Web | ✅ DONE + field tested |
| Guest Approvals | Admin official guest billing approval page | Web | ✅ DONE + field tested |
| F13 | Node.js 20 → 22 upgrade | Infrastructure | ⏳ Not started — deadline Oct 2026 |

**Mobile remaining:** F1 (BookMealScreen.js) + F2 (WalkInScreen + ProxyBookingScreen).

---

### 3.2 V1 Extension — SCOPE LOCKED — DESIGN COMPLETE V1.1–V1.4

**No build until Enhancement mobile update complete and Phase 2 rollout stable.**

Reference document: `Servio_V1_Extension_Scope_09Jun2026.md`

| Version | Scope | Design Status | Build Status |
|---------|-------|---------------|-------------|
| V1.1 | Family Member CRUD | ✅ LOCKED | Not started |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | ✅ LOCKED | Not started |
| V1.3 | Tea Bar + Tuck Shop (bakery absorbed) | ✅ LOCKED | Not started |
| V1.4 | BBQ | ✅ LOCKED | Not started |
| V1.5 | Dashboards + analytics + reporting + billing | Design after V1.4 build | Not started |
| V1.6 | Notifications + reporting alignment | Design after V1.4 build | Not started |
| Mobile Ext. | F9–F12 admin/manager/supervisor mobile dashboards | Deferred | Not started |

---

## 4. Structural Issues (Fix Before Heavy Usage)

| # | Issue | Risk | When to Fix |
|---|-------|------|-------------|
| S1 | Booking duplicate-check not atomic | Two simultaneous bookings could create duplicates under load | Before full 350-employee rollout |
| S2 | employeeService .limit() then in-memory filter | Search breaks silently past 50 employees | Before full 350-employee rollout |
| S3 | Notification fanout 500-op batch on ALL_EMPLOYEES | Firestore batch limit hit at scale | Before full rollout |
| S4 | Node.js 20 deprecation (= F13) | End of active support October 2026 | Before October 2026 |

---

## 5. Rollout Plan

| Phase | Who | Trigger | Status |
|-------|-----|---------|--------|
| Phase 1 | Internal team — Homi, Awaiz, Hadi | Complete | ✅ Done |
| Phase 2 | Controlled FFL employee group (3–5 employees) | After mobile F1/F2 + APK rebuild + field test pass | Pending |
| Phase 3 | Full FFL management club | After Phase 2 stable | Pending |

**Note (15 Jun):** Prod test run (~15 testers, 15 days) now serves as the controlled-rollout validation. Mobile not part of this web-only prod test run.

---

## 6. Infrastructure

### Dev (servio-dev-55d2d) — development workbench

| Resource | Value |
|----------|-------|
| NAS dev path | /mnt/storage/projects/servio_dev/ |
| Backup script | `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh` |
| GDrive dev folder | 1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI |
| GDrive src folder | 1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0 |
| Firebase project | servio-dev-55d2d |
| Web API key (public) | AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o |
| Dev API | https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api |
| Dev web app | https://servio-dev-55d2d.web.app |
| Dev credential | core/functions/service-account.json |

### Prod (servio-prod-3a6de) — frozen test run, then real production

| Resource | Value |
|----------|-------|
| Firebase project | servio-prod-3a6de |
| Prod API | https://asia-south1-servio-prod-3a6de.cloudfunctions.net/api |
| Prod web app | https://servio-prod-3a6de.web.app |
| Custom domain | https://servio.homilabs.org (CNAME → servio-prod-3a6de.web.app; awaiting DNS/SSL 16 Jun) |
| Prod credential | keys/service-account-prod.json (gitignored — SECRET, full prod admin) |
| Firestore instance | named **servio-dev** (same name as dev — Option B; check PROJECT name not DB label) |

### Deploy & build commands

| Action | Command |
|--------|---------|
| Confirm active project (ALWAYS before deploy) | `firebase use` |
| Switch project | `firebase use dev` / `firebase use prod` |
| Web build | `npm run build` (in web/) — uses .env.production for prod |
| Hosting deploy | `firebase deploy --only hosting` (from servio_dev root) |
| Functions deploy | `firebase deploy --only functions` (from servio_dev root) |
| Mobile build | `eas build --platform android --profile preview` |
| Copy collection dev→prod | `node copy_dev_to_prod.js <collection>` (from core/functions) |
| Export collection → CSV | `node export_to_csv.js <collection>` (dev only) |
| Import CSV → collection | `node import_from_csv.js <collection> <file.csv> [merge\|overwrite]` (dev only) |

**.firebaserc aliases:** `default`=dev, `dev`=servio-dev-55d2d, `prod`=servio-prod-3a6de (default is dev so accidental deploys hit dev).

---

## 7. Key Technical Rules — Never Break

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`
2. **PKT mobile:** `new Date(date.getTime() + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` on mobile (Hermes → NaN)
3. **PKT backend:** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` safe on Node.js
4. **serviceWindowStart** stored as UTC in Firestore (e.g. "01:00" = 06:00 PKT)
5. **Read before writing:** always download from GDrive before editing — additive only, never rewrite working files
6. **Tenant isolation** on every Firestore operation — tenantId on all queries
7. **camelCase throughout** — collections, fields, code
8. **verifyRole** is a factory: `verifyRole(ROLES.X)` — never direct middleware — sets `req.userRole`, `req.tenantId`, `req.officialEmployeeNumber`
9. **Route ordering:** specific before parameterised (e.g. `/events/active` before `/:eventId`)
10. **All responses:** `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`
11. **No `FieldValue.serverTimestamp()`** in services — use `new Date()`
12. **`db.settings()`** called once only in `index.js` — never in service files
13. **Design locked on paper before any code written** — for all features
14. **Ala carte bookingSource:** route reads `bookingSource` + `targetEmployeeNumber` from body — self defaults to caller, proxy/walk-in must supply targetEmployeeNumber
15. **Composite indexes:** any Firestore query combining `where` + `orderBy` on different fields requires a composite index — create immediately from error URL when it appears
16. **admin.initializeApp() with no args** in deployed index.js — lets functions use whichever project they are deployed to
17. **Design before code — always:** schema and flow locked on paper before a single line written. Learned from Flutter V1.

---

## 8. Version Roadmap

| Version | Scope | Status |
|---------|-------|--------|
| V1 | Mess operations — all core flows | ✅ Live |
| V1 Enhancement | F1–F8 + Guest Approvals + F13 | ✅ Web complete. Mobile F1/F2 pending. |
| V1.1 | Family Member CRUD | 🔒 Design locked. Build next. |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 Design locked |
| V1.3 | Tea Bar + Tuck Shop | 🔒 Design locked |
| V1.4 | BBQ | 🔒 Design locked |
| V1.5 | Dashboards + analytics + reporting + billing | Design after V1.4 build |
| V1.6 | Notifications + reporting alignment | Design after V1.4 build |
| V2 | Guest House + BOQ + Library | Future |
| V3 | Sports + Kiosk + SMS/WhatsApp | Future |
| V4 | Recipe + Inventory + automated rates | Future |

---

## 9. Test Users

| Employee # | Role | Name | Notes |
|------------|------|------|-------|
| FFL00001 | admin | Qasim Ejaz | Admin account for QE |
| FFL00002 | employee | Test User 2 | |
| FFL00003 | employee | Ahmed Khan | |
| FFL00004 | mess_supervisor | Tasawwar Alam | |
| FFL00005 | manager | Muhammad Jahangir | |
| FFL00015 | accounts_supervisor | Naeem Ullah | |
| FFL00100 | employee | Humayun Shahzad | |
| FFL01584 | employee | Qasim Ejaz | Real employee account for QE |

**Note:** Above are DEV test users. PROD gets fresh registrations (15 testers register themselves); only admin/super_admin brought over to prod.

**Token refresh (testing — DEV):**
```bash
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o" -H "Content-Type: application/json" -d '{"email":"admin@fatima-group.com","password":"1234@com","returnSecureToken":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

---

## 10. mealTypes UTC Times (Firestore)

| Meal | serviceWindowStart (UTC) | serviceWindowEnd (UTC) | Cutoff (3hr before start) |
|------|--------------------------|------------------------|---------------------------|
| breakfast | 01:00 | 04:00 | 22:00 previous day |
| lunch | 08:00 | 10:00 | 05:00 |
| dinner | 14:00 | 17:00 | 11:00 |

---

## 11. Ala Carte Booking — Design Decisions (Locked)

| Decision | Value |
|----------|-------|
| Ala carte available for | Breakfast only (mess) |
| Duplicate check | None — employee may order same item multiple times |
| Cutoff | None — ala carte is on-demand |
| Cancellation | Allowed until supervisor issues |
| rateTargetKey format | `{date}_breakfast_{itemId}` |
| menuOptionKey on reservation | `alacarte` (flat) |
| bookingGroupId | One shared ID per session across all items |
| Notification | One combined per session — "Ala Carte Booked" |
| Weekly booking | Not applicable — ala carte is daily choice only |
| Official guest ala carte | Supported — live in F3 |

---

## 12. V1 Extension — Key Design Decisions (Locked)

Full detail in `Servio_V1_Extension_Scope_09Jun2026.md`. Summary of critical decisions here for quick reference.

### Rate Entry — Universal Model (All Services)
Accounts supervisor opens rate screen for date + service. Full consumed items list with previous day rate pre-filled. Variances only changed. Cloud Function batch-updates via `rateTargetKey`.

| Service | rateTargetKey Format |
|---------|---------------------|
| Mess | `{date}_{mealType}_{itemId}` |
| Café | `{date}_cafe_{itemId}` |
| Tea Bar | `{date}_teabar_{itemId}` |
| Tuck Shop | `{date}_tuckshop_{itemId}` |
| Bakery | `{date}_bakery_{itemId}` |
| BBQ | `{date}_bbq_{itemId}` |

### New Roles — V1 Extension
| Role | Service |
|------|---------|
| `cafe_supervisor` | Café indoor |
| `cafe_waiter` | Outdoor mini café — peer to cafe_supervisor |
| `tuckshop_supervisor` | Tuck shop |
| `teabar_attendant` | Tea bar — mobile required, assignedLocationId on users |
| `bbq_supervisor` | BBQ |

### New Collections — V1 Extension
| Collection | Version |
|------------|---------|
| `cafeOrders` | V1.2 |
| `teabarLocations` | V1.3 |
| `teabarOrders` | V1.3 |
| `tuckshopOrders` | V1.3 |
| `tuckshopReturns` | V1.3 |
| `bbqEvents` | V1.4 |
| `bbqOrders` | V1.4 |

### Key Schema Additions — V1 Extension
| Collection | New Fields |
|------------|-----------|
| `employees` | `maritalStatus`, `pendingMaritalStatus`, `costCentreCode`*, `sponsoringEmployeeNumber`*, `sponsoringDepartment`* |
| `familyMembers` | `deletionRequested`, `deletionRequestedAt`, `deletionRequestReason`, `deletionRequestNote`, `createdByUid` |
| `appSettings` | `maxFamilyMembersPerEmployee`, `familyMemberFeatureActive` |
| `menuItems` | `barcodeId`, `numericCode`, `isAvailable` |
| `users` | `assignedLocationId`, new role values |

*mandatory for `employeeType: official_guest` only, null for all others

---

## 13. Enhancement Development Log

### V1 Enhancement Field Test — 9 June 2026 ✅

All features field tested and confirmed working.

| Issue Found | Fix Applied | Files |
|-------------|-------------|-------|
| F3 sponsor search — plain text input | Replaced with live search dropdown | `WalkInPage.jsx` |
| F4 special meal catalogue — appeared broken | Missing composite index + hint text + error state | `WalkInPage.jsx` + Firebase indexes |
| F5 event banner — not appearing | Route order bug `/events/active` intercepted by `/:eventId` + missing index | `eventRoutes.js` + Firebase indexes |
| F8 feedback review — not accessible | Missing sidebar link + missing composite index | `Sidebar.jsx` + Firebase indexes |
| Events employee screen — past events showing | Client-side date filter added | `EventManagementPage.jsx` |
| Event banner link — went to notifications | `href="/notifications"` → `href="/events"` | `EmployeeDashboard.jsx` |
| Guest Approvals — no admin page | Built `OfficialGuestApprovalsPage.jsx` + route + sidebar | New files + `App.jsx` + `Sidebar.jsx` |
| Three composite indexes missing | Created from Firebase error URLs | Firebase console |

**New files added:**
- `web/src/pages/admin/OfficialGuestApprovalsPage.jsx`
- `web/src/pages/admin/OfficialGuestApprovalsPage.module.css`

---

### Mobile F1 Update — 9 June 2026 ✅

BF ala carte multi-item booking added to mobile. Matches web exactly.

**Files changed:**
- `mobile/src/screens/employee/BookMealScreen.js` — multi-item ala carte with inline +/- quantity controls, dining mode selector, single confirm button per session
- `mobile/src/services/messService.js` — added `bookAlaCarte` function
- `mobile/app.json` — splash moved to `expo-splash-screen` plugin (SDK 56 schema fix)

**Dependencies updated:** expo 56.0.3→56.0.9, expo-dev-client, expo-font, expo-splash-screen installed.

**expo-doctor:** 21/21 checks passed.

**APK Build:** EAS build triggered — preview profile — android.

---

### F1 — Employee BF Ala Carte Web ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messReservationService.js` — added `createAlaCarteBooking`
- `functions/src/mess/messRoutes.js` — added `POST /mess/reservations/alacarte`
- `web/src/pages/employee/BookMealPage.jsx` — AlaCartePicker component
- `web/src/pages/employee/BookMealPage.module.css`
- `web/src/services/messService.js` — added `createAlaCarteBooking`

**Field test:** All 7 test cases passed.

---

### F2 — Supervisor Proxy/Walk-in BF Ala Carte Web ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messRoutes.js` — proxy/walk-in support for alacarte route
- `web/src/pages/admin/WalkInPage.jsx` — personal_guest toggle removed, ala carte added
- `web/src/pages/admin/WalkInPage.module.css`
- `web/src/pages/admin/ProxyBookingPage.jsx` — ala carte section in Step 3
- `web/src/pages/admin/ProxyBookingPage.module.css`

**Design decision locked:** `personal_guest` walk-in removed. Guest walk-in is official guest flow under F3.

---

### Phase 5 — Mobile Bug Correction ✅ — 6 June 2026

| Bug | Fix |
|-----|-----|
| MB1 | Event popup buttons — EmployeeHomeScreen.js |
| MB2 | More tab wrong screen — EmployeeNavigator.js |
| MB3 | Raw ISO date — BookMealScreen.js + ManagerHomeScreen.js |
| MB4 | Full Week error codes — WeeklyBookingScreen.js |
| MB5 | Typo "Howare" — BookMealScreen.js |
| MB6 | "combo slot" → "meal slot" — BookMealScreen.js |
| MB7 | Dash instead of 0 — AdminHomeScreen.js + ManagerHomeScreen.js |
| MB8 | Kitchen Dashboard option labels — KitchenDashboardPage.jsx |

### Phase 1–4 — Web + Data Bug Correction ✅ — 6 June 2026
All web bugs WB1–WB16 and data actions DA1–DA4 resolved.

---

## 14. V1 Extension Design Session Log

### Design Session — 9 June 2026

Complete design discussion held for V1 Extension modules. All decisions locked V1.1 through V1.4.

| Module | Decision |
|--------|----------|
| Family CRUD (V1.1) | Fully locked — see scope doc |
| Café + Outdoor Mini Café (V1.2) | Fully locked — outdoor mini cafe separated from tuck shop, uses cafeOrders with diningMode:outdoor_seating |
| Tea Bar (V1.3) | Fully locked — 6 locations, teabar_attendant role, mobile required |
| Tuck Shop (V1.3) | Fully locked — 2 tabs only (counter + bakery), barcode + numeric codes, go green no receipts, same-day returns debit model |
| Bakery | Absorbed into tuck shop — no standalone version. Bakery backend V4 only. |
| BBQ (V1.4) | Fully locked — per-event menu, proposedRate display, isPreorderOnly flag, no order restrictions |
| OG Guest Model | Fully locked — Type1 manual slip, Type2 OG numbers real-time |
| Official Guest Fields | employees adds: costCentreCode + sponsoringEmployeeNumber + sponsoringDepartment (official_guest only) |
| V1.5 + V1.6 | Deferred — design after V1.4 build complete |
| Rate Entry | Universal model locked for all services |
| Home Delivery | Parked — post V1 Extension |

**Reference document:** `Servio_V1_Extension_Scope_09Jun2026.md`

---

## 15. Dev / Prod Separation Log — 15 June 2026

### What was done this session

**Environment strategy (locked):** Two permanent Firebase projects. Dev = private workbench. Prod launches first as a frozen TEST environment for a ~15-day trial with ~15 testers (parallel to manual club operations), then test data is WIPED and prod relaunches as real production. Custom domain survives the wipe (only data resets, project persists).

**Config made environment-based:**
- Web: 16 service files switched from hardcoded URLs to `import { BASE_URL } from './config.js'`; `web/src/config/firebase.js` reads all 6 Firebase values from `import.meta.env`. `.env.development` + `.env.production` hold per-env values. Stray `web/.env` (which forced dev URL into all builds) deleted.
- Mobile: NOT yet done — deferred. Mobile still has hardcoded dev config in `api.js` + `firebase.js`; needs env-awareness (app.config.js + EAS profiles) and package reconciliation (dev `org.homilabs.servio` vs prod `com.homilabs.servio`) before prod mobile builds.

**Prod project stood up (servio-prod-3a6de):** Blaze plan; Email/Password auth enabled; Firestore named instance `servio-dev` created (Option B — same name as dev so backend code is unchanged); web + Android apps registered.

**Pre-deploy fixes:** `firebase.json` database → `servio-dev`; `.firebaserc` given dev/prod aliases (default=dev); `index.js` changed to `admin.initializeApp()` no-args (uses project it's deployed into — removes the dev-credential cross-wire). Confirmed `getFirestore('servio-dev')` stays unchanged.

**Deployed to prod:** Functions (`api`, `resolveDaily`, `generateSnapshots` in asia-south1 — first attempt failed on API-enable timing, retry succeeded). Hosting (built with .env.production, deployed). Verified web→prod chain on empty system (login page loads; "invalid email or password" = success signal on empty DB).

**Data copied dev→prod (employees + menuItems only):**
- Built `copy_dev_to_prod.js` — two Admin SDK apps (devApp reads, prodApp writes), preserves doc IDs, pauses for "yes", verifies counts.
- employees: 343 docs copied, IDs preserved, verified 343/343/343.
- menuItems: copy command issued (`node copy_dev_to_prod.js menuItems`) — verify count in prod console.
- Deliberately NOT copied: templates, menu cycles (manager recreates in prod), test users (testers register fresh), test transactions (clean start).

**Custom domain:** `servio.homilabs.org` — CNAME added in Hostinger (`servio` → `servio-prod-3a6de.web.app`, TTL 14400); Hostinger uses dns-parking.com nameservers (its own — DNS records tab is authoritative, no nameserver change needed). Added to Firebase Auth → Authorized domains (Custom). Firebase verification PENDING (DNS propagation up to 24h, then SSL). **Test 16 June.**

**Utility scripts built (dev-only):** `export_to_csv.js` (read-only) + `import_from_csv.js` (writes; requires `__docId` column, previews, confirms, merge-default). On GDrive: export_to_csv.js = `1noKz_mCrKbFBQAM1PnMC9L1JINQq05GY`, import_from_csv.js = `128CuXv7PJI0Qonn9qrqlUa6kD8AmsHjv`.

### Key learnings (this session)
- **`admin.initializeApp()` with no args** in deployed functions → uses whichever project it's deployed to. Hardcoded credential in index.js would cross-wire prod→dev.
- **Always `firebase use` before every deploy** — confirm active project. Default alias = dev so accidents are safe.
- **Prod's Firestore instance is named `servio-dev`** (Option B) — expected, not a mistake. Disambiguate by PROJECT name at console top, not DB label.
- **First functions deploy to a new project** often fails once on API-enable timing — just re-run.
- **Node resolves `require` relative to the SCRIPT's location** — utility scripts must live where `node_modules`/firebase-admin is (core/functions), not /tmp.
- **Web API keys are public; service-account JSON is the real secret** — prod key in gitignored `keys/`, outside core/functions so it's never bundled into deploys.
- **prod uses `.firebasestorage.app` storage bucket, dev uses `.appspot.com`** — intentional, don't "fix".
- **User login = Firebase Auth account + users doc linked by UID.** Copying user docs does NOT copy Auth logins → testers/admins register fresh instead.

### Carry-forward (open threads)
1. Test `servio.homilabs.org/login` once DNS/SSL ready (16 Jun).
2. Admin/super_admin bootstrap in prod (deferred — delicate first-super_admin manual step).
3. Manager recreates menu cycle in prod; 15 testers register fresh.
4. Mobile env-config work before any prod mobile build (api.js, firebase.js, app.config.js, EAS profiles, package name reconciliation, prod google-services.json).
5. Node 20→22 upgrade (F13) — dev first, then both projects together, before Oct 2026.
6. Relocate utility scripts out of core/functions (or add to functions ignore).
7. After 15-day test: WIPE prod data, relaunch as real production.
8. "Servio" name has contested usage in hospitality software — branding consideration (not a blocker).

---

*Last updated: 15 June 2026 — dev/prod separation complete, prod frozen for 15-day test run, V1 Extension resumes on dev*
