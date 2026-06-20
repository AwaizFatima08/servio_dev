# Servio — Command Board V1 Extension (Active)
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: `ffl`) |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| File scope | V1 Extension (V1.1+) — active development |
| Stack | Node.js + Express (Firebase Cloud Functions) · React/Vite (Web) · Expo React Native (Mobile) · Firestore + Auth |
| Dev Firebase | `servio-dev-55d2d` |
| Prod Firebase | `servio-prod-3a6de` |
| GitHub | `AwaizFatima08/servio_dev` |
| NAS Path | `/mnt/storage/projects/servio_dev/` |
| Consolidated on | 19 June 2026 |
| Last Updated | 19 June 2026 |

> **Reading note for new sessions.** This is the working command board. Paste it at the start of a new chat to restore context. V1 history lives separately in `Servio_CB_V1.md` — reference that only if a V1-era detail comes up.

---

## 1. Current Status (paragraph)

V1 is deployed to prod (frozen for the 15-day tester trial — see V1 CB) and dev development has moved entirely to V1 Extension. **V1.1 Family Member CRUD** is the active feature. **Backend is complete** (initial 16-Jun + Slice 3a vocabulary/relation/audit expansion 19-Jun). **Web frontend Slices 1, 2, and 3a have shipped** (read-only page → add/edit/deactivate → backend extension). **Slice 3b is next**: marital status card and relation-edit UI on `MyFamilyPage`. **Mobile not yet started.** V1.2–V1.4 are scope-locked and queued behind V1.1 closure.

---

## 2. Next Session — Starting Point

Standing rules at session start, every time:

```bash
# Backup before any work
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh

# Confirm active project before any deploy
firebase use
# default = dev. If prod is shown, switch back: firebase use dev
```

### Immediate Work Order

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | **V1.1 Slice 3b — Marital status UI + relation-edit UI on My Family** | Dev (Web) | Plan first, then build. See Section 5 carry list. |
| 2 | V1.1 Mobile | Dev (Mobile) | After web Slice 3b closes. Full family CRUD on Expo. |
| 3 | Test `servio.homilabs.org` hosting (DNS/SSL) | Prod | Confirm login loads + works |
| 4 | Admin/super_admin bootstrap in PROD | Prod | Deferred delicate step |
| 5 | Mobile F1/F2 + prod mobile config | Mobile | Sequenced after V1.1 |
| 6 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Deadline 30 Oct 2026 |

---

## 3. V1 Extension — Build Status

Reference: `Servio_V1_Extension_Scope_09Jun2026.md` in `docs/`.

| Version | Scope | Design | Build |
|---------|-------|--------|-------|
| V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web 1+2+3a ✅ · Web 3b ⏳ · Mobile ⏳ |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 LOCKED | Not started |
| V1.3 | Tea Bar + Tuck Shop (bakery absorbed) | 🔒 LOCKED | Not started |
| V1.4 | BBQ | 🔒 LOCKED | Not started |
| V1.5 | Dashboards + analytics + reporting + billing | Design after V1.4 build | — |
| V1.6 | Notifications + reporting alignment | Design after V1.4 build | — |
| Mobile Extension | F9–F12 admin/manager/supervisor mobile dashboards | Deferred | — |

### V1.1 Slices

| Slice | What | Status | Notes |
|-------|------|--------|-------|
| Backend (initial) | familyService, maritalStatusService, profileNudgeService, familyRoutes | ✅ 17-Jun field-tested | 4 new files, 5 surgical edits |
| Web Slice 1 | Read-only My Family page | ✅ 18-Jun field-tested | familyService.js (web), MyFamilyPage.jsx + .module.css, sidebar+route |
| Web Slice 2 | Add / Edit / Activate-Deactivate | ✅ 19-Jun field-tested | Three write functions added; per-row Edit + Deactivate; Add and Edit dialogs |
| Backend Slice 3a | Marital vocab expansion + relation editing + audit | ✅ 19-Jun field-tested (17/17) | Vocabulary corrected mid-session. V1.1 carry #1 also closed in this slice. |
| Web Slice 3b | Marital status card + relation-edit UI | ⏳ Next | See carry list in Section 5 |
| Mobile | Full V1.1 family CRUD | ⏳ Pending | After web closes |

---

## 4. Active Open Items (V1 Extension scope)

| # | Item | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 1 | `_memberHasTransactions()` stub returns false | Dev | **HIGH** — V1.2 blocker | Must query `cafeOrders`, `tuckshopOrders`, `bbqOrders` for `consumerFamilyMemberId` before V1.2 family tagging ships. Slice 3a parked deletion but the stub still ships with the codebase. |
| 2 | Backend cascade asymmetry not surfaced in UI | Dev (Web) | Medium | `setEmployeeStatus` deactivates family but does not reactivate. Admin web UI must warn admins about manual reactivation. Surfaces in admin-side web work, not Slice 3b. |
| 3 | Build mode footgun on web | Dev | Medium | `npm run build` defaults to production mode and bakes prod Firebase config into the bundle. Use `npm run build -- --mode development` for dev deploys. **Structural fix:** add `build:dev` and `build:prod` scripts to `web/package.json`. |
| 4 | Browser cache after deploys | Dev | Low | Hard reload alone may serve stale JS. Use DevTools → Disable cache + hard reload, OR Application → Clear site data, after every web deploy. |
| 5 | DOB format-only validation | Dev | Low | `^\d{4}-\d{2}-\d{2}$` accepts impossible dates like 2014-13-45. Acceptable while frontend uses a calendar picker. |
| 6 | Firebase Auth default sender silently dropped | Dev | **HIGH for prod** | No password reset emails received via `firebaseapp.com` sender at Gmail or corporate addresses. Prod risk for 15-tester pilot. Need custom SMTP / SendGrid sender domain before real prod launch. |
| 7 | GDrive backup folder contains live secrets | Dev | **HIGH** | `service-account.json` private key + web API key in plaintext, reachable by anyone with the link. Rotate dev service-account key and exclude from backups. Raised 16-Jun, still open. |
| 8 | Test Son 1 (`GjjK8WCLwUIxOQ73clFa`) relationHistory bloated | Dev | Low | 18+ audit entries from repeated test runs. Cosmetic. Clean manually in Firebase console when convenient. |
| 9 | `pendingMaritalStatus` field unused but lives on | Dev | Low | Slice 3a removed all writes to this field. Defensive null write on every marital change handles stale data. Field could be dropped entirely in future cleanup. |
| 10 | `cnicLast4` storage type inconsistent | Dev | Low | Schema docs say 4-digit string e.g. "4521". Worth a one-off audit to confirm consistency in the live employees collection. |
| 11 | Orphan `users` docs on dev | Dev | Low | From earlier delete-and-recreate cycles. Non-blocking. |
| S1 | Booking duplicate-check not atomic | Dev | Before full rollout | Carry from V1 — see V1 CB |
| S2 | `employeeService` `.limit()` + in-memory filter breaks past 50 employees | Dev | Before full rollout | Carry from V1 |
| S3 | Notification fanout 500-op batch limit | Dev | Before full rollout | Carry from V1 |
| S4 | Node.js 20 deprecation (= F13) | Infrastructure | **Before 30 Oct 2026** | Carry from V1. Dev first → test → roll to both. |

