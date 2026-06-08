# Servio — Project Command Board
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: ffl) |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Stack | Node.js + Express (Firebase Cloud Functions) \| React/Vite (Web) \| Expo React Native (Mobile) \| Firestore + Auth |
| Firebase | servio-dev-55d2d |
| GitHub | AwaizFatima08/servio_dev |
| NAS Path | /mnt/storage/projects/servio_dev/ |
| Last Updated | 9 June 2026 |
| Last Backup | Due — run before closing this session |

---

## 🎉 MILESTONE — 9 June 2026

**V1 Core + V1 Enhancement — WEB COMPLETE AND FIELD TESTED**

All 20 web screens live. All V1 Enhancement features (F1–F8) developed, deployed, and field tested. All bugs resolved. System stable and ready for Phase 2 controlled rollout.

Mobile update remaining for F1/F2 ala carte feature only.

---

## 1. Current Status

**PHASE: V1 Enhancement — WEB COMPLETE. Mobile F1/F2 pending.**

All web features delivered and field tested. One mobile update remaining — BF ala carte employee self-serve (F1) and supervisor proxy/walk-in (F2). No other work until this mobile update is done and tested.

---

## 2. Next Session — Starting Point

Always run backup before starting:

```bash
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh
```

### Work Order — Next Session

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | F1 Mobile — Employee BF ala carte self-serve | Mobile (Expo) | After combined web field test confirmed passing |
| 2 | F2 Mobile — Supervisor proxy/walk-in BF ala carte | Mobile (Expo) | After F1 mobile done and tested |
| 3 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Deadline October 2026 — plan before August |

After mobile F1/F2 complete and tested → proceed to Phase 2 rollout (controlled FFL employee group).

---

## 3. Open Feature Lists

### 3.1 V1 Enhancement — SCOPE LOCKED — WEB COMPLETE ✅

| # | Feature | Platform | Status |
|---|---------|----------|--------|
| F1 | Employee self-serve BF ala carte (multi-item) | Web + Mobile | ✅ Web DONE + field tested. Mobile pending. |
| F2 | Supervisor proxy/walk-in BF ala carte (multi-item) | Web | ✅ Web DONE + field tested. Mobile pending. |
| F3 | Official guest walk-in + sponsor search | Web | ✅ DONE + field tested |
| F4 | Supervisor special meal walk-in catalogue | Web | ✅ DONE + field tested |
| F5 | Accounts Supervisor home dashboard + event banner | Web | ✅ DONE + field tested |
| F6/F7 | Booking cutoff widget in App Settings | Web | ✅ DONE + field tested |
| F8 | Individual feedback review for admin | Web | ✅ DONE + field tested |
| Guest Approvals | Admin official guest billing approval page | Web | ✅ DONE + field tested |
| F13 | Node.js 20 → 22 upgrade | Infrastructure | ⏳ Not started — deadline Oct 2026 |

**Mobile remaining:** F1 (BookMealScreen.js — BF ala carte) + F2 (WalkInScreen + ProxyBookingScreen).

### 3.2 V1 Extension — SCOPE LOCKED

**No work on Extension until Enhancement mobile update complete and Phase 2 rollout stable.**

| Version | Scope | Design Status | Dependency |
|---------|-------|---------------|------------|
| V1.1 | Family Member CRUD | LOCKED | None — standalone |
| V1.2 | Café + basic kitchen dashboard | LARGELY LOCKED | V1.1 |
| V1.3 | Tea Bar (locked) + Tuck Shop (pending) | TEA BAR LOCKED / TUCK SHOP PENDING | V1.1 |
| V1.4 | Bakery + supervisor view | PENDING DISCUSSION | V1.1 |
| V1.5 | Full dashboards + analytics + reporting + billing | PENDING DISCUSSION | V1.2, V1.3, V1.4 |
| V1.6 | Notifications + reporting alignment | PENDING DISCUSSION | V1.5 |
| Mobile Ext. | Admin/Manager/Supervisor/Accounts mobile dashboards | DEFERRED | Post V1 Extension stable |

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
| Phase 1 | Internal team — Homi, Awaiz, Hadi | IN PROGRESS | ✅ Active |
| Phase 2 | Controlled FFL employee group (3–5 employees) | After mobile F1/F2 complete + APK rebuild + field test pass | Pending |
| Phase 3 | Full FFL management club | After Phase 2 stable | Pending |

---

## 6. Infrastructure

| Resource | Value |
|----------|-------|
| NAS dev path | /mnt/storage/projects/servio_dev/ |
| Backup script | bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh |
| GDrive dev folder | 1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI |
| GDrive src folder | 1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0 |
| Firebase project | servio-dev-55d2d |
| Web API key | AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o |
| Production API | https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api |
| Web app | https://servio-dev-55d2d.web.app |
| Web deploy | npm run build (in web/) → firebase deploy --only hosting |
| Functions deploy | firebase deploy --only functions (in core/functions/) |
| Mobile build | eas build --platform android --profile preview |

---

