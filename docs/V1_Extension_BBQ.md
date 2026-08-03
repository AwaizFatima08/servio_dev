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
| Consolidated on | 01 August 2026 — pre-BBQ V1 Extension history (03-Jul–09-Jul: all of V1.3 Tea Bar's build) moved to `docs/Servio_CB_V1Extension_Archive.md`. **BBQ (V1.4) session log deliberately kept in THIS file, not archived** — BBQ is still active development; its log moves to the archive only once that phase closes too. |
| Last Updated | 02 August 2026 — Table Booking cluster (Screens #9, #10, #11) built and field-tested, full lifecycle proven live. V1.4 BBQ frontend: 9 of 13 screens complete (#1, #2, #3, #6, #7, #8, #9, #10, #11). |

> **Reading note.** This is the compact working board — paste it to restore context at the start of a session. Pre-BBQ dated history (V1.1 Family CRUD, V1.2 Café, V1.3 Tea Bar — every session, 03-Jul through 09-Jul-2026) lives in `docs/Servio_CB_V1Extension_Archive.md`. **BBQ's dated session log (10-Jul-2026 onward) is NOT in the archive — it's below, in this file, §12 onward**, since BBQ is still being actively built. Older V1-era history (before V1 Extension started) is in `Servio_CB_V1.md`.

---

## 1. Current Status

V1 is live on prod (frozen for the 15-day tester trial — do not develop on prod). All dev work is on V1 Extension.

- **V1.1 Family CRUD, V1.2 Café, V1.3 Tea Bar** — all **COMPLETE** on backend + web (mobile deferred to end of V1 Extension for all three). Full build history archived — see `docs/Servio_CB_V1Extension_Archive.md`.
- **V1.4 (BBQ)** — design locked 10-Jul (`docs/BBQ_V1.4_Design_Draft_10Jul2026.md`). **Backend fully complete and field-tested** across all collections (`bbqSettings`, `bbqEvents`, `bbqOrders`, `bbqTableRequests`, `bbqLiveItemStatus`) and both scheduled functions (`bbqKitchenTargetLocker`, `bbqAutoClose`). **Frontend: 9 of 13 screens complete** — #1 Preorder, #2 Live Order, #3 My BBQ Orders, #6 Kitchen Dashboard, #7 Live Item Counts, #8 Exception Review Queue, #9 Table Request (Employee), #10 Table Booking Approval (Admin), #11 Table Booking Confirmation (Manager) — all built, deployed, and field-tested live on real data, including the full cross-screen lifecycle (submit → approve/return/reject → resubmit → confirm/cancel). **Screens #4 (Proxy Order), #5 (Official Order), #12–13 (Menu Draft, Menu Approve & Publish) not yet started.**
- **V1.4b (Tuck Shop) / V1.4c (Bakery)** — not started.
- Mobile build for V1.1–V1.4c is bundled at the end of V1 Extension.

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
git log --oneline -5    # confirm last session's work is here
```

### Work Order

| Priority | Task | Platform | Notes |
|----------|------|----------|-------|
| 1 | **V1.4 BBQ — continue frontend** | Dev | Screens #4, #5, #12–13 remain. Build order not pre-decided — choose fresh each session per standing discipline (this is the same discipline that correctly identified #6 → #7 → #8, and then #9 → #10 → #11, as natural clusters, not a fixed plan). |
| 2 | **PROD blocker: password-reset email** | Prod | `firebaseapp.com` sender is silently dropped by Gmail/corporate filters. Need custom SMTP / SendGrid sender before the real prod launch. |
| 3 | **PROD blocker: secrets in GDrive backup** | Dev/Prod | `service-account.json` private key + web API key sit in plaintext in the backup folder. Rotate the dev key; exclude secrets from backups. |
| 4 | Finish café cleanup (stale comments only) | Dev | Low priority. Two stale comments left: `constants.js` (~lines 427–429, café cancel) and `cafeService.js` `cancelOrder` header. Cosmetic. |
| 5 | Mobile build (V1.1–V1.4c) | Mobile | After all module web builds close. Includes F1/F2 mobile from V1 Enhancement. |
| 6 | Node.js 20 → 22 upgrade | Infrastructure | Deadline 30 Oct 2026. Dev first → test → both. |

---

## 3. Build Status

Reference: `Servio_V1_Extension_Scope_09Jun2026.md` in `docs/`.

| Version | Scope | Design | Build |
|---------|-------|--------|-------|
| V1.1 | Family Member CRUD | 🔒 LOCKED | **COMPLETE** — Backend ✅ · Web ✅ · Mobile deferred. Full history: archive. |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 LOCKED | **COMPLETE** — Backend ✅ · Web ✅ (all slices) · Mobile deferred. Full history: archive. |
| V1.3 | Tea Bar (Tuck Shop/Bakery renumbered out to V1.4b/V1.4c, no longer bundled here) | 🔒 LOCKED | **COMPLETE** — Backend ✅ · Web: all 8 screens ✅, live-tested. Full history: archive. |
| V1.4 | BBQ | 🔒 LOCKED — `BBQ_V1.4_Design_Draft_10Jul2026.md` | Backend ✅ complete + field-tested. Web: 9/13 screens ✅ (#1, #2, #3, #6, #7, #8, #9, #10, #11). #4, #5, #12–13 not started. Full session-by-session detail: §12 below (this file, not archived yet). |
| V1.4b | Tuck Shop | Split from old V1.3, 10-Jul | Not started |
| V1.4c | Bakery | Split from old V1.3, 10-Jul | Not started |
| V1.5 | Dashboards + analytics + reporting + billing + rate entry + notification + feedback — collective flow, for **all** flows (mess, café, Tea Bar, BBQ, Tuck Shop, Bakery). Old V1.6 fully absorbed here. | Design after V1.4/V1.4b/V1.4c | — |
| Mobile Extension | F9–F12 admin/manager/supervisor mobile dashboards | Deferred | — |

---

## 4. Open Items

Sorted by priority. **HIGH / prod-blockers first** — do not let these reach real production. Low-priority items grouped below (kept visible so nothing is forgotten, but not blocking).

### HIGH — before real prod launch

| # | Item | Notes |
|---|------|-------|
| H1 | Password-reset email broken | `firebaseapp.com` sender silently dropped by Gmail + corporate filters. No reset emails arrive. Need custom SMTP / SendGrid sender before the 15-tester pilot. |
| H2 | Secrets in GDrive backup | `service-account.json` private key + web API key in plaintext, reachable by anyone with the backup-folder link. Rotate dev service-account key; exclude secrets from backups. |

### Before any module reaches prod

| # | Item | Notes |
|---|------|-------|
| P1 | Seed prod appSettings | Prod project needs `maxFamilyMembersPerEmployee: 12` + `familyMemberFeatureActive: true` seeded. |
| P2 | Dev test-data wipe | Café: `CAFE_TEST_*` menuItems, `serviceMenuConfigs/cafe` resolver output, 2 misspelled legacy items, accumulated `cafeOrders` test fixtures. Tea Bar: 4 leftover `teabarLocations` test docs. **BBQ, growing:** several test `bbqEvents`/`bbqOrders`/`bbqTableRequests` docs (incl. all `Test BBQ *` items on `ffl_2026-09-04`, and now a full set of `bbqTableRequests` test docs across `2026-08-14` and `2026-09-04` from the 02-Aug Table Booking cluster testing — submitted/approved/returned/rejected/confirmed/cancelled examples of each); `bbqSettings.closeoutTime` left at test value `"23:15"` not reverted to `"23:00"`; `ffl_2026-09-04`'s `orderWindowStartAt`/`orderWindowEndAt` manually overwritten for testing. |
| P3 | Prod-side Firestore index for `teabarLocations` show-inactive query | Only built on dev so far — needed on prod before any Tea Bar prod deploy. Not urgent (Tea Bar isn't going to prod before V1.5/billing). |

### Medium

| # | Item | Notes |
|---|------|-------|
| M1 | `toLocaleString` audit (backend) | Grep `toLocaleString` across `core/functions/src` and audit each call site for the PKT/Hermes risk. Preventive — no confirmed defect. |
| M2 | Timestamp serialization | Café/BBQ APIs return Firestore Timestamps as `{_seconds,_nanoseconds}`, not ISO. Frontend coerces via helpers. Normalize at the API boundary later. |
| M3 | Cascade UI warning | `setEmployeeStatus` deactivates family but does not reactivate. Admin web UI should warn admins about manual reactivation. |
| M4 | `_memberHasTransactions()` stub always returns `false` | Placeholder only — never actually checks anything. **Now live-relevant, not just theoretical:** café already tags consumers by family member; BBQ (`bbqOrders.consumerFamilyMemberId`) does too as of V1.4. Real implementation must check all order collections before a family member can be safely deactivated without silently orphaning order history. |
| M5 | `setEmployeeStatus` response missing `familyMembersDeactivated` field | Cascade runs correctly on the backend, but the HTTP response omits this field, so the web UI can't show "X family members were also deactivated." Web-facing fix only, pairs with M3. |
| M6 | `bbqLiveItemStatus` cross-order isolation — never actually tested | Screen #7 field-testing confirmed the increment/display mechanic works, but only one real BBQ order exists in current test data (all 4 test items on one doc). Never verified that preparing/cancelling one order's items leaves a *different* order's counts untouched. Needs a second real order with different items to test properly — reasoning from code alone isn't enough (see 01-Aug entry, §12). |
| M7 | Screen #7 "Uncategorized" bucket — code path exists, never fired | All test items correctly matched their category in every test so far. The fallback bucket for an itemId in `bbqLiveItemStatus` not found in the current event's menu has never actually been exercised. Worth deliberately provoking once. |
| M8 | Frontend hardcoded role lists don't auto-follow backend `constants.js` | Confirmed pattern, not a one-off: `UserManagementPage.jsx` had its own separate ROLES/ROLE_LABELS list that didn't include `bbq_supervisor` until fixed 01-Aug, despite the role existing in the backend since 11-Jul. Check any file with a hardcoded role list whenever a new role is added anywhere in the system. |
| M9 (RESOLVED same session) | `Sidebar.jsx` NAV_CONFIG can have two blocks with an identical `section:` name under different roles | Real bug, 02-Aug: an edit meant for `employee`'s `section: 'BBQ'` block landed in `manager`'s block instead (same section name, similar surrounding code), simultaneously wiping manager's existing Exception Queue link. Both `React key={section}` collision risk AND find/replace ambiguity risk. Caught via a deliberate elimination chain (grep source → grep built bundle → Incognito test → grep for duplicate `section: 'BBQ'` occurrences), not by inspection. Fixed same session. **Lesson, not just a one-off fix:** when editing `Sidebar.jsx`, always check for duplicate section names across roles before pasting an edit — don't trust the section label alone as a unique anchor. |
| M10 (RESOLVED same session) | JSX outer wrapper `<div>` can go missing silently during a multi-line find/replace edit, with no automated check catching it until `npm run build:dev` | Happened 02-Aug on `BbqTableApprovalPage.jsx`'s History-widening edit — the outer `<div key={req.requestId} className={styles.requestCard}>` opening tag was dropped while its closing `</div>` stayed, orphaning a stray closing tag and leaving `.map()` return multiple sibling elements with no single root. Caught by Homi's own review before even attempting a build, not by any tooling. **Lesson:** JSX has no `node --check`-equivalent for structural edits — the only real checks are a careful re-read of the diff, or the build itself. |

### Low — not blocking

| # | Item | Notes |
|---|------|-------|
| L1 | DOB validation is format-only | Accepts impossible dates. Fine while a calendar picker is used. |
| L2 | `pendingMaritalStatus` dead field | No longer written; defensive null-write handles stale data. |
| L3 | `cnicLast4` type consistency | Confirm 4-digit string across live employees. |
| L4 | Orphan `users` docs on dev | From delete-and-recreate cycles. Non-blocking. |
| L5 | Utility-script bundling | ~10 dev-only scripts get bundled into every functions deploy. Relocate eventually. |
| L6 | Test creds in git | Two dev-only test accounts hardcoded in test scripts. Throwaway fixtures; accepted. |
| L7 | Browser timezone in "Updated" labels | `toLocaleString` with no explicit zone. Fine for single-tenant PKT. |
| L8 | Two stale code comments | `constants.js` (~427–429) + `cafeService.js` `cancelOrder` header. Cosmetic — see Work Order #4. |
| L9 | Dead single-order café routes | Labelled in `cafeRoutes.js`. Superseded by group versions. **Do NOT remove `/orders/:orderId/cancel`** — still live. |
| L10 | Crossed test-account emails | `cafe.supervisor@…` vs `supervisor.cafe@…` swapped between Rashid and Majid. Cosmetic. |
| L11 | Tea Bar self-order route's role list too broad | Manager and other contractual-staff roles can currently self-order Tea Bar when they shouldn't. Left deliberately. **Must clean before prod.** |
| L12 | Orphaned Firestore index on `teabarOrders` | No matching query anywhere (grep-confirmed). Answer "No" to CLI delete prompt until a deliberate cleanup pass. |

### Carried from V1 (before full rollout)

| # | Item | Notes |
|---|------|-------|
| S1 | Booking duplicate-check not atomic | See V1 CB. |
| S2 ⚠ CHECK SOON | `employeeService` `.limit()` + in-memory filter breaks past 50 employees | **FFL already has 300+ employees — check before the next rollout.** See V1 CB. |
| S3 | Notification fanout 500-op batch limit | See V1 CB. |

### Pipeline / Backlog — flexible, does NOT block the current roadmap

| # | Item | Notes |
|---|------|-------|
| PL1 | iOS support | Requires a Mac for code signing — none in the team's device list. Parked. |
| PL2 | Penetration testing | Do before V2 expansion (GuestHouse/BOQ/Library). |
| PL3 | REST API key system | For external integrations. Relevant from V3/V4 onward. |

---

## 5. Universal Rate-Entry / Billing — NOT built yet (V1.5)

Café/Tea Bar/BBQ orders ship with billing hooks (`rateTargetKey`, `rateStatus: pending`, `billingDestination`, null `unitRate`/`amount`) but **no rate-entry mechanism exists yet**. Plan (V1.5): port the mess `mealRates` + applicator model to all order-taking modules at once.

Café `rateTargetKey` is pickup/consumption-dated: `{pickupDate}_cafe_{itemId}`. Mess format: `{date}_{mealType}_{optionKey}`. BBQ carries `unitRate`/`amount`/`rateStatus` fields, present but inert (populated in V1.5, per house convention of null-at-creation).

---

## 6. Prod Launch Checklist (when prod is un-frozen and rebuilt)

- Admin / super_admin bootstrap in prod (delicate first-super_admin manual step).
- Manager recreates the menu cycle in prod.
- 15 testers register fresh.
- Seed prod appSettings (P1 above).
- Fix password-reset email (H1) and rotate/exclude secrets (H2).
- Mobile env-config before any prod mobile build.
- Wipe dev/prod test data (P2 above — now includes BBQ test docs).
- Build the prod-side Tea Bar `teabarLocations` composite index (P3).
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

IPv6 is permanently disabled on the NAS (`/etc/sysctl.d/99-disable-ipv6.conf`) — was silently breaking `firebase deploy --only firestore:indexes`. Confirmed persistent across reboots as of 09-Jul.

---

## 8. Key Technical Rules — Never Break

1. `getFirestore('servio-dev')` — never `admin.firestore()`.
2. `verifyRole` is always a factory: `verifyRole(ROLES.X)` — never used directly as middleware.
3. All responses via `successResponse`/`errorResponse` from `../utils`.
4. `tenantId` always derived from the verified token, never from request body.
5. Specific routes before parameterised routes in every Express router.
6. `new Date()` in service files; `FieldValue.serverTimestamp()` only where explicitly correct.
7. **camelCase throughout** — collections, fields, code.
8. **Route ordering:** specific routes before parameterised (`:id`) routes.
9. **All responses** via `successResponse` / `errorResponse` — never raw `res.json()`.
10. **Design locked on paper before any code** — committed as its own commit before edits.
11. **Backend-first, then frontend.** One slice fully closed (data-layer verified, not UI alone) before the next opens.
12. **`build:dev` before deploying web to dev** (the prod-config footgun — resurfaces via typos like `-dev` vs `:dev`, not just bare invocation). **`firebase use` before functions deploy.**
13. **`node --check` is not enough** — grep-verify is the real check (undeclared-variable use is a runtime error, not a parse error). For frontend, a clean `npm run build:dev` is the equivalent syntax check.
14. **A restore is a rollback** — after restoring a file from backup, diff it against the version it replaced to see what was *lost*, not just that the clobber is gone.
15. **Read the actual code before proposing a fix or believing a claim of correctness** — reasoning from a file's structure ("the backend targets only this order's own items[], so isolation is probably fine") is not the same as testing it. Several real gaps (Screen #3's edit bug, Screen #8's exception queue, BBQ's `orderedDelta` wiring) were only found by actually reading or curling, not by inference.

---

## 9. Locked Decisions (rule stated; full reasoning in the archive or design doc)

Each line is the rule you must not break. Pre-BBQ reasoning lives in `docs/Servio_CB_V1Extension_Archive.md`; BBQ reasoning lives in `BBQ_V1.4_Design_Draft_10Jul2026.md` and §12 below.

**Dev / prod (15-Jun):** two permanent independent Firebase projects; both use the `servio-dev` named DB; disambiguate by project name. Prod frozen at V1 for a 15-day trial, then wiped + relaunched.

**Build order:** per-module vertical slice — each module's backend → web is field-tested before the next module's backend starts. Mobile for all modules bundled at the end of V1 Extension.

**Web service pattern — Pattern B:** token is passed into the service by the caller.

**Café / Tea Bar / BBQ order-taking conventions (see archive + design doc for full reasoning):** whole-order kitchen model (accept/prepared/cancel act on the whole order, not per-line); `consumerType: self|family_member` for consumer tagging; `cutoffWaived`/`overrideReason` override pattern; billing keyed to consumption/pickup date, not order-placed date.

### BBQ (V1.4) — locked 10-Jul, amended 11-Jul, decisions made through 01-Aug

- **Order-type split** (`preorder`/`live`) as two independently-locked sibling orders — genuinely new pattern, no existing module does this. Preorder locks at `preorderCutoffTime` regardless of `orderStatus`; live locks the instant `orderStatus` becomes `accepted`.
- **Three separate approval-style fields**, each answering a different question: `lateRequestApprovalStatus` (honor this late order at all?), `cancellationRequestStatus` (cancel an already-accepted order?), `approvalStatus` (honor the official-account charge? — irrelevant to whether food is served). Deliberately not merged into one field.
- **`bbqEvents.menu` is 6 arrays, not 5** (amended 11-Jul): `preorderItems`, `liveCookItems`, `kidsItems`, `beverages`, `breadItems`, `dessertItems` — `bread_dessert` split into two. Driven by `menuItems.bbqMenuGroup`'s 6 controlled values.
- **`cancelBbqOrder` (plain self-cancel, `placed`-only, no approval)** is a confirmed addition beyond the original design doc — the doc only defined an approval-gated cancel for already-accepted orders; a still-placed order had no cancel path until 11-Jul.
- **`bbqLiveItemStatus` uses incremental `FieldValue.increment`**, not full recompute — accepted tradeoff: no self-correction if a transition is missed. Every `bbqOrders` quantity-changing path must also call `applyBbqItemDeltas`.
- **Official BBQ orders:** initiated by `bbq_supervisor` OR `manager` (both floor-present), approved by Admin. Service is never blocked by approval outcome — only the cost-centre charge is gated.
- **`walk_in` not needed for BBQ** — BBQ's "no phone, forgot to order" scenario is still an identified supervisor booking for an identified employee, i.e. `proxy`. `bookingSource` stays `self | proxy | official`.
- **Screen #7 (Live Item Counts) groups items by category client-side** — `bbqLiveItemStatus` itself carries no category field, so the screen cross-references the current event's 6-array menu to build the grouping. Only items with actual counts are shown (no zero-padding the full menu); an unmatched itemId falls into "Uncategorized" rather than being dropped.
- **Screen #9 (Table Request) combines submission + own history/resubmit/cancel in one screen** — confirmed 02-Aug. Unlike orders (split #1/#2 creation vs. #3 history), the design doc lists only one employee-facing table-request screen, so both jobs live here. Multiple concurrent active requests per employee are allowed, no UI restriction — the backend never enforced one-active-request-per-employee either.
- **Screens #10/#11 use an explicit event-dropdown, not the single-"current"-event auto-pick every other BBQ screen uses** — confirmed 02-Aug, deliberately inconsistent with #1/#2/#3/#6/#7/#8/#9. Reasoning: table requests may be reviewed on any day for an upcoming Friday, unlike same-day kitchen-floor urgency. Defaults to the soonest published event.
- **Screen #10's History tab covers `approved` + `returned` + `rejected`**, not just returned/rejected as first built — widened same session, 02-Aug, after an approved request proved invisible on Admin's screen the moment it left Pending (it moves on to Screen #11, but Admin had no record of having approved it).
- **Screen #11 (Confirm) also carries Cancel** for approved requests — confirmed 02-Aug. The backend allows manager+ to cancel from `approved` same as the owner can, and no other screen would naturally hold that action. No separate confirmed-history view on this screen (default taken, not explicitly requested).

---

## 10. Tokens / Quick Reference

- Get a token: `node scripts/get_token.js <email> <password>` from `core/functions/` (absolute path if needed: `/mnt/storage/projects/servio_dev/core/functions/scripts/get_token.js`; ~1hr expiry, re-capture each session). Always sanity-check with `echo ${#TOKEN}` before curling — a silent fetch failure looks identical to an empty API response otherwise.
- Test accounts (password `1234@com` for all): `admin@fatima-group.com` (CLB00010 Qasim, admin) · `supervisor.cafe@fatima-group.com` (CLB00030 Majid, cafe_supervisor) · `test1@fatima-group.com` (FFL00002, employee) · `test2@fatima-group.com` (FFL00003 Ahmed Khan, employee/teabar_attendant) · `farrukh.imtiaz@fatima-group.com` (FFL00257, employee).
- **BBQ-role test account exists:** Gul Nokhaiz (CLB00050, `bbq_supervisor`) — seen live in Screen #7 testing 01-Aug. Password not separately confirmed; try the standard `1234@com` convention first.
- Café itemIds: Black Coffee = `yaoXMs4GR9fiOEBU8rcJ` · Cardamom Tea = `ACBHgUFPRKL5C8B9IQlf`.
- Café window: 18:00–22:30 PKT (whole-order accept/prepare/cancel field-tests need the live window).
- BBQ API param note: `GET /bbq/live-status?eventDate=...` wants the **bare date** (`2026-09-04`), not the tenant-prefixed doc-ID string (`ffl_2026-09-04`) — caught the hard way 01-Aug, easy to mix up since the doc ID uses the prefixed form.

---

## 11. Reference Index — Where to Look for What

This board stays intentionally compact. When a decision here needs more context, go to the right file instead of re-reading everything.

| Need | Go to | Notes |
|------|-------|-------|
| Full dated history, V1.1/V1.2/V1.3 (03-Jul–09-Jul-2026) | `docs/Servio_CB_V1Extension_Archive.md` | Every pre-BBQ session log. Search by date or keyword — it's long. |
| Full dated history, BBQ (V1.4, 10-Jul-2026 onward) | **§12 below, this file** | Not archived yet — BBQ is still active development. Will move to its own archive once the BBQ phase closes. |
| V1-era history (before V1 Extension started) | `Servio_CB_V1.md` | Not covered by either archive. |
| BBQ schema, screen map, locked design decisions | `docs/BBQ_V1.4_Design_Draft_10Jul2026.md` | The authoritative BBQ reference — status LOCKED. Includes the 11-Jul menu-array amendment note in place, not silently edited. |
| Café/Tea Bar lifecycle as the build template for future modules | Archive, search "kitchen board" / "whole-order" | The proven accept → prepared → history pattern BBQ's Screen #6 and future Tuck Shop/Bakery work reuse. |
| Family-member consumer tagging — which modules support it | **RESOLVED, 10-Jul BBQ design lock.** `family_member_flow.md` (below) originally scoped this to Café/Tuck Shop/Bakery only and excluded BBQ — that's now superseded. `bbqOrders.consumerFamilyMemberId` is a real, live field as of V1.4. Café, Tea Bar (n/a — no family concept), and BBQ all support it; `_memberHasTransactions()` (Open Item M4) must check all of them once implemented. |
| Original conceptual design for family-member consumer tagging | Project doc `family_member_flow.md` | **Caution — directional intent only, not current schema authority.** Uses old field names (`memberName`/`relationship`) superseded by the locked schema (`fullName`/`relation`), and predates the BBQ resolution above. |
| Authoritative current Firestore schema | `Servio_V1_Schema_Reference.docx` | Cross-check against live data before trusting it for new tables. |
| Full V1 Extension scope definition | `Servio_V1_Extension_Scope_09Jun2026.md` | Referenced in §3 above. |
| Tea Bar frontend screen map, access matrix | `TeaBar_Frontend_Screen_Map_and_History_Filters_05Jul2026.md` | Now historical — V1.3 is complete. |

---

## 12. BBQ (V1.4) — Full Dated Session Log

**Not archived — BBQ is still active development.** Everything below is kept in this working file, in full, following the same discipline the pre-BBQ log had while V1.3 was active. This section moves to its own archive file once all 13 BBQ screens are complete and field-tested, mirroring exactly what happened to V1.1–V1.3's history today.

---

## Update Entry — 10-Jul-2026 — V1.4 BBQ design locked; roadmap renumbered

### Session Scope
Full BBQ design conversation, conducted in-chat, written up as
`docs/BBQ_V1.4_Design_Draft_10Jul2026.md` — the same role Tea Bar's
screen map document played before that build. No code touched this
session; paper design only.

### Design outcome (see the design doc for full field-level detail)
- New collections: `bbqEvents` (fat doc, resolved weekly menu +
  Manager-draft/Admin-approve lifecycle, mirrors `events`' official
  vocabulary), `bbqSettings` (policy doc mirroring `reservationSettings`),
  `bbqOrders` (split by `orderType: preorder | live`, each with its own
  independent lock rule), `bbqTableRequests` (lightweight request only —
  no table/seat entity, "reserved" tag is physical/off-system),
  `bbqLiveItemStatus` (new live per-item rollup, Cloud-Function
  maintained, mirrors `eventAttendanceSummaries`' aggregation pattern).
- `bbqOrders.orderStatus` reuses café's exact four-value enum
  (`placed|accepted|prepared|cancelled`) — deliberately not given a
  fifth value for late-preorder requests; those use a separate
  `isLateRequest`/`lateRequestApprovalStatus` pair instead, keeping
  `orderStatus`'s meaning identical everywhere it's used.
- Three separate approval-style fields on `bbqOrders`, each answering a
  different question: `lateRequestApprovalStatus` (honor a late order at
  all), `cancellationRequestStatus` (cancel an already-accepted order —
  Manager-only override, `orderStatus` itself untouched during review so
  the kitchen dashboard never misreads a pending review as "not
  active"), and `approvalStatus` (billing sign-off on official orders,
  reused from café — order is served regardless of outcome).
- Confirmed: `bbq_supervisor` is one flat role held by ~4 people
  (typically 1 at the fixed terminal, others covering the floor),
  interchangeable, no role-level distinction. `manager` is a genuinely
  separate person. Floor-tablet frontend work is explicitly deferred to
  the mobile build phase, not a V1.4 web concern.
- Confirmed: no `notifications` write in the V1.4 backend at all —
  deferred to the collective V1.5 flow along with feedback/rate/billing.
  `bbqOrders.preparedAt` still gets recorded (feeds the dashboard + a
  future KPI), it just doesn't fire a notification yet.
- Screen count: 13 (vs. Tea Bar's 8) — flagged explicitly as a bigger
  build going in.

### Roadmap renumbered (propagated into §3 Build Status and §1 Current
Status above)
- **V1.3 is now Tea Bar only.** Tuck Shop and Bakery — previously
  bundled into V1.3's scope — split out to **V1.4b (Tuck Shop)** and
  **V1.4c (Bakery)**.
- **V1.5** stays aligned to its original definition (dashboards +
  analytics + reporting + billing) — the earlier-discussed addition of
  rate entry/notification/feedback is exactly that, an *addition* to the
  existing V1.5, not a replacement of it.
- **V1.6 (notifications + reporting alignment) is retired** — fully
  absorbed into V1.5. V1.6 no longer exists as a separate version
  anywhere in this roadmap.

### Two real mistakes caught and corrected mid-session (worth keeping
visible, not just quietly fixed)
1. First draft of the design doc silently assumed `manager` (menu
   drafter) and `bbq_supervisor` (floor runner) might be the same
   person wearing two hats — flagged as an assumption rather than
   stated as fact, then confirmed wrong (they're two different people).
2. First draft silently assumed BBQ's "order ready" notification was in
   V1.4 scope, based on an ambiguous reading of the original brief —
   flagged as an assumption, then confirmed wrong (deferred to V1.5).

Both were caught by explicitly marking them as assumptions requiring
confirmation rather than treating an inference as a decision — the
design doc would have been built around two wrong guesses otherwise.

## Update Entry - 11-Jul-2026 23:24

### Status
V1.4 BBQ backend build — session focus: bbqSettings, bbqEvents, bbqOrders (create + kitchen/approval), bbqTableRequests. All four field-tested end-to-end against live dev deploys, not just deployed-and-assumed-working. Three commits this session: de45ec9, 30619fa, 1b15c96.

### Completed

**bbqSettings** — tenantId-doc policy collection, admin-only GET/PATCH, mirrors reservationSettings exactly. Seed script: scripts/seedBbqSettings.js.

**bbqEvents** — full Manager-draft / Admin-approve lifecycle (draft → pending_review → published/returned → cancelled), reusing EVENT_STATUS_OFFICIAL verbatim. Composite doc ID `{tenantId}_{eventDate}`, Friday-only validated. Menu resolver builds items[] arrays from Manager-selected itemIds (NOT auto-pulled from full catalogue — confirmed design decision).

**menuItems schema extension** — new field `bbqMenuGroup`, required only for items tagged serviceCategories:['bbq']. Validated at both addMenuItem and updateMenuItem.

**bbqOrders** — multi-item-per-document model (NOT one-item-per-doc like café). Create paths: createBbqOrder (self), createProxyBbqOrder (bbq_supervisor/manager), createOfficialBbqOrder (billing-approval flow). Server resolves item menuGroup against the published event's menu — never trusts client-sent classification, same principle as mess's menuSnapshot. Kitchen/approval (bbqKitchenService.js): acceptBbqOrder, markBbqOrderPrepared, cancelBbqOrder (plain self-cancel, placed-only), approveLateOrder/rejectLateOrder, requestCancellation/approveCancellationRequest/rejectCancellationRequest, approveOfficialBbqOrder/rejectOfficialBbqOrder.

**bbqTableRequests** — full lifecycle: submit → pending → Admin approve/return/reject → (if returned) resubmit → pending → Manager confirm (only from approved). Cancel available to owning employee OR manager+.

**New role added:** bbq_supervisor (ROLES.BBQ_SUPERVISOR).

### Schema Amendments (locked doc §2.1 superseded, see dated note in design doc itself)

- `breadsDesserts[]` (5-array menu design) split into `breadItems[]` + `dessertItems[]` (6 arrays). Corresponding menuItems.bbqMenuGroup now has 6 values, not 5: preorder | live_cook | kids | beverage | bread | dessert. Deliberate decision, confirmed mid-session, not a correction of an error.
- Added audit fields not in original design doc, filling gaps caught during build (pattern: doc gave some decision paths audit trails but not others — fixed for consistency):
  - bbqTableRequests: returnedByUid/returnedAt/returnComments, rejectedByUid/rejectedAt/rejectionReason
  - bbqOrders: lateRequestDecisionByUid/lateRequestDecisionAt/lateRequestDecisionReason
  - bbqOrders: cancelledAt/cancelledByUid/cancellationReason (needed for the new plain-cancel path below)
- **New function beyond original design doc:** cancelBbqOrder — plain self-cancel for still-'placed' orders, no Manager approval needed. Original doc only defined an approval-gated cancel for already-accepted orders; a still-placed order had no cancel path at all. Confirmed addition, consistent with how café/mess handle pre-acceptance cancellation.

### Firestore Indexes Added
bbqEvents (×2), bbqTableRequests (×4 — two added mid-session after a live 500 error surfaced a missing eventDate-only query index), bbqOrders (×1, kitchen board query).

### Decisions Locked This Session
- Routing convention for BBQ: one combined bbqRoutes.js (café/Tea Bar style), not separate route files per collection (mess/events style).
- bbqSettings GET/PATCH: admin-only, mirrors reservationSettings.
- Manager picks a specific itemIds subset for each Friday's bbqEvents menu — NOT an auto-pulled full catalogue.
- No preorder-per-employee limit (unlike original design doc's "one preorder" language — confirmed no cap).
- Item validation always server-resolved against the published event's menu, never client-trusted.
- Event must be published before any order or table request can be placed against it.
- orderType is a frontend choice, backend only validates timing, doesn't infer.
- An approved late preorder is treated as a fully regular preorder from that point on — isLateRequest stays true as history, but no operational difference.
- A rejected late order is also cancelled (orderStatus flips) — doesn't sit as a phantom order.
- approveCancellationRequest is atomic — approval IS the cancellation (cancellationRequestStatus + orderStatus flip together), no separate later action.
- cancelBbqOrder / requestCancellation: owner or bbq_supervisor/manager/admin.
- Official BBQ orders (proxy + official creation) require bbq_supervisor OR manager — a real gap caught before deploy: initial route gating used managerAndAbove which excludes bbq_supervisor entirely; fixed to a new bbqSupervisorAndAbove group.

### Known Gaps (accepted, not blocking)
- Owner-vs-non-owner cancel access control (bbqTableRequests AND bbqOrders) — logic written and reviewed but never tested against a genuine non-privileged second account; only tested with the single admin token available this session.
- rejectOfficialBbqOrder — untested (directly mirrors the now-proven approveOfficialBbqOrder/café pattern, low risk).
- No single-order GET endpoint for bbqOrders yet (kitchen board list is the only read path currently).
- Late-request detection logic (_validateOrderWindow's "past cutoff, not yet closed" branch) verified only via manual Firestore field edit, not via genuine real-time cutoff timing — no real Friday date was reachable this session to test naturally.

### Dev Data Residue (fold into existing P2 cleanup item)
Several ffl_2026-08-14 / ffl_2026-07-31 / ffl_2026-08-07 test bbqEvents docs, ~15 test bbqOrders docs in various terminal states, 4 test bbqTableRequests docs, bbqSettings.closeoutTime left at "23:15" (test value, not reverted to seed default "23:00"), test menuItems (CAFE_TEST_TEA-style BBQ equivalents) with bbqMenuGroup drift from mid-session testing.

### Next Session Starting Point
Remaining from original V1.4 BBQ scope: bbqLiveItemStatus (Cloud Function aggregator, per-item real-time kitchen counts — "prepared" counts now testable since accept/prepare exists) + bbqKitchenTargetLocker (17:30 Friday scheduled snapshot function). Neither started. Read design doc §2.5 and §5 before proposing anything.
## Update Entry - 12-Jul-2026 13:05

### bbqLiveItemStatus — built and fully field-tested

New collection `bbqLiveItemStatus` (doc ID `{tenantId}_{eventDate}`) holds
live, per-item ordered/prepared counters for the supervisor's cumulative-
count kitchen screen. New file: `bbqLiveItemStatusService.js`
(`applyBbqItemDeltas` helper). Wired into `bbqOrderService.js` (all 3
create functions) and `bbqKitchenService.js` (markBbqOrderPrepared,
cancelBbqOrder, rejectLateOrder, approveCancellationRequest).

**Architecture decision:** incremental `FieldValue.increment` counters,
NOT a full re-query/re-sum like `eventService.js`'s `aggregateAttendance()`
(design doc's "same pattern as attendanceAggregator" phrase turned out to
describe something that doesn't exist as a standalone Cloud Function —
the real event pattern is a synchronous inline call that fully re-scans
all responses every time, which doesn't scale to BBQ's higher order
volume across a 3-hour service window). Chosen deliberately for speed;
accepted tradeoff is that a missed transition drifts the counter with no
self-correction, unlike the recompute pattern.

Writes use `set(..., {merge:true})` with nested objects (not `update()`)
so the document auto-creates on the first order of the night, and
Firestore's nested-map deep-merge means each write only touches the
specific itemId(s) involved — sibling itemIds are never touched.
Increment calls are `await`ed, never fire-and-forget (Cloud Functions can
freeze the process right after sending the HTTP response — a
fire-and-forget write could silently never complete).

**Trigger map (confirmed against real code, not assumed):**
- createBbqOrder / createProxyBbqOrder / createOfficialBbqOrder → orderedCount +qty
- acceptBbqOrder → no change
- markBbqOrderPrepared → preparedCount +qty
- cancelBbqOrder (plain, placed-only) → orderedCount -qty
- rejectLateOrder → orderedCount -qty
- approveCancellationRequest → orderedCount -qty always; preparedCount -qty
  ONLY if order.orderStatus was already 'prepared' at approval time
  (captured via wasAlreadyPrepared before the status overwrite) — confirmed
  12-Jul-2026 that prepared-then-cancelled can happen on a real Friday night
- approveLateOrder, requestCancellation, rejectCancellationRequest,
  approveOfficialBbqOrder, rejectOfficialBbqOrder → no change (confirmed,
  none of these touch orderStatus/items in a way that changes quantities)

**Field-tested against live dev writes, all 6 paths, predicted-then-verified:**
1. Order created (qty 2) → orderedCount 2, no preparedCount field ✓
2. Accepted + prepared → preparedCount 2, orderedCount unchanged ✓
3. Second order (qty 1, same item) → orderedCount 3, preparedCount
   untouched at 2 (proves merge doesn't clobber siblings) ✓
4. Cancel second order (still placed) → orderedCount back to 2 ✓
5. Late order: manually set preorderCutoffAt to the past → order created
   with isLateRequest:true, orderedCount 2→3 → rejectLateOrder →
   orderedCount back to 2 ✓. preorderCutoffAt restored to original value
   (17:30) immediately after.
6. Prepared-then-cancelled race: order created → accepted → cancellation
   requested (still accepted) → marked prepared anyway (simulating kitchen
   not knowing) → cancellation approved → BOTH orderedCount and
   preparedCount dropped together (3→2, 3→2), confirming the conditional
   branch fires correctly ✓

Board returned to baseline (orderedCount 2, preparedCount 2) after all
tests — consistency check passed.

### Incident: three files emptied to 0 bytes mid-session — root cause found and fixed

During this session's commit, `constants.js`, `bbqOrderService.js`, and
`bbqKitchenService.js` were found truncated to 0 bytes on disk AFTER a
successful `git commit` (commit itself was fine — full content was
correctly captured; only the working-tree copies were empty). Caught only
because `git status --short` was run as a matter of course after the
commit — otherwise this would have shipped silently on next deploy and
broken every route that imports constants.js (i.e. almost everything).

Root cause: VS Code's Remote [SSH] `files.autoSave` was set to
`afterDelay` (1000ms) — different from, and overriding, the User-scope
setting which was already `off`. All three wiped files were open as
editor tabs during the commit; background autosave over the SSH
connection likely raced against git reading the same files, producing a
truncated write. Hooks and rclone background sync were both checked and
ruled out (no active hooks beyond .sample files; no rclone timer/cron/
running process).

Fix applied: `files.autoSave` set to `off` in BOTH User and Remote
scopes. Manual save (Ctrl+S) is now required — adopt the habit of
saving explicitly, then checking `git status --short` shows the expected
file(s) as modified, before `git add`.

Files restored via `git checkout -- <path>` from the last good commit
(a8dab2a) before the corrupted files were ever added/committed — no data
was actually lost, but it was close.

**Lesson for future sessions:** always run `git status --short` (not just
`git log -1`) after every commit, not only before — confirms both what
went IN and that the working tree still matches it. This was already a
standing rule but wasn't being applied to the post-commit side
consistently.

### Committed
`3da2da6` — BBQ live item counter: increment ordered/prepared counts on
order create, accept, prepare, cancel, reject-late, approve-cancellation-
request. Pushed to origin/main.

## Update Entry - 12-Jul-2026 16:50

### bbqKitchenTargetLocker — built and field-tested

New scheduled Cloud Function `bbqKitchenTargetLocker.js`, runs 17:30 PKT
every Friday only (cron `30 17 * * 5`, Asia/Karachi). Snapshots
`bbqLiveItemStatus`'s live `orderedCount` per item into
`bbqEvents.kitchenTargetSnapshot` (flattened to `{itemId: number}`, NOT
the nested `{itemId: {itemName, orderedCount, preparedCount}}` shape
of the source doc), and stamps `kitchenTargetLockedAt`. Confirmed
permanent once set — refuses to overwrite on a second run, matching the
design doc's "never regenerated, same rule as dailyMenus" requirement.
No manual re-lock endpoint — deliberate decision, confirmed 12-Jul-2026:
if wrong, requires manual Firestore edit to null `kitchenTargetLockedAt`
before it can re-run, same as a real production mistake would need
correcting by hand.

Assumption confirmed with Homi and used as the basis for NOT filtering
by orderType inside the function: live ordering doesn't open until 19:30,
two hours after this runs, so whatever's in `itemCounts` at 17:30 is
automatically 100% preorder data.

**Refactor for testability:** `lockForTenant` and `exports.run` both
accept an optional `eventDate` override (`{ eventDate: 'YYYY-MM-DD' }`),
defaulting to the real PKT-today when omitted. The real 17:30 cron call
passes nothing, so production behavior is unchanged — this exists purely
so the function can be tested on demand without waiting for an actual
Friday. New file: `core/functions/scripts/test_bbq_locker.js` — one-off
manual runner, credential pattern copied from `seedBbqSettings.js`
(`admin.initializeApp()` with no args only works inside a deployed
function; local runs need the explicit service-account cert).

**Field-tested, predicted-then-verified, against ffl_2026-07-17:**
1. First run (`eventDate` override) → console log "Locked ffl_2026-07-17
   — 1 items." → Firestore confirmed: `kitchenTargetLockedAt` set to a
   real timestamp, `kitchenTargetSnapshot: { hd95Hia3Ftzky1sEsci8: 2 }` —
   correctly flattened from the source's nested `orderedCount: 2` ✓
2. Second run, same override → console log "already locked — refusing
   to overwrite" → confirmed no further Firestore write, guard holds ✓
3. Cloud Scheduler job `firebase-schedule-bbqKitchenTargetLocker-
   asia-south1` confirmed registered post-deploy: State enabled,
   Frequency `30 17 * * 5 (Asia/Karachi)`, Google's own human-readable
   translation confirms "At 5:30 PM" + "Equal to Friday" — correct.

**Not yet proven:** an actual real-world 17:30-Friday firing via the
live scheduler (as opposed to the manual override bypass) — will
self-confirm the first time a real BBQ Friday occurs after this deploy.
Not a blocker, just not yet witnessed end-to-end.

### Incident: stray duplicate file during this slice's commit

`test_bbq_locker.js` briefly existed in TWO locations — the correct
`core/functions/scripts/` and an accidental duplicate at the repo root's
`scripts/` (paths would have resolved incorrectly from there — points
outside `core/functions/` entirely). Caught by `git status --short`
showing an unexpected 4th untracked file before staging. Deleted before
commit; not pushed. No repeat of the file-emptying autosave bug from
earlier this session — confirmed clean before and after this commit.

### Committed
`c8e50a3` — BBQ kitchen target locker: 17:30 Friday scheduled snapshot
of live counts into bbqEvents.kitchenTargetSnapshot, permanent once
locked. Field-tested via eventDate override against ffl_2026-07-17 —
write path and never-regenerate guard both confirmed. Pushed to
origin/main.

### V1.4 BBQ backend status
Both new pieces from this session's starting point (bbqLiveItemStatus +
bbqKitchenTargetLocker) are now built, deployed, and field-tested. This
closes design doc §2.5 and §5 in full. BBQ backend is now essentially
complete except for the known open items already logged in the
11-Jul-2026 and 12-Jul-2026 13:05 entries (owner-vs-non-owner cancel
untested, no single-order GET endpoint, bbqSettings.closeoutTime test
value, etc.) — none of which block moving to BBQ frontend design next.

### NEXT starting point
BBQ backend, as scoped, is done. Next: BBQ frontend (screens per design
doc §3 — 13 screens) OR pre-frontend cleanup pass on the known gaps
list — decision not yet made, first task of next session.
## Update Entry - 13-Jul-2026

### Session focus: closing two real gaps found before BBQ frontend could start

Session opened with a fresh review of the BBQ design doc §3 screen map
against the actual deployed `bbqRoutes.js` — not just the CB's "backend
essentially complete" claim. Found two screens with no backend endpoint
to call at all: screen #3 (My BBQ Orders) had no GET route for an
employee's own order history, and screen #7 (Live Kitchen Dashboard —
cumulative counts) had no GET route to read `bbqLiveItemStatus` at all,
despite the aggregator itself being built and field-tested last session.
Neither was in the CB's "known gaps" list — that list only flagged the
smaller "no single-order GET" item, which is a different, narrower gap.

### Built and field-tested

**`getMyBbqOrders`** (`bbqOrderService.js`) + **`GET /bbq/orders/mine`**
(`anyAuthenticated`) — employee's own order history, queried by
`employeeNumber` (billing account holder), same pattern as
`getMyTableRequests`. Deliberately includes proxy orders placed on the
employee's behalf, not just self-placed ones. Added a `_toISO`/`_clean`
helper to `bbqOrderService.js`, mirroring the identical helper already in
`bbqEventService.js`/`bbqTableRequestService.js` — this file didn't need
one until now since its create functions only ever returned plain values.
New composite index required (`employeeNumber` + `tenantId` + `createdAt`
desc) — hit the expected `FAILED_PRECONDITION` on first real call, created
via the console link, added to `firestore.indexes.json`. Field-tested:
confirmed `success:true, count:0, orders:[]` for an employee with no BBQ
orders — correct result, not a bug.

**`getBbqLiveItemStatus`** (`bbqLiveItemStatusService.js`) + **`GET
/bbq/live-status?eventDate=...`** (`bbqSupervisorAndAbove`) — reads the
live per-item counters for the cumulative-count screen. No new index
needed (single doc-by-ID read). Field-tested against `ffl_2026-07-17`'s
existing live-item data from the 12-Jul session — returned
`orderedCount:2, preparedCount:2` for the one test item, exactly matching
the "board returned to baseline" state recorded in that session's log. A
useful cross-check that the live-item data hadn't drifted between
sessions.

**`bbqAutoClose`** (new file, `core/functions/src/scheduled/`) — new
scheduled function, runs 23:50 PKT Fridays only, closes any BBQ event
still `published` where `eventDate <= today`. Confirmed with Homi:
"Friday Night 12:00" = end-of-Friday, simplified to 23:50 same-day rather
than 00:00 Saturday to avoid day-of-week cron arithmetic across midnight,
matching the existing `resolveDaily` (23:50 daily) precedent.

Built with a deliberate design choice, flagged and left open rather than
silently copied from `teabarAutoCancel`: bounded to `eventDate <= today`
rather than a blind sweep of every `published` event regardless of date
(unlike `teabarAutoCancel`, which sweeps unconditionally). Reasoning: BBQ
menus can be published up to a week ahead (design doc: "published
Thursday" for the coming Friday), so a blind sweep risks closing a
genuinely future, not-yet-happened event if two events are ever
`published` simultaneously. Whether that scenario is actually possible in
practice was flagged to Homi but not explicitly confirmed either way —
the bounded version is safe regardless, so left as built.

Includes the same `eventDate` override pattern as
`bbqKitchenTargetLocker` for manual testing (`test_bbq_autoclose.js`,
same credential pattern as `test_bbq_locker.js`).

**Incident, caught and fixed:** the `index.js` registration got pasted in
twice during editing (duplicate `exports.bbqAutoClose` block, one with
stray leading indentation). Not a functional bug — JS silently uses the
last of two identical duplicate assignments, and the deploy log confirmed
only one function was ever created — but cleaned up for source clarity.
Caught via `grep -c`, not by symptom.

**Field-tested, predicted-then-verified:** first manual run hit the
expected missing-index error (`status`+`tenantId`+`eventDate` composite,
not previously needed by any other query); index created via console
link, added to `firestore.indexes.json`; second run closed
`ffl_2026-07-17` correctly — confirmed via Firestore console that `status`
flipped to `closed`, `updatedAt` changed, and nothing else on the
document (`kitchenTargetSnapshot`, `menu`, all six item arrays) was
touched.

### New indexes added (3 total, all confirmed Enabled)
- `bbqOrders`: employeeNumber ↑, tenantId ↑, createdAt ↓ (for `getMyBbqOrders`)
- `bbqEvents`: status ↑, tenantId ↑, eventDate ↑ (for `bbqAutoClose`)
- (pre-existing, reconfirmed untouched during this session's audit: `bbqEvents` tenantId+status+eventDate↓, and tenantId+eventDate↓ — both still correctly tracked, no drift)

### Known consequence
`ffl_2026-07-17` — last session's kitchen-target-locker test event — is
now permanently `closed` as a result of field-testing `bbqAutoClose`
against it. No route exists to move a `closed` event back to `published`
(`publishBbqEvent` only accepts a `pending_review` starting status). Not
a bug — expected behavior — but means that event is no longer usable for
further "published event" testing.

### New clean test event created for frontend work
`ffl_2026-08-21` — drafted (Manager) → submitted → published (Admin),
walking the full real lifecycle end-to-end rather than a console
shortcut. One valid menu item: `hd95Hia3Ftzky1sEsci8` ("Test BBQ Chicken
Tikka"), sitting in `preorderItems` only.

**Known gap, flagged for before Screen #2's turn:** this event has
nothing in `liveCookItems`, `kidsItems`, `beverages`, `breadItems`, or
`dessertItems`. Fine for screens #1 (Preorder tab) and #3 (My Orders).
Not enough to distinguish "Screen #2 built correctly, empty data" from
"Screen #2 broken" once that screen's turn comes — will need more test
`bbqMenuGroup`-tagged items added deliberately before then.
## Update Entry - 13-Jul-2026 (BBQ Frontend — Screen #1)

### BBQ Preorder screen (Screen #1) — built and fully field-tested end-to-end

First BBQ frontend screen. Two new frontend service files
(`web/src/services/bbqEventService.js`, `web/src/services/bbqOrderService.js`
— frontend, separate from the backend files of the same name) plus
`BbqPreorderPage.jsx` + `.module.css`, wired into `App.jsx`
(`/bbq-preorder`) and `Sidebar.jsx` (new "BBQ" nav section, employee role).

Structure follows `TeabarSelfOrderPage.jsx` closely — cart, review modal,
success screen all reuse `TeabarSelfOrderPage.module.css` directly rather
than duplicating; only genuinely new pieces (consumer picker, dining mode
toggle, late-request warning banner) live in `BbqPreorderPage.module.css`.

**Two real decisions locked this session, both confirmed with Homi
before building:**
- BBQ orders use `dine_in` and `takeaway` only — `outdoor_seating` (a
  third value that exists in the shared `DINING_MODES` constant,
  presumably café-specific) deliberately excluded. BBQ night is
  inherently outdoor already, so a distinct "outdoor seating" choice
  doesn't apply here.
- Past-cutoff preorders are NOT blocked (Option B, over Option A which
  would've disabled ordering after cutoff). Screen shows a visible
  amber warning banner and still allows submission — relies entirely on
  the backend's existing `isLateRequest`/`lateRequestApprovalStatus`
  handling, consistent with the design doc treating late requests as a
  first-class path (Screen #8 Exception Review Queue exists specifically
  for this).

**`getMyFamily()` shape verified before use, not assumed** — grepped the
real doc comment in `familyService.js` confirming
`data = { officialEmployeeNumber, count, members }`, each member
`{ familyMemberId, fullName, relation, isActive, ... }`. Matched the
code's assumption exactly on first check — a rare case of a flagged
assumption needing zero correction.

### Debugging note — false alarm on bundle verification, worth remembering

After first `npm run build:dev`, `grep -c "BbqPreorderPage" dist/assets/index-*.js`
returned 0 even after a full `rm -rf dist` + clean rebuild, with identical
file hashes both times. This looked like strong evidence the new code
wasn't being bundled at all. Root cause, found only after live browser
testing proved the screen actually worked: **minified production builds
mangle component names — grepping for a literal component name in a
minified bundle is not a valid verification method.** The build was
correct the whole time; the verification technique was wrong. Real
confirmation came from live browser testing + a direct Firestore
document check, not from bundle inspection. Lesson for future sessions:
verify frontend builds by testing the actual running app, not by
grepping minified output for source-level names.

### Full field test, real account, real data

Farrukh Imtiaz (FFL00257, employee) — full flow walked live: menu load
(`ffl_2026-08-21`'s one preorder item), add to cart, review modal
(consumer picker showed "Self" correctly, dining mode toggle
functional), submit, success screen ("Preorder placed — For
2026-08-21"). Cross-checked two ways:
1. Firestore console — `bbqOrders/oDQMayrj6l75MK4Sm2nv` — every field
   correct (`orderStatus: placed`, `orderType: preorder`,
   `consumerType: self`, `diningMode: dine_in`, `isLateRequest: false`,
   correct item/quantity).
2. `GET /bbq/orders/mine` (the endpoint built earlier this session) —
   returned the same order, same shape, `count: 1`. First time this
   session a complete vertical slice (backend query + backend write +
   frontend fetch + frontend UI + frontend submit) has been proven
   working together end-to-end, not just individually.

Also tested with Ahmed Khan (FFL00003, `bbq_supervisor`) — screen
renders and functions correctly for this role too, since it currently
falls through to the employee nav config (see gap below).

### Known gap, NOT fixed this session — flagged for a decision next session
`bbq_supervisor` has no entry in `Sidebar.jsx`'s `NAV_CONFIG` — falls
through to the `employee` config via `getNav()`'s fallback. Ahmed Khan
(a real `bbq_supervisor` test account) currently sees the full employee
menu (My Bill, Feedback, Café, Tea Bar, BBQ Preorder, etc.) rather than a
supervisor-focused nav. Not a regression from this session's work, but
BBQ Preorder is now visibly part of what falls into that catch-all.
Separately, `bbq_supervisor`'s Home dashboard is a `ComingSoon`
placeholder in `App.jsx`'s `RoleDashboard` — pre-existing, unrelated to
BBQ Preorder specifically. Both flagged, neither fixed — decision on
whether/when to address deferred to next session.

## Update Entry - 13-Jul-2026 (bbq_supervisor nav gap — closed)

### Fixed: bbq_supervisor sidebar fallback

`bbq_supervisor` previously had no entry in `Sidebar.jsx`'s `NAV_CONFIG`,
falling through to the `employee` config — meaning every BBQ supervisor
saw the full employee menu (My Bill, Feedback, Café, Tea Bar, BBQ
Preorder) instead of a role-appropriate one.

**Scope confirmed with Homi:** `bbq_supervisor`'s nav should eventually
contain Proxy Order (#4), Official Order (#5), Kitchen Dashboard (#6),
and Cumulative Counts (#7) — none of which are built yet. Explicitly
NOT "BBQ Preorder" (Screen #1) — that's an employee self-ordering
screen, not part of this role's intended scope.

Since #4–#7 don't exist yet, added a minimal `bbq_supervisor` block
containing only `Home` — honest about current build state rather than
linking to not-yet-built screens. Will grow as #4–#7 are built, same
pattern as Tea Bar's four-item block.

**Deliberate decision, recorded:** removing the sidebar link does NOT
block backend access — `POST /bbq/orders` and `/bbq-preorder` remain
reachable by a `bbq_supervisor` who navigates there directly (URL
guess or old bookmark), since `anyAuthenticated` on that route
intentionally includes this role. Confirmed acceptable with Homi:
sidebar controls discoverability only, not a security boundary — a
supervisor placing a personal preorder isn't harmful. If this
changes later, it needs an explicit role-exclusion added to the route
itself, not just a nav removal.

Field-tested live: Ahmed Khan (FFL00003, bbq_supervisor) — sidebar now
shows only "BBQ Operations → Home," confirmed via screenshot.

### Next Session Starting Point
`bbq_supervisor` nav gap closed. BBQ frontend build order unchanged:
Screen #3 (My BBQ Orders) is next — backend (`getMyBbqOrders`) already
built and field-tested, UI pattern precedent already read in full
(`TeabarSharedHistoryPage.jsx`).

## Update Entry - 31-Jul-2026 (Resume after ~18-day gap)

### Status on resume

Away since 13-Jul-2026 (NAS powered off for the duration); resumed
work today, 31-Jul-2026. No work happened elsewhere during the gap —
this session's starting point is exactly where the last chat left
off, verified from disk and git rather than assumed from memory.

**Confirmed via `git status --short` / `git log --oneline -10`:**
- Last committed work: `955480c` (bbq_supervisor nav fix) — matches
  the CB's previous entry exactly, no drift.
- **Uncommitted Screen #3 work is still sitting on disk, untouched:**
  - `core/functions/src/bbq/bbqOrderService.js` (modified) —
    `editBbqOrder`, built and partially field-tested
  - `core/functions/src/bbq/bbqRoutes.js` (modified) — the
    `PATCH /bbq/orders/:orderId/edit` route
  - `web/src/services/bbqOrderService.js` (frontend, modified) —
    `editBbqOrder`, `cancelBbqOrder`, `requestBbqCancellation`
  - `web/src/App.jsx`, `web/src/components/layout/Sidebar.jsx`
    (modified) — Screen #3 route + nav wiring
  - `web/src/pages/employee/BbqMyOrdersPage.jsx` + `.module.css`
    (untracked, never committed)

### Known unresolved issue carried over

Screen #3's Edit action did not visibly update the UI in at least one
test: editing order `sOqUvCkmk8EGINEkIYST` (quantity 1 → intended 6)
left the card showing `×1` after Save. Root cause never found —
session ended before the planned DevTools Network-tab check happened.
Backend `editBbqOrder` itself has independent, confirmed-correct
evidence from a separate order (`oDQMayrj6l75MK4Sm2nv`) tested earlier
in the same prior session, so the leading suspicion is a frontend
issue (stepper not registering, or a misclick between order cards),
not a repeat of the backend counter logic.

### Still to re-check before resuming build
- `ffl_2026-08-21`'s current `status` in Firestore — `bbqAutoClose`
  runs every Friday 23:50 PKT and will have fired multiple times
  during the 18-day gap; may no longer be `published`.
- Current quantities on the two test orders
  (`sOqUvCkmk8EGINEkIYST`, `oDQMayrj6l75MK4Sm2nv`) and the
  `bbqLiveItemStatus` counter — re-read fresh, not assumed.

## Update Entry - 31-Jul-2026 (Screen #3 Edit bug — re-tested, did not reproduce)

### DevTools diagnosis performed as planned

Opened Network tab, cleared log, repeated the exact failing action from
13-Jul: Edit → change quantity → Save on order `sOqUvCkmk8EGINEkIYST`
(the order that got stuck at ×1 in the earlier session).

**Result: the edit succeeded.** Network tab showed the expected clean
sequence — `mine` (200) → `edit` (200) → `mine` (200) — and both the UI
and a direct API check confirmed the change landed correctly:
- Order document: `quantity: 1 → 4`, `updatedAt` moved from
  `createdAt` (2026-07-13T19:46:18) to a fresh timestamp
  (2026-07-31T15:15:49) — genuine write confirmed, not a stale UI
  showing old data.
- `bbqLiveItemStatus`: `orderedCount` moved from 5 → 8, exactly
  matching the expected math (5 − 1 old + 4 new = 8).

### Honest conclusion — not "fixed," reclassified

No code changed between the 13-Jul failure and today's successful
retest. The bug did not reproduce under the same steps. Recording this
precisely rather than either overclaiming ("fixed") or leaving it open
without qualification ("still broken"):

**Status: observed once (13-Jul), not reproduced since, root cause
unknown.** Leading theory, unconfirmed: a one-off frontend timing/
render glitch specific to that session, rather than a deterministic
logic bug — three independent test sequences (two before the gap on a
different order, one today on the previously-stuck order) all show
`editBbqOrder`'s core logic — validation, re-resolution against the
published menu, and the two-delta live-counter adjustment — working
correctly every time it's been exercised.

**Not closing this as resolved.** If it recurs, worth checking:
double-click/double-submit protection on the Save button (no explicit
guard against a fast double-click currently exists beyond the
`submitting` state), and whether it correlates with any particular
browser/network condition. No action taken today per session scope
(testing only, no code changes) — flagged for awareness, not
scheduled as a fix, since there's nothing concrete yet to fix.

### Confirmed still valid, all re-verified fresh (not from memory)
- `ffl_2026-08-21` — still `status: published`, untouched during the
  18-day gap (expected — `bbqAutoClose` only touches past-dated events,
  and this Friday is still 3 weeks out).
- Both test orders and the live-status counter — all consistent with
  their last known 13-Jul state before this session's edit.

## Update Entry - 31-Jul-2026 (Test data — second BBQ event for Screen #2)

### New published test event created: `ffl_2026-09-04`

Closes the gap flagged since 13-Jul: `ffl_2026-08-21` only had one
menu item (`preorderItems` only), making Screen #2 (Live tab)
untestable — no data in `liveCookItems`, `kidsItems`, `beverages`,
`breadItems`, `dessertItems`.

Checked the catalogue first rather than creating new items blind —
found 5 pre-existing `bbq`-tagged test items already covering 4 of the
5 missing groups (created 11-Jul, apparently seeded ahead of need but
never used):
- `hd95Hia3Ftzky1sEsci8` — Test BBQ Chicken Tikka — `preorder`
- `uSo0QzVkr1Xonb1a20f6` — Test BBQ Beef Boti — `live_cook`
- `maifdBdKWtINI3egbnY6` — Test BBQ Kids Nuggets — `kids`
- `Y4uHYJRDUnRhcpjrPhPu` — Test BBQ Soft Drink — `beverage`
- `UDESHeeoy1ZyQw4sJDzy` — Test BBQ Naan — `bread`

**Still no `dessert`-tagged item anywhere in the catalogue** — minor
residual gap, not blocking (4/5 groups is enough to test Screen #2
meaningfully), flagged for whenever it's convenient to seed one.

Walked the full real lifecycle, Manager→Admin, same as `08-21`: draft
(5 items) → submit → publish. All three steps predicted and confirmed
matching exactly. Verified via `GET /bbq/events/ffl_2026-09-04` that
all 5 items resolved into the correct arrays.

**Decision: keeping both `08-21` and `09-04` published simultaneously**
rather than replacing — `08-21` has real order history (from Screen
#1/#3 testing) worth preserving; `09-04` is dedicated to Screen #2
testing. Deliberate side effect, flagged in advance: with two events
now `published` at once, `GET /bbq/events?status=published&limit=1`
(used by `getCurrentBbqEvent` on Screen #1) will return `09-04` (later
`eventDate`, sorted desc) — Screen #1 will show `09-04`'s single-item
menu going forward, not `08-21`'s. This is also incidentally the
first real-world test of the "two events published simultaneously"
scenario originally flagged as a hypothetical when designing
`bbqAutoClose` — confirms the existing sort-by-`eventDate`-desc
behavior, not yet confirmed as correct/desired UX, just confirmed as
current behavior.

### Addendum — 31-Jul-2026, two design decisions confirmed (no code changes)

**1. Screen #1's single-event behavior — confirmed correct, no change
needed.** Discussed whether having two events simultaneously
`published` (`08-21` and `09-04`) is a problem for Screen #1. Confirmed
with Homi: Screen #1 showing only the single latest published event
(current `GET /bbq/events?status=published&limit=1` behavior, sorted
`eventDate desc`) is the intended design, not a bug to fix. No action
needed — this was flagged as an open question in the previous entry,
now resolved as "working as intended."

**2. Future Screens #12/#13 (Manager/Admin event list — Menu Draft,
Menu Approve & Publish) — design decision recorded ahead of build.**
Confirmed with Homi: when these screens are eventually built, the
event list should default to hiding `closed` and `cancelled` events
(showing only `draft`, `pending_review`, `returned`, `published` by
default), with an explicit toggle/filter to reveal historical
closed/cancelled events on demand. Reasoning: without this, the list
grows unbounded with every past Friday and becomes unusable over a
season. Mirrors the existing soft-delete-via-`isVisible` pattern used
elsewhere in the schema — nothing is hidden permanently, just filtered
by default.

Not actionable today — #12/#13 are not yet built. Recorded now so the
decision doesn't need to be re-litigated when their turn comes.

## Update Entry - 31-Jul-2026 (BBQ Frontend — Live Order screen, Screen #2)

### Screen #2 (BBQ Live Order) — built and field-tested end-to-end

New files: `BbqLiveOrderPage.jsx`, `BbqLiveOrderPage.module.css`. Route
`/bbq-live-order` added to `App.jsx`; nav entry added to `Sidebar.jsx`
(employee role, BBQ section, between Preorder and My BBQ Orders).

**No backend changes needed.** Read `bbqOrderService.js` (backend)
before building anything and found `createBbqOrder` already fully
supports `orderType: 'live'` — resolves items against all 6 menu
arrays, and `_validateOrderWindow`'s `LIVE` branch hard-rejects outside
`orderWindowStartAt`/`orderWindowEndAt` with no late-request concept
(unlike preorder). Confirmed this before writing any frontend code
rather than assuming — this made Screen #2 a frontend-only build.

### Field-shape assumption — verified before use, not guessed

`event.orderWindowStartAt`/`orderWindowEndAt` needed to be readable via
plain `new Date(...)`. Verified against actual backend code
(`bbqEventService.js`'s `_cleanEvent`/`_toISO`, confirmed inside
`getBbqEvents` — the function `GET /bbq/events` actually calls) rather
than copying Screen #1's pattern on faith. Confirmed: both fields come
back as ISO strings on read, `new Date(...)` is correct.

### Five states built

Loading / No event published / **Not Open Yet** (countdown to
`orderWindowStartAt`) / **Live** (grouped menu, cart, order placement) /
**Closed for Tonight** (after `orderWindowEndAt`).

### Field-tested live, real account, real data

- **Not Open Yet**: confirmed against real data (`ffl_2026-09-04`,
  34 days out) — correct message, correct target date/time, countdown
  format `Xd HH:MM:SS`, confirmed genuinely ticking second-by-second
  (not frozen).
- **Live**: tested via temporary Firestore edit —
  `ffl_2026-09-04.orderWindowStartAt`/`orderWindowEndAt` manually moved
  to 31-Jul-2026 22:00/23:55 PKT (Firestore console timestamp picker).
  Confirmed: 4 of 5 menu groups rendered correctly (Live Cook, Kids,
  Beverages, Bread — Dessert correctly absent, no dessert item exists
  in the catalogue yet, known gap since 31-Jul earlier entry). Correct
  items in correct sections, correct food-type badges.
- **Cart → Review → Place Order**: 4 items across 4 groups added,
  cart bar showed correct count, review modal showed all 4 lines +
  consumer picker (defaulted Self) + dining mode toggle, order placed
  successfully, landed on success screen with correct event date.
- **Cross-screen confirmation**: the placed live order appears
  correctly on **My BBQ Orders** (Screen #3) as a 4th card, `placed`
  status, all 4 items/quantities correct, no late/cancel-request
  badges (expected — live orders have no late concept). Confirms
  Screen #3 handles `orderType: 'live'` orders correctly, not just
  `preorder` ones — hadn't been explicitly tested until now.
- **NOT tested this session**: the "Closed for Tonight" state (after
  `orderWindowEndAt`). Code is symmetric to the "Not Open Yet" check
  and presumed correct, but this is a presumption, not a confirmed
  fact — flagging honestly rather than claiming full coverage.

### Bug found and fixed same session: broken group-header icons

`ti-baby-carriage`, `ti-bread`, `ti-ice-cream` are not in this
project's bundled Tabler icon set — Kids and Bread section headers
rendered a broken/fallback glyph in production (Live Cook's `flame`
and Beverages' `cup` happened to exist and rendered fine). Found via
screenshot review, not assumed.

Fix: grepped this codebase for icon names *already confirmed working*
(`grep -rn "ti-" web/src/pages/employee/ web/src/components/layout/Sidebar.jsx`)
rather than guessing a second unverified name. Swapped Kids → `users`,
Bread → `bowl`, Dessert → `box` (Dessert's fix is unverified — no
dessert item exists yet to actually render it against, flagged
separately, not claimed as tested).

**Process note on the grep method**: it only catches icon names
written as literal text (`ti-something`). It does NOT catch
dynamically-built ones like Sidebar's `icon: 'meat'` pattern
(`ti-${icon}`) — so this is proof of what page-level icons work, not
a complete inventory of every icon in the app. Worth remembering next
time an icon needs checking elsewhere.

### Dev data residue (fold into existing P2 cleanup item)

`ffl_2026-09-04`'s `orderWindowStartAt`/`orderWindowEndAt` no longer
match what `saveBbqEventDraft` would generate from `bbqSettings` —
manually overwritten for live-state testing. Needs revert or
regeneration via re-saving the event draft before this event is used
for anything else.

### Git state at this entry

Code (2 new files + `App.jsx`/`Sidebar.jsx` edits + icon fix) was
built, deployed to hosting, and field-tested successfully **before**
being committed to git — deploy is not a substitute for commit,
confirmed via `git status --short` before staging anything. Commit
sequence: code commit(s) first, this CB entry as a separate commit
after.

### Addendum — 31-Jul-2026 (late night), post-backup

**"Closed for Tonight" state — now confirmed, was flagged untested
earlier tonight.** The 22:00–23:55 test window closed naturally on its
own; screenshot confirms correct message ("Live ordering for
2026-09-04 has ended"), correct icon rendering, no crash. This closes
the one gap this entry originally flagged as unverified.

**Cancellation-approval role question — re-confirmed correct as
locked, no change made.** Homi recalled a different rule (supervisor +
manager) after the 18-day gap; checked against the design doc in three
separate places (§2.3 field annotation, §4 Roles Touched, §3 Screen
Map for Screen #8) — all three agree: Manager only. Backend
(`managerAndAbove` on both `/cancellation-request/approve` and
`/reject`) matches the doc correctly. No bug, no drift — just a
memory gap after time away, caught before it became an accidental
change. Design stands as-is.

**Whole-order cancellation, not item-level — re-confirmed correct,
no change made.** Checked `bbqOrders` schema (§2.3): all
cancellation-related fields (`cancellationRequestStatus`,
`cancellationRequestedAt`, `cancellationDecisionAt`, etc.) live on the
order document itself, not per-item. Matches what's built (Screen #3's
Cancel/Request Cancellation buttons act on the whole card). Homi's
recollection this time matched the doc exactly.

**Screen #2 cancel-button question — resolved by clarifying screen
boundaries, not by building anything new.** Discussed whether Screen
#2 (Live Order) needs its own cancel button on placed-order cards.
Per design doc §3, order management (cancel/edit/request-cancellation)
is Screen #3's job (My BBQ Orders), not Screen #2's (which is
order-placement only). Confirmed Screen #3 already handles this
correctly, field-tested tonight. No new work needed — would have
duplicated existing, correctly-scoped functionality.

**Genuinely still open, not resolved tonight — carry forward:** the
post-acceptance "Request Cancellation" flow (as distinct from plain
pre-acceptance "Cancel") has never been exercised on a real accepted
order. Structurally can't be tested yet — requires a `bbq_supervisor`
account to accept an order first, and the only path to accept an
order is Screen #6 (Kitchen Dashboard — order cards), which doesn't
exist yet. Not a bug, just an untested path with a real, known
dependency. Revisit once Screen #6 exists.

### Build approach going forward — explicit commitment, not just a plan

Remaining screens (#4 Proxy Order, #5 Official Order, #6–7 Kitchen
Dashboard, #8 Exception Review Queue, #9–11 Table Booking, #12–13 Menu
Draft/Publish) will be built and briefly reviewed screen-by-screen, as
before — but **full interdependency audit deliberately deferred to
after all 13 screens exist**, rather than repeated per-screen, since
several of these genuinely can't be exercised in isolation (e.g.
tonight's cancellation-request gap). Explicit commitment: this
deferral must end in an actual full audit before BBQ is declared
complete — not quietly become "we never got back to it." Recorded here
so it's checkable later, not just remembered.

## Update Entry - 01-Aug-2026 (session: Screens 6 & 8)

### Status
V1.4 BBQ frontend continues. Screen #6 (Kitchen Dashboard) and Screen #8
(Exception Review Queue) both built, deployed, and field-tested live on
real data. 4/13 screens now complete (#1, #2, #3, #6, #8 — note #8 was
built out of numeric order, ahead of #4/#5/#7, since it unblocked a
genuine untested path and had a real pending record waiting for it).

### Screen #6 — BBQ Kitchen Dashboard (order cards)
Role: bbq_supervisor+. Path: /bbq-kitchen. **Zero new backend needed** —
GET /bbq/kitchen/orders, PATCH .../accept, PATCH .../prepared all
already existed from the 11-Jul backend session. Pure frontend build:
new bbqKitchenService.js (web), new BbqKitchenPage.jsx + .module.css,
route + bbq_supervisor sidebar nav entry added.

Key design decision, confirmed before build: unlike café's kitchen
board, BBQ orders are one-document-per-order (items[] array already
inside), so no bookingGroupId grouping step was needed — simpler than
café's pattern, not just a reuse of it. Also deliberately scoped
narrower than café's board: accept/prepared actions ONLY, no
supervisor-cancel button — matches design doc §3's exact wording for
this screen and the same screen-boundary logic already applied to
Screen #2 on 31-Jul (order management belongs to Screen #3, not to
placement/kitchen-adjacent screens).

Event selection: auto-detects current published event via
getCurrentBbqEvent (same as Screens #1/#2) — same known caveat carries
forward (multiple simultaneous published events means it follows
whichever getCurrentBbqEvent picks, not necessarily the one with real
order history).

**Side-fix, same commit:** UserManagementPage.jsx's role dropdown
(web) had its own hardcoded ROLES/ROLE_LABELS list, separate from
backend constants.js — bbq_supervisor existed in the backend since
11-Jul but was never added to this web list, meaning NO account could
ever be assigned that role through the UI. Fixed — added in the
supervisor cluster after teabar_attendant in both lists. Pattern to
remember: adding a role to backend constants.js does not automatically
propagate to frontend hardcoded mirrors of that list; check
UserManagementPage.jsx (and possibly others) whenever a new role is
added going forward.

Field-tested live: all four test items (Test BBQ Beef Boti, Test BBQ Kids Nuggets, Test BBQ Soft Drink, Test BBQ Naan) correctly grouped into their real categories (Live Cook/Kids/Beverages/Bread) with zero landing in Uncategorized. Ordered: 1 confirmed for all four before any kitchen action. All four items belong to a single BBQ order (one doc, items[] array) — Mark Prepared was clicked once on that one order card, and Prepared correctly moved from 0 to 1 on all four items simultaneously, matching the one-order-one-card design. Not tested: cross-order isolation — whether preparing one order's items leaves a different order's items untouched. Only one BBQ order exists in the current test data for this event; a second order with different items would be needed to actually exercise that path.

**Closed as a side effect:** the post-acceptance "Request Cancellation"
flow on Screen #3, untested since 31-Jul specifically because nothing
existed to accept an order into 'accepted' status until tonight.
Employee (Farrukh Imtiaz) requested cancellation on the now-accepted
order; badge correctly showed "accepted" + "Cancellation pending";
kitchen card correctly still offered Mark Prepared during the pending
review (confirmed matches design doc's deliberate decoupling of
cancellationRequestStatus from orderStatus).

Also deployment-process note: an `npm run build -dev` typo (should be
`build:dev`) caused npm to swallow the flag and silently fall back to
the bare `build` script, which loaded .env.production per the existing
documented bug pattern, and got deployed to the dev hosting site before
being caught and corrected. Login was not confirmed broken/unbroken in
the gap, but the corrected build was verified to say
`--mode development` before redeploying. Worth remembering: this bug
resurfaces via typos, not just bare invocation — watch for `-dev`
vs `:dev`.

### Screen #8 — Exception Review Queue (NEW backend + frontend)
Role: manager+. Path: /bbq-exceptions. **Genuine backend gap found by
reading code, not assumed:** no existing query anywhere returned orders
with pending late-requests or pending cancellation-requests — checked
both bbqOrderService.js and bbqKitchenService.js in full before
concluding this. Added:
- `getBbqExceptionQueue({tenantId, eventDate})` in bbqKitchenService.js
  — returns TWO separate arrays (lateRequests[], cancellationRequests[]),
  deliberately not merged, since the two exception types use different
  approve/reject endpoints and mean different things.
- `GET /bbq/exceptions?eventDate=...` route, managerAndAbove gated.
- Backend verified live via curl with a real Manager token before any
  frontend was written — confirmed correct shape and correctly
  returned the one real pending cancellation request created earlier
  in the session.

Frontend: extended web's bbqKitchenService.js with 5 new functions;
new BbqExceptionQueuePage.jsx + .module.css; route added; manager
NAV_CONFIG in Sidebar.jsx got its first-ever BBQ section (previously
had none at all — genuine pre-existing gap, unrelated to tonight's
build, closed as a byproduct).

**Locked UI decisions (confirmed with Homi before build):**
- Scoped to current eventDate (consistent with Screen #6), not
  cross-event.
- Approve = single click, no confirm step.
- Reject = requires a typed reason in BOTH cases. Backend only
  mandates a reason for late-request rejection; cancellation-request
  rejection is backend-optional but enforced as required in this app's
  UI for a consistent audit trail — deliberate choice, not a backend
  mismatch to "fix" later.

**Field-tested live:** approve and reject-with-reason both exercised
on the one real pending cancellation request (Farrukh Imtiaz's live
order). Rejected with reason "Items already prepared."

### Screen #3 display gap — found via Screen #8 testing, not before
After rejecting the cancellation request on Screen #8, Screen #3 (My
BBQ Orders) showed no trace of the rejection — card reverted to a
plain "accepted" look with "Request cancellation" available again, as
if nothing had happened. Root cause: BbqMyOrdersPage.jsx only ever
checked for cancellationRequestStatus === 'pending'; no branch existed
for 'rejected' at all (not a regression — this state literally could
not occur before tonight, since nothing could produce a rejection
before Screen #8 existed).

Fixed: added a rejected-state badge (reusing existing status_cancelled
styling — deliberately kept, not changed to a new color; confirmed
with Homi this stays visually consistent with the existing "Late
request rejected" pattern already on the same page, despite the
surface-level risk of looking like the whole order was cancelled) plus
an inline display of cancellationDecisionReason, reusing the existing
rowError style. No CSS changes needed — both classes already existed.
Field-tested live: badge, reason text, and "Request cancellation"
button all confirmed correct on Farrukh Imtiaz's account.

**Noteworthy pattern for the record:** this gap could not have been
found by testing Screen #3 in isolation, however thoroughly — the
state it needed to display had never existed in the system until
Screen #8 made it possible. Worth remembering when scoping "done" for
any screen that depends on a downstream reviewer screen not yet built.

### Known open items, not blocking, carried forward
- Screen #6: createdAt timestamp rendering used a guessed Firestore
  `{_seconds}` shape (no live payload seen before building) —
  confirmed CORRECT by the later Screen #8 curl test, no fix needed,
  noting for the record only.
- Multiple-published-events UX question (getCurrentBbqEvent picking
  "most recent by date," not "most relevant for testing") — still
  open, still not urgent, now touched by three screens (#1, #2, #6, #8)
  instead of two.
- Screens #4, #5, #7, #9–13 not yet started.
- Full BBQ-screens interdependency audit still deliberately deferred
  to after all 13 screens exist — commitment still standing, not
  forgotten.
- Dev data residue unchanged from 31-Jul note (ffl_2026-09-04's
  orderWindowStartAt/orderWindowEndAt still manually overwritten,
  bbqSettings.closeoutTime still at test value "23:15").

### Git state at session close
Two commits this session:
1. `09c40cb` — Screen #6 + UserManagementPage role-list fix (6 files)
2. [commit hash for Screen #8 + Screen #3 fix — to be filled in after
   Homi commits]

### Next Session Starting Point
Build order for remaining screens (#4, #5, #7, #9–13) still not
decided. Screen #7 (cumulative item-count dashboard, reads
bbqLiveItemStatus) may be a natural next step given proximity to
Screen #6's kitchen-floor context, but no commitment made — decide
fresh next session per standing discipline.


---

## Update Entry - 01-Aug-2026 (session: Screen #7 — Live Item Counts)

### Status
Pre-flight confirmed clean: `firebase use` → dev (servio-dev-55d2d);
`git status --short` → clean; `git log --oneline -5` → HEAD `81f87c5`
as expected, matching the placeholder note from the prior session's
close.

### Screen #7 — Live Kitchen Dashboard: Cumulative Item Counts
Role: `bbq_supervisor`+. Path: `/bbq-live-counts`. **Needed zero new
backend** — `GET /bbq/live-status` and `getBbqLiveItemStatus()` already
existed from an earlier session (12-Jul), unused by any frontend until
tonight.

Frontend: one new function in `bbqKitchenService.js`
(`getBbqLiveItemStatus`), new `BbqLiveCountsPage.jsx` + `.module.css`,
route added, and a new sidebar item under `bbq_supervisor`'s existing
BBQ Operations section (alongside Kitchen Dashboard).

**Pre-build verification (before any frontend code was written):**
Read `bbqOrderService.js` in full to confirm all three order-creation
paths (`createBbqOrder`, `createProxyBbqOrder`, `createOfficialBbqOrder`)
correctly call `applyBbqItemDeltas({ orderedDelta: 1 })`, and that
`editBbqOrder` correctly does old-item-subtract/new-item-add as two
separate calls — confirmed correct on all counts.

Then curl-tested `GET /bbq/live-status` against real dev data before
writing any frontend. First attempt returned `notFound: true` —
traced to a bad `eventDate` query param (used the tenant-prefixed
doc-ID string `ffl_2026-09-04` instead of the bare `2026-09-04` the
API actually expects — an assistant error, not a backend defect;
confirmed by cross-checking the Firestore console directly, where the
document was sitting there fully populated all along). Corrected curl
confirmed real, correctly-populated data: 4 items, `orderedCount: 1`
each, real `lastAggregatedAt`. **Also noted from this data:**
`preparedCount` is genuinely absent from the document until something
is actually prepared — not present-and-zero — confirming the frontend
needed to treat a missing value as 0, not assume the field is always
there.

**Design decisions confirmed with Homi before build (not assumed):**
- Items grouped by menu category (Preorder/Live Cook/Kids/Beverages/
  Bread/Dessert), built client-side by cross-referencing the flat
  `itemCounts` map against the current event's 6-array `menu` —
  `bbqLiveItemStatus` itself carries no category field.
- Only items with actual counts are shown — screen does not pad with
  the full menu at zero.
- An itemId in `itemCounts` not found in the current event's menu
  falls into an "Uncategorized" bucket rather than being dropped
  silently (never actually exercised in testing — no such case
  occurred; see Open Item M7).
- Same 30s auto-refresh + toggle convention as Screen #6.

**Field-tested live:** all four test items (`Test BBQ Beef Boti`,
`Test BBQ Kids Nuggets`, `Test BBQ Soft Drink`, `Test BBQ Naan`)
correctly grouped into their real categories (Live Cook/Kids/
Beverages/Bread) with zero landing in Uncategorized. `Ordered: 1`
confirmed for all four before any kitchen action.

**Correction made mid-session, recorded honestly:** all four test
items belong to a SINGLE BBQ order (one Firestore doc, one `items[]`
array — this is the whole point of BBQ's one-order-one-card model,
same as café). Mark Prepared was clicked ONCE on that one order card
on Kitchen Dashboard — there is no per-item action anywhere in the
BBQ kitchen flow. The backend correctly applied `preparedDelta: 1` to
every item inside that order's `items[]` in one pass; `Prepared`
correctly moved from `0` to `1` on all four items simultaneously.
**An earlier draft of this CB entry incorrectly described this as
"marked prepared one at a time" and drew a "lower-risk" conclusion
about cross-item isolation from that wrong premise — corrected before
commit, once Homi caught the mistake. See Open Item M6: cross-order
isolation genuinely has NOT been tested, since only one BBQ order
exists in current test data. This is not a minor wording fix — the
original draft's reasoning was built on a false assumption about what
had actually been clicked.**

### Known open items, not blocking, carried forward
- M6 (new): `bbqLiveItemStatus` cross-order isolation never tested —
  needs a second real BBQ order with different items.
- M7 (new): Screen #7's "Uncategorized" bucket has a code path but has
  never actually fired in a real test.
- M8 (new, generalized from tonight's own near-miss with reasoning-
  instead-of-testing): frontend hardcoded role lists don't auto-follow
  backend `constants.js` — same pattern already caught once for
  `bbq_supervisor` in `UserManagementPage.jsx` on 01-Aug (earlier
  session, Screen #6/#8). Check any file with a hardcoded role list
  whenever a new role is added anywhere.
- Multiple-published-events UX question — now touches five screens
  (#1, #2, #6, #7, #8), still open, still not urgent.
- Screens #4, #5, #9–13 not yet started.
- Full BBQ-screens interdependency audit still deliberately deferred
  to after all 13 screens exist — commitment still standing.
- Dev data residue unchanged: `ffl_2026-09-04`'s `orderWindowStartAt`/
  `orderWindowEndAt` still manually overwritten; `bbqSettings.closeoutTime`
  still at test value `"23:15"`.

### CB consolidation, same session
Pre-BBQ V1 Extension history (V1.1 Family CRUD, V1.2 Café, V1.3 Tea
Bar — every dated session, 03-Jul through 09-Jul-2026) moved in full,
verbatim, to `docs/Servio_CB_V1Extension_Archive.md`. BBQ's own dated
log (10-Jul-2026 onward, including tonight's entry) deliberately kept
in this working file rather than archived — BBQ is still active
development, per Homi's explicit instruction. This is the same
discipline applied to V1.3 today, to be applied to BBQ once its 13
screens are complete.

### Git state at session close
`a22fd3a` — Screen #7 code (BBQ Live Item Counts).
`d60b6a7` — CB consolidation (pre-BBQ history archived, board renamed
to `V1_Extension_BBQ.md`). Both pushed to `origin/main` same night.
[Filled in retroactively 02-Aug, once known — left as a placeholder
too long; a small process gap worth naming rather than quietly fixing.]

### Next Session Starting Point
Screens #4, #5, #9–13 remain. Build order not pre-decided — choose
fresh next session per standing discipline, same as every prior
screen decision.
---

## Update Entry — 02-Aug-2026 — Screens #9, #10, #11: Table Booking cluster complete

### Session Scope
Continuation of the same overnight session that closed with Screen #7
(pre-flight from that session still stands — dev confirmed, HEAD
`81f87c5` at start). Built the full Table Booking cluster: #9 (Employee
request), #10 (Admin approval), #11 (Manager confirmation) — the
natural three-screen group identified fresh this session, same
discipline as #6→#7→#8, not a pre-set plan.

**Sequencing note, recorded honestly:** unlike #6/#7/#8 (each committed
separately as it closed), Homi chose to build all three of #9/#10/#11
before committing anything. A deliberate departure from the
one-commit-per-screen precedent, not an accident — flagged in the
moment, not silently gone along with.

### Backend: zero new work needed, confirmed by reading before building
Read `bbqTableRequestService.js` and the table-request routes in
`bbqRoutes.js` in full before writing any frontend. Full lifecycle
already existed and matched the design doc's 11-Jul audit-field
amendment exactly: submit (pending) → Admin approve/return/reject →
(if returned) employee resubmit → pending again → Manager confirm
(only from approved) → cancel (owner or manager+, from
pending/approved/returned). No backend changes this session.

### Design decisions confirmed with Homi before build (not assumed)
- Screen #9 combines the submission form and the employee's own
  request history/resubmit/cancel in one screen (not split like
  orders #1/#2 vs #3).
- Multiple concurrent active table requests per employee allowed — no
  UI restriction.
- Screens #10/#11 scope to one event via a dropdown (default: soonest
  published), unlike every other BBQ screen's single-"current"-event
  auto-pick — first screen(s) to need `getPublishedBbqEvents`, a new
  function (only `getCurrentBbqEvent` existed before tonight).
- Screen #11 carries both Confirm and Cancel.
- Screen #10 shows a Pending action queue AND a History tab — later
  widened mid-session (see below).
- Approve/Confirm = single click, no confirm dialog. Return/Reject =
  typed reason required, button disabled until non-empty — same
  pattern as Screen #8's Exception Queue, reused deliberately.

### Two real bugs found and fixed this session
**1. Sidebar wrong-block paste (Screen #9's edit).** The Table
Request sidebar link was meant to land in `employee`'s `section:
'BBQ'` block, but landed in `manager`'s block instead — two blocks
sharing the identical section name, easy to mismatch when eyeballing
a large file. Side effect: manager's existing Exception Queue link
was silently overwritten and gone. Diagnosed properly, not guessed at
— ruled out caching (hard refresh, then a full Incognito session with
a different user), confirmed the deployed bundle genuinely contained
the right strings via `grep` on the built JS, and only then grepped
for `section: 'BBQ'` occurrences and found two. Both blocks fixed:
employee gained Table Request, manager's Exception Queue restored.
Logged as Open Item M9 (resolved same session) — the process lesson
matters beyond this one fix.

**2. JSX syntax error (Screen #10's History-widening edit).** Homi
caught this himself before attempting a build: a find/replace meant
to touch only the inner `cardTop` div accidentally dropped the outer
wrapping `<div key={req.requestId} className={styles.requestCard}>`
opening tag, leaving its closing tag orphaned and `.map()` returning
multiple sibling elements with no single root. One-line fix (restore
the wrapper + its `key` prop). Logged as Open Item M10 — there's no
`node --check`-equivalent for JSX structure; the only real checks are
a careful diff re-read or the build itself.

### Field-tested live — full chain, real evidence, not code-reading confidence
Traced through real screenshots across the session, not assumed from
passing builds:
- **Submit → Pending → Reject (with reason)**, twice independently
  (10-guest "gents only" request, rejected "no slot available" both
  times it was tested) — Admin's typed-reason requirement confirmed
  working both times.
- **Submit → Pending → Approve → Confirm**, twice independently
  (Farrukh's 40-guest request, Humayun's 4-guest request) — full
  cross-screen chain proven, including the approved request correctly
  showing `Confirmed` back on Screen #9 afterward.
- **Submit → Pending → Return (with reason) → Resubmit → Pending
  again → reappears cleanly in Admin's queue.** This closes the one
  path flagged as untestable at the end of last night's session
  (Screen #9's resubmit branch existed in code but nothing could
  produce a `returned` request before Screen #10 existed). Confirmed
  correct: old return data (`returnedByUid/At/Comments`) properly
  cleared on resubmit, edited note text carried through, History (0)
  on re-check confirming no stale return record left behind.
- **Cancel from both directions, confirmed distinctly, not inferred
  from an identical-looking badge.** Owner-cancel (Screen #9) and
  manager-cancel (Screen #11, from `approved` status) are genuinely
  different code paths/UI triggers producing the same `Cancelled`
  status — both explicitly confirmed via direct question to Homi
  after an initial screenshot left it ambiguous which had actually
  been clicked. Worth naming: a passing-looking result isn't proof of
  *which* path produced it, and this session treated that distinction
  as worth stopping and asking about rather than assuming.
- **Event-dropdown scoping exercised in practice**, not just built —
  Admin and Manager both switched between `2026-08-14` and
  `2026-09-04` mid-session and correctly saw different, correct
  request sets per event.

### Mid-session design change: Screen #10's History widened
Originally built to show only `returned`/`rejected` (per the original
locked decision). Homi flagged that an approved request became
invisible on Admin's screen the instant it left Pending — a real
usability gap, not a bug. Widened to include `approved` too, with a
small colored status-badge system (green/orange/red) added to
history cards. Confirmed visually correct after the fix — the
previously-invisible 4-guest approved request became visible.

### CB consolidation, same session
Filled in Screen #7's session-close entry's two placeholder commit
hashes (`a22fd3a` code, `d60b6a7` CB consolidation), which had been
left as `[to be filled in]` since last night and never actually
updated — a small process gap, fixed here rather than left stale
indefinitely.

### Known open items, not blocking, carried forward
- M9, M10 (new, this session, both resolved same session) — see §4.
  Kept as process lessons, not just closed tickets.
- M6, M7, M8 (from Screen #7's session) — unchanged, still open.
- **Multiple-published-events handling is now deliberately
  inconsistent across BBQ screens, not just an open question:**
  #1/#2/#3/#6/#7/#8/#9 all auto-pick a single "current" event;
  #10/#11 explicitly show a dropdown across all published events.
  Both are reasoned choices for their own screen's context (same-day
  urgency vs. any-day review), not an oversight — but worth a
  conscious decision later if it ever causes confusion in practice,
  rather than letting the inconsistency grow silently as more screens
  are built.
- Screens #4, #5, #12, #13 remain — 9 of 13 BBQ screens now complete.
- Full BBQ-screens interdependency audit still deliberately deferred
  to after all 13 screens exist — commitment still standing, now
  closer.
- Dev data residue growing, not shrinking — see updated P2 above.

### Next Session Starting Point
Screens #4, #5 (Proxy/Official Order — café has a close template) and
#12, #13 (Menu Draft + Approve/Publish — currently zero real UI for
BBQ menu creation at all) remain. Build order not pre-decided — choose
fresh next session per standing discipline, same as every prior
screen decision.
## Session: 01–02-Aug-2026 — BBQ Proxy/Official Order cluster + field-testing fallout

### Scope
Originally Screens #4 (Proxy Order) and #5 (Official Order). Grew during
field testing into a 15-screen total for BBQ frontend — a real, deliberate
scope addition, not creep: two genuine gaps were found and closed rather
than deferred, because both blocked the two screens actually being usable.

### Completed
- **Screen #4 — BBQ Proxy Order** (`BbqProxyOrderPage.jsx`). Live-only
  (confirmed decision — no preorder toggle). Employee search →
  window-gated 5-group live menu → consumer/family picker → dining mode.
  Calls existing backend `createProxyBbqOrder` (was already built,
  unused until now).
- **Screen #5 — BBQ Official Order** (`BbqOfficialOrderPage.jsx`).
  Live-only. Sponsor search → same menu/window gating, no consumer
  picker → guest name + free-text cost centre. Calls existing
  `createOfficialBbqOrder`.
- **Screen #14 — BBQ Official Approvals** (`BbqOfficialPendingPage.jsx`,
  new — not in the original 13/14 count until this session). Admin-only
  billing-approval queue. Simpler than café's equivalent by design —
  bbqOrders is one document per order, no group-by-bookingGroupId
  reassembly needed the way café's per-line-item model requires.
- **Screen #15 — BBQ History** (`BbqHistoryPage.jsx`, new). Card-grid
  pattern copied from Tea Bar's shared history (not café's table — same
  one-doc-per-order reasoning as Screen #14). Filters: Event Date /
  Employee Number, mutually exclusive by design (avoids a 3-field
  composite index for a low-volume weekly dataset). Scoped to proxy +
  official only — self-placed orders filtered client-side. Later
  extended with Edit/Cancel actions directly on the cards (role-gated,
  not ownership-gated) — see Decision below.
- Backend: `getBbqOfficialPendingOrders`, `getBbqOfficialPendingOrders`
  route, `getBbqOrderHistory` + route — all in `bbqOrderService.js` /
  `bbqRoutes.js`.
- Frontend service: 7 new wrapper functions added to
  `web/src/services/bbqOrderService.js` (proxy, official, list-pending,
  approve, reject, history).
- `App.jsx` + `Sidebar.jsx`: 4 new routes, nav links added to
  `bbq_supervisor`/`manager`/`admin` blocks — grep-verified against the
  M9 wrong-block risk each time, all landed correctly.

### Bugs Found & Fixed (real, not process notes)
- **`createdByEmployeeNumber` bug** — `createProxyBbqOrder` and
  `createOfficialBbqOrder` never received the placing user's own
  `officialEmployeeNumber` from the route layer; both silently fell
  back to writing the *target*/*sponsor's* number into "placed by."
  Pre-existing since those functions were first written — invisible
  until Screen #14 became the first screen to ever display that field.
  Fixed: added `placedByEmployeeNumber` parameter through
  `bbqRoutes.js` → `bbqOrderService.js`, no fallback (writes `null`
  rather than silently repeating the wrong value if ever missing).
- **Access-control gap** — `bbq_supervisor` was missing from the
  `cafeOrAdmin` role list gating `GET /family/employee/:employeeNumber`
  (the endpoint Proxy/Official Order's employee-search step depends
  on). Café-only role list, written before BBQ existed; BBQ was never
  added when its own proxy/official screens started needing it. Fixed
  by adding `ROLES.BBQ_SUPERVISOR`.
- **Client-side ownership bug** — `BbqMyOrdersPage.jsx` showed
  Edit/Cancel to the employee for ANY `placed` order regardless of who
  actually created it. For proxy/official orders, `createdByUid` is the
  supervisor's uid, not the employee's — so the buttons would have
  failed at the API for any employee who actually clicked them. Fixed:
  restricted to `bookingSource === 'self'` only.
- **Missing error surfacing** — the first version of the
  `official-pending` route swallowed the real error behind a fixed
  string with no `console.error`. Caught immediately during first
  testing (500 with no diagnosable cause) and fixed before it became a
  pattern repeated elsewhere.
- **Duplicate Firestore composite indexes** — two pairs of identical
  indexes on `bbqOrders` (`approvalStatus/billingDestination/tenantId/
  createdAt` and `employeeNumber/tenantId/createdAt`), each pair
  field-for-field identical with different Index IDs. One pair from
  this session (console-create + later CLI-deploy both creating a
  copy), one pre-existing. Deleted the duplicates via console. CLI
  deploy still flagged mismatch once (409 on a stale ID) immediately
  after deletion — attributed to Firestore's async index-deletion lag,
  not re-chased same-session; **needs a follow-up check** (see Open
  Items).

### Decisions Locked
- Proxy orders are **live-only** — no preorder toggle. Confirmed
  explicitly, not assumed.
- Official orders built live-only on the **same reasoning**, not a
  separately confirmed decision — flagged as an assumption in code
  comments, never explicitly asked/answered.
- Cost centre is **free text** on Official Order, not a dropdown from
  `officialAccounts` — confirmed against café's actual code (an earlier
  assumption in this session was wrong and corrected before building).
- Admin does **not** get Proxy/Official Order links in the sidebar,
  even though the backend permits admin to call those routes — matches
  café's existing convention (admin can reach via URL, not surfaced in
  nav).
- Issue 5 (who manages a proxy/official order after it's placed):
  **Option (a) chosen** — Edit/Cancel added directly to Screen #15's
  cards, role-gated (`bbq_supervisor`/`manager`/`admin`, not
  ownership-based), not a separate "orders I placed" screen. Confirmed
  the Kitchen Dashboard does NOT expose these at any order stage before
  choosing this — was briefly assumed to be a non-issue, verified false
  by live test, then built.
- Official orders **stay visible** in the sponsor's own `My BBQ Orders`
  list, now clearly tagged "Official · billed to cost centre X" rather
  than removed from that view — matches the same design principle
  already used for proxy orders (visibility for the account holder,
  even when it's not their own consumption).
- History's two filters (Event Date / Employee Number) kept **mutually
  exclusive** — deliberate index-count tradeoff, not a UI limitation
  worth revisiting without a reason.

### Open Items
- **M11** — Official-order `orderType` live-only assumption never
  explicitly confirmed with Homi (only Proxy's was). Revisit if a
  preorder-style official order is ever actually needed.
- **M12** — Duplicate Firestore index cleanup: confirm (next session,
  not urgent) that the console now shows exactly one copy of each
  `bbqOrders` composite index, and that a `firestore:indexes` deploy no
  longer flags a mismatch. If still duplicated after a real time gap,
  investigate further rather than re-deleting blindly.
- **M13** — `firestore.indexes.json` reconciliation: confirmed clean
  for the two indexes touched this session; the pre-existing
  `teabarOrders` index gap (already tracked under P3) was reconfirmed
  present, not fixed.
- **M14** — BBQ screen count is now **15**, not 13 or 14. Update
  wherever the total is referenced (design doc header, any prior CB
  summary line) so it stops silently under-counting.
- Firebase CLI is 6 minor versions behind (`15.19.1` → `15.25.1`,
  flagged by the tool itself). Not urgent, logged only.

### Next Steps
- Confirm M12 (index duplication) resolved.
- Update BBQ_V1_4_Design_Draft screen count + Appendix references to 15.
- Full BBQ interdependency audit — still pending, now genuinely overdue
  given how much cross-screen surface area exists (still explicitly
  tracked from prior sessions, not newly added here).
  ## Session: 02-Aug-2026 (evening) — Screens #12/#13 (Menu Draft, Menu Approve & Publish)

### Scope
Screens #12 and #13 — the last two of the original 13, both untouched
since session start (bbqEvents test docs were seed-script-only before
tonight). No new backend routes needed — saveBbqEventDraft/submitBbqEvent/
publishBbqEvent/returnBbqEvent/cancelBbqEvent all already existed and
were already correct; confirmed by reading the actual route file before
building, not assumed.

### Completed
- **Screen #12 — BBQ Menu Draft** (`BbqMenuDraftPage.jsx`, new).
  Manager picks bbq-tagged items via a grouped checklist, saves as
  draft or save+submits in one action. Two prefill paths: auto-reload
  an in-progress draft/returned event on the same date (safety net,
  not a reopening of anything locked), and an explicit "Copy from last
  published" button for starting a new week from a prior one's
  selection. Friday-only date validation, client-side pre-check.
- **Screen #13 — BBQ Menu Approve & Publish** (`BbqMenuApprovePage.jsx`,
  new). Admin's pending_review queue, list+detail pane copied from
  EventManagementPage.jsx's shape. Publish is a single confirm (no
  venue field, unlike official club events). Return requires comments,
  same modal shape as Events.
- 6 new frontend service functions added to `bbqEventService.js`
  (frontend): `getBbqEventsList`, `getBbqEvent`, `saveBbqEventDraft`,
  `submitBbqEvent`, `publishBbqEvent`, `returnBbqEvent`.
- Routes + Sidebar links added — Menu Draft to `manager` only (matches
  backend's `managerAndAbove` gate; `bbq_supervisor` deliberately
  excluded, same reasoning as the official-order-approvals link earlier
  this week), Menu Approve to `admin` only.

### Bugs Found & Fixed (all real, all caught live during testing)
- **Catalogue-group vocabulary mismatch** — `menuItems.bbqMenuGroup`
  stores raw tags (`preorder`/`live_cook`/`kids`/`beverage`/`bread`/
  `dessert`); Screen #12's picker checked those raw values directly
  against the *resolved menu's* array-key names (`preorderItems`/
  `liveCookItems`/etc.) — two different vocabularies that only look
  similar. Every item silently failed the check and vanished from the
  picker with no error. Fixed with an explicit translation map, kept
  in sync with the backend's own `GROUP_TO_MENU_KEY`.
- **Missing `eventId` field, pre-existing since bbqEventService.js was
  first written** — `getBbqEvent`/`getBbqEvents` (backend) never
  included the document ID as a field in their response, only the
  document body. Every other BBQ collection's service already does
  this correctly (`{ orderId: d.id, ...d.data() }` pattern); events
  just missed it. Invisible until Screen #13 — the first screen in the
  whole module that actually needed the ID back from a list/get call.
  Fixed at the source in both functions.
- **`getCurrentBbqEvent` ordering bug** — trusted the backend's
  `eventDate desc` ordering + `limit=1` to mean "the current event."
  Only ever worked by accident, because until tonight only one BBQ
  event had ever been published at a time. `published` status never
  reverts (same as `orderStatus` never un-cancels), so the moment a
  second published event existed, the most-FUTURE one surfaced
  instead of the nearest one — every employee-facing order screen
  silently showed the wrong week. `getPublishedBbqEvents` had already
  solved this exact problem with a client-side re-sort;
  `getCurrentBbqEvent` never got the same fix. Rewritten to fetch all
  published events, filter out any whose `closeoutAt` has passed, and
  sort client-side for nearest-first. Both directions field-tested
  live: a nearer event appearing (status-based), and the current event
  aging out via `closeoutAt` while still status `published`
  (timestamp-based) — confirmed as two genuinely different code paths,
  both proven working.

### Decisions Locked
- Once a BBQ event leaves draft/returned (submitted, published, or
  cancelled), it can NEVER be edited again — explicitly reconfirmed
  tonight when asked to loosen this for "already-published menus need
  fixing too." Guard stays exactly as-is. The only editing feature
  built is prefill-for-a-NEW-draft ("copy from last published"), never
  reopening anything locked.
- "Nearest event, irrespective of publish order or recency" is the
  correct current-event definition for all employee-facing screens —
  confirmed explicitly, drove the getCurrentBbqEvent fix.
- Menu Draft nav link: `manager` only, not `bbq_supervisor` — matches
  the backend's actual permission, avoids a repeat of the
  family-lookup-role-gap mistake from the Proxy/Official cluster.

### Open Items
- **M15** — Resubmit-after-return cycle never fully verified. Reopening
  a returned draft and seeing the prefilled items + return note was
  confirmed; clicking "Save & Submit for Review" again and landing
  back at pending_review was not screenshotted. Same cycle the Table
  Booking cluster explicitly closed out — BBQ's equivalent is still open.
- **M16** — "Copy from last published" button has rendered but never
  actually been clicked/tested.
- **M17** — Friday-only date validation never tested against an actual
  non-Friday date (only ever tested with valid Fridays).
- **M18** — `cancelBbqEvent` has NO frontend anywhere — backend route
  works, but neither Screen #12 nor #13 has a Cancel action. A manager
  who drafts the wrong Friday currently has no way to remove it; it
  sits as permanent clutter. Needs a decision: build now or defer.
- **M11–M14** carried forward unchanged from the 02-Aug (earlier)
  session — official-order live-only assumption unconfirmed, duplicate
  Firestore index cleanup unverified, firestore.indexes.json
  reconciliation incomplete, screen count needs updating.
- **Full BBQ interdependency audit** — still not started, case is
  stronger now than when first flagged: 15 screens, three separate
  "what's the current event" resolution paths in the frontend
  (getCurrentBbqEvent, getPublishedBbqEvents, and Menu Draft's own
  existing-event lookup), and tonight proved one of those three had a
  live bug sitting in it undetected. Exactly the class of problem this
  audit exists to catch.

### Next Steps
- Close M15/M16/M17 (quick verification, no new code expected).
- Decide + build M18 if needed.
- Screen count: **all 13 original screens + Screens #14/#15 = 15 total,
  all built.** Update BBQ_V1_4_Design_Draft header/Appendix.
- Full interdependency audit — treat as its own dedicated session, not
  squeezed into a build session.
### Process Note
- **M19** — 7355e49 (this session's close-out) is a MIXED commit — six
  code files + docs/V1_Extension_BBQ.md landed together despite the
  intended two-commit split. The `git add` + `git commit` sequence for
  the code-only commit apparently didn't execute as a separate step
  before the CB commit was staged; caught only after push, too late to
  cleanly split without rewriting already-pushed history (not worth the
  risk for a labeling issue with zero functional impact). No harm done —
  logged so a future `git log` reader isn't confused why this one CB
  commit also touched six code files.
## Session: 03-Aug-2026 — M15-M18 verification + Cancel Event feature (M18)

### Scope
Closing out the four open items from the 02-Aug (Screens #12/#13) session.
No new screens — verification passes on M15-M17, one real feature build
for M18.

### Completed
- **M15 closed** — full return→resubmit→re-pending→publish cycle
  verified live on 16-Oct-2026, with screenshots at every transition.
  Stronger than the minimum bar: proved the entire lifecycle end to end
  a second time on a document that had already been through one return.
- **M16 closed** — "Copy from last published" verified: fresh date
  (13-Nov-2026), single click, all 5 items from the most recent
  published event pulled in pre-checked, count matched.
- **M17 closed, with a real bug found and fixed along the way** — the
  Friday-only date error displayed correctly but never actually gated
  the Save buttons; both remained clickable and would have hit the
  backend's own Friday guard on every invalid-date attempt (harmless,
  but a wasted round trip with no visible reason why nothing happened).
  Fixed: both buttons now `disabled` whenever `dateError` is set.
  Verified: buttons visibly greyed out on 10-08-2026 (a Monday) before
  any click is possible.
- **M18 closed** — new "Cancel This Event" action on Screen #12, scoped
  to draft/returned only (never offered on pending_review — that's
  Admin/Screen #13 territory if it's ever needed, not built tonight).
  New frontend service wrapper `cancelBbqEvent`. Verified end to end:
  confirm dialog showed the full permanence warning verbatim, action
  completed, reload correctly showed the locked/blocked message with a
  properly-styled `Cancelled` tag.

### Design Correction Caught Mid-Build (real, not just a note)
- M18 was originally scoped from "a manager drafted the wrong Friday,
  wants it gone" — a cleanup framing. Re-reading cancelBbqEvent's actual
  guard while writing the confirm-dialog text surfaced that this framing
  was wrong: cancelling does NOT free the date. 'cancelled' isn't in the
  backend's editableStatuses list, and the deterministic
  {tenantId}_{eventDate} doc ID means a cancelled Friday can never get a
  fresh draft again, ever — same permanent-lockout the published-event
  edit guard already has, just reached through Cancel instead of
  resubmission. An unsubmitted wrong-date draft is already harmless
  (invisible to employees, only costs anything once a year when that
  calendar date recurs) — clicking Cancel on it would make the mistake
  permanent instead of ignorable.
- Confirmed with Homi: the REAL use case is BBQ being called off
  entirely (weather, official commitment) — genuinely rare, deliberate,
  and correctly never rescheduled onto the same date. The confirm
  dialog now actively warns managers away from using Cancel for the
  wrong-date scenario it was originally imagined to solve.
- This is the kind of thing the process almost shipped wrong by
  building toward the original request literally rather than
  re-verifying the actual guard behavior first — caught before deploy,
  not after.

## Session: 03-Aug-2026 (continued) — M11 closed + Screen #13 Cancel Event

### Scope
Two small closes following the M15-M18 session earlier tonight — M11
(confirmed, not built) and a genuine gap Screen #13 had that Screen #12
didn't (no way to kill a pending_review event outright, only Return it
for correction).

### Completed
- **M11 closed** — confirmed directly: official BBQ orders are live-only,
  same reasoning as proxy (always for someone physically present that
  night, no preorder scenario applies). `BbqOfficialOrderPage.jsx`'s
  header comment updated from "ASSUMPTION FLAGGED, NOT CONFIRMED" to a
  confirmed note with the decision date. No code/behavior change —
  orderType was already correctly hardcoded 'live'; only the comment
  was out of date with reality.
- **Screen #13 — Cancel Event action added** (`BbqMenuApprovePage.jsx`).
  Kills a pending_review event outright — distinct from Return, which
  sends it back to the manager for correction and keeps the date usable.
  Same backend action as Screen #12's Cancel (`cancelBbqEvent`, no new
  service function needed — reused as-is). Same PERMANENT consequence
  ('cancelled' status, deterministic doc ID means the date can never be
  reused). Button styled `btnGhost`, deliberately not `btnDanger` like
  Return — Return is already the screen's "danger" action for sending
  work back; Cancel needed to read as the rarer, more drastic third
  option, not compete visually with Return for attention.
  Context-specific confirm-dialog wording (the "start a new draft
  instead" escape hatch from Screen #12's dialog was correctly dropped
  here — a submitted, already-reviewed menu has no equivalent "you
  probably just picked the wrong date" framing; Return already covers
  that case for a submitted menu).

### Verification
Full chain field-tested live on 18-Sept-2026 with screenshots at every
transition: manager creates + submits draft → admin's detail pane shows
Publish/Return/Cancel Event all present and correctly styled → Cancel
Event clicked → confirm dialog shows the correct submitted-menu-specific
warning text → confirmed → event removed from the pending-review list →
manager reopens the same date → locked state correctly shows status
`Cancelled`, consistent with Screen #12's own Cancel behavior from
earlier tonight.

### Decisions Locked
- Official BBQ orders: live-only, confirmed (was previously an
  unconfirmed assumption — M11).
- Screen #13 now has feature parity with Screen #12 on the
  Cancel/permanence pattern — both screens can kill an event, at
  whichever stage of its lifecycle they naturally encounter it
  (draft/returned on #12, pending_review on #13), with consistent
  wording adapted to what's actually true at that stage.

### Open Items — carried forward, unchanged
- Full BBQ interdependency audit — in progress, feedback expected
  tomorrow at session start.
- M12/M13 — duplicate Firestore index cleanup verification, still
  pending (low urgency, already confirmed the surviving indexes work).
- M14 — screen count reference in design doc still needs updating.
- Pre-BBQ-cluster items (bbqLiveItemStatus cross-order isolation,
  Uncategorized menu bucket, hardcoded role-list pattern) — untouched,
  unrelated to this or the prior BBQ session.
- Mobile BBQ screens — deliberately deferred until after V1 Extension
  closes (confirmed intentional, not an oversight — see prior exchange).

### Next Steps
- Review audit findings at start of next session, work through them one
  at a time per usual discipline (verify before fix, not batch-assumed).
- M12-M14 cleanup whenever convenient.