### Recently Closed

- ✅ V1.1 carry #1 — `setEmployeeStatus` route now includes `familyMembersDeactivated` in HTTP response. Closed 19-Jun in Slice 3a session.
- ✅ Service-layer `familyMembersDeactivated` count — was already in service return, never the issue. Closed via discovery 19-Jun.

---

## 5. Carry into Slice 3b (Next Slice)

Slice 3b is the web frontend for the marital status decoupling and relation-edit work that Slice 3a built into the backend. Specific items:

1. **Marital Status card on `MyFamilyPage`** — top of page, above the family list. Inline edit pattern mirroring Contact Info card on My Profile. Dropdown with all four values (`single` / `married` / `divorced` / `widowed`). No transition restrictions. No cascade warning (none exists). Submit writes directly via the existing `PATCH /family/marital-status/me` endpoint.
2. **Web service additions** — add `setMyMaritalStatus` function in `web/src/services/familyService.js`. Extend existing `updateFamilyMember` to accept and send `relation`.
3. **Page-gating rule update** — `MyFamilyPage` shows if `maritalStatus !== 'single'` OR any active family rows exist. Hides only when `single` AND no active rows. This protects divorced/widowed employees with active children from losing access to their page.
4. **Edit Member dialog upgrade** — replace the disabled relation field with a radio group (Spouse / Son / Daughter). Add frontend DOB safeguard: if selected relation is son/daughter, DOB field becomes required; if cleared while relation is child, block submit with inline error matching backend message.
5. **My Profile gets nothing for marital status** — decision changed mid-session to keep marital status on My Family page only. Don't add a section to MyProfilePage.
6. **No admin queue UI** — admin marital approval endpoints are parked (see locked decisions). No admin-side work in Slice 3b.

---

## 6. Locked Decisions (preserved with dates)

### Family deletion flow — PARKED (19 June 2026)

Records are permanent once created. Soft-delete via `Deactivate` only. Matches HMIS convention and schema reference Principle 9 ("Soft delete via isVisible — records never hard-deleted"). Five backend endpoints remain deployed but unreachable from any UI route:

- `POST   /family/me/:id/delete-request`
- `DELETE /family/me/:id/delete-request`
- `GET    /family/deletion-requests`
- `POST   /family/deletion-requests/:id/approve`
- `POST   /family/deletion-requests/:id/reject`

Retained for possible future admin cleanup tooling. Re-evaluate if wrong-relation entries become a real complaint in field use. `_memberHasTransactions()` stub remains a V1.2 fix requirement regardless of UI exposure.

### Marital status — vocabulary, control, cascade (19 June 2026)

**Four values, employee-controlled, no admin approval, no pending state, no cascade.**

```
MARITAL_STATUS = {
  SINGLE:   'single',
  MARRIED:  'married',
  DIVORCED: 'divorced',
  WIDOWED:  'widowed',
}
```

Any value may be set from any state. Employee declares status directly; backend writes immediately. Marital status is a **personal label**; the **family list is operational truth**. They are intentionally decoupled. Real-world analogue from HMIS: a patient's marital status record can lag reality by weeks without causing operational harm because consumption is gated by per-record state, not by status.

**Admin endpoints PARKED but not removed** (same pattern as deletion):
- `listPendingMaritalChanges`
- `approveMaritalChange`
- `rejectMaritalChange`

Retained for possible future admin tooling. Their bodies still work if called directly.

### Relation editability (19 June 2026)

Relation became editable in Slice 3a. DOB safeguard: edits that result in `son` or `daughter` relation require a non-null DOB. Every real relation change appends to `relationHistory[]` array on the member doc:

```
{ from, to, changedAt, changedByUid }
```

`relationHistory` is empty for pre-Slice-3a docs and grows lazily. No size cap.

### Per-version vertical slice build (16 June 2026)

V1.1 backend → web → mobile complete before V1.2 starts. Parallel multi-backend builds compound dependency risk. Chosen over the all-four-backends-first approach.

### Cap counting (19 June 2026)

The 12-member cap counts active + inactive members together (backend behaviour). Every entry an employee ever made counts against their slot permanently. Generous enough (1 spouse + up to 11 children).

### Edit on deactivated members (19 June 2026)

Allowed. Employee may correct a name typo on a deactivated row without reactivating first. Backend permits this (only refuses if `deletionRequested === true`, which UI can never set).

### Dev / Prod separation (15 June 2026)

Two permanent independent Firebase projects. Both use Firestore named instance `servio-dev`. Disambiguate by **project name**, not DB label. Prod frozen at V1 for ~15-day tester trial, then wipe + relaunch as real prod.

---

## 7. V1.1 — Build Session Log (full narratives, chronological)

### Session 16 June 2026 — V1.1 Backend Built

New folder `core/functions/src/family/`: `familyService.js`, `maritalStatusService.js`, `profileNudgeService.js`, `familyRoutes.js`. Edited (additive): `constants.js` (MARITAL_STATUS), `index.js` (mount `/family`), `appSettingsService.js` (2 settings keys), `employeeService.js` (cascade + single-batch rewrite of `setEmployeeStatus`).

**Endpoints (base `/api`, all need Bearer token):**

- Employee self-service: `GET /family/me`, `POST /family/me`, `PATCH /family/me/:id`, `PATCH /family/me/:id/status`, `POST /family/me/:id/delete-request`, `DELETE /family/me/:id/delete-request`, `GET /family/marital-status/me`, `PATCH /family/marital-status/me`, `GET /family/profile-completion/me`.
- Admin: `GET /family/deletion-requests`, `POST /family/deletion-requests/:id/approve`, `POST /family/deletion-requests/:id/reject`, `GET /family/marital-status/pending`, `POST /family/marital-status/pending/:empNo/approve`, `POST /family/marital-status/pending/:empNo/reject`.

Original design rules (some now superseded — see locked decisions):
- spouse/son/daughter; max 12 (configurable via appSettings); DOB required for son+daughter, optional for spouse.
- Deletion: employee requests → `isActive=false` + `deletionRequested=true` → admin verifies zero-txn → permanent delete or reject-with-note.
- married→single: pending admin approval; family accessible during pending; auto-deactivate all active family on approval; no auto-restore on employee reactivation.
- Profile nudge = home banner (not a bell notification).

**Carry forward** (16-Jun):
- Close `_memberHasTransactions()` stub before V1.2 family tagging.
- Confirm composite index need on profileNudge married-family query during field test.

### Session 17 June 2026 — V1.1 Backend Deploy + Field Test Passed