## 7. Key Technical Rules — Never Break

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`
2. **PKT mobile:** `new Date(date.getTime() + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` on mobile (Hermes → NaN)
3. **PKT backend:** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` safe on Node.js
4. **serviceWindowStart** stored as UTC in Firestore (e.g. "01:00" = 06:00 PKT)
5. **Read before writing:** always download from GDrive before editing; additive only — never rewrite working files
6. **Tenant isolation** on every Firestore operation — tenantId on all queries
7. **camelCase throughout** — collections, fields, code
8. **verifyRole** is a factory: `verifyRole(ROLES.X)` — never direct middleware; sets `req.userRole`, `req.tenantId`, `req.officialEmployeeNumber`
9. **Route ordering:** specific before parameterised (e.g. `/events/active` before `/:eventId`) — lesson learned this session
10. **All responses:** `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`
11. **No `FieldValue.serverTimestamp()`** in services — use `new Date()`
12. **`db.settings()`** called once only in `index.js` — never in service files
13. **Design locked on paper before any code written** — for all features
14. **Ala carte bookingSource:** route reads `bookingSource` + `targetEmployeeNumber` from body — self defaults to caller, proxy/walk-in must supply targetEmployeeNumber
15. **Composite indexes:** any new Firestore query combining `where` + `orderBy` on different fields requires a composite index — create immediately from the error URL when it appears

---

## 8. Version Roadmap

| Version | Scope |
|---------|-------|
| V1 current | Mess operations — all core flows live. All bugs resolved. |
| V1 Enhancement | F1–F8, F13, Guest Approvals — SCOPE LOCKED. Web complete + field tested. Mobile F1/F2 pending. |
| V1 Extension | V1.1 Family CRUD → V1.2 Café → V1.3 Tea Bar + Tuck Shop → V1.4 Bakery → V1.5 Dashboards → V1.6 Notifications. SCOPE LOCKED. |
| V2 | Guest House + BOQ + Library |
| V3 | Sports + Kiosk + SMS/WhatsApp |
| V4 | Recipe + Inventory + automated rates |

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

**Token refresh (testing):**
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
| rateTargetKey format | `{date}_breakfast_alacarte_{itemId}` |
| menuOptionKey on reservation | `alacarte` (flat) |
| bookingGroupId | One shared ID per session across all items |
| Notification | One combined per session — "Ala Carte Booked" |
| Weekly booking | Not applicable — ala carte is daily choice only |
| Official guest ala carte | Supported — part of F3, now live |

---

## 12. Enhancement Development Log

### V1 Enhancement Field Test — 9 June 2026 ✅

**All features field tested and confirmed working. Fixes applied during session:**

| Issue | Fix | Files |
|-------|-----|-------|
| F3 sponsor search — plain text input | Replaced with live search dropdown (same pattern as employee search) | `WalkInPage.jsx` |
| F4 special meal catalogue — appeared broken | Missing composite index on `menuItems` + missing hint text + no error state | `WalkInPage.jsx` + Firebase indexes |
| F5 event banner — not appearing | `GET /events/active` route intercepted by `GET /:eventId` (wrong route order) + missing composite index on `events` | `eventRoutes.js` + Firebase indexes |
| F8 feedback review — not accessible | Missing sidebar link + missing composite index on `mealFeedback` | `Sidebar.jsx` + Firebase indexes |
| Events employee screen — past events showing | Client-side date filter added to `EmployeeEventsView.loadEvents` | `EventManagementPage.jsx` |
| Event banner link — went to notifications | `href="/notifications"` → `href="/events"` | `EmployeeDashboard.jsx` |
| Guest Approvals — no admin page | Built `OfficialGuestApprovalsPage.jsx` + route + sidebar link | New files + `App.jsx` + `Sidebar.jsx` |
| Three composite indexes missing | Created from Firebase error URLs | Firebase console |

**New files added this session:**
- `web/src/pages/admin/OfficialGuestApprovalsPage.jsx`
- `web/src/pages/admin/OfficialGuestApprovalsPage.module.css`

**Files modified this session:**
- `functions/src/events/eventRoutes.js` — route ordering fix
- `web/src/pages/admin/WalkInPage.jsx` — F3 sponsor search + F4 catalogue hint + error state
- `web/src/pages/admin/EventManagementPage.jsx` — employee events date filter
- `web/src/components/layout/Sidebar.jsx` — Feedback Review + Guest Approvals links
- `web/src/App.jsx` — OfficialGuestApprovalsPage import + route
- `web/src/pages/employee/EmployeeDashboard.jsx` — event banner href fix

---

### F1 — Employee BF Ala Carte (Web) ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messReservationService.js` — added `createAlaCarteBooking`
- `functions/src/mess/messRoutes.js` — added `POST /mess/reservations/alacarte`
- `web/src/pages/employee/BookMealPage.jsx` — AlaCartePicker component
- `web/src/pages/employee/BookMealPage.module.css` — new classes
- `web/src/services/messService.js` — added `createAlaCarteBooking`

**Field test result:** All 7 test cases passed.

---

### F2 — Supervisor Proxy/Walk-in BF Ala Carte (Web) ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messRoutes.js` — updated alacarte route for proxy/walk-in
- `web/src/pages/admin/WalkInPage.jsx` — ala carte section added
- `web/src/pages/admin/WalkInPage.module.css` — new classes
- `web/src/pages/admin/ProxyBookingPage.jsx` — ala carte section added
- `web/src/pages/admin/ProxyBookingPage.module.css` — new classes

**Design decision locked:** `personal_guest` walk-in removed. Guest walk-in redesigned as official guest flow under F3.

**Field test result:** Passed.

---

### Phase 5 — Mobile Bug Correction — 6 June 2026 ✅

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

### Phase 1–4 — Web + Data Bug Correction — 6 June 2026 ✅
All web bugs WB1–WB16 and data actions DA1–DA4 resolved.