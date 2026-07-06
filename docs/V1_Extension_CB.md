# Servio — Command Board V1 Extension (Active)
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: `ffl`) |
| Stack | Node.js + Express (Firebase Cloud Functions) · React/Vite (Web) · Expo React Native (Mobile) · Firestore + Auth |
| Dev Firebase | `servio-dev-55d2d` |
| Prod Firebase | `servio-prod-3a6de` |
| GitHub | `AwaizFatima08/servio_dev` |
| NAS Path | `/mnt/storage/projects/servio_dev/` |
| Consolidated on | 03 July 2026 |
| Last Updated | 03 July 2026 (review pass) — café flow COMPLETE; cleanup mostly done; V1.3 next. Duplicated §9 block removed; M5/M6 open items added; Pipeline/Backlog list added; §11 Reference Index added. |

> **Reading note.** This is the compact working board — paste it to restore context at the start of a session. The full dated history (every session log, June–July 2026) lives in `docs/Servio_CB_V1Extension_Archive.md`. Older V1-era history is in `Servio_CB_V1.md`.

---

## 1. Current Status

V1 is live on prod (frozen for the 15-day tester trial — do not develop on prod). All dev work is on V1 Extension.

- **V1.1 Family CRUD** — complete on backend + web. Mobile deferred to the end of V1 Extension.
- **V1.2 Café + Outdoor Mini Café + kitchen dashboard** — **COMPLETE** on backend + web. Employee ordering, kitchen board (whole-order model), proxy/walk-in, café history, and official meals (dine-in + takeaway, same-day + future-dated), with pickup-dated billing keys. Official ordering is whole across both dining modes and both time horizons. Mobile deferred.
- **Café cleanup** — mostly done (admin sidebar trimmed; orphan index file, dead constant, dead CSS removed; dead single-order routes labelled for later removal; `addDaysToDateStr` move examined and declined). Small remainder: a couple of stale code comments (low priority).
- **V1.3 (Tea Bar + Tuck Shop + Bakery)** and **V1.4 (BBQ)** — scope-locked, not started.
- Mobile build for V1.1–V1.4 is bundled at the end of V1 Extension.
---

## 2. Next Session — Start Here

Standing rules at session start, every time:

```bash
# 1. Back up before any work
bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh

# 2. Confirm the active Firebase project (must be dev, never prod)
firebase use            # expect: dev (servio-dev-55d2d)

# 3. Confirm a clean, synced starting point
git status --short      # expect: clean
git log --oneline -3    # confirm last session's work is here
```

### Work Order

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | **V1.3 design-lock** (Tea Bar + Tuck Shop + Bakery) | Paper first | Design on paper before any code. Café lifecycle (kitchen board, accept→prepared→history) is the proven template to copy. **First: verify/fix the schema doc (M4) — it has wrong field names and could mislead new-table work.** |
| 2 | **PROD blocker: password-reset email** | Prod | `firebaseapp.com` sender is silently dropped by Gmail/corporate filters. Need custom SMTP / SendGrid sender before the real prod launch. |
| 3 | **PROD blocker: secrets in GDrive backup** | Dev/Prod | `service-account.json` private key + web API key sit in plaintext in the backup folder. Rotate the dev key; exclude secrets from backups. |
| 4 | Finish café cleanup (stale comments only) | Dev | Low priority. Two stale comments left: `constants.js` (~lines 427–429, café cancel) and `cafeService.js` `cancelOrder` header. Cosmetic. |
| 5 | Mobile build (V1.1–V1.4) | Mobile | After all four module web builds close. Includes F1/F2 mobile from V1 Enhancement. |
| 6 | Node.js 20 → 22 upgrade | Infrastructure | Deadline 30 Oct 2026. Dev first → test → both. |
---

## 3. Build Status

Reference: `Servio_V1_Extension_Scope_09Jun2026.md` in `docs/`.

| Version | Scope | Design | Build |
|---------|-------|--------|-------|
| V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web ✅ · Mobile deferred |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 LOCKED | Backend ✅ · Web ✅ (all slices) · Mobile deferred |
| V1.3 | Tea Bar + Tuck Shop + Bakery — own `tuckshop_bakery_supervisor` role, own dashboard, own full order flow (accept → prepared → history), mirroring café | 🔒 LOCKED | Not started. Role split `cafe_bakery_tuckshop_supervisor → cafe_supervisor + tuckshop_bakery_supervisor` lands here. |
| V1.4 | BBQ | 🔒 LOCKED | Not started |
| V1.5 | Dashboards + analytics + reporting + billing | Design after V1.4 | — |
| V1.6 | Notifications + reporting alignment | Design after V1.4 | — |
| Mobile Extension | F9–F12 admin/manager/supervisor mobile dashboards | Deferred | — |
---

## 4. Open Items

Sorted by priority. **HIGH / prod-blockers first** — do not let these reach real production. Low-priority items grouped below (kept visible so nothing is forgotten, but not blocking).

### HIGH — before real prod launch

| # | Item | Notes |
|---|------|-------|
| H1 | Password-reset email broken | `firebaseapp.com` sender silently dropped by Gmail + corporate filters. No reset emails arrive. Need custom SMTP / SendGrid sender before the 15-tester pilot. |
| H2 | Secrets in GDrive backup | `service-account.json` private key + web API key in plaintext, reachable by anyone with the backup-folder link. Rotate dev service-account key; exclude secrets from backups. |

### Before V1.2 / any module reaches prod

| # | Item | Notes |
|---|------|-------|
| P1 | Seed prod appSettings | Prod project needs `maxFamilyMembersPerEmployee: 12` + `familyMemberFeatureActive: true` seeded (they were missing on dev and had to be seeded — prod needs the same). |
| P2 | Dev test-data wipe | Clear `CAFE_TEST_*` menuItems, the `serviceMenuConfigs/cafe` resolver output, the 2 legacy items (`Cardimom Tea` — misspelled — and `Black Coffee`), and all accumulated `cafeOrders` test fixtures (incl. KEYTEST/DINEIN orders). Fold into the wipe-prod-after-test-run plan. |

### Medium

