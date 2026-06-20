# Servio — Command Board V1 (Reference)
**HomiLabs Solutions SMC Pvt Ltd · homilabs.org**

| Property | Value |
|----------|-------|
| Product | Servio — Club Management Platform |
| Client | FFL Management Club (tenantId: `ffl`) |
| Company | HomiLabs Solutions SMC Pvt Ltd · homilabs.org |
| File scope | V1 — Mess operations + V1 Enhancement (closed chapter) |
| Status | V1 deployed to prod (frozen for 15-day test) + V1 Enhancement web complete |
| Last meaningful event | 17 June 2026 (V1 stable; V1 Extension begins) |
| Consolidated on | 19 June 2026 |

> **Reading note.** This file documents what V1 is and how it was built. Active development continues in V1 Extension — see `Servio_CB_V1_Extension.md`. Shared content (infrastructure, technical rules, test users, deploy commands) lives in the V1 Extension file, not here, to avoid duplication. This file is reference only.

---

## 1. V1 Scope (as shipped)

V1 covers mess operations end-to-end:

- Identity layer (signup, role-based routing, employee master)
- Menu management (items → weekly templates → cycles → resolved daily menus)
- Booking lifecycle (employee self-book, proxy, walk-in, guest)
- Issuance (booking → issued / no-show tracking)
- Manual rate entry + retrospective cost dashboards
- Feedback (one rating per area, no free text)
- In-app notifications
- Event attendance (counts-based, separate from meals)

V1 explicitly excluded café, tuck shop, bakery, BBQ, inventory, recipe costing, automated billing — all of which fall under V1 Extension (V1.1+) and later versions.

---

## 2. V1 Enhancement — F1–F8 + Guest Approvals + F13

V1 Enhancement is the set of feature additions layered onto V1 after Phase 11/12 closure. Scope was locked before build.

| # | Feature | Platform | Status |
|---|---------|----------|--------|
| F1 | Employee self-serve BF ala carte (multi-item) | Web + Mobile | ✅ Web done. Mobile pending. |
| F2 | Supervisor proxy/walk-in BF ala carte (multi-item) | Web + Mobile | ✅ Web done. Mobile pending. |
| F3 | Official guest walk-in + sponsor search | Web | ✅ Done |
| F4 | Supervisor special meal walk-in catalogue | Web | ✅ Done |
| F5 | Event banner on employee home screen | Web | ✅ Done |
| F6 | Accounts Supervisor home dashboard | Web | ✅ Done |
| F7 | Booking cutoff editable in App Settings | Web | ✅ Done |
| F8 | Individual feedback review for admin | Web | ✅ Done |
| Guest Approvals | Admin official guest billing approval page | Web | ✅ Done |
| F13 | Node.js 20 → 22 upgrade | Infrastructure | ⏳ Open — deadline October 2026 |

**Mobile remaining work (carry into mobile build phase):**
- F1: `BookMealScreen.js` — multi-item BF ala carte
- F2: `WalkInScreen` + `ProxyBookingScreen` — multi-item BF ala carte

---

## 3. Structural Issues (raised in V1, carry forward to V1 Extension)

These are known limitations from V1 build that need to be addressed before full FFL-wide rollout. They straddle V1 / V1 Extension and are being tracked in the V1 Extension command board's open-items list.

| # | Issue | Risk | Trigger to fix |
|---|-------|------|----------------|
| S1 | Booking duplicate-check not atomic | Two simultaneous bookings could create duplicates under load | Before full 350-employee rollout |
| S2 | `employeeService` uses `.limit()` then in-memory filter | Search breaks silently past 50 employees | Before full 350-employee rollout |
| S3 | Notification fanout 500-op batch on ALL_EMPLOYEES | Firestore batch limit hit at scale | Before full rollout |
| S4 | Node.js 20 deprecation (= F13) | End of active support 30 October 2026 | Before October 2026 |

---

## 4. V1 — Major Milestones (closed chapter)

### Phase 11 — Functional validation (CLOSED, 09 April 2026)

End-to-end field test of all V1 modules: monthly menu creation, weekly template builder, menu resolver engine, employee menu display, meal reservation (employee/guest/proxy), reservation edit/cancellation, supervisor dashboard, meal issuance, feedback submission + dashboard reflection, meal rate management, event management end-to-end, analytics dashboard integration. Code health: Flutter analyzer clean, no schema drift, no refactor outside validation scope. Discipline maintained — no schema changes during validation, no feature expansion, issue-wise resolution.

### Phase 12 — Account hardening (CLOSED, 09 April 2026)

Firebase Auth session persistence (Keep Me Logged In via AuthGate). Login flow stabilised. Change Password functionality: re-auth enforced, secure update via Firebase, error handling, dialog-based UI integration in Employee + Admin Dashboard Shells. Firestore access restricted to authenticated users; no public read/write; password update secured with re-auth.

### V1 Enhancement web build (COMPLETE)

F1–F8 + Guest Approvals all built and field-tested on web. Sequence was: scope lock → build → field test → close. No mid-phase scope expansion.

### Dev / Prod environment separation (15 June 2026)

Two permanent, independent Firebase projects established.

