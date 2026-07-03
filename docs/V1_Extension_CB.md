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

### V1.3 Tea Bar — Locations + Menu CLOSED (tested), Orders slice built (partially tested)

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

### Next session
Resume after 07:30 PKT. Test order-placement success path first, then remaining
failure paths, then design + build Official Orders (next slice).