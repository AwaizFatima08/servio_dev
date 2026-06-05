# Servio — V1 Mobile App Field Test Report

**Project:** Servio — Club Management Platform
**Client:** FFL Management Club
**Tested By:** Dr. Humayun Shahzad (Project Owner)
**Test Date:** 5 June 2026
**Platform:** Android — Expo React Native (Preview Build)
**Backend:** Firebase Cloud Functions — asia-south1 (Production — servio-dev-55d2d)
**Developed by:** HomiLabs Solutions SMC Pvt Ltd · homilabs.org

---

## 1. Test Overview

This report documents findings from the first structured field test session for the Servio V1 mobile application. Testing was conducted on 5 June 2026 by the project owner using a live preview build connected to the production Firebase backend.

All five user roles available in V1 were tested: Employee, Mess Supervisor, Club Manager, Accounts Supervisor, and Admin. Each role was logged in separately and key screens were navigated and exercised.

Testing was conducted in production-simulation mode. No schema changes, no feature additions. Observations and bug logging only.

### What Was Tested

- Login screen and Terms of Use
- Employee Home screen — events, today's meals, weekly menu preview
- Book Meal — individual booking, dining mode selection, confirmation
- Book Full Week — week-wide booking, failure handling
- My Bookings — upcoming view, cancellation flow, history view
- Event Attendance — popup on home, attendance detail screen
- More tab navigation
- Supervisor Issuance Dashboard (mobile)
- Mess Supervisor, Club Manager, Accounts Supervisor, Admin dashboards

### What Was Not Tested

- Notifications screen — blocked by Bug 2 (More tab broken)
- Profile screen — blocked by Bug 2
- Actual issuance action (Issue / No-show buttons) on supervisor mobile
- Proxy booking and Walk-in flows on supervisor mobile
- Push notifications

---

## 2. Overall Result

The Servio V1 mobile application is functionally operational. Core flows — login, meal booking, cancellation, booking history, event attendance, and role-based dashboards — all work correctly and the user experience is clean and professional.

Two critical bugs were found that must be fixed before live deployment. The remaining bugs are moderate or minor and do not prevent the app from being used, but should be resolved in the first patch build.

| Category | Count | Items |
|---|---|---|
| Critical bugs | 2 | Event popup labels missing, More tab broken |
| Moderate bugs | 2 | Date format, Full Week error messages |
| Minor bugs | 3 | Typo, error message language, dash vs 0 |
| Data quality issues | 1 | Employee name casing in Firestore |
| **Total issues** | **8** | |
| Flows working correctly | 8+ | Login, booking, cancel, history, events, dashboards |

---

## 3. Results by Role

| Role | Test Account | Status | Notes |
|---|---|---|---|
| Employee | FFL00003 — Ahmed Khan | Passed with issues | Bugs 1, 2, 3, 4, 5, 6 found. Core booking, cancellation and history flows working. |
| Mess Supervisor | FFL00004 — Tasawwar Alam | Passed with issues | Issuance dashboard working. Bug 8 (name casing). Issuance action itself not tested. |
| Club Manager | FFL00005 — Muhammad Jahangir | Passed with issues | Dashboard rendering correct. Bug 3 (date format). Bug 7 (dash vs 0). |
| Accounts Supervisor | Naeem (number not captured) | Passed | Summary dashboard correct. Web referral notice appropriate. |
| Admin | FFL00001 — Test | Passed with issues | Dashboard renders correctly. Bug 7 (dash vs 0). Admin name is 'Test' — needs real name before go-live. |

---

## 4. Bug Log

### Bug 1 — Critical
**Screen:** Home screen — Employee role
**Description:** Event popup buttons have no text labels. Two buttons are visible (one green filled, one outlined with red border) but the employee cannot tell which is Yes and which is No.
**Recommended Fix:** Add button labels to the event popup bottom sheet. Buttons should read "Yes, I'll Attend" and "No, I Won't Attend".

---

### Bug 2 — Critical
**Screen:** More tab — All employee roles
**Description:** Tapping the More tab in the bottom navigation bar opens the Event Attendance sheet directly instead of the More options menu. All features behind More — Notifications, Profile, Billing, Help — are completely unreachable from the mobile app.
**Recommended Fix:** Correct the tab navigator screen assignment. The More tab must point to the MoreScreen (menu list), not the EventAttendanceScreen.

---

### Bug 3 — Moderate
**Screen:** Book Meal confirmation message, Manager dashboard
**Description:** Raw ISO date format (2026-06-06) is displayed in the booking confirmation message and in the Manager dashboard date label. Employees see a technical date string instead of a human-readable date.
**Recommended Fix:** Apply the `formatTsDate()` / `formatReservationDate()` utility from `dateUtils.js` to all date display points in the mobile app. The same utility is already applied correctly on the web frontend.

---

### Bug 4 — Moderate
**Screen:** Book Full Week result dialog — Employee role
**Description:** The failure summary message in the Book Full Week flow leaks internal field codes directly to the employee. Example message: "You already have an active booking for combo_1 on 2026-06-06 lunch. Cancel it first if you want to change the quantity." The codes `combo_1`, `combo_2` and the ISO date are all visible.
**Recommended Fix:** Map internal keys to display labels before rendering the error list. Replace `combo_1` → `Combo 1`, `combo_2` → `Combo 2`. Apply date formatting to the ISO date. Simplify the message to: "You already have an active booking for Combo 1 on Sat, 6 Jun. Cancel it first to change."

---

### Bug 5 — Minor
**Screen:** Book Meal bottom sheet — Employee role
**Description:** Typo in the dining mode question label: "Howare you dining?" — two words merged into one.
**Recommended Fix:** Fix the text string: `"Howare you dining?"` → `"How are you dining?"`

