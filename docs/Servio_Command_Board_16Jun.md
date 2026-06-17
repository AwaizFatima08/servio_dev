# Servio — Project Command Board
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: ffl) |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| Stack | Node.js + Express (Firebase Cloud Functions) \| React/Vite (Web) \| Expo React Native (Mobile) \| Firestore + Auth |
| Dev Firebase | servio-dev-55d2d |
| Prod Firebase | servio-prod-3a6de |
| GitHub | AwaizFatima08/servio_dev |
| NAS Path | /mnt/storage/projects/servio_dev/ |
| Last Updated | 16 June 2026 |
| Last Backup | Due — run before closing this session |

---

## 🎉 MILESTONE — 16 June 2026

**V1.1 FAMILY MEMBER CRUD — BACKEND COMPLETE — MOVING TO FIELD TEST**

First V1 Extension module backend built, applied to dev, and ready for field testing. Built as a complete vertical slice (per-version approach chosen over all-four-backends-first, because V1.2–V1.4 are not all paper-locked and dependency risk compounds). Web frontend + mobile follow after backend field test passes.

**Built this session:**
- **4 new files** in `core/functions/src/family/`:
  - `familyService.js` — full CRUD, per-employee cap (configurable, default 12), deletion-request flow (employee requests → admin verifies zero-txn → approve/reject), tenant-scoped, ownership-guarded.
  - `maritalStatusService.js` — single↔married. single→married immediate; married→single pending admin approval; on approval cascade-deactivates all active family members in one batch.
  - `profileNudgeService.js` — 4-condition home-banner check (displayName, phoneNumber, maritalStatus, +active family member if married).
  - `familyRoutes.js` — 15 endpoints, route-ordered (specific before parameterised). `/family` mount.
- **5 existing files edited (additive):**
  - `constants.js` — added `MARITAL_STATUS` vocab + export. (`FAMILY_MEMBERS`, `MEMBER_RELATIONS` already existed, reused.)
  - `index.js` — import + mount `familyRoutes` at `/family`.
  - `appSettingsService.js` — whitelisted `maxFamilyMembersPerEmployee` + `familyMemberFeatureActive`.
  - `employeeService.js` — `setEmployeeStatus` now cascades family deactivation; rewritten to a **single batch** (employee + family committed together, no split-state) and **two-equality query** (no composite index needed).
