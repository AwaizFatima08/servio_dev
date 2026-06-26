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
| Consolidated on | 20 June 2026 |
| Last Updated | 24 June 2026 (Slice 5 proxy backend closed + web built/deployed) |

> **Reading note for new sessions.** This is the working command board. Paste it at the start of a new chat to restore context. V1 history lives separately in `Servio_CB_V1.md` — reference that only if a V1-era detail comes up.

---

## 1. Current Status (paragraph)

V1 is deployed to prod (frozen for the 15-day tester trial — see V1 CB) and dev development has moved entirely to V1 Extension. **V1.1 Family Member CRUD** is complete on backend + web (mobile deferred to end of V1 Extension per build-order change locked 19-Jun). **V1.2 Café + Outdoor Mini Café + kitchen dashboard:** the full café flow is now complete on backend + web — employee ordering (Web Slices 2.1–2.4), anytime advance-date ordering (closed 22-Jun), kitchen board (Web Slice 3, closed 23-Jun), and café order completion / `prepared` state (Slice 4, closed 23-Jun). Both `cafe_hours` and `anytime_takeaway` paths are placed/cancel-verified on dev. **Café work still open within V1.2:** supervisor proxy/walk-in ordering UI (next active work), supervisor order-history view, official café meals, and universal rate-entry/billing (deferred to V1.5). V1.3 and V1.4 are scope-locked and queued. Mobile build for V1.1–V1.4 is bundled at end of V1 Extension.

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
| 1 | **Slice 5 close-out (in-window) + Slice 6 design-lock** | Dev (Web) | TWO five-min in-window jobs first (café 18:00–22:30): (a) place a proxy order via the web UI → confirm green success screen; (b) check Majid Ali/CLB00030 `users` doc `role` — if legacy, set to literal `cafe_supervisor` to exercise the new role string. THEN open Slice 6 (supervisor order-history) — design-lock on paper first. |
| 2 | Test `servio.homilabs.org` hosting (DNS/SSL) | Prod | Confirm login loads + works |
| 3 | Admin/super_admin bootstrap in PROD | Prod | Deferred delicate step |
| 4 | V1.1 + V1.2 + V1.3 + V1.4 Mobile build | Mobile | After all four module web builds close. Includes F1/F2 mobile from V1 Enhancement. |
| 5 | F13 — Node.js 20 → 22 upgrade | Infrastructure | Deadline 30 Oct 2026 |

---

## 3. V1 Extension — Build Status

Reference: `Servio_V1_Extension_Scope_09Jun2026.md` in `docs/`.

| Version | Scope | Design | Build |
|---------|-------|--------|-------|
| V1.1 | Family Member CRUD | 🔒 LOCKED | Backend ✅ · Web complete ✅ · Mobile deferred to end of V1 Extension |
| V1.2 | Café + Outdoor Mini Café + kitchen dashboard | 🔒 LOCKED | Backend ✅ · Web 1–2.4 ✅ · advance-date ✅ · Web 3 kitchen ✅ · Web 4 completion ✅ · Web 5 proxy: backend ✅ + web built/deployed (one in-window placement check left) · Web 6 history ⏳ · Web 7 official meals ⏳ · Mobile deferred |
| V1.3 | Tea Bar + Tuck Shop + Bakery — own `tuckshop_bakery_supervisor` role, own dashboard, own full order flow (accept → prepared → history), mirroring café | 🔒 LOCKED | Not started. Role split `cafe_bakery_tuckshop_supervisor → cafe_supervisor + tuckshop_bakery_supervisor` lands here. |
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
| Web Slice 3b | Marital status card + relation-edit UI | ✅ 19-Jun field-tested (12/12) | MaritalCard component, EditDialog upgrade, page restructure |
| Mobile | Full V1.1 family CRUD | ⏳ Deferred to end of V1 Extension | Web is the design source |

### V1.2 Slices

| Slice | What | Status | Notes |
|-------|------|--------|-------|
| Backend Slice 1 | `cafeOrders` schema + self/proxy/walk-in order paths + cancellation rules + family consumer tagging + `cafeMenuResolver` + `cafe_supervisor` + `cafe_waiter` roles + `_memberHasTransactions` stub fix | ✅ 20-Jun field-tested (18/18) | Closes V1.1 carry #1 (open item #1) |
| Backend Slice 2 | Kitchen dashboard: `getKitchenOrders` (today-only, oldest-first, with `unacknowledgedCount`) + `acceptOrder` (placed → accepted) | ✅ 20-Jun field-tested (13/13) | `accepted` is terminal — today-only scope is a correctness requirement |
| Web Slice 1 | Read-only café menu + `GET /cafe/menu` endpoint + Café page + sidebar Café section | ✅ 20-Jun field-tested | Pure read, no order UI |
| Web Slice 2 (2.1–2.4) | Café employee ordering: cart + review modal (consumer picker, order-type/dining interlock, conditional pickup) + multi-item batch submit + full success screen + consolidated collapsible order history + cancel UI | ✅ 22-Jun field-tested (BUILT, café flow HELD OPEN) | See 7.2 session log. `anytime_takeaway` cancel path deployed but unverified by design until advance-date slice. |
| Advance-date ordering | `anytime_takeaway` 24/7 placement + `requestedPickupDate` schema + same-day-after-2000 lockout + modal date-picker | ⏳ NEXT | Backend-first. Closes the café flow + verifies anytime cancel. |
| Web Slice 3 | Kitchen dashboard UI + supervisor proxy ordering | ⏳ Pending | `cafe_supervisor` / `cafe_waiter` sidebar configs go here. Reuses the order modal (built proxy-reusable in Slice 2.3). |
| Web Slice 4 | Café order completion (`prepared` + `isOverrun` + Mark prepared UI) | ✅ 23-Jun closed | Backend 10/10 + isOverrun live; web browser-verified (legacy supervisor role). |
| Web Slice 5 | Supervisor proxy ordering UI | 🔄 backend ✅ + web built/deployed 24-Jun, ONE in-window placement click left | Backend-first (NOT mostly-web): added `createProxyOrderBatch` + `POST /cafe/orders/proxy/batch` + `GET /family/employee/:employeeNumber` (returns family + employeeName). Backend fully proven in-window 19:43 (4-field console check). Web: `CafeProxyOrderPage.jsx` (emp-number search → family-tree dropdown → cafe_hours-only copied modal → `/proxy/batch`). Renders correctly (0-family + 12-member trees both verified). OPEN: web placement WRITE unconfirmed (out of window both attempts) + new `cafe_supervisor` role string still never exercised (both test accounts show legacy `cafe_bakery_tuckshop_supervisor`). |
| Web Slice 6 | Supervisor order-history view | ⏳ Pending | Working assumption: lives ON the kitchen dashboard as a second view, built as a shared service-parameterised component (so V1.3 tuckshop/bakery inherit it). Design-lock Qs open: query shape + composite index (`tenant+status+date`), how-far-back, pagination, read-only vs act-on-past. |
| Web Slice 7 | Official café meals | ⏳ Pending | Displaced from old Slice 4. OG numbers + Type 1 manual slip. |
| Mobile | Full V1.2 mobile flow | ⏳ Deferred to end of V1 Extension | Web is the design source |

---

## 4. Active Open Items (V1 Extension scope)

