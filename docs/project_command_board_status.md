# Servio — Project Command Board

**Product:** Servio — Club Management Platform
**Company:** HomiLabs
**Client:** FFL Management Club
**Stack:** Node.js + Express (Firebase Cloud Functions) + React/Vite (web) + Expo React Native (mobile)
**Firebase:** servio-dev-55d2d
**GitHub:** AwaizFatima08/servio_dev
**NAS Path:** /mnt/storage/projects/servio_dev/

---

## Current Status

**Phase:** V1 Backend — Flows 01–11 Complete
**Last Commit:** 3bb96ff (post Flow 11)
**Date:** 23 May 2026

---

## Completed Flows

- Flow 01: Identity Layer — register, approve, profile
- Flow 02: Employee Master — add, list, get, status
- Flow 03: Menu Catalogue — foodTypes, mealTypes, menuItems CRUD
- Flow 04: Templates + Cycles — create, activate, duplicate protection
- Flow 05: Reservation Settings — seeded, get, update
- Flow 06: Mess Reservations + Issuance — self, proxy, guest, official, special, cancel, no-show
- Flow 07: Rate Entry — retrospective rates, rateApplicator, revision flow
- Flow 08: Feedback — submission, eligibility, duplicate prevention, summary
- Flow 09: Notifications — create, dispatch, read, unread count, mark all read
- Flow 10: Events + Attendance — full lifecycle, aggregator, summary mirrors
- Flow 11: Reporting Dashboard — live queries, snapshot engine, all endpoints tested

---

## Remaining V1 Flows

- Flow 12: Cafe + TuckShop + Bakery + TeaBar
- Flow 13: BBQ
- Flow 14: Billing Dashboard

---

## Next Session — Flow 12: Cafe + TuckShop + Bakery + TeaBar

Scope:
- Cafe orders — ala carte, dine-in + takeaway, family consumer tagging
- TuckShop transactions — barcode, numeric code, return flow
- Bakery orders — scheduled items + pre-order queue
- TeaBar issuance — staff-punched, official hi-tea
- Kitchen dashboard feeds for cafe and bakery
- serviceMenuConfigs fat document reads
- bakerySchedule reads

Starting file: src/cafe/cafeRoutes.js

---

## Locked Decisions

- camelCase throughout — Firestore collections, fields, JS code
- API route paths: kebab-case
- File names: camelCase
- Constants keys: UPPER_SNAKE
- Schema: 28 collections across 6 layers — see Servio_V1_Schema_Reference.docx
- No mobile (React Native) build until web V1 is stable — RECONSIDERED, both in parallel
- Single role per user in V1
- No grade-based role restriction in V1
- Throttle: 5 failed attempts within 60 minutes → isThrottled = true → admin resets manually
- Proxy booking: supervisor/manager/admin exempt from cutoff entirely
- Cancellation cutoff applies to employee self-cancellation only
- Tenant check enforced on proxy booking for multi-tenant readiness
- verifyToken and verifyRole are direct exports — never use { } destructuring
- db.settings() called once only in index.js — never repeat in service files
- Every where+orderBy or multi-field query requires a composite index — check emulator log after first run of any new endpoint

---

## Critical Technical Notes

- No shared firebase.js — each service imports firebase-admin directly
- db.settings({ databaseId: 'servio-dev' }) called once only in index.js
- verifyToken only decodes Firebase Auth token — does NOT set role or tenantId
- verifyRole middleware fetches Firestore users doc and sets: req.userRole, req.tenantId, req.officialEmployeeNumber
- Always use verifyRole for role checks — never check req.user.role directly
- Function name in emulator: asia-south1-api (not us-central1-api)
- Emulator URL: http://127.0.0.1:5001/servio-dev-55d2d/asia-south1/api
- Tokens expire after 1 hour — re-login required for each test session
- verifyToken export: module.exports = verifyToken (direct, no destructuring)
- verifyRole export: module.exports = verifyRole (direct, no destructuring)

---

## Parked / Deferred

- V1.1: cafeOrders, tuckShopTransactions, bakeryOrders
- V1.2: bbqEvents, bbqOrders
- V2: guestHouseBookings, boqAllotments, libraryBooks
- V3: sportsBookings, swimmingConsents, SMS/email/WhatsApp notifications
- V4: Recipe + Inventory + Procurement

---

## Firestore Composite Indexes Created

