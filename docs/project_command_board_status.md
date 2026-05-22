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