**Correction to 16 June status:** "applied to dev" meant saved in VS Code, not deployed. The `/family/*` routes returned 404 until `firebase deploy --only functions` was run on dev today. Actual deploy date = 17 June 2026. **Lesson: deploy ≠ apply.** The two-step always needs the explicit `firebase deploy` to be considered live.

**Field test coverage (all PASS via curl against live dev functions, FFL00100 employee + FFL00001 admin):**

- Marital state machine (then-current rules): single→married immediate; married→single pending; admin approve applies + cascades family deactivation atomically; pending clears; reject keeps married.
- Family CRUD: add with validation; edit with guards; status toggle with boolean type check.
- Deletion lifecycle: request → admin queue → cancel / reject-with-note / approve. Verified across 12 members during cleanup.
- Configurable cap proven driven by `appSettings` (cap=3 test rejected the next add). Restored to 12.
- Both cascades (marital-approval + employee-deactivation) atomic via identical-to-the-second `updatedAt` timestamps.
- Employee deactivation cascades active family; reactivation does NOT auto-restore.

**Items logged from field test:**

1. `[Fix at web stage]` `setEmployeeStatus` route drops `familyMembersDeactivated` from HTTP response. Cascade runs correctly (verified in data), but count never reaches the client. (Closed 19-Jun, Slice 3a.)
2. `[MUST fix before V1.2]` `_memberHasTransactions()` is a stub returning false. (Still open. See Active Open Items.)
3. `[Low priority]` DOB validation format-only. (Still open. Acceptable with calendar picker.)
4. `[Cosmetic]` Service return objects carry `message` that `successResponse` duplicates into `data`. Harmless.

**Data changes on DEV this session:**
- `appSettings` seeded with `maxFamilyMembersPerEmployee: 12` and `familyMemberFeatureActive: true` (were missing — whitelisted in change set but never seeded). Prod will need these seeded separately.
- FFL00100 family fully cleaned (count 0). maritalStatus left at single.

**Process flags raised:**
- `firebase use` was pointing at prod at session start (sticky from 15-Jun prod session). Caught before any deploy. **Always verify `firebase use` before deploying.**
- Node 20 deprecation warning now appears on every deploy (decommission 30 Oct 2026) — F13 clock is running.

### Session 18 June 2026 — Web Slice 1 (Read-only My Family page)

Web frontend Slice 1 deployed to dev and field-tested. All 7 tests passed.

**Delivered:**
- New: `web/src/services/familyService.js` (read-only — `getMyMaritalStatus`, `getMyFamily`)
- New: `web/src/pages/employee/MyFamilyPage.jsx` + `.module.css`
- Edit: `web/src/components/layout/Sidebar.jsx` (added My Family menu item under employee My Space)
- Edit: `web/src/App.jsx` (added `/my-family` route and import)

**Field test confirmed:**
- Null/single state → polite empty card pointing to My Profile
- Married + empty → "No family members yet" card
- Member rendering: active, deactivated (grey badge + dim row), deletion-pending (red badge + dim row, takes precedence)
- Pending married→single → amber banner above member list
- Network failure → "Failed to fetch" red banner, page chrome intact, no crash
- Admin sidebar excludes My Family ✓