---

### Bug 6 — Minor
**Screen:** Book Meal duplicate check error — Employee role
**Description:** When an employee tries to book a combo they have already booked, the error message reads "You already have a booking for this combo slot." The phrase "combo slot" is internal language that employees will not understand.
**Recommended Fix:** Change the message to: "You already have a booking for this meal slot."

---

### Bug 7 — Minor
**Screen:** Manager dashboard, Admin dashboard
**Description:** Meal headcount cards show a dash (—) instead of 0 when the count is zero. This is visually inconsistent and could confuse users into thinking data has not loaded.
**Recommended Fix:** Ensure headcount values default to `0`, not `null` or `undefined`. If data is still loading, show a spinner. Once loaded, always show a numeric value.

---

### Bug 8 — Data Quality
**Screen:** Supervisor Issuance view — Mess Supervisor role
**Description:** The employee name for FFL00100 is stored as "HUMAYUN SHAHZAD" in all caps in the `employees` collection. This displays inconsistently compared to other employees shown in title case (e.g., "Ahmed Khan").
**Recommended Fix:** Update the `fullName` field in the `employees` document for FFL00100 from `"HUMAYUN SHAHZAD"` to `"Humayun Shahzad"`. This is a data fix in Firestore, not a code change.

---

## 5. What Is Working Well

The following areas were tested and confirmed working correctly with no issues found:

- **Login screen** — branding, logo, tagline, footer credits all correct and professional
- **Terms of Use screen** — displays correctly on first login with proper HomiLabs / FFL attribution
- **Home screen** — greeting with name, date, Upcoming Events with Response Required badges, Today's Meals, Weekly Menu preview
- **Book Meal screen** — date picker row, meal type tabs, combo display with names, Book button
- **Book Full Week** — week-wide booking logic, Combo 1 pre-selected by default, dining mode toggle, correct cutoff enforcement (past cutoff meals correctly rejected)
- **Cancellation flow** — reason selection sheet, Keep Booking / Confirm Cancel buttons, success dialog, instant list refresh
- **My Bookings — Upcoming** — correct grouping by date, status badges, Cancel buttons
- **My Bookings — History** — issued status, Rs. amounts, dates all displaying correctly
- **Event Attendance Detail screen** — Self toggle, Spouse toggle, Children counters, Additional Adults counter, Total Attendees counter all working correctly
- **Supervisor Issuance Dashboard (mobile)** — shows correct employees and combos, counts accurate, Breakfast / Lunch / Dinner tabs working
- **Kitchen Dashboard (web)** — meal card counts, issuance progress bar, combo breakdown table working
- **Accounts Supervisor dashboard** — Jun 2026 summary correct, web referral notice appropriate
- **Role-based dashboards** — each role sees appropriate information, Quick Reference web links visible on Admin dashboard
- **Top bar countdown** — "Dinner in 1h 56m" real-time display working correctly on supervisor web view

---

## 6. Additional Observations

### Design Quality
The overall visual design is consistent and professional across all roles and screens. The Servio brand identity — dark green palette, Playfair Display headings, DM Sans body, SS ribbon logo — is rendered correctly throughout. The application looks ready for real users.

### Booking Logic — Dual Combo Per Slot Is By Design
An important design clarification was confirmed during testing: an employee is permitted to book both Combo 1 and Combo 2 for the same meal slot. This is intentional — an employee may be hosting an informal guest, or simply want both options. The system correctly allows this. Both appear as separate rows in the supervisor's issuance dashboard with the employee name and number on each row, which is clear and sufficient for the supervisor to issue correctly.

### Kitchen Dashboard — Internal Codes on Web
The Kitchen Dashboard on web shows `combo_1` and `combo_2` as subtitle text under the combo names in the breakdown table. While not a blocker, this is internal language leaking into a supervisor-facing screen. The subtitle should show "Combo 1" and "Combo 2" in human-readable form. This is a web issue, not mobile, and can be addressed in the next web patch.

### Admin Account Name
The admin account FFL00001 has the display name "Test". This must be updated to the actual admin's real name before live deployment. This is a data update in Firestore, not a code change.

### Node.js Version
The backend is currently running on Node.js 20, which reaches end of active support in October 2026. An upgrade to Node.js 22 is required before that date. This is not a V1 launch blocker but must be tracked and scheduled.

---

## 7. Recommended Next Steps

### Before Live Deployment — Must Fix

- Fix Bug 1: Add button labels to the event popup bottom sheet
- Fix Bug 2: Correct the More tab navigator to point to the More menu screen
- Data fix: Update FFL00001 admin display name from "Test" to the actual admin's name
- Data fix: Correct FFL00100 `fullName` casing in the `employees` collection

### First Patch Build — Should Fix

- Fix Bug 3: Apply date formatting utility to all mobile date display points
- Fix Bug 4: Map `combo_1` / `combo_2` to `Combo 1` / `Combo 2` in Full Week error messages
- Fix Bug 5: Correct typo "Howare you dining?"
- Fix Bug 6: Change "combo slot" to "meal slot" in duplicate booking error message
- Fix Bug 7: Replace dash (—) with 0 in headcount cards on Manager and Admin dashboards
- Web fix: Replace `combo_1` / `combo_2` subtitles in Kitchen Dashboard breakdown table

### After Bug Fixes

- Rebuild APK and distribute to a controlled group of 3–5 real employees
- Test Notifications and Profile screens (currently blocked by Bug 2)
- Test actual issuance action on supervisor mobile (Issue and No-show buttons)
- Test Proxy Booking and Walk-in flows on supervisor mobile

---

*Servio V1 Field Test Report · HomiLabs Solutions SMC Pvt Ltd · homilabs.org*
