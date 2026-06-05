# Servio V1 — Web App Field Test Report

**Date:** 5 June 2026
**Platform:** Web App
**Tested by:** Dr. Humayun Shahzad
**Status:** CLOSED — Ready for correction

---

## Bugs

| # | Area | Description |
|---|------|-------------|
| Bug 1 | Employee Master | Edit panel missing DOB field — cannot update DOB for any employee |
| Bug 2 | Weekly Booking | Redundant Dine In/Takeaway toggle — appears both globally and per meal |
| Bug 3 | Employee Home | Event notification banner missing despite published event and delivered notification |
| Bug 4 | Notifications | "Invalid Date" timestamp on every notification across all roles system-wide |
| Bug 5 | Proxy Booking | Employee search returns no results — supervisor cannot book on behalf of employee |
| Bug 6 | Walk-in Booking | Employee search returns no results — walk-in for employee cannot be completed |
| Bug 7 | Event Creation | Note template titles all showing as "Guests" in admin event creation form |
| Bug 8 | Billing Dashboard | Accounts Supervisor getting "Access denied" on Employee Statement tab |
| Bug 9 | Reports | "Snapshot generated at Invalid Date" on Weekly Bookings screen |
| Bug 10 | Reports | Live Today tab not fetching data — shows 0 regardless of date |
| Bug 11 | Employee Home | "Book your first meal" prompt showing despite active bookings existing today |
| Bug 12 | Feedback | Pending tab showing 0 despite issued meals within feedback window |

---

## Feature / Design Requests

| # | Area | Description |
|---|------|-------------|
| Feature A | App Settings | Add booking cutoff as editable field — currently hardcoded |
| Feature B | Templates & Cycles | Add edit option for active cycle — currently only Close button available |

---

## Pending Discussions

| # | Topic |
|---|-------|
| Discussion 1 | Official Guest Walk-in Flow — sponsoring employee fields missing — already on V1 gap fix roadmap |
| Discussion 2 | Notification Generation Matrix — full review needed of which action triggers which notification for which role |

---

## Admin Actions Needed

| # | Action |
|---|--------|
| Action 1 | FFL00006 Qasim Ejaz — role showing as Employee, needs correction |
| Action 2 | FFL00001 — check and clear pendingDesignation if set unintentionally |

---

## Confirmed Working

| Area | Notes |
|------|-------|
| Employee home screen layout | Greeting, date, tenant tag, stats cards all correct |
| Weekly menu display | This week's menu expanding and showing correctly |
| Single day booking | Full flow working end to end |
| Weekly booking | Partial success screen, failed reasons, confirmed list all correct |
| Booking cutoff enforcement | Correct error shown when cutoff passed |
| My Bookings — Active | Showing correctly with status, mode, rate pending |
| My Bookings — History | Showing issued and cancelled meals correctly |
| My Bill | Itemised list with pending and applied rate states both working |
| Cancel booking | Reason dropdown, optional note, confirmation dialog all working |
| Cancellation cutoff message | "Contact supervisor to cancel" showing correctly |
| My Profile | Contact info, HR info, password change all present |
| Events list | All published events visible to employee |
| Event detail | Date, time, venue, notes, custom notice all displaying correctly |
| Event attendance response | Attending/Not Attending, household counts, submission working |
| Event response cutoff lock | Response locked after cutoff correctly |
| Event returned status | Return note visible on admin side correctly |
| Contact Us | Manager name, phone, support email, support phone all correct |
| Notifications delivery | Meal Booked and event notifications being delivered correctly |
| Issuance Dashboard | Pending reservations, Issue and No-show actions working |
| Kitchen Dashboard | All 3 meals, counts, issuance progress, cutoff badge working |
| Walk-in Guest flow | Guest name entry and walk-in record working |
| Billing Dashboard — Monthly Summary | Total meals, total amount, breakdown by meal type correct |
| Rate Entry | Accounts Supervisor rate entry working correctly |
| Rate applied on employee bill | Rs. amounts showing with Applied status correctly |
| User Management | Active users list, role display, suspend action working |
| Employee Master | 342 employees loading, detail panel, Edit/Deactivate working |
| App Settings | All values loading, edit available |
| Menu Management | 27 items loading with food type, unit, services, status |
| Templates & Cycles | Active cycle, template list, edit template all working |
| Reports — Weekly Bookings | Correct numbers loading |
| Reports — Feedback Trends | Loading correctly |
| Reports — Admin Alerts | Loading correctly |
| Admin notifications | Meal Rates Entered notifications generating with full detail |
| Manager interface | Menu, Templates, Events, Reports all working |

---

*Report prepared at end of Web App Field Test Batch 2 — 5 June 2026*
*Mobile App review to follow in next session*
*Bug corrections to proceed one at a time after mobile review is complete*
