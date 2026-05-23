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

**Phase:** Project Initialised — Ready for Flow 01
**Last Commit:** ba89963
**Date:** 22 May 2026

---

## Completed

- Firebase config relocated to project root
- React web app initialised (Vite) — smoke tested
- Expo React Native app initialised — smoke tested
- Backend (Firebase Functions/Express) — smoke tested, health check confirmed
- constants.js locked — 28 collections, camelCase, aligned to Servio_V1_Schema_Reference.docx
- Schema reference document: docs/Servio_V1_Schema_Reference.docx

---

## Next Session — Flow 01: Identity Layer

Build order:
1. deploymentConfig read at app startup
2. Employee lookup and validation (cnicLast4 + dateOfBirth)
3. Registration request creation (registrationRequests collection)
4. Admin approval flow
5. users document creation on approval
6. Login + token verification (verifyToken middleware already built)
7. Role-based routing

Starting file: core/functions/src/auth/authRoutes.js (currently placeholder ping only)

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

---

## Parked / Deferred

- V1.1: cafeOrders, tuckShopTransactions, bakeryOrders
- V1.2: bbqEvents, bbqOrders
- V2: guestHouseBookings, boqAllotments, libraryBooks
- V3: sportsBookings, swimmingConsents, SMS/email/WhatsApp notifications
- V4: Recipe + Inventory + Procurement

## 22 May 2026

### Completed
- Project initialised — web, mobile, backend all running
- constants.js locked to V1 schema — 28 collections, camelCase
- Firebase web app registered — config saved
- Named Firestore database: servio-dev
- Flow 01: register, approve, profile — all tested
- Flow 02: employee master — add, list, get, status — all tested  
- Flow 03: menu catalogue — foodTypes seeded, mealTypes seeded, menuItems CRUD — all tested
- Flow 04: templates and cycles — create, activate, duplicate protection — all tested
- Flow 05: reservation settings — seeded, get, update — all tested
- Seed scripts: seedCatalogue.js, seedReservationSettings.js

### Test Data in Firestore (servio-dev)
- deploymentConfig: ffl document
- employees: FFL00001, FFL00002, FFL00003
- users: PQHHC0Egnpafsdvo0oZvLOPKMQH3 (super_admin, admin@fatima-group.com)
- Firebase Auth: admin@fatima-group.com / 1234@com
- menuItems: EJvcPLythiJssM1ze9kr, u6Or4EYW89NM1784nPqs
- templates: U7RqdMOuyvPXPEbQ1Bv9 (Summer 2026 Week A)
- cycles: 8pAHziigB5yLHaPNckNz (Summer 2026 — active)

### Next Session — Flow 06
Mess Reservations + Issuance — most complex flow
- booking logic, cutoff enforcement
- self/guest/proxy/official/special meal booking
- issuance flow
- status management

### Last Commit
548b7e3

## 23 May 2026

### Completed
- Flow 06 Part A: Daily Menu Resolver + Self Booking + Issuance — all tested
- dailyMenuResolver.js — resolves dailyMenus from active cycle + template at 23:55 nightly
- Manual resolver trigger — POST /mess/resolve-daily-menus (admin/super_admin only)
- Daily menu fetch — GET /mess/daily-menu/:date/:mealType
- Self booking — POST /mess/reservations (cutoff, duplicate, past date, menu validation all working)
- Issuance list — GET /mess/reservations/issuance-list?date=&mealType=
- Issue reservation — PATCH /mess/reservations/:id/issue
- No-show — PATCH /mess/reservations/:id/no-show

### New Files
- src/mess/dailyMenuResolver.js
- src/mess/messReservationService.js
- src/mess/messRoutes.js

### Test Data Added
- users: dM34PAhXItby1QOY9K0S6N8JtL42 (employee, test1@fatima-group.com, FFL00002)
- users: dusMNzDu5faGJQOQEuimJdoNvYL2 (employee, test2@fatima-group.com, FFL00003)
- Firebase Auth: test1@fatima-group.com / 1234@com
- Firebase Auth: test2@fatima-group.com / 1234@com
- dailyMenus: ffl_2026-05-23_breakfast, ffl_2026-05-23_lunch, ffl_2026-05-23_dinner
- messReservations: LK5REc9kCXGx8164U9yk (FFL00002, lunch, 2026-05-23, issued)

### Critical Technical Notes (Learned Today)
- No firebase.js shared file exists — each service imports firebase-admin directly
- db.settings({ databaseId: 'servio-dev' }) must be called only ONCE across entire app — already called in index.js or first loaded service. Never repeat in new files.
- verifyToken only decodes Firebase Auth token — does NOT set role or tenantId
- verifyRole middleware fetches Firestore users doc and sets: req.userRole, req.tenantId, req.officialEmployeeNumber
- Always use verifyRole for role checks — never check req.user.role directly
- Function name in emulator: asia-south1-api (not us-central1-api)
- Emulator URL: http://127.0.0.1:5001/servio-dev-55d2d/asia-south1/api
- Tokens expire after 1 hour — re-login required for each test session


### Flow 06 Part B — Completed 23 May 2026
- Proxy booking — POST /mess/reservations/proxy (supervisor/manager/admin, no cutoff)
- Cancellation — PATCH /mess/reservations/:id/cancel (employee own, supervisor any)
- Double cancel rejection working
- Issued reservation cannot be cancelled
- Employee cannot cancel another employee's reservation

### Locked Decisions
- Proxy booking: supervisor/manager/admin exempt from cutoff entirely
- Cancellation cutoff applies to employee self-cancellation only
- Tenant check enforced on proxy booking for multi-tenant readiness

### Flow 07 — Completed 23 May 2026
- Rate entry — POST /rates
- Pending rate list — GET /rates/pending?date=
- Rates by date — GET /rates/:date
- rateApplicator built inline — batch updates messReservations via rateTargetKey
- Revision flow working — old rate marked isActive:false, new rate created
- Composite Firestore index created for mealRates (isActive, mealType, menuOptionKey, tenantId, createdAt)

### Flow 08 — Completed 23 May 2026
- Feedback submission — POST /feedback
- Feedback by reservation — GET /feedback/reservation/:reservationId
- Feedback summary — GET /feedback/summary?date=&mealType=
- Duplicate area rejection working
- 24hr window check implemented
- Summary aggregation by feedbackArea with averages

### Next Session — Flow 09: Notifications
- In-app notifications only (V1)
- Triggers: booking confirmed, booking cancelled, meal issued
- POST /notifications — admin creates notification
- GET /notifications/my — employee fetches own unread notifications
- PATCH /notifications/:id/read — mark as read
- GET /notifications/admin — admin views all notifications
- Starting file: src/notifications/notificationService.js (folder already exists)