- Web config made environment-based (`.env.development` / `.env.production`). All 16 web service files + Firebase config read from env. No hardcoded URLs.
- `.firebaserc`: `dev` + `prod` named aliases; `default` = dev (safe). Habit: always `firebase use` before deploy.
- `firebase.json` firestore database corrected to `servio-dev`. Stray `web/.env` deleted.
- `index.js` → `admin.initializeApp()` (no args): deployed functions use whichever project they run in. Cross-wire removed. `getFirestore('servio-dev')` unchanged.
- Functions deployed to PROD: `api`, `resolveDaily`, `generateSnapshots` (asia-south1). Live URL confirmed = `.env.production`.
- Web hosting deployed to PROD. Login page verified live against prod Auth + backend (empty-DB "invalid login" = success signal).
- Prod service-account key → `keys/service-account-prod.json` (gitignored). Verified `project_id` = `servio-prod-3a6de`.
- Data copied dev→prod (IDs preserved): **employees (343)** + **menuItems**. NOTHING else copied.
- Utility scripts: `copy_dev_to_prod.js`, `export_to_csv.js`, `import_from_csv.js` (currently in `core/functions/`, scheduled for relocation).
- Custom domain `servio.homilabs.org`: CNAME at Hostinger → `servio-prod-3a6de.web.app`; added to Firebase Auth authorized domains. DNS/SSL propagation pending at time of split.

**Decision locked 15 June 2026:** prod frozen at V1 for ~15-day test with ~15 testers; dev development resumes on V1 Extension (V1.1 Family CRUD). After test → wipe prod → relaunch as real production.

---

## 5. Prod — 15-Day Test (in progress at time of split)

Open threads tied to the prod test that may extend past V1 closure:

- Admin/super_admin bootstrap (delicate manual first-super_admin step)
- Manager recreates menu cycle in prod
- 15 testers register fresh
- Mobile env-config before any prod mobile build (`api.js` + `firebase.js` hardcoded dev; need `app.config.js` + EAS profiles; reconcile package `org.homilabs.servio` vs `com.homilabs.servio`; prod `google-services.json`)
- Relocate utility scripts (`copy_dev_to_prod.js`, `export_to_csv.js`, `import_from_csv.js`) out of `core/functions/` so they aren't bundled into deploys
- After test: WIPE prod + relaunch as real prod
- "Servio" name contested in hospitality software — branding consideration, not blocker
- When V1.1 reaches prod: seed `appSettings` keys `maxFamilyMembersPerEmployee` + `familyMemberFeatureActive` (dev-only so far)
- Firebase Auth email delivery via default `firebaseapp.com` sender is silently dropped by Gmail and corporate mail filters. Discovered during Slice 1 testing. Prod risk for 15-tester pilot when testers forget passwords — need custom SMTP / SendGrid sender domain before real prod launch.

---

## 6. V1 — Project Evolution Lessons (preserved for future builds)

These are the painful-but-valuable lessons from V1 build. They informed the discipline that's now in place for V1 Extension.

1. **Design completely before coding.** V1 began without schema lock and paid for it in rework. Phase 11 was largely about cleaning up architectural drift. The current rule "design on paper before any code written" came from this.

2. **Freeze scope per version.** Feature creep during build was the second-largest source of rework. New ideas now go to the next-version backlog, not into the active build.

3. **Schema naming consistency matters more than feature completeness.** Same concept rendered with different field names broke dashboards and analytics late in build. Schema reference + camelCase throughout came from this.

4. **Validate integration, not just modules.** Modules can be individually green and the system still fails because cross-module data flow is broken. Per-version vertical slice (backend→web→mobile complete before next slice starts) came from this.

5. **Service layer between UI and Firestore.** UI containing business logic was a refactoring nightmare. The current architecture enforces UI → service → data.

6. **IDs not labels for linking.** String matching across collections was fragile. All joins now go through identifiers.

7. **Position document before development.** No core project doc at V1 start meant decisions changed across sessions. The command board and scope reference docs came from this.

---

## 7. V1 Firestore Schema (reference)

V1 used 28 collections across 6 layers. The authoritative schema is `Servio_V1_Schema_Reference.docx` in `docs/`. Summary by layer:

- **Identity & Governance:** deploymentConfig, employees, users, registrationRequests, familyMembers, officialAccounts
- **Menu Domain:** foodTypes, mealTypes, menuItems, messWeeklyTemplates, menuCycles, dailyMenus, serviceMenuConfigs, bakerySchedule
- **Mess Operations:** reservationSettings, messReservations, mealRates, mealFeedback
- **Events:** eventNoteTemplates, events, eventAttendanceResponses, eventAttendanceSummaries, eventRates, eventFeedback
- **Notifications:** notifications, notificationDeliveries
- **Reporting & Settings:** reportingSnapshots, appSettings

V1 Extension adds collections on top (`familyMembers` existed but was unused until V1.1; café/teabar/tuckshop/bbq collections are designed but not yet created).

---

## 8. V1 — Final Status

V1 is closed. Web is feature-complete and field-tested. Mobile F1/F2 work remains but is sequenced behind V1 Extension per the per-version vertical slice decision. Prod is deployed and frozen for the 15-day tester trial.

All further development of new features happens in V1 Extension. See `Servio_CB_V1_Extension.md` for active work, current state, infrastructure, technical rules, test users, and open items.

---

*V1 chapter closed 17 June 2026. Consolidated reference written 19 June 2026.*