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
| Last Updated | 7 June 2026 |
| Last Backup | Due — run before closing this session |

---

## 1. Current Status

**PHASE: V1 Enhancement Feature Development — F1 and F2 COMPLETE**

F1 (Employee BF ala carte self-serve) deployed and field-tested. All test cases passed.
F2 (Supervisor proxy/walk-in BF ala carte) developed and deployed. Field test pending in next session.
Next: F2 field test report → then proceed to F3.

---

## 2. Next Session — Starting Point

Always run backup before starting:

```bash
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh
```

### Work Order — V1 Enhancement (priority order)

| # | Feature | Priority | Platform | Status |
|---|---------|----------|----------|--------|
| F1 | Employee self-serve BF ala carte multi-item | HIGH | Web + Mobile | ✅ COMPLETE — Web deployed + field tested |
| F2 | Supervisor proxy/walk-in BF ala carte multi-item | HIGH | Web | ✅ COMPLETE — Web deployed, field test pending |
| F3 | Official guest walk-in mess booking — schema gap fix | MEDIUM | Backend + Web | Not started |
| F4 | Supervisor proxy/walk-in special lunch/dinner | MEDIUM | Web | Not started |
| F5 | Event banner on employee home screen | MEDIUM | Web | Not started |
| F6 | Accounts Supervisor home dashboard | MEDIUM | Web | Not started |
| F7 | Booking cutoff as editable field in App Settings | LOW | Backend + Web | Not started |
| F8 | Individual feedback review for admin | LOW | Web | Not started |
| F13 | Node.js 20 → 22 upgrade | DEADLINE OCT 2026 | Infrastructure | Not started |

Design discussion required before development begins on each remaining feature.

---

## 3. Open Feature Lists

### 3.1 V1 Enhancement — SCOPE LOCKED

**Scope frozen as of 6 June 2026. No additions until Enhancement complete and field-tested.**

| # | Feature | Priority | Platform | Status |
|---|---------|----------|----------|--------|
| F1 | Employee self-serve BF ala carte (multi-item) | HIGH | Web + Mobile | ✅ Web DONE. Mobile pending. |
| F2 | Supervisor proxy/walk-in BF ala carte (multi-item) | HIGH | Web | ✅ Web DONE. Field test pending. |
| F3 | Official guest walk-in mess booking — schema gap fix | MEDIUM | Backend + Web | Not started |
| F4 | Supervisor proxy/walk-in special lunch/dinner | MEDIUM | Web | Not started |
| F5 | Event banner on employee home screen | MEDIUM | Web | Not started |
| F6 | Accounts Supervisor home dashboard | MEDIUM | Web | Not started |
| F7 | Booking cutoff as editable in App Settings | LOW | Backend + Web | Not started |
| F8 | Individual feedback review for admin | LOW | Web | Not started |
| F13 | Node.js 20 → 22 upgrade | DEADLINE OCT 2026 | Infrastructure | Not started |

**Note on F1 Mobile:** Web complete and tested. Mobile app ala carte booking (BookMealScreen.js) still pending — to be done after F2 field test passes.

**Note on personal_guest walk-in:** Guest toggle removed from WalkInPage. Guest walk-in will be redesigned as official guest flow under F3.

### 3.2 V1 Extension — SCOPE LOCKED

**Scope frozen as of 6 June 2026. No additions until Extension complete and field-tested.**

| Version | Scope | Design Status | Dependency |
|---------|-------|---------------|------------|
| V1.1 | Family Member CRUD | LOCKED | None — standalone |
| V1.2 | Café + basic kitchen dashboard | LARGELY LOCKED | V1.1 |
| V1.3 | Tea Bar (locked) + Tuck Shop (pending) | TEA BAR LOCKED / TUCK SHOP PENDING | V1.1 |
| V1.4 | Bakery + supervisor view | PENDING DISCUSSION | V1.1 |
| V1.5 | Full dashboards + analytics + reporting + billing | PENDING DISCUSSION | V1.2, V1.3, V1.4 |
| V1.6 | Notifications + reporting alignment | PENDING DISCUSSION | V1.5 |
| Mobile Ext. | Admin/Manager/Supervisor/Accounts mobile dashboards (F9–F12) | DEFERRED FROM V1 ENHANCEMENT | Post V1 Extension stable |

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