| # | Item | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 2 | Backend cascade asymmetry not surfaced in UI | Dev (Web) | Medium | `setEmployeeStatus` deactivates family but does not reactivate. Admin web UI must warn admins about manual reactivation. Surfaces in admin-side web work. |
| 3 | Build mode footgun on web | Dev | **HIGH — bit us 24-Jun (~1hr lost)** | `npm run build` = `--mode production` = loads `.env.production` = PROD Firebase config. Deployed to DEV hosting on 24-Jun → browser authed against prod → "invalid email/password" for EVERY account in EVERY browser (curl/`get_token.js` kept working — hardcoded dev key — which masked it). **`build:dev` and `build:prod` scripts ALREADY EXIST in `package.json`.** RULE: deploying web to dev = ALWAYS `npm run build:dev` then `firebase deploy --only hosting`. Web-side twin of "firebase use before functions deploy." |
| 4 | Browser cache after deploys | Dev | Low | Hard reload alone may serve stale JS. Use DevTools → Disable cache + hard reload, OR Application → Clear site data, after every web deploy. |
| 5 | DOB format-only validation | Dev | Low | `^\d{4}-\d{2}-\d{2}$` accepts impossible dates like 2014-13-45. Acceptable while frontend uses a calendar picker. |
| 6 | Firebase Auth default sender silently dropped | Dev | **HIGH for prod** | No password reset emails received via `firebaseapp.com` sender at Gmail or corporate addresses. Prod risk for 15-tester pilot. Need custom SMTP / SendGrid sender domain before real prod launch. |
| 7 | GDrive backup folder contains live secrets | Dev | **HIGH** | `service-account.json` private key + web API key in plaintext, reachable by anyone with the link. Rotate dev service-account key and exclude from backups. Raised 16-Jun, still open. |
| 8 | Test Son 1 (`GjjK8WCLwUIxOQ73clFa`) relationHistory bloated | Dev | Low | 18+ audit entries from repeated test runs. Cosmetic. Clean manually in Firebase console when convenient. |
| 9 | `pendingMaritalStatus` field unused but lives on | Dev | Low | Slice 3a removed all writes to this field. Defensive null write on every marital change handles stale data. Field could be dropped entirely in future cleanup. |
| 10 | `cnicLast4` storage type inconsistent | Dev | Low | Schema docs say 4-digit string e.g. "4521". Worth a one-off audit to confirm consistency in the live employees collection. |
| 11 | Orphan `users` docs on dev | Dev | Low | From earlier delete-and-recreate cycles. Non-blocking. |
| 12 | Schema Reference doc out of sync — `familyMembers` field names | Dev | Low | `Servio_V1_Schema_Reference.docx` says `memberName` + `relationship`. Live data uses `fullName` + `relation`. V1.1 family CRUD ships with correct names; the doc is wrong. Update the doc. |
| 13 | Audit other readers of `familyMembers` | Dev | Low | If `cafeOrderService` had the wrong field-name assumption (open #12), worth grepping for `memberName` / `relationship` across the codebase to catch any other readers (mess proxy booking, event attendance, etc.) making the same assumption. |
| 14 | Dev test data cleanup before V1.2 reaches prod | Dev | Before V1.2 → prod | Wipe `CAFE_TEST_*` menuItems, the resulting `serviceMenuConfigs/cafe` resolver output, the 2 legacy items (`Cardimom Tea` — misspelled, should be Cardamom — and `Black Coffee`), and accumulated `cafeOrders` test fixtures. Roll into the existing wipe-prod-after-test-run plan. `unacknowledgedCount` observed at 7 on 20-Jun confirms accumulation across sessions as expected/harmless on dev. |
| 15 | Utility script bundling in `core/functions/scripts/` | Dev | Low | Now 7 dev-only scripts (`seed_cafe_menu.js`, `list_family_members.js`, `get_token.js`, `test_cafe_slice1.sh`, `test_member_has_transactions.js`, `test_cafe_slice2.sh`, `test_kitchen_today_scope.js`) on top of the original 3. All get bundled into every `firebase deploy --only functions` call. Same relocation thread as the existing V1 open item — now larger. Still not blocking. |
| 17 | Sidebar configs missing for `cafe_supervisor` and `cafe_waiter` | Dev (Web) | Resolve in V1.2 Web Slice 3 | Both roles exist in `constants.js` (added in V1.2 Backend Slice 1) but `NAV_CONFIG` in `Sidebar.jsx` has no entries for them. Users with either role currently fall through to the default employee nav. Resolve when kitchen dashboard UI ships (V1.2 Web Slice 3). Not blocking Web Slice 2. |
| 18 | Browser timezone leakage in "Updated" timestamp on Café page | Dev (Web) | Low | Page subtitle shows `updatedAt` rendered via `Date.toLocaleString` with no explicit timezone. Users in different timezones see different times for the same backend write. Acceptable for V1.2 (single-tenant FFL, all PKT users), but worth noting before any multi-tenant deployment. Hard-code to PKT in the formatter if it ever matters. |
| 19 | Universal rate-entry / billing for café / tea bar / tuck shop / bakery | Dev | V1.5 billing-alignment | Café order lines ship with billing hooks (`rateTargetKey {date}_cafe_{itemId}`, `rateStatus: pending`, `billingDestination: employee_account`, null unitRate/amount) but NO rate-entry mechanism exists yet. Port the mess `mealRates` + applicator model: issued items → next-day per-item report → rate entered once → batch-published by `rateTargetKey` → employee notified → billing-history screen. One slice, all four services, after the order flows are built. Until then every café order shows "Rate pending" indefinitely. |
| 20 | `toLocaleString` audit across `core/functions/src` | Dev | Medium | `pktMinutesOfDay` in `cafeOrderService.js` was migrated `toLocaleString` → UTC arithmetic (Rule #2 compliance) on 22-Jun. Other time-of-day usages elsewhere in the backend may carry the same Hermes-on-mobile / inconsistency risk. Grep for `toLocaleString` and audit each call site. Preventive — no confirmed defect. |
| 21 | Verify `bookingGroupId` + `createdByRole` present in `listMyOrders` response | Dev (Web) | Confirm next session | 2.4 `MyCafeOrdersPage` groups by `bookingGroupId` and derives the "through proxy booking" tag from `createdByRole`. Both are on the order document (confirmed in raw test output) and `listMyOrders` returns order docs, so they should be present — built defensively (missing `bookingGroupId` → order renders as a standalone solo card; missing `createdByRole` → no proxy tag). Confirm in the field that multi-item orders actually consolidate into one card. |
| 22 | Backend timestamp serialization: `{_seconds,_nanoseconds}` not ISO | Dev | Medium | Café API returns Firestore Timestamps as `{_seconds,_nanoseconds}` objects, NOT ISO strings — discovered during 2.4. Frontend coerces via a `toDate` helper that handles object / ISO / ms shapes. `cafeService.js` comments saying "(ISO)" for `createdAt` / `cancellationWindowExpiresAt` are wrong until normalized. Normalize at the API boundary (serialize Timestamps to ISO in `successResponse`) in a later pass, then simplify the frontend coercion. |
| 23 | Café test-order fixtures accumulating on dev | Dev | Before V1.2 → prod | Batch-order testing (22-Jun) created many real `cafeOrders` for FFL00003 — multiple `CAFE_TEST_*` / `Cardimom Tea` / `Black Coffee` / `Doodh Patti Tea` / `Cappuccino` fixtures across several `bookingGroupId`s, all `Rate pending`. Harmless dev data. Fold into the existing open item #14 / #8 cleanup sweep before V1.2 reaches prod. |
| 24 | Café window widening discipline during build | Dev | Active reminder | The `cafe_hours` / `anytime_takeaway` order windows were manually widened on the deployed dev function during café-flow development to allow off-hours testing. As of 22-Jun the window is **reverted to the real 18:00–22:30 and verified enforcing** (rejection message confirmed in field). If widened again for the advance-date slice: widen → test → revert → grep-verify (`grep "TEMP TEST WINDOW"` = 0, constants = `18*60` / `22*60+30`) BEFORE declaring the slice done. A widened window must never reach prod. This is the exact mismatch that caused a false "window bug" diagnosis on 22-Jun (see 7.2). |
| S1 | Booking duplicate-check not atomic | Dev | Before full rollout | Carry from V1 — see V1 CB |
| S2 | `employeeService` `.limit()` + in-memory filter breaks past 50 employees | Dev | Before full rollout | Carry from V1 |
| S3 | Notification fanout 500-op batch limit | Dev | Before full rollout | Carry from V1 |
| S4 | Node.js 20 deprecation (= F13) | Infrastructure | **Before 30 Oct 2026** | Carry from V1. Dev first → test → roll to both. |

### Recently Closed

- ✅ **V1.2 café employee ordering flow (Web Slices 2.1–2.4)** — cart → review modal → multi-item batch submit → consolidated collapsible history → cancel UI. Built and field-tested 22-Jun. NOTE: BUILT, not fully closed — café flow held open pending the advance-date slice (see Section 5). `cafe_hours` path complete; `anytime_takeaway` cancel unverified by design until anytime timing fixed.
- ✅ **Open Item #1** — `_memberHasTransactions()` stub fix. Now queries `cafeOrders` for `consumerFamilyMemberId` matches. Verified via `test_member_has_transactions.js` (direct unit test, not used by production code). Closed 20-Jun in V1.2 Backend Slice 1.
- ✅ V1.1 carry #1 — `setEmployeeStatus` route now includes `familyMembersDeactivated` in HTTP response. Closed 19-Jun in V1.1 Backend Slice 3a.
- ✅ Service-layer `familyMembersDeactivated` count — was already in service return, never the issue. Closed via discovery 19-Jun.
- ✅ **Open Item #17** — sidebar `NAV_CONFIG` entries for `cafe_supervisor` and `cafe_waiter` (+ legacy `cafe_bakery_tuckshop_supervisor` and `manager`). Added in V1.2 Web Slice 3. Closed 23-Jun.
- ✅ **V1.2 advance-date ordering + Web Slice 3 (kitchen board) + Web Slice 4 (completion)** — all closed 22–23 Jun. Café flow no longer "held open."
- ✅ **Slice 5 proxy backend** — `createProxyOrderBatch`, `/cafe/orders/proxy/batch`, `GET /family/employee/:employeeNumber`. Field-tested in-window 24-Jun, 4-field console check passed (bookingSource=proxy, employeeNumber=target, createdByEmployeeNumber=supervisor, shared bookingGroupId). Web built + deployed; placement-click verification pending in-window.
- ✅ **Open Item #17** — sidebar `NAV_CONFIG` for café roles. Added in Web Slice 3, 23-Jun.
---

## 5. Carry into the anytime advance-date ordering slice

The café employee ordering flow (Web Slices 2.1–2.4) is built. The café flow is **held open** until this next slice lands. Scope:

**The problem.** `anytime_takeaway` currently caps placement at 08:00–22:30 PKT and assumes same-day pickup (`requestedPickupTime` is `'HH:MM'`, implicitly today). This is too narrow for the real scenario: "I'm hosting a dinner tomorrow and want to place a café order late tonight for next-day pickup." The 08:00–22:30 cap is a `cafe_hours` rule leaking onto the anytime flow — "anytime" should mean place anytime, with the constraint on *fulfilment* timing, not *ordering* time.

**The new model (`anytime_takeaway` only — `cafe_hours` unchanged):**
1. **Placement allowed 24/7** — drop the 08:00–22:30 placement cap for `anytime_takeaway`.
2. **Add `requestedPickupDate`** (YYYY-MM-DD) to the café order schema. Existing orders implicitly = order date; new ones carry an explicit pickup date.
3. **Validate the pickup *datetime*** (date + time): must be in the future; ≥2h lead time applies to **same-day** pickups only (a next-day order doesn't need the 2h kitchen-prep lead).
4. **Same-day lockout after 20:00 PKT:** if placement time is after 20:00, today's pickup is off the table — `requestedPickupDate` must be tomorrow or later. (Kitchen-capacity guardrail.)

**Spans:** schema addition (`requestedPickupDate`) · backend `_validateOrderInput` time logic · web modal date-picker (anytime only, defaulting to today or tomorrow-if-past-2000) · history display (show pickup date on anytime orders) · batch endpoint passthrough (`requestedPickupDate` is session-level, carried to every line like `requestedPickupTime`).

**Closes the café flow.** Verify the `anytime_takeaway` cancel path (per-line + whole-order, built in 2.4) as part of this slice — it's deployed but unverifiable until anytime orders can be meaningfully placed.

**Design questions to lock BEFORE building:**
- 20:00 lockout threshold: hardcoded constant vs `appSettings` key?
- Maximum advance days (can you order 30 days out, or is there a ceiling)?
- Confirm: lead-time (2h) waived entirely for future-date orders; only same-day pickups enforce it.
- `requestedPickupDate` format + how existing (date-less) orders are treated in history display.

**Discipline:** backend-first, design-locked on paper, field-tested via curl before the web modal. If the café window is widened for off-hours testing, revert + grep-verify before declaring done (open item #24).

**NOT in this slice:** the birthday-cake / multi-day-advance *bakery* pre-order model is a separate service (V1.3, `bakeryOrders`, `isPreorderOnly`). This slice is café `anytime_takeaway` next-day ordering, not arbitrary bakery scheduling.

---

## 6. Locked Decisions (preserved with dates)

### Family deletion flow — PARKED (19 June 2026)

Records are permanent once created. Soft-delete via `Deactivate` only. Matches HMIS convention and schema reference Principle 9 ("Soft delete via isVisible — records never hard-deleted"). Five backend endpoints remain deployed but unreachable from any UI route:

- `POST   /family/me/:id/delete-request`
- `DELETE /family/me/:id/delete-request`
- `GET    /family/deletion-requests`
- `POST   /family/deletion-requests/:id/approve`
- `POST   /family/deletion-requests/:id/reject`

Retained for possible future admin cleanup tooling. Re-evaluate if wrong-relation entries become a real complaint in field use.

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

### Per-version vertical slice build — SUPERSEDED (16 June 2026 → 19 June 2026)

**Original rule (16-Jun):** V1.1 backend → web → mobile complete before V1.2 starts. Parallel multi-backend builds compound dependency risk.

**Superseded by (19-Jun, closeout):** backend → web → next-module backend → web. All four modules' mobile builds bundled at end of V1 Extension.

**Rationale for the change:**
- Web iterations are faster than mobile (no build step, no APK install, no Play/EAS pipeline). Web field tests close same-session.
- Backend gets exercised in production-shape by web traffic before mobile consumes it. Bugs surface and get fixed before mobile encounters them.
- All four module mobile builds can share patterns and helpers, reducing duplication compared to one-at-a-time mobile builds.
- The 16-Jun rationale ("parallel multi-backend builds compound dependency risk") is honoured: each module's backend still ships and is field-tested before the next module starts. Only mobile is decoupled.

**Risks knowingly accepted:**
- Mobile UX may not port cleanly from web — touch targets, smaller viewports, native navigation, Expo lifecycle, Hermes quirks. Web designs inform mobile but don't dictate it; mobile screens will need their own design pass per module.
- Mobile build is a single large chunk at the end. If schedule slips at that stage, V1 Extension can't ship to users until mobile catches up.
- Web tests don't surface mobile-specific issues. Offline behaviour, push notifications, background state, OS permission flows — these only emerge during mobile field test.
- V1.1 and V1.2 are not closed chapters yet. Backend done, web done, mobile pending. Future sessions should treat both as "open, mobile remaining" rather than closed.

### Cap counting (19 June 2026)

The 12-member cap counts active + inactive members together (backend behaviour). Every entry an employee ever made counts against their slot permanently. Generous enough (1 spouse + up to 11 children).

### Edit on deactivated members (19 June 2026)

Allowed. Employee may correct a name typo on a deactivated row without reactivating first. Backend permits this (only refuses if `deletionRequested === true`, which UI can never set).

### Dev / Prod separation (15 June 2026)

Two permanent independent Firebase projects. Both use Firestore named instance `servio-dev`. Disambiguate by **project name**, not DB label. Prod frozen at V1 for ~15-day tester trial, then wipe + relaunch as real prod.

### Café roles (20 June 2026)

Add `CAFE_SUPERVISOR` and `CAFE_WAITER` to `ROLES`. Peer roles, own dashboards once V1.2 Web Slice 3 ships. Legacy `CAFE_BAKERY_TUCKSHOP_SUPERVISOR` deprecated in code comment but NOT removed — kept for V1 compatibility; not yet removed from any user document. Will be cleaned up in a later session.
### Tuck Shop / Bakery — separate service, role, dashboard, flow (24 June 2026)

Tuck Shop and Bakery are NOT folded into café. In V1.3 they get their own `tuckshop_bakery_supervisor` role (the deferred half of the `cafe_bakery_tuckshop_supervisor` split), their own operational dashboard, and their own full order lifecycle — accept → prepared → history — mirroring the café flow shipped in V1.2. Café remains the *evidence base*: its order-lifecycle patterns (kitchen board, accept/prepared transitions, today-only scoping, order-history view) are the proven template tuckshop/bakery copies. OPEN for V1.3 design-lock: whether the order-history view (café Slice 6) is built as a shared service-parameterised component that tuckshop/bakery reuses, or whether tuckshop/bakery carries its own copy. Tuckshop's barcode / numeric-code / return flow genuinely differs from café's kitchen-prep model, so the dashboard is expected to diverge even though the lifecycle states match.
| Web Slice 6 | Supervisor order-history view | ⏳ Pending | Working assumption (not locked): lives ON the kitchen dashboard screen as a second view, not a standalone page. Build as shared service-parameterised component IF V1.3 reuse is chosen. |

### Café service-file structure (20 June 2026)

One file per concern in `core/functions/src/cafe/`: `cafeOrderService.js` (order placement + cancellation), `cafeKitchenService.js` (kitchen list + accept), `cafeMenuService.js` (menu read), `cafeMenuResolver.js` (menu write). Mirrors the existing mess precedent where `kitchenService.js` is separate from `messReservationService.js`. Consistency over file-size concerns.

### Café `accepted` is terminal — SUPERSEDED (20 June 2026 → 23 June 2026)

No `ready` / `served` transition exists in V1.2. Direct consequence: accepted orders never leave the active set on their own. This makes "today only" scoping on the kitchen list a **correctness requirement**, not a convenience. Verified by a dedicated test (`test_kitchen_today_scope.js`) that plants a 2-day-old order and confirms exclusion — code review was deemed insufficient for a load-bearing decision.
**Superseded by Slice 4 (23-Jun):** `prepared` is now the terminal café status (`accepted → prepared` via `markPrepared`). However, the "today-only kitchen scope is a correctness requirement" conclusion **still holds** — `prepared` orders fall off the board the same way, and an abandoned `placed`/`accepted` order must still not linger across dates. The original reasoning survives the supersession; only the name of the terminal state changed.

### Café page "no menu" condition collapse (20 June 2026)

Three backend conditions render the same employee-facing empty state ("Café menu is being set up"): document missing, document `isActive: false`, document `items: []`. Trade-off acknowledged: admin cannot distinguish from the employee view which condition fired. V1.2 Web Slice 1 has no admin UI to set `isActive: false` anyway, so theoretical until a later slice exposes that toggle.

### Café sidebar — new section (20 June 2026)

Café gets its own sidebar section between "Mess & Dining" and "Club" in the employee `NAV_CONFIG`. Not appended to Mess & Dining. Rationale: Café is structurally separate from mess (different backend collection, different ordering flow, different billing model) and V1.3 (Tea Bar, Tuck Shop) will sit alongside it as similar non-mess services.

### Web Slice 1 — no order scaffolding (20 June 2026)

V1.2 Web Slice 1 ships pure read-only. No disabled Order buttons, no inert consumer/dining selectors, no order-composer shell. Driven by the V1.1 Slice 3a failure mode: deferred concerns become later rework, and field testers report dead UI as bugs that aren't bugs. Slice 2 stands up the order flow as one cohesive feature.

### Web service pattern — Pattern B (token passed in) (20 June 2026)

`cafeService.js` matches `menuService.js` / `messService.js` / `kitchenService.js` (token passed in by the caller; `<WithToken>` in `App.jsx` injects it as a prop). `familyService.js`'s inside-the-service `auth.currentUser.getIdToken()` pattern is the outlier and was deliberately NOT propagated. Pattern B is the convention for new web services going forward.

### Café order consumer model — whole-order, single consumer (22 June 2026)

An order is tagged to ONE consumer for the whole order (restaurant model), not per-line. **This corrects the V1.2 scope doc**, which described per-line family-member tagging — that was never built; the batch endpoint takes a session-level `consumerType` / `consumerFamilyMemberId` applied to every line. Self-ordering and proxy both pick from a single "Self + family members" picker.

### Café order "placed by" label model (22 June 2026)

History shows **"Order placed by - {consumerName}"** (+ "through proxy booking" when a supervisor booked, derived from `createdByRole`). This is the consumer-as-placer convention agreed with Homi: the label names whose *consumption* the order represents, regardless of whose hands were on the device. Scenarios: employee orders for anyone on his own login → "placed by {employee}"; supervisor selects a child who dined alone → "placed by {child} through proxy booking"; supervisor places for an employee who forgot his phone → "placed by {employee} through proxy booking"; spouse on the employee's login selects herself → "placed by {spouse}".

**The label is display-only.** Underneath, three facts stay separable at the data layer:
- **Billing always → the employee account** (the account holder pays; family members and children have no account). The label helps the employee spot a family member over-using the facility.
- **Audit (`createdByUid` / `createdByRole`) always → the real booker** (employee or supervisor), never the consumer.
- Label is shown only for family/proxy orders; plain self orders stay clean (no redundant "placed by yourself").

### Café orders are immutable once placed — no edit, cancel-only (22 June 2026)

A placed café order cannot be edited (no quantity change, no add-item, no edit page). Reasons: (1) café orders go to a **kitchen** that may already be cooking once `placed` / `accepted` — editing a fired order desyncs the kitchen from reality; (2) each line carries a `rateTargetKey` heading for rate entry — "set quantity to zero" is really a cancellation and must hit the audited cancel path (records `cancelledAt` / `cancelledByUid` / `cancellationReason`), not a silent mutation. **"Add more" = a top-up order** (new `bookingGroupId`), placed the normal way — this is the correct model (a second round at the table), not a workaround. To change a placed order, the employee cancels (where rules permit) and re-orders.

### Café cancellation rules — anytime-only (22 June 2026, reaffirming deployed backend)

- **`cafe_hours` (dine-in / live takeaway):** the 30-minute serving window is a kitchen commitment (cooking starts immediately to meet it), so these are **never employee-cancellable**. No cancel button is shown at all on these orders (clean — not a greyed/disabled button, since `cafe_hours` is the common path and greying every order would be visual noise). Charged regardless.
- **`anytime_takeaway`:** the only cancellable type — cancellable while `now < cancellationWindowExpiresAt` (deployed window: 1h). Cancel offered both whole-order (collapsed line) and per-line (expanded detail).
- This matches the deployed backend exactly — 2.4's cancel UI required no backend change.

### Café order modal built proxy-reusable (22 June 2026)

The review modal (`OrderModal` in `CafePage.jsx`) is a self-contained component taking `(cart, itemsById, employeeName, familyMembers, onPlace, onClose)`. The supervisor proxy flow (V1.2 Web Slice 3) reuses it: same modal after an employee-search step, passing that employee's name + family and an `onSubmit` pointed at `/orders/proxy`. No rewrite — structured for this now at zero cost.

### Café batch order is atomic (22 June 2026)

`createSelfOrderBatch` writes all lines via `db.batch()` (one shared `bookingGroupId`, one doc per line, atomic all-or-nothing). This improves on the mess `createAlaCarteBooking` non-atomic `.add()`-loop pattern — worth back-porting to mess in a later pass. A bad item anywhere in the array rejects the whole batch (resolution happens before the write loop — no partial batch). Null `bookingGroupId` = a standalone single-item order (legacy single-item path renders as a solo card in history).

---

## 7. Build Session Log

### 7.1 V1.1 Sessions

#### Session 16 June 2026 — V1.1 Backend Built

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
- Close `_memberHasTransactions()` stub before V1.2 family tagging. (CLOSED 20-Jun in V1.2 Backend Slice 1.)
- Confirm composite index need on profileNudge married-family query during field test.

#### Session 17 June 2026 — V1.1 Backend Deploy + Field Test Passed

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
2. `[MUST fix before V1.2]` `_memberHasTransactions()` is a stub returning false. (Closed 20-Jun, V1.2 Backend Slice 1.)
3. `[Low priority]` DOB validation format-only. (Still open. Acceptable with calendar picker.)
4. `[Cosmetic]` Service return objects carry `message` that `successResponse` duplicates into `data`. Harmless.

**Data changes on DEV this session:**
- `appSettings` seeded with `maxFamilyMembersPerEmployee: 12` and `familyMemberFeatureActive: true` (were missing — whitelisted in change set but never seeded). Prod will need these seeded separately.
- FFL00100 family fully cleaned (count 0). maritalStatus left at single.

**Process flags raised:**
- `firebase use` was pointing at prod at session start (sticky from 15-Jun prod session). Caught before any deploy. **Always verify `firebase use` before deploying.**
- Node 20 deprecation warning now appears on every deploy (decommission 30 Oct 2026) — F13 clock is running.

#### Session 18 June 2026 — Web Slice 1 (Read-only My Family page)

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
- **Web build mode bug** — `npm run build` defaults to production mode and bakes prod Firebase config into the bundle. Workaround: `npm run build -- --mode development`. (Open item #3.)
- **Browser cache after deploy** — hard reload alone may serve stale JS. Use DevTools → Disable cache + hard reload, OR Application → Clear site data. (Open item #4.)
- **Firebase Auth email delivery broken** — `firebaseapp.com` sender silently dropped by Gmail and corporate filters. (Open item #6.)

**Account changes today (DEV):**
- FFL00001 RETIRED — was dummy bootstrap admin slot, no longer in use.
- CLB00010 = admin / Qasim Ejaz (NEW). Personal email `admin@fatima-group.com`. Replaces FFL00001 as admin test account.
- FFL01584 = Qasim Ejaz's personal employee account (customer hat) — separate identity by design.
- FFL00100 = elevated from employee to admin during troubleshooting. To be kept as elevated admin.
- Orphan `users` docs from earlier delete-and-recreate cycles need cleanup. Non-blocking.

#### Session 19 June 2026 (morning) — Web Slice 2 (Add / Edit / Activate-Deactivate)

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

#### Session 19 June 2026 (later) — Backend Slice 3a + Vocabulary Correction + V1.1 Carry #1 Closure

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

#### Session 19 June 2026 (late) — V1.1 Web Slice 3b: Marital UI + Relation-edit UI

Slice 3b shipped to dev and field-tested across 12 scenarios on FFL00003 (Ahmed Khan) and FFL00257 (Farrukh Imtiaz). All passed. V1.1 web layer is now complete.

**Delivered (all in `web/src/`):**
- `services/familyService.js` — full file replacement. New function `setMyMaritalStatus(maritalStatus)` for PATCH `/family/marital-status/me`. `updateFamilyMember` signature extended to accept `relation` alongside `fullName` and `dateOfBirth`. Slice 1/2 reader functions preserved. Stale comments updated to reflect post-Slice-3a backend reality (4-value marital, relation editable, relationHistory in shape).
- `pages/employee/MyFamilyPage.jsx` — full file replacement. New `MaritalCard` inline component (Edit-Save with full-width dropdown, mirroring MyProfilePage Contact Info pattern). Page restructured around always-visible marital card. Gating rule: family list + Add button shown if `status !== 'single' OR any active members`. Old "not married" empty card removed. Old pendingBanner branch removed (dead post-Slice-3a). `EditDialog` upgraded: relation now a radio group matching AddDialog; DOB-required check follows the *selected* relation (matches backend post-merge evaluation).
- `pages/employee/MyFamilyPage.module.css` — additive append. New section/edit/field idioms matching MyProfilePage. New classes: `.section`, `.sectionHeader`, `.sectionTitle`, `.editBtn`, `.editActions`, `.saveSmBtn`, `.cancelSmBtn`, `.fieldItem`, `.fieldLabel`, `.fieldValue`, `.fieldEmpty`, `.fieldInput`, `.familyHeader`, `.singleHint`. No Slice 1/2 classes overridden.

**Deploy command used:**
```
cd web && npm run build -- --mode development
cd .. && firebase deploy --only hosting
```

**Field test results — all 12 scenarios passed:**

*Page-gating + marital flow:*
- Status=single, no family → marital card + `.singleHint`. Family section hidden.
- Edit + Save flip works. Edit + Cancel works (no save). No-op save closes silently with no flash.
- Status changes single → married → divorced → widowed → married all succeed, all show "Marital status updated." flash, all preserve family section visibility because backend decoupling works.
- Status married → single AND active members exist → family section remains visible. Gating rule protects divorced/widowed employees with active children.
- Status single AND no active members → family section hides.

*Relation editing + DOB safeguard:*
- Son → daughter → spouse → son round-trip works.
- Relation change from spouse → son with empty DOB blocked by frontend with inline message before backend round-trip.
- Name-only edit doesn't append to `relationHistory`. DOB-only edit doesn't either.

*Cap visual:*
- Add button greyed when 12 active+inactive (excluding deletion-pending); hint "Limit of 12 reached" shown.
- Cap visual hidden entirely when family section is hidden.

**Notes from session:**
1. **Five orphan CSS classes in `MyFamilyPage.module.css`** — `pendingBanner`, `emptyHint`, `formHint`, `formInputDisabled`, `headerRow`. These are styles the Slice 3b JSX no longer references. Vite tree-shakes unused classes at build, so no runtime impact. Left in the file to keep the edit purely additive. Worth removing in a future cleanup pass.
2. **`pendingMaritalStatus` field** — frontend now ignores it entirely. Backend still returns it (always null post-Slice-3a). Open item #9.
3. **`autoFocus` on the marital dropdown** — when user clicks Edit, the dropdown gets keyboard focus. Tested fine.
4. **No nudges after status change** — per locked decision, the user gets only the success flash. No prompts about updating family list. Field test confirmed this feels clean.

**V1.1 status after this session:**
- Backend: complete (initial + Slice 3a)
- Web: complete (Slice 1 + 2 + 3a backend + 3b)
- Mobile: deferred to end of V1 Extension per build-order change locked the same day
- V1.1 carry item #1: closed in Slice 3a session

### 7.2 V1.2 Sessions

#### Session 20 June 2026 — V1.2 Backend Slice 1 (Café Ordering)

V1.2 Backend Slice 1 complete and field-tested. 17/17 HTTP test cases passed on dev. Direct unit test of the `_memberHasTransactions` stub fix also passed. Open Item #1 (stub fix) closed in this session.

**Scope delivered:**
- New collection `cafeOrders` — schema per V1.2 scope doc, mirrors `messReservations` shape with café-specific additions/removals (orderType, requestedPickupTime, cancellationWindowExpiresAt, consumerType/consumerFamilyMemberId, no issueStatus/menuSnapshot).
- Self-order, proxy-order (supervisor on behalf), and walk-in-order paths.
- Two order types: `cafe_hours` (18:00–22:30 order window, 23:00 service close, no employee cancellation) and `anytime_takeaway` (08:00–22:30 order window, 2-hour minimum lead time, 1-hour cancellation window).
- Family-member consumer tagging with ownership validation (member must belong to the ordering/target employee, be active, not pending deletion).
- Cancellation endpoint with role-aware rules: employee blocked from cancelling `cafe_hours` orders; admin/super_admin override allowed on both order types; ownership enforced for non-admin cancellations; already-cancelled guard.
- `cafeMenuResolver.js` — reads `menuItems` tagged `serviceCategories contains 'cafe'`, writes the fat `serviceMenuConfigs/cafe` document. Slice 1 simplification: all items written to `items[]`; `beverages[]` auto-include logic deferred to the slice that builds tuck shop / tea bar.
- Two new roles added: `CAFE_SUPERVISOR`, `CAFE_WAITER`. Legacy `CAFE_BAKERY_TUCKSHOP_SUPERVISOR` marked deprecated in comment, left in place for V1 compatibility.
- `_memberHasTransactions()` stub fix — now queries `cafeOrders` for `consumerFamilyMemberId` matches. Closes Open Item #1. Verified via `test_member_has_transactions.js` (test-only export, not used by production code).
- `pktDateStr` promoted to shared `utils.js` (Node-safe `toLocaleString` pattern). Mess service's inline copy left untouched — not refactored, per additive-only rule.

**Files created:**
- `core/functions/src/cafe/cafeOrderService.js`
- `core/functions/src/cafe/cafeRoutes.js`
- `core/functions/src/cafe/cafeMenuResolver.js`
- `core/functions/scripts/seed_cafe_menu.js`
- `core/functions/scripts/list_family_members.js`
- `core/functions/scripts/get_token.js`
- `core/functions/scripts/test_cafe_slice1.sh`
- `core/functions/scripts/test_member_has_transactions.js`

**Files edited (additive only):**
- `core/functions/src/constants.js` — `ROLES.CAFE_SUPERVISOR`, `ROLES.CAFE_WAITER`, deprecation comment on `CAFE_BAKERY_TUCKSHOP_SUPERVISOR`, `DINING_MODES.OUTDOOR_SEATING`, `CAFE_ORDER_TYPES`, `CAFE_ORDER_STATUS`, `CAFE_CONSUMER_TYPES`, `CAFE_CANCELLATION_REASONS`, `COLLECTIONS.CAFE_ORDERS`.
- `core/functions/src/utils.js` — `pktDateStr` export.
- `core/functions/src/index.js` — mounted `/cafe` routes.
- `core/functions/src/family/familyService.js` — `_memberHasTransactions` stub fix + test-only export.

**Bugs caught and fixed during this session:**
1. **Time-window bug (self-caught during build, then re-surfaced after a missed deploy).** Initial implementation conflated the café order cutoff (22:30) and the café service close (23:00) into a single constant `CAFE_HOURS_END = 23:00`, used for both purposes. Correct design: orders accepted 18:00–22:30, service/pickup ceiling 23:00. Split into `CAFE_ORDER_END` and `CAFE_SERVICE_END`. The fix was written once, but the *first* field test run still hit the old 23:00 message — the local file had reverted or the fix was never actually saved before the first deploy. Re-applied and reverified via grep before redeploying. **Lesson: grep-verify a fix is on disk before assuming a redeploy will pick it up — "I edited it" and "it's on disk" are not the same claim.**
2. **Schema drift discovered: `familyMembers` actual fields are `fullName` + `relation`. Schema Reference doc states `memberName` + `relationship`.** The data is correct (V1.1 family CRUD already shipped and field-tested with these names); the doc is wrong. `cafeOrderService.js` was initially written against the (incorrect) doc and silently produced `consumerName: undefined` until caught by inspecting actual Firestore documents. Fixed: 3 references to `familyMember.memberName` → `familyMember.fullName`. (Open item #12.)
3. **Test design gap, caught before it shipped untested:** initial test plan only had one admin token, meaning non-admin cancellation rejection paths would never have been exercised by the test suite. Restructured to use two tokens (admin + employee), added 3 tests that specifically exercise the non-admin paths.

**Field test summary:** 17 HTTP test cases + 1 direct unit test. All 18 passed on final clean run. Two test users: FFL00003 (Ahmed Khan, admin) and FFL00257 (Farrukh Imtiaz, employee, with 2 family members — son and spouse — added during this session for café-consumer testing).

One temporary scope-widening was used mid-session to avoid waiting for the 18:00 PKT café window (constants temporarily set to an always-open window, test script's window guard temporarily disabled). Both reverted and verified via grep before redeploying for the final clean test run. Composite index for `listMyOrders` query (tenantId + employeeNumber + createdAt) created via the console URL surfaced in the first failed test run.

#### Session 20 June 2026 — V1.2 Backend Slice 2 (Café Kitchen Dashboard)

V1.2 Backend Slice 2 complete and field-tested. 13/13 test cases passed on dev (11 HTTP tests + 2 prep steps in `test_cafe_slice2.sh`, plus 1 direct Firestore diagnostic in `test_kitchen_today_scope.js`).

**Scope delivered:**
- New file `cafeKitchenService.js` — separate from `cafeOrderService.js`, mirroring the existing precedent in mess (`kitchenService.js` separate from `messReservationService.js`). Two functions:
  - `getKitchenOrders({ tenantId })` — today's (PKT) orders with `orderStatus` `placed` or `accepted`, oldest first, plus `unacknowledgedCount` (count of `placed` only). No date parameter — deliberately scoped to today only.
  - `acceptOrder({ orderId, tenantId, acceptedByUid })` — `placed → accepted` only. Rejects cancelled orders, already-accepted orders, and non-existent orders, each with a distinct error message.
- Two new routes added to the existing `cafeRoutes.js`:
  - `GET /cafe/kitchen/orders` — cafe_supervisor, cafe_waiter, admin, super_admin (+ legacy `cafe_bakery_tuckshop_supervisor`)
  - `PATCH /cafe/orders/:orderId/accept` — same role set
- Composite index created for the kitchen-orders query (`tenantId` + `orderStatus` `in` + `createdAt` range + orderBy `createdAt`).

**Design decision confirmed this session: `accepted` is the terminal state for V1.2 — no `ready`/`served` transition exists.** Direct consequence: accepted orders never leave the active set on their own. This makes "today only" scoping on the kitchen list a *correctness requirement*, not a convenience — without it, accepted orders from every previous day would accumulate in the kitchen view indefinitely. Verified by a dedicated test (`test_kitchen_today_scope.js`) that plants a 2-day-old order and confirms exclusion. **Lesson: load-bearing design decisions deserve dedicated tests, not code review alone.**

**Field test methodology — two scripts, increasing rigor:**
1. **`test_cafe_slice2.sh`** — 11 HTTP tests against the live API. Auto-fetches both admin and employee tokens via `get_token.js` at script start (no manual token pasting). Covers: role rejection on both kitchen endpoints, list correctness (orders present, `unacknowledgedCount` accurate), accept happy path, re-accept rejection, accept-after-cancel rejection, accept-nonexistent rejection, final state verification.
2. **`test_kitchen_today_scope.js`** — a dedicated diagnostic that plants a fake `cafeOrders` document directly in Firestore with `createdAt` set 2 days in the past and `orderStatus: 'placed'`, then calls `getKitchenOrders()` directly (bypassing HTTP) and confirms the fake order is excluded. Cleans up the fake document in a `finally` block regardless of pass/fail.

**Decision logged — test credential convenience vs. hygiene:** `test_cafe_slice2.sh` has the admin and employee test account email/password hardcoded so the script self-fetches tokens with zero manual steps. Tradeoff: live, reusable login credentials for two dev-only test accounts are now committed to git in plaintext. Both accounts are throwaway dev fixtures. Accepted as a reasonable tradeoff for dev; flagged explicitly rather than decided silently. (Open item #16.)

**Files created:**
- `core/functions/src/cafe/cafeKitchenService.js`
- `core/functions/scripts/test_cafe_slice2.sh`
- `core/functions/scripts/test_kitchen_today_scope.js`

**Files edited (additive only):**
- `core/functions/src/cafe/cafeRoutes.js` — added `cafeKitchenService` require, two new routes, updated header comment to list all current routes.

#### Session 20 June 2026 — V1.2 Web Slice 1 (Café Read-Only Menu)

V1.2 Web Slice 1 complete and field-tested on dev. Read-only café menu page now reachable at `/cafe` for any authenticated user. Six items render correctly from the live `serviceMenuConfigs/cafe` document. No order placement UI in this slice (deliberate).

**Scope delivered:**

*Backend (additive, 1 new file + 1 surgical edit):*
- New `core/functions/src/cafe/cafeMenuService.js` — single function `getCafeMenu({ tenantId })` reads `serviceMenuConfigs/cafe` and returns `{ serviceName, items, beverages, updatedAt, notFound: false }` or `{ notFound: true }` for the three "no menu" conditions (doc missing / wrong tenant / `isActive: false`).
- `core/functions/src/cafe/cafeRoutes.js` — added `GET /cafe/menu` route with broad role set (every authenticated tenant user). Added `cafeMenuService` require + header-comment line. No existing routes touched.

*Web (3 new files + 2 surgical edits):*
- New `web/src/services/cafeService.js` — single function `getCafeMenu(token)`. Pattern B (token passed in, matching `menuService.js` / `messService.js` / the rest of the web service layer). `familyService`'s inside-the-service `getToken()` pattern was considered and rejected for inconsistency.
- New `web/src/pages/employee/CafePage.jsx` — page component. Internal sub-component `MenuList` renders item rows as static `<div>`s (NOT buttons — no order affordances in Slice 1). Handles four states: loading, error, empty (the three `notFound`/disabled/zero-items conditions all collapse to "Café menu is being set up"), and normal. Receives `token` as a prop via `<WithToken>` in `App.jsx`.
- New `web/src/pages/employee/CafePage.module.css` — fresh module file. 19 class definitions, all referenced by the JSX, zero orphans. Visual idiom mirrors `BookMealPage.module.css` (`.menuList` / `.menuRow` pattern) and `MyFamilyPage.module.css` (`.loading` / `.errorBanner` / `.emptyCard`). No `:hover` and no `cursor: pointer` on `.menuRow` — explicitly chosen to reflect that the row is not an action in this slice.
- `web/src/App.jsx` — one import line + one `<Route>` line under the employee screens block.
- `web/src/components/layout/Sidebar.jsx` — new "Café" section added to the `employee` nav config, positioned between "Mess & Dining" and "Club".

**Design decisions locked this session** (all also in Section 6):
1. Service pattern: B (token passed in).
2. Sidebar: new "Café" section, not appended to Mess & Dining.
3. `cafe_supervisor` / `cafe_waiter` sidebars deferred to Web Slice 3 (kitchen dashboard UI).
4. No order scaffolding. Pure read.
5. Three "no menu" conditions collapsed to one empty card.

#### Session 22 June 2026 — V1.2 Café Employee Ordering (Web Slices 2.1–2.4) + Batch Backend

The full café employee ordering flow built and field-tested across one extended session. Café flow is **BUILT but HELD OPEN** pending the advance-date slice. Browse → cart → review modal → multi-item submit → consolidated collapsible history → cancel UI.

**Backend (additive):**
- `cafeOrderService.js` — added `createSelfOrderBatch` (multi-item, atomic `db.batch()`, one `bookingGroupId`, session-level consumer, 50-item guard). `_buildOrderDoc` gained optional `bookingGroupId` param (null for single-item paths — single-item `createSelfOrder` / proxy / walk-in untouched, still `.add()`). Migrated `pktMinutesOfDay` `toLocaleString` → UTC arithmetic.
- `cafeRoutes.js` — added `POST /cafe/orders/batch` (before `:orderId` routes per Rule #9).
- Each line ships billing hooks: `rateTargetKey {date}_cafe_{itemId}`, `rateStatus: pending`, `billingDestination: employee_account`, null `unitRate` / `amount`. (Universal rate model attaches later — open item #19.)
- Field test: `test_cafe_slice3_batch.sh` — 7/7 PASS (multi-item batch, shared `bookingGroupId`, billing hooks on every line, family-consumer batch, bad-item rejection / no partial batch, anytime+dine_in interlock rejection, empty-array rejection). `--assume-open` flag for widened-window runs.

**Web:**
- `cafeService.js` — added `createBatchOrder`, plus `createSelfOrder` / `listMyOrders` / `cancelOrder` (Pattern B throughout).
- `CafePage.jsx` — reworked Slice-1 read-only menu into: Add-button / quantity-stepper rows → sticky cart bar → review modal (editable line list, order-type / dining-mode segmented controls with interlock, "Order for" consumer picker = Self + active family, conditional pickup-time) → real submit via `createBatchOrder` → full success screen (item lines, totals, next-day-rate note, "View my café orders" + "Order again"). Modal built proxy-reusable.
- `CafePage.module.css` — additive cart / modal / segmented / success classes.
- `MyCafeOrdersPage.jsx` — **rebuilt** from the 2.2 one-tile-per-document layout into orders grouped by `bookingGroupId` → one collapsible card per order. Collapsed line: short Order No. (`#` + last 6 of groupId, uppercase) · time · order-type tag · "Order placed by - {consumer}" (family/proxy only) · dining mode · item/unit counts · status pill · chevron · Cancel (anytime-in-window only). Expanded: per-item line (name × qty, amount or "Rate pending") + per-line cancel where rules permit. `toDate` timestamp-coercion helper (Firestore object / ISO / ms).
- `MyCafeOrdersPage.module.css` — additive order-card / collapse / line classes.
- New route `/my-cafe-orders` + sidebar entry (added in earlier 2.x work).

**Field-tested working (screenshots confirmed):** cart steppers + cart bar; review modal with consumer picker ("son — Test Son 1"), interlock (Anytime Takeaway forces Takeaway, reveals pickup), window-rejection message; successful multi-item placement → success screen (4 items); consolidated history (multi-item orders as single collapsible cards, "Order placed by - Test Son 2", expand-to-items, `cafe_hours` showing no cancel button).

**Decisions locked this session** (all in Section 6): whole-order single-consumer model (corrects scope doc); "Order placed by - {consumer}" display-only label (billing → employee, audit → real booker); orders immutable / no edit / cancel-only / top-up for "add more"; anytime-only cancellation (cafe_hours never cancellable, no button); modal built proxy-reusable; atomic `db.batch()` batch order.

**The "window bug" that wasn't — recorded honestly.** Mid-session a closed-window test (`TEST 7`) appeared to fail — an order was accepted at 14:19 PKT, outside the 18:00–22:30 window. Initial diagnosis claimed a live `toLocaleString` runtime defect in `pktMinutesOfDay`, "shipped since Slice 1, masked by widened testing." **This was wrong.** Root cause: the deployed café window had been **manually widened for testing** and that wasn't accounted for in the test run — a test/deploy **mismatch**, not a code defect. The `pktMinutesOfDay` → UTC-arithmetic change was retained as **preventive Rule-#2 cleanup, NOT a bug fix** — no confirmed defect existed (the sandbox returned correct values). Lesson: don't escalate a test/deploy mismatch into a "shipped bug" diagnosis; check what's actually deployed first. (Open item #24 tracks the widening discipline.)

**Test-harness bug fixed (mine, not the backend's):** `test_cafe_slice3_batch.sh` initially reported 0/7 — every correct backend response failed assertion. Cause: the `jget` helper printed Python's `True` / `False` (capital) while tests compared against JSON-style `"true"` / `"false"`. Every `success` check string-mismatched even though values were right. Fixed `jget` to emit lowercase JSON booleans → 7/7. Also: a stale copy of the script ran twice (disk ≠ executed) before the patched version was actually copied over — the grep-on-disk discipline (Rule #4 / open lesson) caught it.

**Window state at session close:** café window **reverted to the real 18:00–22:30 and verified enforcing** (rejection message seen in field). No widened constants deployed. `getUTCHours` arithmetic on disk and deployed.

**Held open — café flow NOT closed:** the `anytime_takeaway` cancel path (per-line + whole-order) is deployed but **unverified by design** — anytime orders can't be meaningfully placed/cancelled until the advance-date slice fixes the timing model (current 08:00–22:30 placement cap + same-day-only assumption). Cancel will be field-verified as part of that next slice. `cafe_hours` ordering (the common path) is complete and working. See Section 5 for the advance-date slice carry.

**Field test results:**

*Pre-flight greps (all passed):* every new file grep-verified on disk before deploy. CSS file had 19 class definitions exactly matching JSX references, zero orphans. App.jsx and Sidebar.jsx surrounding sections untouched (verified via control greps).

*Backend verification (curl against deployed dev API):*
- Happy path with Ahmed's token (FFL00003, employee): HTTP 200, 6 items returned in correct sortOrder, every field populated (itemId, itemName, foodTypeCode, foodTypeName, baseUnit, sortOrder, unitRate null, rateType), `updatedAt` ISO string present, `beverages: []` as expected for Slice 1, `notFound: false`.
- No token: 401 "Unauthorized — no token provided".
- Garbage token: 401 "Unauthorized — invalid token".

*Web verification (logged in as Ahmed at `servio-dev-55d2d.web.app`):*
- Sidebar: new "Café" section visible between "Mess & Dining" and "Club", coffee icon rendering correctly, single "Café" item linking to /cafe.
- /cafe page: title and subtitle render correctly (subtitle shows "Order window: 18:00 – 22:30 · 6 items · Updated Jun 19, 2026, 23:52" — local PKT display of the UTC `updatedAt` from Firestore).
- All 6 items present in correct order with correct food-type badges and `per {baseUnit}` detail lines.
- "Beverages" section heading correctly hidden (empty array).
- Italic footer note "Ordering will be available in the next update." visible.
- Hover behaviour: confirmed no colour change and no clicking-hand cursor on menu rows. Static rendering as designed.
- Route protection: `/cafe` in fresh incognito session (not logged in) redirects to `/login` as expected via `<ProtectedRoute>`.

**Build / deploy notes:**
- Functions: `firebase deploy --only functions` — all three functions (api, resolveDaily, generateSnapshots) updated cleanly. Node 20 deprecation warning continues to surface.
- Hosting: `npm run build -- --mode development` then `firebase deploy --only hosting`. Footgun ducked again: the build command emits `vite build --mode production --mode development` in the console because the `build` script in `package.json` hardcodes `--mode production` and our flag appends. Vite uses the last `--mode` flag so the bundle is correct, but Open Item #3 (add explicit `build:dev` / `build:prod` scripts) is still the right fix.

**Open items raised this session:** #17 (cafe_supervisor/cafe_waiter sidebar configs missing, resolved in Web Slice 3), #18 (timezone leakage in updatedAt display).

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
20. **Web service pattern: token passed in.** New web service files follow `menuService.js` / `messService.js` / `cafeService.js` — caller fetches token via `useAuth().getToken()` and passes it as a parameter. `familyService.js`'s inside-the-service `auth.currentUser.getIdToken()` is the outlier and is not propagated.

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
| FFL00003 | employee | Ahmed Khan | Primary employee test account (V1.1 Slice 1+2+3a, V1.2 Backend Slice 1+2, V1.2 Web Slice 1, V1.2 café ordering Web 2.1–2.4 on 22-Jun). To be kept as employee going forward. Role drift to admin during V1.2 Backend Slice 1 testing — reverted. Many café test orders (`Rate pending`) accumulated under this account 22-Jun — see open item #23. |
| FFL00100 | admin (elevated) | Humayun Shahzad | Was employee, elevated. Kept as admin. |
| CLB00010 | admin | Qasim Ejaz | Personal email `admin@fatima-group.com`. Auth UID `UNh7SEPZruWHqQLaard7VFszgI73`. Replaces FFL00001. |
| FFL01584 | employee | Qasim Ejaz | Qasim's customer-side account (separate identity by design). Real personal email. |
| FFL00257 | employee | Farrukh Imtiaz | V1.2 proxy target. 2 family members added during V1.2 Backend Slice 1 testing (son + spouse) for café-consumer scenarios. |
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

Alternatively use `core/functions/scripts/get_token.js` — REST-based ID token fetch, no browser console needed.

---

## 12. V1 Extension Design Reference

Reference document: `docs/Servio_V1_Extension_Scope_09Jun2026.md`.

| Module | Decision summary |
|--------|------------------|
| Family CRUD (V1.1) | Fully locked. See Slice 3a corrections in Section 6 for the actual current rules. |
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
| `docs/Servio_V1_Schema_Reference.docx` | V1 authoritative schema (28 collections, 6 layers) — **out of sync re: `familyMembers` field names (open item #12)** |
| `docs/Servio_V1_Extension_Scope_09Jun2026.md` | V1.1–V1.4 scope lock |
| `docs/Servio API Refrence.docx` | API surface reference |
| `docs/Servio_Management_Introduction.docx` | Product positioning |
| `docs/Servio SRS.docx` | Software requirements |
| `docs/Servio_Technical_Review.docx` | Technical review |
| `docs/Servio v1 frontend scope.docx` | V1 frontend scope |
| `docs/Servio_V1_Use_Cases.docx` | V1 use cases |

---

## 14. Session Discipline (lessons baked in)

These are the operating rules that have been earned through pain over the V1.1 and V1.2 sessions. Sometimes redundant with the technical rules above; preserved here separately because they're about process, not code.

1. **Surface concerns immediately, don't defer them as side notes.** When a design tension is noticed mid-planning, the right move is to stop and ask, not to write down "we can deal with this later" and proceed. Discipline failure happened during V1.1 Slice 2 planning (relation immutability) and was the trigger for Slice 3a.
2. **Read before edit.** Always read existing file before proposing changes — additive only, no rewrites of working files.
3. **Deploy ≠ apply.** Apply the rule. Always verify `firebase use` before deploy. Always verify endpoint with a live request after deploy.
4. **Grep on disk before redeploy.** Editor save dialog confirming a save is not always equivalent to bytes on disk — especially over network-mounted file systems. After every edit, grep the file to confirm the change is actually there before the next deploy step. Lesson earned during V1.2 Backend Slice 1 (the time-window bug fix that didn't survive to disk on the first try).
5. **Field test before declaring done.** Module-level pass doesn't equal integration pass.
6. **Load-bearing design decisions deserve dedicated tests.** A correctness requirement (e.g. "kitchen list is today-only by design", "cascade is one-way") should be verified by a test that specifically plants the edge case, not relied on by code review. Lesson earned during V1.2 Backend Slice 2 (the `test_kitchen_today_scope.js` diagnostic).
7. **Discipline batches.** Bugs by root cause, complete one phase before opening next. Proactive flags during build, not deferred.
8. **Decisions get challenged before locked.** Honest reasoning preferred over flattery. No wishlist items in active scope.
9. **Documentation rhythm:** command board + scope docs updated at session close. GDrive backup of key documents.
10. **One issue at a time.** Don't batch fixes. Isolate root cause. Fix. Verify. Move forward.

---

*V1 Extension command board · Active working file · Consolidated 20 June 2026 · Last updated 22 June 2026.*

## V1.2 Café — Anytime Advance-Date Ordering Slice — CLOSED ✅ (22 Jun 2026)

**Status:** Backend slice closed, field-verified on live dev (servio-dev-55d2d).
This closes the café backend flow.

### What shipped
- `anytime_takeaway` placement now 24/7 (dropped 08:00–22:30 placement cap).
- New field `requestedPickupDate` (YYYY-MM-DD PKT) on cafeOrders, threaded
  through all four create paths + batch. Missing → falls back to order date
  on read (no backfill — additive).
- Same-day pickup: 2h lead enforced + ≤23:00 ceiling + 20:00 same-day lockout.
- Future-date pickup (today+1 .. today+7): 2h lead waived, ≤23:00 still enforced.
- Cancellation (Option B): same-day = 1h-from-placement (unchanged);
  future-date = cancellable until pickup (cancellationWindowExpiresAt holds the
  pickup datetime).
- `cafe_hours` flow untouched.

### New constants (in cafeOrderService.js)
- `ANYTIME_TA_SAMEDAY_LOCKOUT = 20*60`
- `ANYTIME_TA_MAX_ADVANCE_DAYS = 7`
- New helpers: `addDaysToDateStr`, `pickupDateTimePKT`

### Field test (all PASS, live dev, 22 Jun)
24/7 placement · same-day 2h lead enforced · short-lead rejected ·
future-date lead waived · ceiling +7 accepted · +8 rejected ·
≤23:00 enforced · **future-date cancel = cancellable until pickup** ·
#21 bookingGroupId + createdByRole present in listMyOrders ·
#24 window reverted to 18*60/22*60+30, deployed, off-hours cafe_hours
order confirmed rejected.

### Tracked items carried forward (NOT bugs — deliberate)
- **Dead constant:** `ANYTIME_TA_START` (08:00) now unused (was the anytime
  placement floor we removed). Left in place per additive discipline. Remove
  in a future cleanup pass if desired.
- **Kitchen createdAt-scoping → WEB SLICE 3:** cafeKitchenService.getKitchenOrders
  filters orders by `createdAt >= startOfTodayPKT`. With advance orders live, an
  order PLACED today for a FUTURE pickup appears on the kitchen board on the
  PLACEMENT day, not the pickup day. Kitchen date semantics must be decided when
  the kitchen dashboard UI is built. Logged, not fixed (out of this slice's scope).

### Lesson (process)
Test harness initially used a hand-rolled date helper that skipped the
pktDateStr +5h correction → returned today+0 for "tomorrow", making correct
backend code look like it was failing across several runs. Fix: test scripts
must reuse the production date helpers, not re-implement them. Two
implementations of the same logic = drift, even in test code.

### NEXT: V1.2 Café Web Slice (frontend) — NOT yet started
Frontend changes required (backend contract now demands them):
1. Order modal: pickup DATE picker (today..today+7; disable today after 20:00 PKT).
2. MyCafeOrdersPage: display requestedPickupDate (fallback to order date if absent).
3. Cancel button gating for future-date orders (available until pickup).
Read CafePage.jsx + MyCafeOrdersPage + the café service file BEFORE proposing edits.

## V1.2 Café — Anytime Advance-Date Ordering — CLOSED ✅ (22 Jun 2026)
**Backend AND Web slices closed. Café flow complete end-to-end, field-verified on dev.**

### Shipped (backend, cafeOrderService.js)
- anytime_takeaway placement 24/7; requestedPickupDate (YYYY-MM-DD PKT) added,
  threaded through all 4 create paths + batch; missing → order date on read (no backfill).
- Same-day: 2h lead + ≤23:00 + 20:00 lockout. Future-date (today+1..+7): lead waived, ≤23:00.
- Cancel (Option B): same-day = 1h from placement; future-date = until pickup
  (cancellationWindowExpiresAt holds pickup datetime).
- Constants: ANYTIME_TA_SAMEDAY_LOCKOUT=20*60, ANYTIME_TA_MAX_ADVANCE_DAYS=7.
  Helpers: addDaysToDateStr, pickupDateTimePKT.
- cafe_hours window reverted to 18*60/22*60+30, redeployed, off-hours rejection verified.

### Shipped (web)
- CafePage.jsx: pickup-date picker in order modal (anytime only; min today / max today+7;
  min→tomorrow after 20:00 PKT). Browser-tz helpers (toLocaleString en-CA), not backend math.
- MyCafeOrdersPage.jsx: requestedPickupDate carried through grouping; expanded pickup row
  shows "Pickup <date>, <time>" when pickup differs from order day, time-only otherwise.
- cafeService.js: no change (payload passthrough). Cancel gating: no change (isCancellable
  already correct for future dates via cancellationWindowExpiresAt).

### Field-verified (dev, 22 Jun)
Backend curl: all 8 validation rules + future-date cancel (cancelWin = pickup datetime).
Web: date picker bounds (29 selectable, 30 greyed); #AG2XP5 shows "Pickup Mon, 29 Jun";
#NVB4WN grouped under 22 Jun shows "Pickup Tue, 23 Jun"; per-line + whole-order cancel; success screen.

### Tracked items (NOT bugs — carried forward)
- Dead constant ANYTIME_TA_START (08:00) — was the removed placement floor. Left in place
  (additive). Remove in a future cleanup pass.
- Kitchen createdAt-scoping → WEB SLICE 3: cafeKitchenService.getKitchenOrders scopes to
  createdAt>=startOfTodayPKT. Advance orders appear on kitchen board on PLACEMENT day, not
  PICKUP day. Decide kitchen date semantics when the kitchen dashboard UI is built.
- MyCafeOrdersPage history filter/grouping also keyed on createdAt — advance orders group
  under placement day (correct, but pickup date only visible on expand). Acceptable; revisit
  if users want pickup-day grouping.

### Process lesson
Test harness initially used a hand-rolled date helper missing the pktDateStr +5h correction
→ returned today+0 for "tomorrow", made correct backend look broken across several runs.
Lesson: test scripts must REUSE production helpers, not re-implement them.

V1.2 Café Web Slice 3 — CLOSED 23Jun2026. Kitchen board switched createdAt→requestedPickupDate semantics (advance orders surface on pickup day); in-memory soonest-pickup-first sort, dine-in null-pickup sinks below. Backend deployed + field-tested 6/6. 32 legacy field-less cafeOrders purged from dev. Frontend: new CafeKitchenPage.jsx (pages/admin/) + web cafeKitchenService.js + /cafe-kitchen route + sidebar nav for cafe_supervisor/cafe_waiter/manager/admin/legacy cafe_bakery_tuckshop_supervisor. Manager-inheritance gap fixed (MANAGER added to kitchen accept + orders routes). Card shows item/qty/pickup-time/dining-mode/consumer/employee-number + Accept. Full flow browser-verified: place→board→accept→status-back-to-employee. Open item #17 CLOSED. Role split (cafe_bakery_tuckshop_supervisor → cafe_supervisor + tuckshop_bakery_supervisor) DEFERRED to V1.3. Cosmetic: "Cardimom Tea" typo in seed data (→ Cardamom), non-blocking.

---

### V1.2 Café Slice 4 — Café Order Completion — CLOSED 23-Jun-2026 (late session)

**Backend (deployed dev, field-tested 10/10 ×3 + isOverrun live-verified):**
- `CAFE_ORDER_STATUS.PREPARED = 'prepared'` (constants).
- `_buildOrderDoc`: `preparedAt` + `preparedByUid` null at creation (all 4 create paths).
- `cafeKitchenService`: `markPrepared` (strict accepted→prepared; rejects placed/
  prepared/cancelled/wrong-tenant). `CAFE_OVERRUN_MINUTES = 15`. `isOverrun` computed
  at read in `getKitchenOrders` (from `acceptedAt`, accepted-only, duration math =
  timezone-irrelevant). Header rewritten.
- `cafeRoutes`: `PATCH /cafe/orders/:orderId/prepared` — cafe_supervisor, cafe_waiter,
  legacy cafe_bakery_tuckshop_supervisor, manager, admin, super_admin (manager per
  locked rule). Stale "accepted is terminal" route comment corrected.
- Test: transitions 10/10 (3 runs). isOverrun confirmed in LIVE board (orders accepted
  >15min = true, fresh = false). Full placed→accepted→prepared chain verified in
  Firestore docs.

**Web (deployed dev, browser-verified as Rashid Khan/CLB00020/legacy supervisor):**
- web `cafeKitchenService.js`: `markPrepared` added.
- `CafeKitchenPage.jsx`: `onPrepare`+`preparingId`; "Mark prepared" button REPLACES static
  "Accepted" tag (Q1); card class placed→amber / accepted+overrun→red / accepted→green
  (Q4 precedence); "Overrun" pill beside dining badge; NO reorder on overrun (Q3 — red in
  place, sort untouched); NO confirm (Q2).
- CSS: `.orderCardOverrun`, `.cardTopRight`, `.overrunPill`, `.prepareBtn` added.
- Browser-verified: red overrun cards + pill render, dine-in null-pickup renders, Mark
  prepared drops card off board, legacy-role inheritance works in UI.

**Café window widen/revert (open item #24):** widened again for off-hours testing
(LEAD_MIN→0, SAMEDAY_LOCKOUT→24*60), REVERTED to 2*60 / 20*60, TEMP comments cleaned.
Two hand-edit slips occurred during widen (duplicate const, then orphaned usage) — both
caught by deploy analyzer + grep before reaching anything. Reinforces #24: prefer
in-place value edits over add/delete lines when widening.

**⚠ RECONCILIATION OWED next session (do these before new work):**
- §1 Status paragraph is 2 slices stale (still says café "HELD OPEN") — rewrite.
- Slices table line "Web Slice 4 | Official café meals" is WRONG — Slice 4 became
  completion; official meals displaced to a later slice. Correct the row.
- Locked decision "Café `accepted` is terminal (20-Jun)" is SUPERSEDED by Slice 4 —
  annotate (preserve, don't delete).
- Open item #17 (sidebar) — already closed 23-Jun, move to Recently Closed.
- "Last Updated" header → 23-Jun.

**New carry items (Slice 4):**
- Supervisor/manager have NO history view for prepared (or any past) café orders — they
  leave the live board and there's no screen to see lifecycle back. Employees have
  `/cafe/orders/mine`; supervisors have nothing. → NEXT SLICE CANDIDATE: design a SHARED
  supervisor order-history view (café/teabar/tuckshop/bakery, parameterised by service —
  every future service hits this same gap). Design-lock open Qs: standalone vs on dashboard;
  query shape + composite index (tenant+status+date); read-only vs act-on-past; how far
  back + pagination.
- `cancelOrder` has NO guard against cancelling a `prepared` order — decide in a future
  cancel-flow review.
- Orphaned `.acceptedTag` CSS in `CafeKitchenPage.module.css` (dead, harmless).
- `cafeOrderService.js` header/scope comments (~lines 13/356/390) say "Slice 4 = official
  meals" — drifted from actual contents. Cosmetic.

  ## Session — 24 June 2026 (Slice 5 backend sub-slice)

CB reconciliation completed (the 5 owed edits from 23-Jun closeout: §1 status,
Slice-4 row corrected to completion, accepted-is-terminal annotated SUPERSEDED,
#17 → Recently Closed, Last Updated stamped). Tuckshop/bakery separation decision
recorded as locked (own role + dashboard + full order flow, mirrors café; V1.3).
3 stale "Slice 4" comments in cafeOrderService.js fixed to Slice 7 (lines
14/356/849); 383 + 392 correctly left.

SLICE 5 BACKEND SUB-SLICE — built + deployed to dev, PARTIALLY field-verified.
Two new pieces, both additive:
  1. GET /family/employee/:employeeNumber (familyService.listFamilyForEmployee +
     _assertEmployeeExists; familyRoutes cafeOrAdmin gate). Returns SELECTABLE
     (active, non-deletion-pending) family of a given employee for proxy picker.
     FULLY field-tested 24-Jun: real family returned w/ correct fullName/relation
     (no drift), empty-case = count 0 not error, plain-employee = 403, bad number
     = 404 (live employees field-names confirmed). CLOSED.
  2. createProxyOrderBatch (cafeOrderService) + POST /cafe/orders/proxy/batch
     (cafeRoutes). Multi-item proxy order: createdByEmployeeNumber = supervisor,
     employeeNumber = target, bookingSource = PROXY, one bookingGroupId, atomic
     batch. Mirror of createSelfOrderBatch + createProxyOrder deltas.
     VERIFIED out-of-window 24-Jun: no-override window rejection (Q1b holds),
     targetEmployeeNumber-required guard, empty-items guard, validation ordering
     (required before window), family-fetch→consumer chain executes.
     *** ONE OPEN VERIFICATION: the in-window SUCCESS WRITE is unproven — every
     test rejected before batch.commit() because tested at 16:33 PKT (café window
     18:00–22:30). Must confirm a placed multi-item proxy order writes N docs with
     correct bookingSource=proxy / employeeNumber=target / createdByEmployeeNumber
     =supervisor / shared bookingGroupId. ***

RESUME (in-window, after 18:00 PKT):
  SUP_TOKEN=$(node scripts/get_token.js 'cafe.supervisor@fatima-group.com' '1234@com')
  → POST /cafe/orders/proxy/batch, target FFL00003, 2 items, consumerType self
  → expect success, orderCount 2, one bookingGroupId
  → repeat with consumerType family_member (spouse brM0OOdPAM7LxGNSnmdz)
  → Firebase console: open the bookingGroupId's cafeOrders docs, confirm the
    4 fields above.
  Then close backend sub-slice → open Slice 5 WEB sub-slice (employee-number
  search → family-tree picker → existing cart modal → /cafe/orders/proxy/batch;
  field-test logged in as REAL cafe_supervisor — closes never-tested-role gap).

Test data note: FFL00003 family is polluted (3 spouses, 18× relation-flip on
Test Son 1) — structurally valid for exercising code, NOT realistic. Consider a
cleaner target account before web UI screenshots.
Reminder: Node 20 deprecation warning on every deploy — decommission 30-Oct-2026.
V1.2 Café — Slice 5 (Proxy Ordering): CLOSED — 25 Jun 2026, ~21:25 PKT
Both remaining jobs proven, data-layer verified (not UI-only).
Job 1 — web proxy placement, end-to-end: Logged in as Majid (CLB00030, cafe_supervisor) → /cafe-proxy-order → searched FFL00003 (Ahmed Khan, 12-member tree) → placed multi-item dine-in proxy orders for self + family members. Green success screen confirmed ("Order placed for Ahmed Khan"). Orders appeared correctly on: café kitchen board (consumer-tagged "For [member]"), and Ahmed's own "My Café Orders" ("Order placed by – [member] · through proxy booking"). Lifecycle proven: placed → accepted → prepared.
Job 2 — cafe_supervisor role: closed within Job 1, not separately. cafeOrders docs show createdByRole: "cafe_supervisor" — the role exercised through the real proxy flow, not just a badge check.
Data-layer proof (5 cafeOrders docs inspected in Firestore):

Proxy order (Club Sandwich): bookingSource:"proxy", createdByEmployeeNumber:"CLB00030" ≠ employeeNumber:"FFL00003", createdByRole:"cafe_supervisor", consumerType:"family_member", consumerName:"Test Spouse 2". Creator≠holder = genuine proxy (the load-bearing check).
Self-order control (Cappuccino): bookingSource:"self", createdByEmployeeNumber:"FFL00003", createdByRole:"employee", consumerType:"self". Proves proxy/self paths write distinctly.
All: billingDestination:"employee_account", rates pending (correct — café bills next day).

Code change this session: web/src/pages/admin/UserManagementPage.jsx — added cafe_supervisor + cafe_waiter to ROLES array and ROLE_LABELS map (the role-split missed this file when constants/routes/sidebar got the new strings). Grep-verified (4 hits), build:dev, deployed to dev hosting, committed (81eed02) + pushed.
Hygiene carry-items (none blocking; address before/at prod-wipe):

Test-account emails crossed: Rashid (now Sports Supervisor) holds cafe.supervisor@...; actual café supervisor Majid holds supervisor.cafe@.... Cosmetic on dev; clean up before test-run.
New test account CLB00040 (Nadir Shah, café waiter) — created mid-session.
Rashid (CLB00020) moved legacy café → Sports Supervisor — confirm intentional.
cafeOrders now holds proxy orders under BOTH legacy (cafe_bakery_tuckshop_supervisor, CLB00020, 24 Jun) and new (cafe_supervisor, 25 Jun) roles — mixed test data, clear at prod-wipe.
Seeded test items use readable IDs (CAFE_TEST_SANDWICH/FRIES/COFFEE) — keep out of prod menu seed.

V1.2 status: Slice 5 closed. Next: Slice 6 (supervisor order-history view) — design-lock on paper FIRST, no code until locked.
V1.2 Café — Slice 6 (Supervisor Order-History View): CLOSED — 26 Jun 2026
Backend built, deployed, field-tested end-to-end, committed + pushed.

Design: read-only paginated past-order list (dispute-lookup + audit). Café-only,
NOT built shared (extract for V1.3 tuckshop/bakery when a real 2nd caller exists).
Design-locked on paper 25-Jun, zero open Qs; built this session.

Two additive pieces:
  1. listCafeOrderHistory (cafeKitchenService.js) — read-only, cursor-paginated.
     Params: tenantId, lookbackDays(7 default), day(YYYY-MM-DD single-pick, wins
     over lookback), includeCancelled(false default), cursorCreatedAt.
     Sort createdAt DESC. Status `in` [placed,accepted,prepared], +cancelled on
     toggle. Page size 25 via limit(26) probe → hasMore w/o 2nd query. Cursor =
     createdAt-only (single orderBy field, simplest index; orderId tiebreak
     DEFERRED — add only if a real same-ms dup surfaces). Date math self-contained
     inline (did NOT reach into cafeOrderService's local addDaysToDateStr — see
     deferred-util carry).
  2. GET /cafe/history (cafeRoutes.js) — verifyRole supervisor/waiter/legacy/
     manager/admin/super_admin. includeCancelled parsed string→bool (=== 'true';
     raw forward would make toggle always-on). days→parseInt, service guards NaN/range.

NEW INFRA: composite index cafeOrders (orderStatus ASC, tenantId ASC, createdAt
DESC, __name__ DESC) — index ID CICAgJjFx5sK, built + Enabled. Captured from
Firestore's emitted error link, NOT hand-authored.

Field-tested live (supervisor token, FFL tenant, real data):
  Page 1: count 25, hasMore true, nextCursor = last row createdAt. Sort verified
    newest-first (25-Jun → 22-Jun). 7-day window held. Zero cancelled (default set
    correct). Read-only.
  Page 2 (cursor fed back): count 8, hasMore false, nextCursor null, first row
    OLDER than page-1 cursor — startAfter correct, no skip/repeat. 33 orders total
    in window across 2 pages.
  (Branch tests ?day= and ?includeCancelled=true: not run — simple variants,
   optional polish.)

Code: cafeKitchenService.js + cafeRoutes.js committed + pushed (fc956b0 covered
indexes; code commit pending this session-close).

MAJOR DRIFT CAUGHT this session (worth more than the slice): firebase.json deploys
firestore indexes from core/functions/firestore.indexes.json — that file was a
STALE 12-index (default)-db export (May 28), while live servio-dev has 25. Bare
`firebase firestore:indexes` reads (default) not the named servio-dev db → all
past index drift traces here. FIXED: exported live with --database=servio-dev (25
incl. the 3 cafeOrders), synced BOTH the root file and the deploy-target
core/functions file, committed. .bak copies kept (firestore.indexes.json.bak,
core/functions/firestore.indexes.json.bak-12idx-may28).
*** DO NOT `firebase deploy --only firestore:indexes` without reading the
add/delete preview — confirm 25, never fewer. ***

New carry items (Slice 6):
- Two firestore.indexes.json files (root + core/functions) now in sync but WILL
  drift again — structural cleanup: keep one, point firebase.json at it. Own slice.
- DEFERRED: promote addDaysToDateStr (local in cafeOrderService.js) → utils.js,
  switch both callers to import. Own slice (own backup, grep, field-test existing
  callers). Extract-when-two-real-callers — do NOT bundle into a feature build.
- Node 20 deprecation: decommission 30-Oct-2026 — runtime upgrade before then.

V1.2 status: Slice 6 BACKEND closed. Next: Slice 6 WEB sub-slice — own component,
own route/tab, NO live-board state leak (design-lock hard condition), build:dev,
field-test as real cafe_supervisor. Backend contract fixed: consumes
{ orders, count, hasMore, nextCursor }.