| Collection | Fields | Purpose |
|---|---|---|
| mealRates | isActive, mealType, menuOptionKey, tenantId, createdAt | Flow 07 rate queries |
| messReservations | tenantId, reservationDate | Flow 11 weekly booking |
| messReservations | issueStatus, reservationStatus, tenantId, reservationDate | Flow 11 monthly billing |
| mealFeedback | tenantId, reservationDate | Flow 11 feedback trends |
| events | tenantId, eventDate | Flow 11 event summary |
| reportingSnapshots | reportType, tenantId, periodStart (desc) | Flow 11 snapshot list |

---

## Test Data in Firestore (servio-dev)

- deploymentConfig: ffl document
- employees: FFL00001, FFL00002, FFL00003
- users: PQHHC0Egnpafsdvo0oZvLOPKMQH3 (super_admin, admin@fatima-group.com)
- users: dM34PAhXItby1QOY9K0S6N8JtL42 (employee, test1@fatima-group.com, FFL00002)
- users: dusMNzDu5faGJQOQEuimJdoNvYL2 (employee, test2@fatima-group.com, FFL00003)
- Firebase Auth: admin@fatima-group.com / 1234@com
- Firebase Auth: test1@fatima-group.com / 1234@com
- Firebase Auth: test2@fatima-group.com / 1234@com
- menuItems: EJvcPLythiJssM1ze9kr, u6Or4EYW89NM1784nPqs
- templates: U7RqdMOuyvPXPEbQ1Bv9 (Summer 2026 Week A)
- cycles: 8pAHziigB5yLHaPNckNz (Summer 2026 — active)
- dailyMenus: ffl_2026-05-23_breakfast, ffl_2026-05-23_lunch, ffl_2026-05-23_dinner
- messReservations: LK5REc9kCXGx8164U9yk (FFL00002, lunch, 2026-05-23, issued)
- events: mBUcM6712HqJgAx9mUjY (Farewell Dinner, official, returned)

---

## Update Log

### 22 May 2026

- Project initialised — web, mobile, backend all running
- constants.js locked to V1 schema — 28 collections, camelCase
- Firebase web app registered — config saved
- Named Firestore database: servio-dev
- Flows 01–05 completed and tested
- Seed scripts: seedCatalogue.js, seedReservationSettings.js

### 23 May 2026

- Flow 06 Part A: Daily Menu Resolver + Self Booking + Issuance
- Flow 06 Part B: Proxy booking + Cancellation
- Flow 07: Rate Entry + rateApplicator
- Flow 08: Feedback
- Flow 09: Notifications
- Flow 10: Events + Attendance
- Flow 11: Reporting Dashboard

#### Flow 11 Detail

**New files:**
- src/reports/reportRoutes.js
- src/reports/reportService.js
- src/reports/snapshotEngine.js
- src/reports/generators/dailyHeadcount.js
- src/reports/generators/weeklyBookingSummary.js
- src/reports/generators/monthlyBilling.js
- src/reports/generators/feedbackTrends.js
- src/reports/generators/eventSummary.js
- src/reports/generators/adminAlerts.js
- src/reports/generators/cafeDailySummary.js (stub — activate in Flow 12)
- src/reports/generators/bbqEventSummary.js (stub — activate in Flow 13)

**Endpoints validated:**
- POST /reports/trigger-snapshot — manual engine trigger, admin only
- GET /reports/daily-headcount?date= — live query
- GET /reports/admin-alerts — live query
- GET /reports/snapshot/:reportType?period= — snapshot read
- GET /reports/snapshots/:reportType — list available periods
- GET /reports/event/:eventId — on-demand event summary

**Scheduled job registered:**
- exports.generateSnapshots — runs nightly at 23:30 PKT

**constants.js updated:**
- REPORT_TYPES expanded with V1 active keys + stubs for V1.1, V1.2, V2, V3, V4
- VEG and NVEG removed from FOOD_TYPE_CODES — not in schema reference doc

**Issues encountered and resolved:**
- reportService.js had trailing space in filename on NAS — renamed with mv
- verifyToken imported with { } destructuring — fixed to direct require
- verifyRole imported with { } destructuring — fixed to direct require
- db.settings() called in snapshotEngine.js — removed, violates locked rule
- admin.firestore.FieldValue.serverTimestamp() used in snapshotEngine.js — replaced with new Date()
- 5 composite indexes required and created during testing