- All new files syntax-checked clean. Timestamps in new code use `new Date()` (Rule #11); the one cascade inside existing `employeeService.js` reuses that file's `ts()` to stay internally consistent — deliberate, logged.

**Decisions locked this session:**
- Per-version build order: V1.1 complete (backend→web→mobile) before V1.2 starts.
- Relation is immutable after creation (wrong relation = delete + re-add).
- married→single: family stays accessible during pending; auto-deactivates on approval; no auto-restore on employee reactivation (manual review).

**Open stub to close before V1.2:** `familyService._memberHasTransactions()` returns `false` (no consumer-tagged collections exist yet). Must query `cafeOrders`/`tuckshopOrders`/`bbqOrders` for `consumerFamilyMemberId` before V1.2 family tagging goes live, so a member with real transactions can never be hard-deleted.

**Security flag (raised, not yet actioned):** GDrive backup folder contains live `service-account.json` private key + web API key in plaintext, reachable by anyone with the link. Recommend rotating the dev service-account key and excluding it from backups.

---

## 🎉 MILESTONE — 15 June 2026

**DEV / PROD ENVIRONMENTS FULLY SEPARATED — PROD DEPLOYED — PROD FROZEN FOR ~15-DAY TEST**

Two permanent, independent Firebase projects established. Dev remains the private development workbench. Prod stands up as a frozen V1 test environment for a ~15-day trial run with ~15 testers, after which prod data is WIPED and prod is relaunched as real production. All development continues on DEV.

**Completed this session:**
- Web config made environment-based (`.env.development` / `.env.production`). All 16 web service files + Firebase config read from env. No hardcoded URLs.
- `.firebaserc`: `dev` + `prod` named aliases; `default` = dev (safe). Habit: always `firebase use` before deploy.
- `firebase.json` firestore database corrected to `servio-dev`. Stray `web/.env` deleted.
- `index.js` → `admin.initializeApp()` (no args): deployed functions use whichever project they run in. Cross-wire removed. `getFirestore('servio-dev')` unchanged.
- Functions deployed to PROD: `api`, `resolveDaily`, `generateSnapshots` (asia-south1). Live URL confirmed = .env.production.
- Web hosting deployed to PROD. Login page verified live against prod Auth + backend (empty-DB "invalid login" = success signal).
- Prod service-account key → `keys/service-account-prod.json` (gitignored). Verified project_id = servio-prod-3a6de.
- Data copied dev→prod (IDs preserved): **employees (343)** + **menuItems**. NOTHING else copied.
- Utility scripts: `copy_dev_to_prod.js`, `export_to_csv.js`, `import_from_csv.js` (in core/functions).
- Custom domain `servio.homilabs.org`: CNAME at Hostinger → servio-prod-3a6de.web.app; added to Firebase Auth authorized domains. DNS/SSL propagation pending — **test tomorrow**.

---

## 1. Current Status

PHASE: PROD frozen (15-day test) — DEV on V1.1 (Family CRUD backend DEPLOYED + field-tested ✅ → web frontend next)

Prod deployed and frozen for tester trial. On dev: **V1.1 Family CRUD backend complete and applied**, now moving to field test. After backend field test passes → V1.1 web frontend (My Family tab in `MyProfilePage.jsx`) → mobile. V1 Enhancement web complete + field-tested. Mobile F1/F2 and prod mobile config remain open, sequenced behind V1 Extension per current direction.

---

## 2. Next Session — Starting Point

Always run backup before starting:

```bash
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh
```

**Confirm active project before any deploy:** `firebase use` (default = dev).

### Immediate Work Order (Priority Order)

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | Test `servio.homilabs.org` hosting (DNS/SSL) | Prod | Confirm login loads + works |
| 2 | **Field-test V1.1 Family CRUD backend** | Dev (Backend) | Run section H checklist — Postman/curl. FFL00100 employee, FFL00001 admin |
| 3 | V1.1 web frontend — My Family tab | Dev (Web) | After backend field test passes. Pull `MyProfilePage.jsx`, add tab |
| 4 | V1.1 mobile | Dev (Mobile) | After web |
| 5 | Admin/super_admin bootstrap in PROD | Prod | Deferred delicate step — recreate fresh, set users-doc role |
| 6 | Manager recreates menu cycle in PROD | Prod | His test experience |
| 7 | 15 testers register fresh in PROD | Prod | Full signup experience |
| 8 | Mobile F1/F2 BF ala carte + prod mobile config | Mobile | Sequenced after V1.1 / per direction |
| 9 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Dev first → test → roll to both. Deadline Oct 2026 |

### V1.1 Field Test — checklist location
Section H of `V1.1_Backend_Change_Set.md`. Key cases: spouse DOB optional / son+daughter DOB required; cap at 12; deletion-request lifecycle; married→single pending→admin approve cascades family deactivation; employee deactivation cascades family (check `familyMembersDeactivated` count), reactivation does NOT auto-restore. Watch Functions log for any composite-index URL on the `profileNudgeService` married-family check (3 equality filters + limit) — create from URL if it appears.

### PROD open threads (carry-forward)
- Admin/super_admin bootstrap (delicate first-super_admin manual step).
- Manager recreates menu cycle; 15 testers register fresh.
- Mobile env-config before any prod mobile build (api.js + firebase.js hardcoded dev; need app.config.js + EAS profiles; reconcile package org.homilabs.servio vs com.homilabs.servio; prod google-services.json).
- Relocate utility scripts (copy/export/import) out of core/functions so they aren't bundled into deploys.
- After test: WIPE prod + relaunch as real prod.
- "Servio" name contested in hospitality software — branding consideration, not blocker.
- Seed appSettings maxFamilyMembersPerEmployee + familyMemberFeatureActive on prod when V1.1 reaches prod (dev-only so far).

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
| F7 | Booking cutoff editable in App Settings | Web | ✅ DONE + field tested |
| F8 | Individual feedback review for admin | Web | ✅ DONE + field tested |
| Guest Approvals | Admin official guest billing approval page | Web | ✅ DONE + field tested |
| F13 | Node.js 20 → 22 upgrade | Infrastructure | ⏳ Not started — deadline Oct 2026 |

**Mobile remaining:** F1 (BookMealScreen.js) + F2 (WalkInScreen + ProxyBookingScreen).

---

### 3.2 V1 Extension — SCOPE LOCKED — DESIGN COMPLETE V1.1–V1.4

**Build resumes on DEV now (prod frozen for test). Start: V1.1 Family CRUD.**

Reference document: `Servio_V1_Extension_Scope_09Jun2026.md`

| Version | Scope | Design Status | Build Status |
|---------|-------|---------------|-------------|
| V1.1 | Family Member CRUD | ✅ LOCKED | **Backend DONE → field test. Web/mobile next** |
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
| PROD Test | ~15 testers on frozen prod V1 | Prod deployed | 🔄 In progress (~15 days) |
| Prod Relaunch | Real production | After test → wipe + relaunch | Pending |
| Phase 3 | Full FFL management club | After relaunch stable | Pending |

---

## 6. Infrastructure

### DEV (development workbench — all dev continues here)
| Resource | Value |
|----------|-------|
| Firebase project | servio-dev-55d2d |
| API | https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api |
| Web app | https://servio-dev-55d2d.web.app |
| Web API key (public) | AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o |
| Service account | core/functions/service-account.json |
| NAS dev path | /mnt/storage/projects/servio_dev/ |
| Backup script | `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh` |
| GDrive dev folder | 1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI |
| GDrive src folder | 1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0 |

### PROD (frozen V1 test — do not develop here)
| Resource | Value |
|----------|-------|
| Firebase project | servio-prod-3a6de |
| API | https://asia-south1-servio-prod-3a6de.cloudfunctions.net/api |
| Web app | https://servio-prod-3a6de.web.app |
| Custom domain | servio.homilabs.org (CNAME at Hostinger; DNS/SSL pending) |
| Service account (SECRET) | keys/service-account-prod.json (gitignored) |
| Data loaded | employees (343) + menuItems only |

### Shared notes
- Both projects use Firestore named instance **`servio-dev`** (Option B). `getFirestore('servio-dev')` unchanged. Disambiguate by PROJECT name, not DB label.
- Deployed `index.js` uses `admin.initializeApp()` (no args) → uses project deployed-to.
- ALWAYS `firebase use` before deploy. `.firebaserc` default = dev.
- Web deploy: `npm run build` (in web/) → `firebase deploy --only hosting`.
- Functions deploy: `firebase deploy --only functions`.
- Mobile build: `eas build --platform android --profile preview`.

---

## 7. Key Technical Rules — Never Break

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`. (Both dev AND prod use this named instance.)
2. **PKT mobile:** `new Date(date.getTime() + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` on mobile (Hermes → NaN)
3. **PKT backend:** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` safe on Node.js
4. **serviceWindowStart** stored as UTC in Firestore (e.g. "01:00" = 06:00 PKT)
5. **Read before writing:** always read existing file before editing — additive only, never rewrite working files
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
17. **`firebase use` before EVERY deploy** — confirm dev vs prod. default = dev (safe).
18. **Prod service-account key is a real secret** — keys/service-account-prod.json, gitignored. Never commit, never bundle into deploys.

---

## 8. Version Roadmap

| Version | Scope | Status |
|---------|-------|--------|
| V1 | Mess operations — all core flows | ✅ Live (dev) + deployed to prod (frozen test) |
| V1 Enhancement | F1–F8 + Guest Approvals + F13 | ✅ Web complete. Mobile F1/F2 pending. |
V1.1 | Family Member CRUD | 🔒 Locked. Backend deployed to dev + field test PASSED (17 Jun). Web/mobile pending. |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 Design locked |
| V1.3 | Tea Bar + Tuck Shop | 🔒 Design locked |
| V1.4 | BBQ | 🔒 Design locked |
| V1.5 | Dashboards + analytics + reporting + billing | Design after V1.4 build |
| V1.6 | Notifications + reporting alignment | Design after V1.4 build |
| V2 | Guest House + BOQ + Library | Future |
| V3 | Sports + Kiosk + SMS/WhatsApp | Future |
| V4 | Recipe + Inventory + automated rates | Future |

---

## 9. Test Users (DEV)

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

**NOTE:** Prod has NO test users — 15 testers register fresh; only admin/super_admin to be bootstrapped.

**Token refresh (DEV testing):**
```bash
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o" -H "Content-Type: application/json" -d '{"email":"admin@fatima-group.com","password":"1234@com","returnSecureToken":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

---

## 10. mealTypes UTC Times (Firestore)

| Meal | serviceWindowStart (UTC) | serviceWindowEnd (UTC) | Cutoff (3hr before start) |
|------|--------------------------|------------------------|---------------------------|
| breakfast | 01:00 | 04:00 | 22:00 previous day |
| lunch | 08:00 | 10:00 | 07:00 previous-day cutoff per ops |
| dinner | 14:00 | 17:00 | per ops cutoff |

*(BF 0600–0900 PKT, Lunch 1300–1500 PKT, Dinner 1900–2200 PKT; cutoffs per locked mess ops.)*

---

## 11. Dev/Prod Separation — Session Log (15 June 2026)

Full environment separation executed and verified:
- Environment-based config (web service files + Firebase config via Vite env).
- `.firebaserc` named aliases; `firebase.json` database = servio-dev; stray web/.env removed.
- `admin.initializeApp()` no-args (project-aware functions).
- Prod functions + hosting deployed and verified.
- Prod credential generated + secured (gitignored keys/).
- employees(343) + menuItems copied dev→prod, IDs preserved.
- Utility scripts: copy_dev_to_prod.js, export_to_csv.js, import_from_csv.js.
- servio.homilabs.org CNAME + Auth authorized domain (DNS/SSL pending).

**Decision:** prod frozen at V1 for ~15-day test; dev development resumes on V1 Extension (V1.1 Family CRUD). After test → wipe prod → relaunch as real production.

---

## 12. V1 Extension Design Session Log

### Design Session — 9 June 2026

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

## 13. V1.1 Family CRUD — Build Session Log

### Build Session — 16 June 2026

**Backend built and applied to dev. Moving to field test.**

New folder `core/functions/src/family/`: `familyService.js`, `maritalStatusService.js`, `profileNudgeService.js`, `familyRoutes.js`.
Edited (additive): `constants.js` (MARITAL_STATUS), `index.js` (mount /family), `appSettingsService.js` (2 settings keys), `employeeService.js` (cascade + single-batch rewrite of setEmployeeStatus).

**Endpoints (base `/api`, all need Bearer token):**

Employee self-service: `GET /family/me`, `POST /family/me`, `PATCH /family/me/:id`, `PATCH /family/me/:id/status`, `POST /family/me/:id/delete-request`, `DELETE /family/me/:id/delete-request`, `GET /family/marital-status/me`, `PATCH /family/marital-status/me`, `GET /family/profile-completion/me`.

Admin: `GET /family/deletion-requests`, `POST /family/deletion-requests/:id/approve`, `POST /family/deletion-requests/:id/reject`, `GET /family/marital-status/pending`, `POST /family/marital-status/pending/:empNo/approve`, `POST /family/marital-status/pending/:empNo/reject`.

**Locked design rules (V1.1):**
- spouse/son/daughter; max 12 (configurable via appSettings); DOB required for son+daughter, optional for spouse.
- Relation immutable after creation; edit allows fullName + dateOfBirth only.
- Deletion: employee requests → isActive=false + deletionRequested=true → admin verifies zero-txn → permanent delete or reject-with-note.
- married→single: pending admin approval; family accessible during pending; auto-deactivate all active family on approval; no auto-restore on employee reactivation.
- Profile nudge = home banner (not a bell notification).

**Carry-forward:**
- Close `_memberHasTransactions()` stub before V1.2 family tagging.
- Confirm composite index need on profileNudge married-family query during field test.
- Decide whether to force `new Date()` in `employeeService.js` cascade (currently reuses file's `ts()`).
- Reference: `V1.1_Backend_Change_Set.md`.

---

*Last updated: 16 June 2026 — V1.1 Family CRUD backend complete + applied to dev. Moving to backend field test, then web frontend (My Family tab), then mobile. Prod still frozen for 15-day test.*

🎉 MILESTONE — 17 June 2026
V1.1 FAMILY MEMBER CRUD — BACKEND DEPLOYED TO DEV + FIELD TEST PASSED
The V1.1 family backend was deployed to dev and field-tested end to end via curl against the live dev functions (FFL00100 employee + FFL00001 admin). All phases passed. Four items logged (none blocking). Ready to proceed to V1.1 web frontend.
Correction to 16 June status: "applied to dev" meant saved in VS Code, not deployed. The /family/* routes returned 404 until firebase deploy --only functions was run on dev today. Actual deploy date = 17 June 2026.
Field test coverage (all PASS):

Marital state machine: single→married immediate; married→single pending; admin approve applies + cascades family deactivation atomically; pending clears; reject keeps married.
Family CRUD: add with validation (spouse DOB optional; son/daughter DOB required; YYYY-MM-DD format enforced; bad relation rejected); edit (guards against clearing child DOB and editing deletion-pending members); status toggle with boolean type check.
Deletion lifecycle: request → admin queue → employee cancel / admin reject-with-note / admin approve (permanent delete). Verified across 12 members during cleanup.
Configurable cap: proven driven by appSettings, not just the fallback — cap=3 test rejected the next add with "Maximum of 3". Restored to 12.
Both cascades (marital-approval + employee-deactivation) confirmed atomic via identical-to-the-second updatedAt timestamps.
Employee deactivation cascades active family; reactivation does NOT auto-restore (confirmed: 12 members, any active: False).

Items logged from field test:

[Fix at web stage] setEmployeeStatus route drops familyMembersDeactivated from the HTTP response. Cascade runs correctly (verified in data), but the count never reaches the client — route returns only officialEmployeeNumber + isActive. Pass the full service object through so admin UI can display the count.
[MUST fix before V1.2] familyService._memberHasTransactions() is a stub returning false. Field test confirmed approve-deletion hard-deletes with zero transaction guard. Implement against cafeOrders/tuckshopOrders/bbqOrders (consumerFamilyMemberId) before V1.2 family tagging ships.
[Low priority] DOB validation is format-only (/^\d{4}-\d{2}-\d{2}$/); accepts impossible dates like 2014-13-45. Acceptable while frontend uses a calendar picker.
[Cosmetic] Service return objects carry a message that successResponse duplicates into data. Harmless; optional cleanup.

Data/config changes made on DEV this session:

appSettings seeded with maxFamilyMembersPerEmployee: 12 and familyMemberFeatureActive: true (were missing — whitelisted in change set but never seeded). Prod will need these seeded separately when V1.1 reaches prod.
FFL00100 family fully cleaned (count 0). maritalStatus left at single (no endpoint resets to null) — minor, noted.

Process flags:

firebase use was pointing at prod at session start (sticky from 15 June prod session). Caught before any deploy. Default alias = dev, but active project persists across sessions — always verify firebase use before deploying.
Node 20 deprecation warning now appears on every deploy (decommission 30 Oct 2026) — F13 clock is running.