**Discovered and recorded:**
- **Web build mode bug** — `npm run build` defaults to production mode and bakes prod Firebase config into the bundle. Workaround: `npm run build -- --mode development`. **Structural fix needed:** add `build:dev` and `build:prod` scripts to `web/package.json`. (Open item #3.)
- **Browser cache after deploy** — hard reload alone may serve stale JS. Use DevTools → Disable cache + hard reload, OR Application → Clear site data. (Open item #4.)
- **Firebase Auth email delivery broken** — `firebaseapp.com` sender silently dropped by Gmail and corporate filters. No password reset emails received at any of 3 tested addresses. **Prod risk** for tester pilot. (Open item #6.)

**Account changes today (DEV):**
- FFL00001 RETIRED — was dummy bootstrap admin slot, no longer in use.
- CLB00010 = admin / Qasim Ejaz (NEW). Personal email `admin@fatima-group.com`. Replaces FFL00001 as admin test account.
- FFL01584 = Qasim Ejaz's personal employee account (customer hat) — separate identity by design.
- FFL00100 = elevated from employee to admin during troubleshooting. To be kept as elevated admin.
- Orphan `users` docs from earlier delete-and-recreate cycles need cleanup. Non-blocking.

### Session 19 June 2026 (morning) — Web Slice 2 (Add / Edit / Activate-Deactivate)

Shipped to dev and field-tested on FFL00003 (Ahmed Khan, employee). All three write actions functional. Deletion flow deliberately NOT exposed in UI (decision locked — see Section 6).

**Delivered (additive only):**
- `web/src/services/familyService.js` — added `addFamilyMember`, `updateFamilyMember`, `setFamilyMemberStatus`. Slice 1 read functions preserved byte-for-byte.
- `web/src/pages/employee/MyFamilyPage.jsx` — header "Add member" button with cap visual, per-row Edit + Deactivate/Reactivate buttons, Add and Edit dialogs (inline components), flash banner for write feedback, per-row busy lock.
- `web/src/pages/employee/MyFamilyPage.module.css` — additive style rules.
- Deployed: `firebase deploy --only hosting` (functions unchanged).

**Field test results:**
- Add member (spouse, son, daughter): PASS — DOB required only for children.
- Edit member name + DOB: PASS — relation field visible but disabled (relation immutable at this point in time).
- Edit name on deactivated member: PASS — allowed as designed.
- Deactivate / Reactivate: PASS.
- Cap at 12: PASS — Add button disabled, inline note.
- Offline mode (DevTools): PASS — page-level error shown, no crash.
- Multiple active spouses allowed: confirmed.

**Discipline failure acknowledged this session:** A design concern about relation immutability surfaced mid-Slice-2 planning, was written down as a side note, then code was written anyway. The agreed rule is: when a design concern surfaces, hold the coding and surface it for decision. Caught after Slice 2 shipped. The fix was Slice 3a (relation editable with DOB safeguard).

**Open issues from Slice 2:**
1. Marital status has no UI on My Profile. Required manual edit in Firebase console for test. → Slice 3b (relocated to My Family page).
2. Multiple active spouses allowed. Backend does not enforce monogamy. → Locked as "polygamy allowed" 19-Jun.
3. Relation immutable in backend. → Resolved by Slice 3a.
4. Marital vocabulary too narrow (only single/married). → Resolved by Slice 3a.
5. `familyMembersDeactivated` count still not in employee status route response. → Resolved by Slice 3a.

### Session 19 June 2026 (later) — Backend Slice 3a + Vocabulary Correction + V1.1 Carry #1 Closure

Vocabulary expansion + relation editing built into the backend, field-tested via curl-based shell script. 17/17 assertions pass on both safe and destructive runs. V1.1 carry item #1 verified closed in the same session.

**Vocabulary correction.** Earlier-morning locked decision had said married→divorced/widowed would cascade spouse deactivation + require admin approval + restrict transitions ("`single` is a starting state only"). Superseded later the same day: **no cascade, no admin approval, no transition restrictions**. Marital status and family list intentionally decoupled. See Section 6 for the final locked decision.

**Backend file edits (Slice 3a):**

| File | Change |
|---|---|
| `core/functions/src/constants.js` | `MARITAL_STATUS` expanded 2 → 4 values |
| `core/functions/src/family/maritalStatusService.js` | `setMyMaritalStatus` rewritten — no transition restrictions, no pending state, no cascade. Three admin functions tagged `[PARKED]` |
| `core/functions/src/family/familyService.js` | `updateFamilyMember` accepts `relation` with DOB safeguard + `relationHistory` audit; `_validateMemberInput` extended; `_shape` includes `relationHistory` array |
| `core/functions/src/family/familyRoutes.js` | One-line destructure extension to pass `relation` through |
| `core/functions/src/employee/employeeRoutes.js` | 3-line fix: response now includes `familyMembersDeactivated`. **Closes V1.1 carry #1.** |

**Test tooling created:**
- `scripts/slice3a_field_test.sh` — 17-test curl-based field test. Authenticates via Firebase REST sign-in. Cap-aware (picks existing son rather than failing on add-to-cap). Includes post-cascade family reactivation because backend cascade is one-way by design.

**Field test results (FFL00003 → admin path via CLB00010 / FFL00100):**

All 17 tests pass on both safe and `--include-destructive` runs:

- 01–04: Vocabulary transitions all immediate, `pending: false` in every response.
- 02: Spouses still active after `married → divorced` (cascade absence confirmed at data layer; 3 active spouses survived).
- 05: Invalid `maritalStatus: "foo"` rejected with correct error message.
- 06: Same-value write rejected.
- 07: Test target picked from existing dataset (Test Son 1, ID `GjjK8WCLwUIxOQ73clFa`).
- 08, 09: Relation editing son → daughter → spouse, `relationHistory` appends exactly once per real change.
- 10: DOB safeguard fires (spouse → daughter with `dateOfBirth: null` rejected).
- 11: Name-only edit, history length unchanged.
- 12: Invalid relation rejected.
- 13: Same-value relation edit returns 400 (no fields changed).
- 14: Cleanup, status to single.
- 15: Destructive. `PATCH /employees/FFL00003/status {isActive:false}` returns HTTP 200 with `familyMembersDeactivated: 12` in the response. Script reactivates Ahmed + manually reactivates all 12 family members.

**Process notes from session:**

- **Two false-positive bugs in the field test script** were caught and fixed during testing:
  (a) `jq_get` was using jq's `//` operator without `tostring`, which null-coalesces literal `false` values. Fixed by wrapping the expression in `tostring`.
  (b) Test 15's pass condition was using `jq` (not `jq -r`), so the fallback string `"missing"` came out JSON-quoted and the equality check fell through to a fake pass. Fixed by switching to `jq -r` and validating the field is a non-negative integer.
  Worth recording: both produced apparent passes that were not real passes.

- **Test 15 cleanup gap.** Original script reactivated Ahmed but did not reactivate the cascaded family members (backend doesn't auto-restore — documented scope decision). First destructive run left all 12 members inactive, contaminating the next run's baseline. Fixed by adding explicit per-member reactivation loop after the destructive call.

- **Role drift on dev.** FFL00003 (Ahmed Khan) was elevated to admin during field testing then reset back to employee, then back to admin again. Two failed test-15 runs were due to role drift, not code. Future scripts should verify role before destructive tests.

- **V1.1 carry #1 actual root cause** confirmed by reading `employeeRoutes.js`: the route handler destructured the service return and dropped `familyMembersDeactivated`. Service layer was already producing the field correctly (confirmed by earlier code review). Fix: pass the field through explicitly in the `successResponse` payload. Pattern matches the rest of the route file (named fields, not pass-through).

---

## 8. Infrastructure

### DEV (development workbench)

| Resource | Value |
|----------|-------|
| Firebase project | `servio-dev-55d2d` |
| API | `https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api` |
| Web app | `https://servio-dev-55d2d.web.app` |
| Web API key (public) | `AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o` |
| Service account | `core/functions/service-account.json` |
| NAS dev path | `/mnt/storage/projects/servio_dev/` |
| Backup script | `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh` |
| GDrive dev folder | `1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI` |
| GDrive src folder | `1tVfOH3kfMxiEQJ6U_3PKycmCj21CdZJ0` |

### PROD (frozen V1 test — do not develop here)

| Resource | Value |
|----------|-------|
| Firebase project | `servio-prod-3a6de` |
| API | `https://asia-south1-servio-prod-3a6de.cloudfunctions.net/api` |
| Web app | `https://servio-prod-3a6de.web.app` |
| Custom domain | `servio.homilabs.org` (CNAME at Hostinger; DNS/SSL pending at time of split) |
| Service account (SECRET) | `keys/service-account-prod.json` (gitignored) |
| Data loaded | employees (343) + menuItems only |

### Shared notes

- Both projects use Firestore named instance `servio-dev`. `getFirestore('servio-dev')` unchanged. Disambiguate by **project name**, not DB label.
- Deployed `index.js` uses `admin.initializeApp()` (no args) → uses project deployed-to.
- ALWAYS `firebase use` before deploy. `.firebaserc` default = dev.
- **Web deploy:** `npm run build -- --mode development` (in `web/`) → `firebase deploy --only hosting`. (Until `build:dev` / `build:prod` scripts are added — open item #3.)
- **Functions deploy:** `firebase deploy --only functions`.
- **Mobile build:** `eas build --platform android --profile preview`.

---

## 9. Key Technical Rules — Never Break

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`. (Both dev AND prod use this named instance.)
2. **PKT mobile:** `new Date(date.getTime() + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` on mobile (Hermes → NaN).
3. **PKT backend:** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` safe on Node.js.
4. **`serviceWindowStart`** stored as UTC in Firestore (e.g. `"01:00"` = 06:00 PKT).
5. **Read before writing.** Always read existing file before editing — additive only, never rewrite working files.
6. **Tenant isolation** on every Firestore operation — `tenantId` on all queries.
7. **camelCase throughout** — collections, fields, code.
8. **`verifyRole` is a factory:** `verifyRole(ROLES.X)` — never direct middleware — sets `req.userRole`, `req.tenantId`, `req.officialEmployeeNumber`.
9. **Route ordering:** specific before parameterised (e.g. `/events/active` before `/:eventId`).
10. **All responses:** `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`.
11. **No `FieldValue.serverTimestamp()`** in services — use `new Date()`. (Exception: existing `employeeService.js` uses local `ts()` helper for internal consistency — deliberate, logged.)
12. **`db.settings()`** called once only in `index.js` — never in service files.
13. **Design locked on paper before any code written** — for all features.
14. **Ala carte `bookingSource`:** route reads `bookingSource` + `targetEmployeeNumber` from body — self defaults to caller, proxy/walk-in must supply `targetEmployeeNumber`.
15. **Composite indexes:** any Firestore query combining `where` + `orderBy` on different fields requires a composite index — create immediately from error URL when it appears.
16. **`admin.initializeApp()` with no args** in deployed `index.js` — lets functions use whichever project they are deployed to.
17. **`firebase use` before EVERY deploy** — confirm dev vs prod. Default = dev (safe). The active project persists across sessions; always verify.
18. **Prod service-account key is a real secret** — `keys/service-account-prod.json`, gitignored. Never commit, never bundle into deploys.
19. **Deploy ≠ apply.** Saving in VS Code is not deploying. `firebase deploy --only functions` (or `hosting`) is the only thing that makes new code reachable. Verify with a request against the live endpoint after every deploy.

---

## 10. mealTypes UTC Times (Firestore)

| Meal | serviceWindowStart (UTC) | serviceWindowEnd (UTC) | Cutoff |
|------|--------------------------|------------------------|--------|
| breakfast | 01:00 | 04:00 | 22:00 previous day |
| lunch | 08:00 | 10:00 | per ops cutoff |
| dinner | 14:00 | 17:00 | per ops cutoff |

*(BF 0600–0900 PKT, Lunch 1300–1500 PKT, Dinner 1900–2200 PKT.)*

---

## 11. Test Users (DEV)

### Active

| ID | Role | Identity | Notes |
|----|------|----------|-------|
| FFL00003 | employee | Ahmed Khan | Primary employee test account (Slice 1+2+3a testing). To be kept as employee going forward. |
| FFL00100 | admin (elevated) | Humayun Shahzad | Was employee, elevated. Kept as admin. |
| CLB00010 | admin | Qasim Ejaz | Personal email `admin@fatima-group.com`. Auth UID `UNh7SEPZruWHqQLaard7VFszgI73`. Replaces FFL00001. |
| FFL01584 | employee | Qasim Ejaz | Qasim's customer-side account (separate identity by design). Real personal email. |
| FFL00004 | mess_supervisor | Tasawwar Alam | |
| FFL00005 | manager | Muhammad Jahangir | |
| FFL00015 | accounts_supervisor | Naeem Ullah | |

### Retired

| ID | Was | Retired | Notes |
|----|-----|---------|-------|
| FFL00001 | admin / Qasim Ejaz | 18-Jun-2026 | Dummy bootstrap admin slot from early dev. Replaced by CLB00010. |

**Prod has NO test users** — 15 testers register fresh; only admin/super_admin to be bootstrapped.

### Token refresh (DEV testing)

For admin tests (Qasim's admin account):

```bash
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fatima-group.com","password":"1234@com","returnSecureToken":true}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

For Ahmed (employee tests):

```bash
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o" \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@fatima-group.com","password":"<ahmed-password>","returnSecureToken":true}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

---

## 12. V1 Extension Design Reference

Reference document: `docs/Servio_V1_Extension_Scope_09Jun2026.md`.

| Module | Decision summary |
|--------|------------------|
| Family CRUD (V1.1) | Fully locked. See Slice 3a corrections above for the actual current rules. |
| Café + Outdoor Mini Café (V1.2) | Fully locked — outdoor mini café separated from tuck shop, uses `cafeOrders` with `diningMode: outdoor_seating` |
| Tea Bar (V1.3) | Fully locked — 6 locations, `teabar_attendant` role, mobile required |
| Tuck Shop (V1.3) | Fully locked — 2 tabs only (counter + bakery), barcode + numeric codes, go-green no receipts, same-day returns debit model |
| Bakery | Absorbed into tuck shop — no standalone version. Bakery backend V4 only. |
| BBQ (V1.4) | Fully locked — per-event menu, `proposedRate` display, `isPreorderOnly` flag, no order restrictions |
| OG Guest Model | Fully locked — Type1 manual slip, Type2 OG numbers real-time |
| Official Guest Fields | `employees` adds: `costCentreCode` + `sponsoringEmployeeNumber` + `sponsoringDepartment` (`official_guest` only) |
| V1.5 + V1.6 | Deferred — design after V1.4 build complete |
| Rate Entry | Universal model locked for all services |
| Home Delivery | Parked — post V1 Extension |

---

## 13. Documents

| Path | Purpose |
|------|---------|
| `docs/Servio_CB_V1.md` | V1 reference (closed chapter) |
| `docs/Servio_CB_V1_Extension.md` | **This file. Active working CB.** |
| `docs/Servio_V1_Schema_Reference.docx` | V1 authoritative schema (28 collections, 6 layers) |
| `docs/Servio_V1_Extension_Scope_09Jun2026.md` | V1.1–V1.4 scope lock |
| `docs/Servio API Refrence.docx` | API surface reference |
| `docs/Servio_Management_Introduction.docx` | Product positioning |
| `docs/Servio SRS.docx` | Software requirements |
| `docs/Servio_Technical_Review.docx` | Technical review |
| `docs/Servio v1 frontend scope.docx` | V1 frontend scope |
| `docs/Servio_V1_Use_Cases.docx` | V1 use cases |

---

## 14. Session Discipline (lessons baked in)

These are the operating rules that have been earned through pain over the V1.1 sessions. Sometimes redundant with the technical rules above; preserved here separately because they're about process, not code.

1. **Surface concerns immediately, don't defer them as side notes.** When a design tension is noticed mid-planning, the right move is to stop and ask, not to write down "we can deal with this later" and proceed. Discipline failure happened during Slice 2 planning (relation immutability) and was the trigger for Slice 3a.
2. **Read before edit.** Always read existing file before proposing changes — additive only, no rewrites of working files.
3. **Deploy ≠ apply.** Apply the rule. Always verify `firebase use` before deploy. Always verify endpoint with a live request after deploy.
4. **Field test before declaring done.** Module-level pass doesn't equal integration pass.
5. **Discipline batches.** Bugs by root cause, complete one phase before opening next. Proactive flags during build, not deferred.
6. **Decisions get challenged before locked.** Honest reasoning preferred over flattery. No wishlist items in active scope.
7. **Documentation rhythm:** command board + scope docs updated at session close. GDrive backup of key documents.
8. **One issue at a time.** Don't batch fixes. Isolate root cause. Fix. Verify. Move forward.

---

*V1 Extension command board · Active working file · Consolidated 19 June 2026.*
# ─────────────────────────────────────────
# Servio V1.1 Web Slice 3b closure
# Session date: 19-Jun-2026 (late session)
# ─────────────────────────────────────────

## 19-Jun-2026 (late) — V1.1 Web Slice 3b closure: Marital UI + Relation-edit UI

### Status
Slice 3b shipped to dev and field-tested across 12 scenarios on FFL00003
(Ahmed Khan) and FFL00207 (Farrukh Imtiaz). All passed. V1.1 web layer
is now complete.

### Delivered

**Web files (all in `web/src/`):**
- `services/familyService.js` — full file replacement. New function
  `setMyMaritalStatus(maritalStatus)` for PATCH `/family/marital-status/me`.
  `updateFamilyMember` signature extended to accept `relation` alongside
  `fullName` and `dateOfBirth`. Slice 1/2 reader functions preserved.
  Stale comments updated to reflect post-Slice-3a backend reality
  (4-value marital, relation editable, relationHistory in shape).
- `pages/employee/MyFamilyPage.jsx` — full file replacement. New
  `MaritalCard` inline component (Edit-Save with full-width dropdown,
  mirroring MyProfilePage Contact Info pattern). Page restructured
  around always-visible marital card. Gating rule: family list +
  Add button shown if `status !== 'single' OR any active members`.
  Old "not married" empty card removed. Old pendingBanner branch
  removed (dead post-Slice-3a). `EditDialog` upgraded: relation now
  a radio group matching AddDialog; DOB-required check follows the
  *selected* relation (matches backend post-merge evaluation).
- `pages/employee/MyFamilyPage.module.css` — additive append.
  New section/edit/field idioms matching MyProfilePage. New classes:
  `.section`, `.sectionHeader`, `.sectionTitle`, `.editBtn`,
  `.editActions`, `.saveSmBtn`, `.cancelSmBtn`, `.fieldItem`,
  `.fieldLabel`, `.fieldValue`, `.fieldEmpty`, `.fieldInput`,
  `.familyHeader`, `.singleHint`. No Slice 1/2 classes overridden.

**Deploy command used:**
```
cd web && npm run build -- --mode development
cd .. && firebase deploy --only hosting
```

### Field test results (19-Jun-2026)

All 12 scenarios passed. Verified across two test users:

**Page-gating + marital flow:**
- Status=single, no family → marital card + `.singleHint`. Family section
  hidden. (FFL00003, Image 1; FFL00207, Image 7 with status=null.)
- Edit + Save flip works (Image 9 → result Image 8 reverse).
- Edit + Cancel works (no save).
- No-op save (Edit, leave value same, Save) closes silently with no flash.
- Status changes single → married → divorced → widowed → married all
  succeed, all show "Marital status updated." flash, all preserve family
  section visibility because backend decoupling works.
- Status married → single AND active members exist → family section
  remains visible (Image 10). Gating rule protects divorced/widowed
  employees with active children.
- Status single AND no active members → family section hides
  (back to Image 1 state).

**Relation editing + DOB safeguard:**
- Son → daughter → spouse → son round-trip works.
- Relation change from spouse → son with empty DOB blocked by frontend
  with inline message before backend round-trip.
- Name-only edit doesn't append to `relationHistory`.
- DOB-only edit doesn't append to `relationHistory`.

**Cap visual:**
- Add button greyed when 12 active+inactive (excluding deletion-pending);
  hint "Limit of 12 reached" shown.
- Cap visual hidden entirely when family section is hidden.

### Notes from session

1. **Five orphan CSS classes in `MyFamilyPage.module.css`** —
   `pendingBanner`, `emptyHint`, `formHint`, `formInputDisabled`,
   `headerRow`. These are styles the Slice 3b JSX no longer references.
   Vite tree-shakes unused classes at build, so no runtime impact.
   Left in the file to keep the edit purely additive (Rule #5). Worth
   removing in a future cleanup pass.

2. **`pendingMaritalStatus` field** — frontend now ignores it entirely.
   Backend still returns it (always null post-Slice-3a). The field
   could be dropped from the response shape in a future cleanup, but
   keeping it is harmless. Open item #9.

3. **`autoFocus` on the marital dropdown** — when user clicks Edit, the
   dropdown gets keyboard focus. Tested fine. Easy to remove if it
   feels jarring during real-world use.

4. **No nudges after status change** — per locked decision, the user gets
   only the success flash. No prompts about updating family list. The
   field test confirmed this feels clean; no UX friction observed.

### Open items raised this session
None. Slice 3b found no new bugs.

### V1.1 status after this session
- Backend: complete (initial + Slice 3a)
- Web: complete (Slice 1 + 2 + 3a backend + 3b)
- Mobile: not yet started — full V1.1 family CRUD needs Expo build
- V1.1 carry item #1: closed in Slice 3a session

# ─────────────────────────────────────────

## 19-Jun-2026 (late) — Section corrections to existing CB

### Section 1 — Current Status

Change (current text references "Slice 3b is next"):
```
DEV on V1.1 (Backend + Web Slice 1 + Slice 2 + Slice 3a complete →
Slice 3b next: marital status UI + relation-edit UI on My Family page)
```
to:
```
DEV on V1.1 (Backend + Web Slice 1 + Slice 2 + Slice 3a + Slice 3b
complete → V1.1 web layer DONE. Mobile build is the remaining V1.1 work.)
```

### Section 2 — Next Session Starting Point

Move priority 1 from "Slice 3b" to "V1.1 Mobile". The work order table
becomes:

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | **V1.1 Mobile — full family CRUD on Expo** | Dev (Mobile) | Backend + web are the design source. Plan first, then build. |
| 2 | Test `servio.homilabs.org` hosting (DNS/SSL) | Prod | Confirm login loads + works |
| 3 | Admin/super_admin bootstrap in PROD | Prod | Deferred delicate step |
| 4 | Mobile F1/F2 + prod mobile config | Mobile | Bundle with V1.1 mobile build |
| 5 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Deadline 30 Oct 2026 |

### Section 3 — V1.1 Slices table

Update the Slices table:

| Slice | What | Status | Notes |
|-------|------|--------|-------|
| Backend (initial) | familyService, maritalStatusService, profileNudgeService, familyRoutes | ✅ 17-Jun field-tested | 4 new files, 5 surgical edits |
| Web Slice 1 | Read-only My Family page | ✅ 18-Jun field-tested | familyService.js (web), MyFamilyPage.jsx + .module.css, sidebar+route |
| Web Slice 2 | Add / Edit / Activate-Deactivate | ✅ 19-Jun field-tested | Three write functions added; per-row Edit + Deactivate; Add and Edit dialogs |
| Backend Slice 3a | Marital vocab expansion + relation editing + audit | ✅ 19-Jun field-tested (17/17) | Vocabulary corrected mid-session. V1.1 carry #1 also closed in this slice. |
| Web Slice 3b | Marital status card + relation-edit UI | ✅ 19-Jun field-tested (12/12) | MaritalCard component, EditDialog upgrade, page restructure |
| Mobile | Full V1.1 family CRUD | ⏳ Next | After web closes |

Also update the V1.1 row in Section 3's main version table:
```
V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web 1+2+3a ✅ · Web 3b ⏳ · Mobile ⏳
```
to:
```
V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web complete ✅ · Mobile ⏳
```

### Section 5 — Carry into Slice 3b

This entire section is now closed. Two choices:
(a) Delete the section heading and its body entirely.
(b) Keep it as historical record, renamed "Slice 3b carry items (closed
    19-Jun-2026)" with each item ticked.

Recommend (a) — the CB is forward-looking, and the Slice 3b session log
in Section 7 documents what was delivered. Replace Section 5 with a new
section: "## 5. Carry into V1.1 Mobile" and populate it when the mobile
design conversation begins.

For now, replace Section 5 body with a single line:
```
V1.1 mobile carry items will be drafted at the start of the mobile design
conversation. See Section 7's late-19-Jun entry for the web behaviour
the mobile implementation must match.
```

# ─────────────────────────────────────────
# END OF APPEND BLOCK
# ─────────────────────────────────────────
Follow-up correction: mobile deferred to end of V1 Extension

Session date: 19-Jun-2026 (closeout, after Slice 3b)

─────────────────────────────────────────

19-Jun-2026 (closeout) — Build-order change: mobile deferred to end of V1 Extension

What changed

The per-version vertical slice rule locked on 16-Jun-2026 has been
superseded. Original rule was:


V1.1 backend → web → mobile complete before V1.2 starts.
Parallel multi-backend builds compound dependency risk.



Superseded by:


V1.1 backend → V1.1 web. Skip V1.1 mobile. Start V1.2 backend → V1.2 web.
Continue web-first through V1.2 → V1.3 → V1.4. All four modules' mobile
builds happen together at the end of V1 Extension.



Rationale for the change


Web iterations are faster than mobile: no build step, no APK install,
no Play/EAS pipeline. Web field tests close same-session.
Backend gets exercised in production-shape by web traffic before mobile
consumes it. Bugs surface and get fixed before mobile encounters them.
All four module mobile builds can share patterns and helpers, reducing
duplication compared to one-at-a-time mobile builds.
The 16-Jun rationale ("parallel multi-backend builds compound dependency
risk") is honoured: each module's backend still ships and is field-tested
before the next module starts. Only mobile is decoupled.


Risks knowingly accepted

Recorded here for honesty so a future re-read doesn't have to re-derive them:


Mobile UX may not port cleanly from web. Touch targets, smaller
viewports, native navigation patterns, Expo lifecycle. Web designs
inform mobile but don't dictate it; mobile screens will need their
own design pass per module.
Mobile build is a single large chunk at the end. Four modules'
worth of screens, dialogs, lists, forms. If schedule slips at that
stage, V1 Extension can't ship to users until mobile catches up.
Web tests don't surface mobile-specific issues. Offline behaviour,
push notifications, background state, OS permission flows, Hermes
quirks. These will only emerge during mobile field test.
V1.1 is not a closed chapter yet. Backend done, web done, mobile
pending. Future sessions should treat V1.1 as "open, mobile remaining"
not "closed."


How this changes the CB

Section 2 — Next Session Starting Point. The work order table needs
to be re-ordered. Replace the table in the late-19-Jun append block with:

PriorityTaskPlatformNotes1V1.2 — Café + Outdoor Mini Café + kitchen dashboardDev (Backend + Web)Start by re-reading docs/Servio_V1_Extension_Scope_09Jun2026.md V1.2 section. Plan slice breakdown before any code.2Test servio.homilabs.org hosting (DNS/SSL)ProdConfirm login loads + works3Admin/super_admin bootstrap in PRODProdDeferred delicate step4V1.1 + V1.2 + V1.3 + V1.4 Mobile buildMobileAfter all four module web builds close. Includes F1/F2 mobile from V1 Enhancement.5F13 — Node.js 20 → 22 upgradeInfrastructureDeadline 30 Oct 2026

Section 3 — V1 Extension build status table. Update the V1.1 row from:

V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web complete ✅ · Mobile ⏳

to (no change in content, just clarity that mobile is deferred):

V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web complete ✅ · Mobile deferred to end of V1 Extension

Section 6 — Locked Decisions. The "Per-version vertical slice build
(16 June 2026)" entry should be marked superseded. Edit to:


Per-version vertical slice build (16 June 2026 — SUPERSEDED 19 June 2026)

Original rule (16-Jun): V1.1 backend → web → mobile complete before V1.2
starts. Parallel multi-backend builds compound dependency risk.

Superseded by (19-Jun, closeout): backend → web → next-module backend → web.
All mobile builds bundled at end of V1 Extension. See late-19-Jun closeout
session log in Section 7 for rationale and accepted risks.



Next session opening


Standing backup + firebase use check (per Section 2).
Open docs/Servio_V1_Extension_Scope_09Jun2026.md and re-read the V1.2
section in full. "Design locked on paper" was 09-Jun; that's over 10
days ago. Confirm the scope is still what we want, or update it.
Identify any V1.2 ambiguities or open questions before any slice
planning. Better to surface gaps now than mid-build.
Plan V1.2 slice breakdown (parallel to how V1.1 was: backend slice,
web read slice, web write slice, etc.).
Begin building when the slice plan is locked.


Files paused (V1.1 mobile)

No mobile work was done on V1.1. Web behaviour is the design source when
mobile is eventually picked up. The 19-Jun (late) session log in Section 7
documents the web flow comprehensively. No additional design document
needs to be created right now.

─────────────────────────────────────────

END OF APPEND BLOCK

## Update Entry — 20-Jun-2026 (V1.2 Backend Slice 1 — Café Ordering — CLOSED)

### Status
V1.2 Backend Slice 1 complete and field-tested. 17/17 HTTP test cases passed
on dev. Direct unit test of the `_memberHasTransactions` stub fix also
passed. Open Item #1 (stub fix) is now closed.

### Scope delivered
- New collection `cafeOrders` — schema per V1.2 scope doc, mirrors
  `messReservations` shape with café-specific additions/removals
  (orderType, requestedPickupTime, cancellationWindowExpiresAt,
  consumerType/consumerFamilyMemberId, no issueStatus/menuSnapshot).
- Self-order, proxy-order (supervisor on behalf), and walk-in-order paths.
- Two order types: `cafe_hours` (18:00–22:30 order window, 23:00 service
  close, no employee cancellation) and `anytime_takeaway` (08:00–22:30
  order window, 2-hour minimum lead time, 1-hour cancellation window).
- Family-member consumer tagging with ownership validation (member must
  belong to the ordering/target employee, be active, not pending deletion).
- Cancellation endpoint with role-aware rules: employee blocked from
  cancelling `cafe_hours` orders; admin/super_admin override allowed on
  both order types; ownership enforced for non-admin cancellations;
  already-cancelled guard.
- `cafeMenuResolver.js` — reads `menuItems` tagged `serviceCategories
  contains 'cafe'`, writes the fat `serviceMenuConfigs/cafe` document.
  Slice 1 simplification: all items written to `items[]`; `beverages[]`
  auto-include logic deferred to the slice that builds tuck shop / tea bar.
- Two new roles added: `CAFE_SUPERVISOR`, `CAFE_WAITER`. Legacy
  `CAFE_BAKERY_TUCKSHOP_SUPERVISOR` marked deprecated in comment, left
  in place for V1 compatibility — not yet removed from any user document.
- `_memberHasTransactions()` stub fix — now queries `cafeOrders` for
  `consumerFamilyMemberId` matches. Closes Open Item #1. Verified directly
  via a temporary test export (`test_member_has_transactions.js`) — the
  export is test-only and marked as such in `familyService.js`; not used
  by any production code path.
- `pktDateStr` promoted to shared `utils.js` (Node-safe `toLocaleString`
  pattern). Mess service's inline copy left untouched — not refactored,
  per additive-only rule.

### Files created
- `core/functions/src/cafe/cafeOrderService.js`
- `core/functions/src/cafe/cafeRoutes.js`
- `core/functions/src/cafe/cafeMenuResolver.js`
- `core/functions/scripts/seed_cafe_menu.js`
- `core/functions/scripts/list_family_members.js` (generic, takes employee
  number as argument)
- `core/functions/scripts/get_token.js` (REST-based ID token fetch for
  testing — no browser console needed)
- `core/functions/scripts/test_cafe_slice1.sh` (17 HTTP test cases)
- `core/functions/scripts/test_member_has_transactions.js`

### Files edited (additive only)
- `core/functions/src/constants.js` — added `ROLES.CAFE_SUPERVISOR`,
  `ROLES.CAFE_WAITER` (+ deprecation comment on existing
  `CAFE_BAKERY_TUCKSHOP_SUPERVISOR`), `DINING_MODES.OUTDOOR_SEATING`,
  `CAFE_ORDER_TYPES`, `CAFE_ORDER_STATUS`, `CAFE_CONSUMER_TYPES`,
  `CAFE_CANCELLATION_REASONS`, `COLLECTIONS.CAFE_ORDERS`.
- `core/functions/src/utils.js` — added `pktDateStr` export.
- `core/functions/src/index.js` — mounted `/cafe` routes.
- `core/functions/src/family/familyService.js` — `_memberHasTransactions`
  stub fix + test-only export.

### Bugs caught and fixed during this session
1. **Time-window bug (self-caught during build, then re-surfaced after a
   missed deploy).** Initial implementation conflated the café order
   cutoff (22:30) and the café service close (23:00) into a single
   constant `CAFE_HOURS_END = 23:00`, used for both purposes. Correct
   design: orders accepted 18:00–22:30, service/pickup ceiling 23:00.
   Split into `CAFE_ORDER_END` and `CAFE_SERVICE_END`. The fix was written
   once, but the *first* field test run still hit the old 23:00 message —
   the local file had reverted or the fix was never actually saved before
   the first deploy. Re-applied and reverified via grep before redeploying.
   **Lesson: grep-verify a fix is on disk before assuming a redeploy will
   pick it up — "I edited it" and "it's on disk" are not the same claim.**
2. **Schema drift discovered: `familyMembers` actual fields are `fullName`
   + `relation`. Schema Reference doc (`Servio_V1_Schema_Reference.docx`)
   states `memberName` + `relationship`.** The data is correct (V1.1 family
   CRUD already shipped and field-tested with these names); the doc is
   wrong. `cafeOrderService.js` was initially written against the
   (incorrect) doc and silently produced `consumerName: undefined` until
   caught by inspecting actual Firestore documents. Fixed: 3 references to
   `familyMember.memberName` → `familyMember.fullName`.
   **Open item: update Schema Reference doc to match actual data. Not yet
   done — documentation-only, not blocking further build.**
3. **Test design gap, caught before it shipped untested:** initial test
   plan only had one admin token, meaning non-admin cancellation rejection
   paths (employee blocked from cancelling `cafe_hours`, cancellation
   window enforcement for non-admin) would never have been exercised by
   the test suite — only verified by code review. Restructured to use two
   tokens (admin + employee), added 3 tests that specifically exercise the
   non-admin paths (role rejection on proxy endpoint, no-cancel rule as
   employee, ownership rejection on cancellation).

### Decisions made this session
- Café roles: add `cafe_supervisor` + `cafe_waiter`, deprecate (don't
  remove) `cafe_bakery_tuckshop_supervisor`.
- Service file structure: one file `cafeOrderService.js`, mirrors mess
  pattern, consistency over file-size concerns.
- Test fixtures (`CAFE_TEST_TEA`, `CAFE_TEST_COFFEE`, `CAFE_TEST_SANDWICH`,
  `CAFE_TEST_FRIES`) seeded via real `menuItems` + resolver — not a
  hand-written fat document. Architecturally correct, costs slightly more
  setup, avoids a shortcut that would need unwinding later.

### Open items carried forward (new this session)
1. **Schema Reference doc out of sync** — `familyMembers` field names.
   Update `Servio_V1_Schema_Reference.docx` to read `fullName` / `relation`
   instead of `memberName` / `relationship`. Low priority, documentation
   only.
2. **Audit other readers of `familyMembers`** — if `cafeOrderService` had
   the wrong field names, worth a grep across the codebase for
   `memberName` / `relationship` to see if any other code (mess proxy
   booking, event attendance, etc.) made the same assumption. Not blocking
   — V1.1 family CRUD itself evidently uses the correct names.
3. **Dev test data cleanup before V1.2 reaches prod** — wipe
   `CAFE_TEST_*` menuItems, the resulting `serviceMenuConfigs/cafe`
   resolver output, and the 2 pre-existing legacy items discovered during
   seeding (`Cardimom Tea` — misspelled, should be Cardamom — and
   `Black Coffee`). Roll into the existing wipe-prod-after-test-run plan.
4. **Utility script bundling** — `core/functions/scripts/` now holds 5 new
   test/seed scripts on top of the existing 3 (`copy_dev_to_prod.js`,
   `export_to_csv.js`, `import_from_csv.js`). All get bundled into every
   `firebase deploy --only functions` call. Same relocation thread as the
   existing V1 open item — now larger. Still not blocking, but growing.

### Field test summary
17 HTTP test cases (`test_cafe_slice1.sh`) + 1 direct unit test
(`test_member_has_transactions.js`). All 18 passed on final clean run.
Two test users: FFL00003 (Ahmed Khan, admin) and FFL00257 (Farrukh
Imtiaz, employee, with 2 family members — son and spouse — added during
this session specifically for café-consumer testing).

One temporary scope-widening was used mid-session to avoid waiting for
the 18:00 PKT café window (constants temporarily set to an always-open
window, test script's window guard temporarily disabled). Both reverted
and verified via grep before redeploying for the final clean test run.
Composite index for `listMyOrders` query (tenantId + employeeNumber +
createdAt) created via the console URL surfaced in the first failed test
run.

### Next step
V1.2 Backend Slice 2 — kitchen dashboard (order list for kitchen staff,
acknowledgement endpoint transitioning `placed → accepted`,
unacknowledged-order counter). Per the locked web-first build order,
Slice 2 is backend-only; web slices for café ordering and the kitchen
dashboard UI follow afterward.