| Phase | Who | Trigger |
|-------|-----|---------|
| Phase 1 | Internal team — Homi, Awaiz, Hadi | IN PROGRESS |
| Phase 2 | Controlled FFL employee group (3–5 employees) | After V1 Enhancement complete + APK rebuild + field test pass |
| Phase 3 | Full FFL management club | After Phase 2 stable |

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
9. **Route ordering:** specific before parameterised (e.g. `/cycles/active` before `/:id`)
10. **All responses:** `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`
11. **No `FieldValue.serverTimestamp()`** in services — use `new Date()`
12. **`db.settings()`** called once only in `index.js` — never in service files
13. **Design locked on paper before any code written** — for all features
14. **Ala carte bookingSource:** route reads `bookingSource` + `targetEmployeeNumber` from body — self defaults to caller, proxy/walk-in must supply targetEmployeeNumber

---

## 8. Version Roadmap

| Version | Scope |
|---------|-------|
| V1 current | Mess operations — all core flows live. All bugs resolved. |
| V1 Enhancement | F1–F8, F13 — mess module improvements, missing flows, infrastructure. SCOPE LOCKED. |
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
| Official guest ala carte | Pending — part of F3 |

---

## 12. Enhancement Development Log

### F1 — Employee BF Ala Carte (Web) ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messReservationService.js` — added `createAlaCarteBooking` function
- `functions/src/mess/messRoutes.js` — added `POST /mess/reservations/alacarte` route (self only at this stage)
- `web/src/pages/employee/BookMealPage.jsx` — added AlaCartePicker component, updated SingleBookingFlow, updated SingleSuccess
- `web/src/pages/employee/BookMealPage.module.css` — added `.sectionLabel`, `.sectionHint`, `.acQtyRow`
- `web/src/services/messService.js` — added `createAlaCarteBooking` function

**Field test result:** All 7 test cases passed. Lunch shows combo only. Breakfast shows combo + ala carte. Issuance dashboard shows separate row per ala carte item. Notification fires once per session. Weekly booking unaffected.

---

### F2 — Supervisor Proxy/Walk-in BF Ala Carte (Web) ✅ — 7 June 2026

**Files changed:**
- `functions/src/mess/messRoutes.js` — updated `/reservations/alacarte` route to support `bookingSource: proxy/walk_in` and `targetEmployeeNumber` from body
- `web/src/pages/supervisor/WalkInPage.jsx` — removed personal_guest toggle entirely, added ala carte section for breakfast, updated handleSubmit, resetAll, success screen
- `web/src/pages/supervisor/WalkInPage.module.css` — added 6 new classes
- `web/src/pages/supervisor/ProxyBookingPage.jsx` — added ala carte section in Step 3, updated handleSubmit, resetAll, success screen
- `web/src/pages/supervisor/ProxyBookingPage.module.css` — added 6 new classes

**Design decision locked:** `personal_guest` walk-in removed. Guest walk-in will be redesigned as official guest flow under F3.

**Field test:** Pending — to be done in next session.

---

## 13. F2 Field Test Checklist (Next Session)

**Walk-in (login as FFL00004):**
- [ ] Breakfast — two sections visible (Combo + Ala Carte)
- [ ] Lunch — Combo only, no Ala Carte
- [ ] Guest toggle is completely gone
- [ ] Book ala carte walk-in → Firestore: `bookingSource: walk_in`, `issueStatus: issued`
- [ ] Issuance dashboard shows ala carte walk-in items as already issued

**Proxy Booking (login as FFL00004):**
- [ ] Step 3 Breakfast — two sections visible
- [ ] Step 3 Lunch — Combo only
- [ ] Book ala carte proxy → Firestore: `bookingSource: proxy`, `issueStatus: pending`, `employeeNumber` = target employee (not supervisor)
- [ ] Issuance dashboard shows ala carte proxy items as pending, can be issued

---

## Bug Correction History (Summary)

### F1 + F2 — Ala Carte Feature Development — 7 June 2026 ✅

See Enhancement Development Log above.

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