| # | Item | Notes |
|---|------|-------|
| M1 | `toLocaleString` audit (backend) | Grep `toLocaleString` across `core/functions/src` and audit each call site for the PKT/Hermes risk. Preventive — no confirmed defect. |
| M2 | Timestamp serialization | Café API returns Firestore Timestamps as `{_seconds,_nanoseconds}`, not ISO. Frontend coerces via a `toDate` helper. Normalize at the API boundary later, then simplify the frontend. |
| M3 | Cascade UI warning | `setEmployeeStatus` deactivates family but does not reactivate. Admin web UI should warn admins about manual reactivation. |
| M4 | Schema Reference doc drift ⬆ | `Servio_V1_Schema_Reference.docx` says `memberName`/`relationship`; live data uses `fullName`/`relation`. **Elevated — verify/fix BEFORE building V1.3 tables (see Work Order #1); a wrong schema doc would mislead new-table work.** |
| M5 | `_memberHasTransactions()` stub always returns `false` ⬆ | Placeholder only — never actually checks anything. Real implementation must check `cafeOrders` / `tuckshopOrders` / `bbqOrders` for a matching `consumerFamilyMemberId` before a family member can be safely deactivated without silently orphaning their order history. **Elevated — implement before family-member consumer tagging goes live in any order-taking module (café already tags consumers; V1.3 tuck shop/bakery and V1.4 BBQ will too).** See also Reference Index (§11) for the open BBQ-scope question this connects to. |
| M6 | `setEmployeeStatus` response missing `familyMembersDeactivated` field | The cascade itself runs correctly on the backend (family members ARE deactivated), but the HTTP response sent back to the caller omits this field, so the web UI can't currently show "X family members were also deactivated." Fix is web-facing only. Should be closed alongside M3 (reactivation warning UI), since that UI needs this field to be useful. |
### Low — not blocking

| # | Item | Notes |
|---|------|-------|
| L1 | DOB validation is format-only | Accepts impossible dates (e.g. 2014-13-45). Fine while a calendar picker is used. |
| L2 | `pendingMaritalStatus` dead field | No longer written; defensive null-write handles stale data. Could be dropped later. |
| L3 | `cnicLast4` type consistency | Confirm 4-digit string across live employees. |
| L4 | Orphan `users` docs on dev | From delete-and-recreate cycles. Non-blocking. |
| L5 | Utility-script bundling | ~10 dev-only scripts in `core/functions/scripts/` get bundled into every functions deploy. Relocate out of the deploy path eventually. |
| L6 | Test creds in git | Two dev-only test accounts' email/password are hardcoded in test scripts. Throwaway dev fixtures; accepted. |
| L7 | Browser timezone in "Updated" label | Café page renders `updatedAt` via `toLocaleString` with no explicit zone. Fine for single-tenant PKT; hardcode PKT if multi-tenant ever matters. |
| L8 | Two stale code comments | `constants.js` (~427–429) + `cafeService.js` `cancelOrder` header describe pre-cancellation-flow rules. Cosmetic. |
| L9 | Dead single-order café routes | Labelled in `cafeRoutes.js` (dead-code register). Superseded by group versions. Verify no frontend caller, then remove before prod. **Do NOT remove `/orders/:orderId/cancel` — still live (employee cancel screen).** |
| L10 | Crossed test-account emails | `cafe.supervisor@…` vs `supervisor.cafe@…` are swapped between Rashid and Majid. Cosmetic dev-only; tidy before the test run. |

### Carried from V1 (before full rollout)

| # | Item | Notes |
|---|------|-------|
| S1 | Booking duplicate-check not atomic | See V1 CB. |
| S2 ⚠ CHECK SOON | `employeeService` `.limit()` + in-memory filter breaks past 50 employees | **FFL already has 300+ employees — this limit may ALREADY be biting. Not "someday"; check before the next rollout.** See V1 CB. |
| S3 | Notification fanout 500-op batch limit | See V1 CB. |

*(Node.js 20→22 upgrade lives in the Work Order (#6) with its 30-Oct-2026 deadline — not duplicated here.)*

### Pipeline / Backlog — flexible, does NOT block the current roadmap

Not urgent, not scheduled — kept here only so they aren't forgotten across sessions.

| # | Item | Notes |
|---|------|-------|
| PL1 | iOS support | Requires a Mac for code signing — currently no Mac in the team's device list. Parked until one is available. |
| PL2 | Penetration testing | Do before V2 expansion (GuestHouse/BOQ/Library) — those add more surface area worth testing together. |
| PL3 | REST API key system | For external integrations. Relevant from V3/V4 onward (Sports/Kiosk/SMS/WhatsApp, Recipe/Inventory). No need before then. |
---

## 5. Universal Rate-Entry / Billing — NOT built yet (V1.5)

Café/tea-bar/tuck-shop/bakery orders ship with billing hooks (`rateTargetKey`, `rateStatus: pending`, `billingDestination`, null `unitRate`/`amount`) but **no rate-entry mechanism exists yet**. Café orders show "Rate pending" indefinitely until this is built. Plan (V1.5): port the mess `mealRates` + applicator model — issued items → next-day per-item report → rate entered once → batch-published by `rateTargetKey` → employee notified → billing-history screen. One slice, all services, after the order flows are built.

Note: café `rateTargetKey` is now **pickup/consumption-dated** (FFL convention, fixed 01-Jul), format `{pickupDate}_cafe_{itemId}`. Mess format stays `{date}_{mealType}_{optionKey}`.

---

## 6. Prod Launch Checklist (when prod is un-frozen and rebuilt)

- Admin / super_admin bootstrap in prod (delicate first-super_admin manual step).
- Manager recreates the menu cycle in prod.
- 15 testers register fresh.
- Seed prod appSettings (P1 above).
- Fix password-reset email (H1) and rotate/exclude secrets (H2).
- Mobile env-config before any prod mobile build: `app.config.js` + EAS profiles + prod `google-services.json` (api.js/firebase.js currently hardcoded to dev; reconcile `org.homilabs.servio` vs `com.homilabs.servio`).
- Wipe dev/prod test data (P2).
- After the test run: WIPE prod + relaunch as real prod.
---

## 7. Infrastructure

### DEV (development workbench)

| Resource | Value |
|----------|-------|
| Firebase project | `servio-dev-55d2d` |
| API | `https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api` |
| Web app | `https://servio-dev-55d2d.web.app` |
| Web API key (public) | `AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o` |
| NAS dev path | `/mnt/storage/projects/servio_dev/` |
| Backup script | `bash /mnt/storage/projects/servio_dev/scripts/backup/servio_backup.sh` |
| GDrive dev folder | `1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI` |

### PROD (frozen V1 test — do not develop here)

| Resource | Value |
|----------|-------|
| Firebase project | `servio-prod-3a6de` |
| API | `https://asia-south1-servio-prod-3a6de.cloudfunctions.net/api` |
| Web app | `https://servio-prod-3a6de.web.app` |
| Custom domain | `servio.homilabs.org` (CNAME at Hostinger) |
| Service account (SECRET) | `keys/service-account-prod.json` (gitignored) |

### Shared notes

- Both projects use Firestore named instance `servio-dev`. `getFirestore('servio-dev')` unchanged. Disambiguate by **project name**, not DB label.
- Deployed `index.js` uses `admin.initializeApp()` (no args) → uses the project it runs in.
- ALWAYS `firebase use` before deploy. `.firebaserc` default = dev.
- **Web deploy to dev:** `npm run build:dev` (NOT bare `npm run build` — that loads prod config) → `firebase deploy --only hosting`.
- **Functions deploy:** `firebase deploy --only functions`.
- **Mobile build:** `eas build --platform android --profile preview`.
- Firestore indexes: authoritative file is `core/functions/firestore.indexes.json` (root-level copy was removed). **Composite index rule:** deploy the index first, wait for "Enabled" in the console, THEN deploy the function that uses it.
---

## 8. Key Technical Rules — Never Break

1. **Named Firestore DB:** `getFirestore('servio-dev')` in ALL backend files — never `admin.firestore()`.
2. **PKT on mobile:** `new Date(t + 5*60*60*1000)` + `getUTC*` getters — never `toLocaleString` (Hermes → NaN).
3. **PKT on backend (Node):** `toLocaleString('en-US', {timeZone:'Asia/Karachi'})` is safe.
4. **Read before writing.** Read the file before editing. Additive only — never rewrite working files.
5. **Grep-verify on disk before any edit or deletion.** Disk is the source of truth, not memory.
6. **Tenant isolation** on every Firestore op — `tenantId` on all queries, always from the verified token, never from the request body.
7. **camelCase throughout** — collections, fields, code.
8. **`verifyRole` is a factory:** `verifyRole(ROLES.X)` — never used directly as middleware.
9. **Route ordering:** specific routes before parameterised (`:id`) routes.
10. **All responses** via `successResponse` / `errorResponse` from `../utils` — never raw `res.json()`.
11. **Design locked on paper before any code** — committed as its own commit before edits.
12. **Backend-first, then frontend.** One slice fully closed (data-layer verified, not UI alone) before the next opens.
13. **`build:dev` before deploying web to dev** (the prod-config footgun). **`firebase use` before functions deploy.**
14. **`node --check` is not enough** — grep-verify is the real check (undeclared-variable use is a runtime error, not a parse error).
15. **A restore is a rollback** — after restoring a file from backup, diff it against the version it replaced to see what was *lost*, not just that the clobber is gone.
---

## 9. Locked Decisions (rule stated; full reasoning in the archive)

Each line is the rule you must not break. The dated reasoning behind each lives in `docs/Servio_CB_V1Extension_Archive.md`.

**Dev / prod (15-Jun):** two permanent independent Firebase projects; both use the `servio-dev` named DB; disambiguate by project name. Prod frozen at V1 for a 15-day trial, then wiped + relaunched.

**Family — deletion PARKED (19-Jun):** records are permanent; soft-delete via Deactivate only. Five delete-request endpoints stay deployed but unreachable from any UI.

**Family — marital status (19-Jun):** four values (single/married/divorced/widowed), employee-set, immediate, no admin approval, no cascade. Marital status is a personal label; the family list is the operational truth — intentionally decoupled.

**Family — relation editable (19-Jun):** relation can be changed; edits resulting in son/daughter require a DOB; every change appends to `relationHistory[]`.

**Family — cap counts active + inactive (19-Jun):** the 12-member cap counts every entry ever made (1 spouse + up to 11 children). *(Summarized from memory — verify the exact count + active/inactive rule against the code when convenient.)*

**Build order (superseded 16→19-Jun):** per-module vertical slice — each module's backend → web is field-tested before the next module's backend starts. All four modules' mobile builds are bundled at the end of V1 Extension.

**Café service-file structure (20-Jun):** one file per concern in `core/functions/src/cafe/` — `cafeOrderService` (placement + cancel), `cafeKitchenService` (kitchen list + accept/prepared/history + group ops), `cafeMenuService` (read), `cafeMenuResolver` (write).

**Web service pattern — Pattern B (20-Jun):** token is passed into the service by the caller (matches `menuService`/`messService`). `familyService`'s inside-the-service token pattern is the outlier, not to be copied.
**Café roles (20-Jun):** `cafe_supervisor` + `cafe_waiter` are peer roles. Legacy `cafe_bakery_tuckshop_supervisor` deprecated in comments but not removed from any user doc yet.

**Tuck Shop / Bakery = separate service (24-Jun):** NOT folded into café. In V1.3 they get their own `tuckshop_bakery_supervisor` role, own dashboard, own full lifecycle (accept → prepared → history) mirroring café. Café lifecycle is the proven template to copy. Open V1.3 question: shared service-parameterised history component vs own copy (leaning shared).

**Café order — whole-order single consumer (22-Jun):** one order is tagged to ONE consumer for the whole order (not per-line). Corrects the scope doc's per-line description.

**Café "placed by" label (22-Jun):** history shows "Order placed by — {consumerName}" (+ "through proxy booking" when a supervisor booked). Display-only. Billing always → the employee account; audit (`createdByUid`/`createdByRole`) always → the real booker.

**Café orders immutable (22-Jun):** a placed order cannot be edited. "Add more" = a new top-up order (new `bookingGroupId`). To change an order, cancel (where allowed) and re-order.

**Kitchen board — whole-order model (28-Jun):** everything on the board operates on the ORDER as one unit (grouped by `bookingGroupId`). Accept / Mark Prepared / Cancel are all whole-order and atomic. No per-item operations. One overrun clock per order. Overrun applies to `cafe_hours` only, threshold 30 min.

**Café cancellation — two-sided (reaffirmed 02-Jul):** `cafe_hours` orders are never employee-cancellable (charged regardless; no cancel button). `anytime_takeaway` is cancellable until 3h before pickup (stamped at creation into `cancellationWindowExpiresAt`). PREPARED = hard wall for everyone incl. admin. ACCEPTED = blocked for non-admin. **Supervisor cancel** hardcodes reason `employee_request` (no dropdown); **employee self-cancel** has a 3-reason dropdown (`employee_request` / `data_correction` / `other`).

**Official café meals (27-Jun):** a billing-branch on the normal café order, NOT a new path/collection. `bookingSource=official`, `subjectType=official_meal`, `billingDestination=official_account`. Anchored to a sponsoring employee. `approvalStatus` (pending → approved/rejected) runs in parallel with the kitchen status — billing-only, independent of `orderStatus`. Cost centre is an optional free-text audit note, never a key. Placed by cafe_supervisor/manager/admin (not cafe_waiter).

**Café billing key = pickup date (01-Jul):** café cost is incurred on the consumption/pickup date. `rateTargetKey` = `{effectivePickupDate}_cafe_{itemId}`, where advance orders use the chosen pickup date and same-day orders use the order date.

**Future official dine-in — Route 2 / Proposal A (02-Jul):** future-dated official dine-in rides the `anytime_takeaway` advance-order engine with `diningMode: dine_in`. Same-day dine-in stays the quick `cafe_hours` path. The advance path always requires a serving time. Accepted oddity: an advance dine-in carries `orderType: anytime_takeaway` — "advance order," not literally takeaway. Order type NOT renamed.
---

## 10. Tokens / Quick Reference

- Get a token: `node /mnt/storage/projects/servio_dev/core/functions/scripts/get_token.js <email> 1234@com` (absolute path; ~1hr expiry; re-capture each session).
- Test accounts: `supervisor.cafe@fatima-group.com` (CLB00030 Majid / cafe_supervisor) · `admin@fatima-group.com` (CLB00010 Qasim / admin) · `test1@fatima-group.com` (FFL00002 / employee).
- Café itemIds: Black Coffee = `yaoXMs4GR9fiOEBU8rcJ` · Cardamom Tea = `ACBHgUFPRKL5C8B9IQlf`.
- Café window: 18:00–22:30 PKT (whole-order accept/prepare/cancel field-tests need the live window).
---

## 11. Reference Index — Where to Look for What

This board (`docs/Servio_Command_Board_V1_Extension.md`) is the one to paste at the start of every session. It stays intentionally compact — locked decisions as one-line rules, not the story of how each was reached. When a decision here needs more context (why, what alternatives were rejected, exact test steps), the full dated reasoning is in the archive. Use this table to go straight to the right place instead of re-reading either file end to end.

| Need | Go to | Notes |
|------|-------|-------|
| Full dated session history, June–July 2026 | `docs/Servio_CB_V1Extension_Archive.md` | Every session log behind the locked-decision lines in §9 above. Search by date or keyword rather than reading linearly — it's long. |
| V1-era history (before V1 Extension started) | `Servio_CB_V1.md` | Not covered by the archive above. |
| Café lifecycle as the build template for V1.3 | Archive, search "kitchen board" / "whole-order" | This is the proven pattern (accept → prepared → history) V1.3 tuck shop/bakery is meant to copy. Read this before the V1.3 design-lock session, not after. |
| Original conceptual design for family-member consumer tagging | Project doc `family_member_flow.md` | **Caution — treat as directional intent only, not schema authority.** It's an early planning document: it uses the old field names (`memberName`/`relationship`) that M4 above already flags as superseded by the locked schema (`fullName`/`relation`). It also scopes family tagging to **Café, Tuck Shop, Bakery only** — it does **not** mention BBQ. |
| **Open question — does BBQ need family-member tagging?** | Unresolved — decide at V1.4 design-lock | `family_member_flow.md` excludes BBQ from family tagging. But the `_memberHasTransactions()` stub (M5 above) is written to also check `bbqOrders` for `consumerFamilyMemberId`, implying BBQ orders CAN be tagged to a family member. These two sources disagree. Resolve explicitly on paper before BBQ (V1.4) design-lock — don't let the stub's assumption default the decision by accident. |
| Authoritative current Firestore schema | `Servio_V1_Schema_Reference.docx` | Cross-check against live data before trusting it for new tables — see M4. |
| Full V1 Extension scope definition | `Servio_V1_Extension_Scope_09Jun2026.md` | Referenced in §3 above. |
## Update Entry - 03-Jul-2026 23:15

### V1.3 Tea Bar — Locations + Menu CLOSED (tested), Orders slice built (tested)

**Locations slice:** All 7 functions (create, list, edit, assign, unassign, self-lookup)
live-tested on dev, success AND failure paths. Genuinely proven, not just deployed.

**Menu slice:** teabarMenuResolver.js + teabarMenuService.js built. Rebuild + read
proven end-to-end with 5 real tagged test items. One flat items[] list (no beverages[]
split, unlike café) — Tea Bar's entire menu IS beverages/snacks, split adds no value.

**Orders slice:** teabarOrderService.js built (self-order + proxy-order only — official
orders, cancel, dashboard, history NOT yet built). Deployed clean after fixing a
duplicate-constant SyntaxError (caught at deploy time, not silently). Tested tonight
(Tea Bar closed, 11PM PKT): empty-items ✓, missing-location ✓, hours-closed ✓ (both
/orders and /orders/proxy). NOT yet tested: successful order creation, multi-item
bookingGroupId grouping, bad-location rejection, bad-item rejection — all need Tea Bar
genuinely open (07:30–13:00 or 14:00–17:15 PKT).

## Update Entry — 04-Jul-2026 (evening session)

### Status
V1.3 Tea Bar — Official Orders sub-slice: backend build substantially complete, most pieces field-tested on dev.

### Completed & Field-Tested Today
- `_buildOrderDoc` updated to accept official-order fields (billingDestination, costCentreCode, sponsoringEmployeeNumber/Name, officialGuestName) as optional inputs with safe defaults — self/proxy orders unaffected.
- `approvalStatus` bug fixed: self/proxy orders now correctly write `not_applicable`; official orders write `pending_approval` (previously all order types incorrectly wrote `null`).
- `createOfficialTeabarOrderBatch` — built, deployed, field-tested twice (simple order + order with optional costCentreCode/officialGuestName). Verified in Firestore: correct billing destination, sponsor identity kept separate from creator identity, correct approvalStatus.
- `approveOfficialTeabarOrderGroup` — built, deployed, field-tested. Verified approvedByUid/approvedAt/updatedAt written correctly; confirmed orderStatus/issueStatus remain untouched (approval doesn't block service, by design).
- `rejectOfficialTeabarOrderGroup` — built, deployed, field-tested including optional approvalNote (special characters confirmed intact).
- `listOfficialPendingGroups` — built, deployed, field-tested (correctly returns empty list when nothing is pending).
- Double-approval safety check confirmed firing correctly (attempted to re-approve an already-approved order — correctly refused).
- Composite index added for teabarOrders (tenantId, bookingSource, approvalStatus, createdAt asc) — created in Firebase console AND added to firestore.indexes.json, file validity confirmed via `python3 -m json.tool`.
- Location for official orders resolved automatically from the placing user's own current teabarLocations assignment — same rule as proxy orders, never picked from a list. Written into TeaBar_Official_Orders_Design_Lock_04Jul2026.md §6.
- Five new audit fields (approvedByUid, approvedAt, rejectedByUid, rejectedAt, approvalNote) added to teabarOrders — correction to an oversight in the original TeaBar_Design_Lock_03Jul2026.md §10 field list. Documented in TeaBar_Official_Orders_Design_Lock_04Jul2026.md §7.

### Decisions Locked Today
- `bookingGroupId` is the unit of action everywhere: dashboard display, issuance, approval, AND cancellation — not just creation.
- Official-order approval/rejection is group-based, deliberately improving on café's current live behaviour, which was confirmed by direct code review to approve only one document at a time despite design docs implying otherwise.
- Partial-fulfilment/dispute risk at item level is accepted, not tracked at item level — justified by Tea Bar's small, close-knit user base and physical proximity enabling easy informal correction. Recorded as a revisitable assumption, not a permanent fact.
- Cancellation will also be group-based (decided; not yet built).
- The 3 old pre-fix test documents (n4xRehTFnZzhfA73Ahud, ir7iExBFrpQL84gKWzwz, PP27LXo8a2TeYrFCu8e7) deliberately left uncorrected — disposable test data, already scheduled for pre-prod deletion.

### Pending / Not Yet Tested (real gaps — flagged, not forgotten)
- Multi-item official order group approve/reject/list — both test orders used today had exactly 1 item each. Grouping is proven for order *creation* only so far.
- Double-*rejection* safety check (only double-*approval* was actually tested).
- `listOfficialPendingGroups` has only been tested against an empty result — never against real grouped data.

### Not Started (separate, larger pieces — next after Official Orders closes)
- Cancel (group-based, per locked decision above)
- Attendant dashboard (live view, grouped cards, "Handed over" button)
- Order history (employee's own view + attendant/location view)

## Update Entry — 05-Jul-2026 00:23 PKT

### Session scope
V1.3 Tea Bar backend — closed out Official Orders remaining tests, then designed and built Cancel, Attendant Dashboard, Issue ("Handed over"), the end-of-day auto-cancel scheduled job, and Order History (three views). All work paper-designed before code, per project rule #11.

### Completed and deployed to dev tonight
- **Cancel** (`cancelTeabarOrderGroup`) — employee cancels own order only (self/proxy, never official); teabar_attendant cancels any order at own location only (self/proxy/official); admin/super_admin unrestricted; Manager and all other roles excluded. Hard wall: locked once `issueStatus: issued`. No cancellation-reason field.
- **Attendant Dashboard** (`getTeabarDashboard`) — attendant-only, auto-resolves own location, shows only orders matching today's `orderDate` with `issueStatus: pending`, grouped by `bookingGroupId`.
- **Issue / "Handed over"** (`issueTeabarOrderGroup`) — attendant-only, own location only, deliberately **no admin override** (issuance is a physical-witness claim admin cannot honestly make; admin's existing Cancel power remains the escape hatch for stuck orders).
- **End-of-day auto-cancel** — new file `scheduled/teabarAutoCancel.js`, wired into `index.js` as `exports.teabarAutoCancel`, runs daily at **17:15 PKT** (Tea Bar's close), mirroring the existing `.pubsub.schedule().timeZone('Asia/Karachi')` pattern used by `resolveDaily`/`generateSnapshots`. Sweeps **any** stuck `pending` order regardless of date (safety net for a missed run), not just today's. Uses sentinel `cancelledByUid: 'system_auto_cancel'` to distinguish system action from human action. Deployed separately via `firebase deploy --only functions:teabarAutoCancel`.
- **Order History** — two functions: `getTeabarHistory` (shared by attendant-own-location and admin-any-or-all-locations via optional `locationId` param) and `getEmployeeTeabarHistory` (excludes official/sponsored orders, matching Cancel's ownership rule). Both default to a rolling **last-30-days** window. Admin's history view is **read-only** for now — a Cancel button there is intentionally deferred to a later follow-up, not built this session.

### New shared utility
`addDaysToDateStr` copied verbatim from `cafe/cafeOrderService.js` into `utils.js` (café's own copy untouched). Verified character-for-character against the original, and computationally tested — 6/6 cases including month and year boundaries — both standalone and combined with the real `pktDateStr`, including the midnight PKT/UTC boundary case.

### New Firestore composite indexes (all confirmed Enabled)
`teabarOrders` now has 5 total:
1. `bookingSource, approvalStatus, createdAt` (+ `tenantId`) — official pending queue
2. `locationId, orderDate, issueStatus, createdAt` (+ `tenantId`) — Dashboard
3. `locationId, orderDate DESC, createdAt DESC` (+ `tenantId`) — location History
4. `orderDate DESC, createdAt DESC` (+ `tenantId`) — admin all-locations History
5. `employeeNumber, orderDate DESC, createdAt DESC` (+ `tenantId`) — employee History

### Key technical lesson locked this session
A Firestore range/inequality filter (e.g. `orderDate >= X`) **requires** the query's first `orderBy` to be that same field — cannot filter by range on one field while sorting primarily by a different one. History queries use `.orderBy('orderDate','desc').orderBy('createdAt','desc')` to satisfy this while still achieving newest-first ordering.

### Parked risks carried forward (unchanged — do not lose these)
1. **Tea Bar self-order route's role list is broader than it should be** (Manager, Café Waiter, and other contractual-staff roles can currently self-order when they shouldn't, per Homi's confirmation that contractual club staff are served through a separate arrangement). Left as-is deliberately — relies on audit trail + staff discipline. **Must be tightened before prod.**
2. **`approvalStatus` and `orderStatus` are independent tracks by design** — an official order can end up simultaneously "approved for billing" and "cancelled" (now reachable via manual cancel **or** the new auto-cancel job). Future V1.5 billing logic must check `orderStatus != cancelled`, not just `approvalStatus`, before charging.

### Not yet field-tested (blocked on Tea Bar operating hours, 07:30–13:00 + 14:00–17:15 PKT)
Cancel, Dashboard, Issue, and the auto-cancel job (which additionally needs the clock to actually reach 17:15 with a real stale order present). **History is the one exception** — read-only, no operating-hours gate, testable any time.

### Next session — starting point
1. Re-upload fresh: `teabarOrderService.js`, `teabarRoutes.js`, `scheduled/teabarAutoCancel.js`, `utils.js`, `constants.js`, `firestore.indexes.json` — do not edit from memory of tonight's session.
2. `firebase use` to confirm dev.
3. During the 07:30–13:00 / 14:00–17:15 PKT window: field-test Cancel, Dashboard, and Issue with real orders (multi-item grouping, wrong-location rejection, already-issued/already-cancelled safety checks).
4. Test History endpoints (can be done anytime, including before the window opens).
5. Auto-cancel needs a genuinely stale pending order sitting untouched until 17:15 to prove itself — may need to deliberately leave one order un-issued during the window to test this.
6. After Tea Bar backend is fully field-tested: move to Tea Bar **web frontend** (per Homi's stated plan).
## Update Entry — 05-Jul-2026 (full-day field-testing session)

### Status
V1.3 Tea Bar backend — FULLY FIELD-TESTED. Every slice built in prior sessions
has now been proven working against real orders, not just deployed. One real
bug found and fixed mid-session.

### Fully Tested and Confirmed Working Today
- Self-order creation + Dashboard visibility
- Cancel — including the hard wall (cannot cancel an already-issued order)
- Issue ("Handed over") — including duplicate-tap protection
- Multi-item bookingGroupId grouping — proven across order creation, Dashboard,
  Issue, Approve, and Reject (not just creation, as previously assumed)
- Official order create/approve/reject — including multi-item groups and the
  double-rejection safety check (previously only double-approval was proven)
- Location-based cancel permission — both halves: attendant correctly
  restricted to their own assigned location; admin correctly unrestricted
- All three History views — employee's own (official/sponsored orders
  correctly excluded), attendant's location (official orders correctly
  included, other locations correctly excluded), admin all-locations
  (everything correctly included) — each verified by matching every
  individual bookingGroupId against a hand-built prediction, not just
  comparing counts
- End-of-day auto-cancel (17:15 PKT scheduled job) — proven live with a
  genuinely stale order left untouched all day. Confirmed: orderStatus →
  cancelled, issueStatus correctly left untouched at pending, cancelledByUid
  correctly shows sentinel "system_auto_cancel"

### Bug Found and Fixed This Session
`getTeabarDashboard` was filtering only on `issueStatus`, so a **cancelled**
order still incorrectly appeared as "waiting" on the attendant Dashboard.
Fixed by adding `.where('orderStatus', '==', TEABAR_ORDER_STATUS.PLACED)`.
New Firestore composite index created and confirmed Enabled **before**
deploying the code (correct order, per project rule). Fix verified in both
directions: cancelled orders now correctly hidden; normal pending orders
still correctly show — confirming no overcorrection.

### Live Confirmation of an Already-Known, Already-Accepted Risk
Two official orders (one approved, one rejected) were never issued today and
were both swept up by the 17:15 auto-cancel job — producing real, live
examples of `approvalStatus` and `orderStatus` disagreeing (e.g.
`approvalStatus: approved` + `orderStatus: cancelled` simultaneously on the
same document). This is **not a new bug** — it was already flagged as an
accepted risk in `TeaBar_Backend_Design_Addendum_03Jul2026.md` §4. Decision
reconfirmed today: leave as-is. The existing code comment in
`teabarAutoCancel.js` is sufficient documentation. The real fix belongs in
V1.5 billing logic, which must check `orderStatus != cancelled`, not just
`approvalStatus`.

### Parked Risk — Unchanged
Self-order route's role list is still broader than it should be (Manager and
contractual staff can currently self-order Tea Bar when they shouldn't).
Left as-is deliberately. Must be cleaned before prod.

### Next Step
Tea Bar backend is now genuinely closed out. Web frontend design discussion
has started (separate chat) — a screen map is being built first, per project
rule (list every screen and its responsibility before designing any one
screen in detail). Draft list: 9 screens across employee/attendant/admin
roles. Three open gaps flagged before frontend design proceeds further:
whether a Tea Bar location-management screen already exists, whether the
self-order menu should display as one flat list or grouped by foodTypeName,
and what happens immediately after an employee submits a self-order.
## Update Entry — 06-Jul-2026 (Tea Bar Screen 8 — design lock + backend session)

### Status
Two separate pieces of work today: (1) Screen 8 (Location Management)
frontend design fully locked on paper — see separate document
`TeaBar_Screen8_LocationManagement_DesignLock_06Jul2026.md`. (2) A
backend-focused session to clear two known risks flagged in that design
doc before Screen 8 can be built. One of two backend items is genuinely
done; the third planned item (a new lookup function) was designed but
NOT yet built — carries to next session, see "Not Done" below.

### Completed and Verified Today (dev only, via direct curl testing)

**1. `createLocation` duplicate-name bug — FIXED, tested, committed, pushed.**
The comment claimed the duplicate-name check was case-insensitive; the
actual comparison was exact-match only. Fixed by fetching the tenant's
locations (small, fixed-size collection — cheap to do) and comparing
names in code via `.toLowerCase()`, rather than adding a second
lowercase field to Firestore (would have broken the collection's locked
field list). Verified with three live tests against the dev server:
new name succeeds → same name in different case is rejected → a
different new name still succeeds (rules out over-blocking). Commit
`766b1f2`.

**2. `listLocations` composite index — CHECKED, already existed.**
The code comment warned this query (two `where()` + one `orderBy()`)
needed a composite index "not yet created." Tested directly against the
live server — succeeded cleanly. Cross-checked `firestore.indexes.json`
directly: an index covering exactly `isActive` + `tenantId` +
`locationName` already exists. Conclusion: the index was built at some
earlier point and the code comment was simply never updated — stale
documentation, not a real gap. **No code change made.** This also
clears the earlier worry that this might be silently blocking Screen
1's employee-facing location dropdown — it isn't, since the index was
never actually missing.

### Housekeeping found and resolved mid-session
A separate, already-tested fix from the 05-Jul field-testing session
(the `getTeabarDashboard` cancelled-orders bug — adding the
`orderStatus` filter + its matching index) was found sitting staged in
git, never committed. Verified its actual content matched the 05-Jul
session notes exactly before committing it as its own separate,
clearly-labeled checkpoint (commit `bec9c5b`) — kept deliberately apart
from today's unrelated fix, per the "commit each fix before opening the
next" rule. Both commits pushed to `main`.

### Test data hygiene
Two test locations created during live testing (`CCR I`, `Fix
Verification Test`) were soft-deactivated (`isActive: false`) afterward
via `updateLocation` — not hard-deleted, matching the project's
no-hard-delete convention. Verified via a live `GET /teabar/locations`
call that only the two real locations (`CCR I - Main Building`,
`Workshop`) remain active.

### Not Done — carries to next session (real blocker for Screen 8 build)
**`getUserByEmployeeNumber` — designed on paper, NOT built.** This was
Task 3 of the planned backend session and did not happen today. Spec is
fully written in the Screen 8 design-lock doc §2: lives in the `auth`
module (`authService.js` + `authRoutes.js`), takes an employee number,
returns `fullName` / `officialEmployeeNumber` / `uid` / `role` only,
allowed roles `manager` / `admin` / `super_admin`. Matching frontend
call proposed for `userManagementService.js`. **Screen 8's frontend
cannot be built until this exists** — the attendant-assignment search
box has nothing to call without it.

### Decisions locked today (Screen 8 design)
- Reassignment confirmation message stays generic (does not name the
  attendant's previous location) — v1 simplification, revisit only if
  it causes real confusion in practice.
- Location list shows a "Covered / Unassigned" tag only, not the
  attendant's name — no existing function translates a `uid` back to a
  name anywhere in the app today, and building one wasn't worth doing
  before the simpler version is even field-tested. Revisit later as its
  own small, separate addition if needed.
- Confirmed (not assumed): `assignAttendant` already validates the
  target account's role, tenant, and active status before saving —
  Screen 8 does not need to duplicate this safety check, only display
  whatever message the backend returns.

### Backlog (low priority, not blocking)
- `listLocations`'s code comment still incorrectly claims the index
  "has not yet been created" — cosmetic, same category as café's
  already-parked stale-comment cleanup. Fix whenever this file is next
  touched for another reason.

### Process note
Mid-session, staged an old fix and today's new fix together without
separating them at first, and ran `git push` before finishing the
planned commit sequence. No damage resulted, but worth a reminder for
next time: run one git command, read its actual output, before running
the next — especially before `push`.

## Update Entry — 07-Jul-2026 (Tea Bar Screen 8 — build session: backend lookup + Slice 1 + Slice 2 partial)

### Status
Two connected pieces of work: (1) built the one remaining backend blocker
from the previous session — `getUserByEmployeeNumber` — and (2) used it to
build Screen 8 (Location Management)'s actual frontend, in two slices:
Slice 1 (read-only list) and Slice 2 partial (Create, Edit, Unassign).
Assign/Reassign — the most complex remaining piece — deliberately deferred
to next session, per the "save the hardest piece for a fresh mind" decision
made before starting tonight.

### Completed and Verified Today

**1. Backend: `getUserByEmployeeNumber` — built, deployed, tested in all
three directions.** Lives in `authService.js` + `authRoutes.js`, new route
`GET /auth/user-by-employee-number/:officialEmployeeNumber`. Allowed roles:
manager, admin, super_admin. Returns `fullName`, `officialEmployeeNumber`,
`uid`, `role` only, for an ACTIVE account only — a suspended/inactive
account gets a deliberately generic rejection message (not "not found"),
matching a locked decision made this session (reject with a message, not
silently). Tested live via curl against dev: fake employee number → 404;
real suspended account → 404 generic message; same account reactivated →
200 with correct 4 fields. Also incidentally confirmed: missing "Bearer"
token correctly rejected (401); non-admin/suspended caller correctly
blocked before reaching the function at all. No Firestore index needed —
confirmed by two clean live queries, not assumed.

**2. Frontend: `teabarLocationService.js` (new file) — 5 functions,
Style B token pattern (token passed as parameter, matching café's
admin-facing pages).** Talks to the 5 existing location routes in
`teabarRoutes.js`. Important technical note recorded in the file's own
comment: these routes wrap their response in `{ success, message, data }`
— different from `getUserByEmployeeNumber` (no wrapper) and `getUsers`
(one plain box) — three different response shapes now exist in this app,
confirmed by reading `utils.js` and `teabarRoutes.js` directly, not
assumed. `listTeabarLocations` tested live from the browser console
(not just curl) — this also proved no CORS issue exists on this route.

**3. Frontend: `TeabarLocationsPage.jsx` + `.module.css` (new files) —
built in slices, each slice verified before the next began:**
- Slice 1: read-only table (Location / Status / Coverage), matching
  design-lock's Covered/Unassigned tag requirement. Verified live against
  real dev data (2 real locations at start of session).
- Slice 2 (partial): Create (popup, empty-name validation, live-tested
  both directions), Edit (popup pre-fills current name/active state,
  live-tested both directions, including a real rename that visibly
  auto-refreshed), Unassign (plain browser `window.confirm`, deliberately
  chosen over a custom modal for speed/lower risk this session; button
  only shows on Covered rows; OK path fully live-tested including
  auto-refresh, confirmed by real screenshot showing the browser's own
  "site says" wording — proof it's genuinely `window.confirm`, not a
  custom popup).

**4. Wiring: `App.jsx` (route) and `Sidebar.jsx` (new standalone "Tea Bar"
section, manager/admin/super_admin) — both edited, both verified.**

**5. Backend + frontend build/deploy discipline followed correctly:**
`firebase use` checked before backend deploy (confirmed dev); `npm run
build:dev` used for the web build (confirmed correct by the simple fact
that dev login worked afterward — the dangerous bare `build` would have
broken every test account's login, per the project's own standing
warning).

### Real Mistakes Made and Caught This Session — recorded honestly, not
smoothed over, since this is exactly what the CB is for

1. **`App.jsx`:** a manual edit accidentally duplicated an existing,
   unrelated `CafeHistoryPage` import and route. Would have broken the
   entire app's build if shipped (JavaScript does not allow declaring
   the same import name twice). Caught by direct `grep` count (found 4
   occurrences, expected 2) before any deploy. Fixed, then re-verified
   by count (confirmed back to 2).
2. **`Sidebar.jsx`, first mistake:** while adding the new "Tea Bar"
   section to three roles (manager/admin/super_admin), the anchor text
   used to locate the insertion point got duplicated alongside the new
   block, in all three roles — not just added after, but copied a second
   time. Caught by reading the file closely, confirmed the exact pattern
   in all three role blocks.
3. **`Sidebar.jsx`, second mistake (while fixing the first):** removing
   the duplicated anchor lines in Admin and Super Admin also
   accidentally removed the opening `{` that belonged to the new Tea Bar
   block in those two roles (Manager's fix was done correctly; the same
   mistake did not repeat there). This was NOT caught by eye — it was
   caught by an actual bracket-count script (95 closing braces vs 93
   opening — a real, provable mismatch), followed by a stricter
   stack-based nesting-order check once fixed, confirming the fix was
   structurally sound, not just count-matched.
4. **Git commit message, tonight's Slice 2 commit:** the message included
   the literal text `!confirmed` (from a code snippet being quoted). Bash
   interpreted the `!` as a history-reuse command, failed to find a match,
   and silently dropped that entire line of the message — producing a
   grammatically broken sentence in the saved commit, even though the
   actual code commit succeeded correctly. Caught by reading `git log -1`
   in full afterward, not just trusting the "success" output. Fixed via
   `git commit --amend` (safe here specifically because the broken
   commit had not yet been pushed to GitHub) with the sentence reworded
   to avoid `!` entirely, rather than just retyping the same risky text.
   **Lesson for future sessions: avoid `!` in commit messages typed
   directly into bash — rephrase instead of relying on careful retyping.**

### Decisions Locked Tonight
- Unassign's confirmation uses the browser's plain built-in `window.confirm`,
  not a custom-styled modal — chosen deliberately for lower risk and less
  new code late in a session, not by default. Revisit only if a real
  Manager finds the plain browser styling confusing in practice.
- `getUserByEmployeeNumber` rejects a non-active account with a generic
  message ("This account cannot be assigned right now"), not the specific
  status — deliberately not distinguishable from a true "not found," at
  both the message AND the HTTP status code level (both cases return 404),
  so no information leaks even at a technical/network-inspection level.

### Not Done — carries to next session (real, named blocker for Screen 8's
completion)
**Assign/Reassign attendant flow — not started.** This is the last piece
of Screen 8. Needs: a search box calling `getUserByEmployeeNumber`
(already built and tested tonight), a "Confirm assignment" button that is
greyed out unless the found person's role is exactly `teabar_attendant`,
and a call to the already-existing `assignAttendant` backend function
(unused by any frontend code so far — the 5th of 5 location-service
functions still to be exercised). Deliberately saved for a fresh session
— it is the most complex remaining piece (most moving parts, most
decision points), and tonight's session ran late (post-midnight,
alongside a live match).

### Open Items — flagged honestly, not silently marked done
1. **Unassign's Cancel path** — correct by reading the code (a single
   `if (!confirmed) return;` guard clause, low complexity/low risk), but
   NOT re-tested live tonight. Could not be cleanly retested without
   re-covering a location first, which needs the not-yet-built Assign
   feature. First thing to confirm once Assign exists.
2. **Two test locations soft-deactivated** (`Test Location - Delete Me`,
   `CCR II -Main Building`, the latter has a real spacing typo in its
   name — harmless, cosmetic, never corrected) — both dropped out of the
   visible list after being marked inactive (expected behaviour, since
   `listTeabarLocations` defaults to active-only — confirmed this is
   consistent with existing soft-delete conventions elsewhere in the
   app, not a bug). However, the Edit-and-Save action itself was not
   independently re-confirmed as error-free — it was inferred successful
   from the location disappearing from the list, not directly observed.
   Quick confirm next session: re-open Edit on either one, confirm no
   stale error state, confirm Active checkbox correctly shows unchecked.

### Backlog (unchanged, low priority, not blocking)
- `listLocations`'s stale code comment (claims index "not yet created" —
  it exists) — cosmetic, same category as café's already-parked
  stale-comment cleanup.
- Self-order route's role list too broad — parked, not urgent, must clean
  before prod.

### Next Session — Starting Point
1. Paste this entry to restore context.
2. `firebase use` to confirm dev; `git status --short` to confirm clean
   start (should be empty, per tonight's closing state).
3. Build the Assign/Reassign flow — search box → `getUserByEmployeeNumber`
   → role check → `assignAttendant`. This is the last piece of Screen 8.
4. Once Assign works, retest Unassign's Cancel path (Open Item 1 above).
5. Quick confirm on the two deactivated test locations (Open Item 2
   above).
6. Only once all of the above is done: Screen 8 is genuinely complete —
   move to the next Tea Bar frontend screen per the locked screen map.