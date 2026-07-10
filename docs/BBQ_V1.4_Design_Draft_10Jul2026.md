# Servio — V1.4 BBQ — Design Reference (LOCKED)

**Status: LOCKED, 10-Jul-2026. All open items resolved — see §9. Do not re-open without a deliberate reason; treat as the schema/screen authority for BBQ build work.**
Date: 10-Jul-2026 (superseded draft version also dated 10-Jul-2026)
Companion reference: `Servio_V1_Schema_Reference.docx` Appendix B (original one-line stubs for `bbqEvents`/`bbqOrders`), café's `orderStatus` enum (from `Servio_Schema_Reference_Live_03Jul2026.docx`), and `messReservations`' override-field pattern.

---

## 0. How to read this document

This is the written record of a design conversation. Every field below traces back to something you actually said, or is something I proposed and you agreed to — nothing here is invented from scratch. Sections 8 and 9 are both fully resolved as of 10-Jul — the whole document is locked.

---

## 1. Scope Summary

**What BBQ night actually is:** A Friday-night social event (weekly long-weekend kickoff), outdoor, live-cooking, ~250 seats, no enforced seating/table numbering. Ordering 19:30–22:30, close-out 23:00. Menu changes weekly, published Thursday, needs Manager-draft + Admin-approval before going live.

**What's explicitly OUT of V1.4:**
- Café's own preorder items sold at BBQ — handled entirely by café's existing anytime-order screen, zero BBQ-side work.
- Feedback, rate entry, and billing — deferred to the combined V1.5 flow (same as mess).
- Any table/seat numbering or capacity enforcement — deliberately left lean; "reserved" is a physical tag on the floor, not a system record of a seat.
- Waiter-facing screens — waiters have no app access at all.

---

## 2. New Collections

### 2.1 `bbqEvents`
**Purpose:** One document per Friday. Fat document (like `serviceMenuConfigs`) — resolved menu + event metadata + the locked kitchen target. Manager drafts, Admin approves and publishes.

Document ID: `{tenantId}_{eventDate}` e.g. `ffl_2026-07-17`

| Field | Type | Notes |
|---|---|---|
| eventDate | string | YYYY-MM-DD (the Friday) |
| tenantId | string | |
| status | string | `draft` \| `pending_review` \| `returned` \| `published` \| `closed` \| `cancelled` — reused verbatim from `events`' official-event vocabulary |
| menu | map | `{ preorderItems[], liveCookItems[], kidsItems[], beverages[], breadsDesserts[] }` — each entry resolved from `menuItems`: `{itemId, itemName, foodTypeCode, foodTypeName, baseUnit, sortOrder}` |
| preorderCutoffAt | timestamp | 17:30 that Friday |
| orderWindowStartAt | timestamp | 19:30 |
| orderWindowEndAt | timestamp | 22:30 |
| closeoutAt | timestamp | 23:00 |
| kitchenTargetLockedAt | timestamp\|null | Set once, by the 17:30 scheduled function. Null before that. |
| kitchenTargetSnapshot | map\|null | `{ itemId: lockedQuantity }` — frozen at 17:30, **never regenerated** (same permanence rule as `dailyMenus`) |
| createdByUid | string | Manager |
| approvedByUid | string\|null | Admin |
| publishedAt | timestamp\|null | |
| returnedByUid / returnComments | string\|null | Admin sends back for revision |
| isActive | boolean | |
| createdAt / updatedAt | timestamp | |

**Important notes:**
1. `menu` is resolved (item names denormalised) — operational screens never query `menuItems` directly, same rule as everywhere else.
2. `kitchenTargetSnapshot` is deliberately a one-time snapshot, not a live figure — see §2.4 for the live-tracking counterpart.

---

### 2.2 `bbqSettings`
**Purpose:** Centralised policy document, one per tenant — same role as `reservationSettings`. Read by the booking engine before every action instead of hardcoding rules into screens.

Document ID: `tenantId` (`"ffl"`)

| Field | Type | Notes |
|---|---|---|
| tenantId | string | |
| preorderCutoffTime | string | `"17:30"` |
| orderWindowStartTime | string | `"19:30"` |
| orderWindowEndTime | string | `"22:30"` |
| closeoutTime | string | `"23:00"` |
| allowManagerOverride | boolean | true — manager-only cancel/edit override after lock |
| requireOverrideReason | boolean | true |
| tableBookingCutoffTime | string | `"17:30"` — same as preorder cutoff |
| createdAt / updatedAt | timestamp | |

---

### 2.3 `bbqOrders`
**Purpose:** Core transaction ledger. One document per order-session. **Split by `orderType`** — an employee may place one `preorder`-type order and, separately, one or more `live`-type orders on the same night; these are never mixed within a single document.

Document ID: Firestore auto-ID

| Field | Type | Notes |
|---|---|---|
| orderId | string | Doc ID also |
| bookingGroupId | string | Groups this order's line items — one order, one card on the dashboard, regardless of item count |
| tenantId | string | |
| eventDate | string | YYYY-MM-DD — links to `bbqEvents` |
| orderType | string | `preorder` \| `live` — governs which lock rule applies |
| bookingSource | string | `self` \| `proxy` \| `official` |
| createdByUid / createdByRole / createdByEmployeeNumber | | |
| consumerType | string | `self` \| `family_member` — reused from café's existing pattern |
| consumerFamilyMemberId | string\|null | Set when a kids' table order is placed via proxy or parent's app |
| consumerMemberName | string\|null | Denormalised |
| employeeNumber | string | Billing account holder — always the employee, even for a kids-table order |
| employeeName | string | Denormalised |
| guestName | string\|null | Official-guest orders only |
| items | array | `[{itemId, itemName, foodTypeCode, baseUnit, quantity, menuGroup}]` — `menuGroup`: `preorder` \| `live_cook` \| `kids` \| `beverage` \| `bread_dessert` (display tag only; `orderType` governs locking, not this field) |
| diningMode | string | `dine_in` \| `takeaway` |
| billingDestination | string | `employee_account` \| `official_account` |
| costCentreCode | string\|null | Official only |
| orderStatus | string | `placed` \| `accepted` \| `prepared` \| `cancelled` — **reused verbatim from café's own enum, no fifth value** (Option B locked 10-Jul — see §8.1 history) |
| acceptedAt / acceptedByUid | | BBQ supervisor |
| preparedAt / preparedByUid | | Marks food left the collection point for waiter pickup. Feeds `bbqLiveItemStatus`'s "delivered" count and the elapsed-time KPI. **Does not trigger a notification in V1.4** — confirmed 10-Jul, notifications deferred to the collective V1.5 flow. |
| isLateRequest | boolean | true only for a preorder order submitted after `bbqSettings.preorderCutoffTime`. Default false. |
| lateRequestApprovalStatus | string\|null | `pending` \| `approved` \| `rejected` — only present when `isLateRequest` is true. `orderStatus` stays at its normal `placed` value throughout the review — nothing in the kitchen flow acts on it until Manager approves and it proceeds into the normal accept/prepare pipeline. |
| cancellationRequestStatus | string\|null | `pending` \| `approved` \| `rejected` — **only present while a cancel-request is under review**; `orderStatus` itself is never touched during this review, so the kitchen's live view stays accurate |
| cancellationRequestedAt / cancellationRequestedByUid | | |
| cancellationDecisionAt / cancellationDecisionByUid / cancellationDecisionReason | | Manager only |
| approvalStatus | string | `pending_approval` \| `approved` \| `rejected` — **billing sign-off only, for official orders**, reused pattern from café/Tea Bar. Order is served regardless of outcome — this only governs whether the cost-centre charge is honored. |
| approvedByUid / approvedAt / rejectedByUid / rejectedAt | | Admin. Initiated by `bbq_supervisor` or `manager` (both floor-present per 8.2) |
| unitRate / amount / rateStatus | | Present but inert — populated in V1.5, per house convention (null fields at creation) |
| isVisible | boolean | Soft delete |
| createdAt / updatedAt | timestamp | |

**Important notes:**
1. Preorder-type orders lock at `bbqSettings.preorderCutoffTime`, regardless of `orderStatus`. Live-type orders lock the instant `orderStatus` becomes `accepted`. Two different lock *mechanisms*, one field.
2. Three separate approval-style fields exist on this document, each governing a different thing: `lateRequestApprovalStatus` (should this late order be honored at all), `cancellationRequestStatus` (should an already-accepted order be cancelled), and `approvalStatus` (should the official-account charge be honored, irrelevant to whether the food gets served). Keeping these three separate, rather than reusing one field for all of them, is deliberate — each answers a genuinely different question and none of them should silently double as another.

---

### 2.4 `bbqTableRequests`
**Purpose:** Lightweight request record for large-group/special-request table bookings. No table/seat entity anywhere in the system — purely a request-and-approval record; the "reserved" tag on the actual table is a physical, off-system action.

Document ID: Firestore auto-ID

| Field | Type | Notes |
|---|---|---|
| requestId | string | Doc ID also |
| tenantId | string | |
| eventDate | string | YYYY-MM-DD |
| requestedByUid / employeeNumber / employeeName | | |
| expectedGuestCount | integer | |
| requestNote | string\|null | Free text — special request details |
| status | string | `pending` \| `approved` \| `returned` \| `confirmed` \| `rejected` \| `cancelled` — mirrors `events`' personal-event flow exactly |
| approvedByUid / approvedAt | | Admin |
| confirmedByUid / confirmedAt | | Manager |
| createdAt / updatedAt | timestamp | |

**Important note:** Flow order is deliberately **Employee → Admin approves → Manager confirms**, matching Events' personal-event flow — this was corrected mid-discussion from an earlier draft that had Manager before Admin.

---

### 2.5 `bbqLiveItemStatus`
**Purpose:** Live, per-item aggregate — "40 ordered, 22 prepared" — for the supervisor's cumulative-count screen. Maintained by a Cloud Function on every `bbqOrders` write, same pattern as `eventAttendanceSummaries`. This is genuinely new infrastructure, not a reused pattern with a new name.

Document ID: `{tenantId}_{eventDate}`

| Field | Type | Notes |
|---|---|---|
| eventDate | string | |
| tenantId | string | |
| itemCounts | map | `{ itemId: {itemName, orderedCount, preparedCount} }` |
| lastAggregatedAt | timestamp | |

**Important note:** This is a *live*, continuously-updating figure — separate and expected to diverge from `bbqEvents.kitchenTargetSnapshot`, which is frozen at 17:30 and never recalculated. Both exist for different purposes: the snapshot tells the kitchen how much to bulk-cook; this live doc tells the supervisor what's actually moving through service.

---

## 3. Screen Map (13 screens, roughly 1.6× Tea Bar's size)

| # | Screen | Role | Notes |
|---|---|---|---|
| 1 | BBQ Order — Preorder tab | Employee | Orderable from menu-publish until 17:30 Fri |
| 2 | BBQ Order — Live tab (live-cook/kids/beverages/breads/desserts combined) | Employee | Orderable 19:30–22:30 |
| 3 | My BBQ Orders (history + cancel/edit/late-request) | Employee | Also where late-preorder and cancel-exception requests get submitted |
| 4 | Proxy Order | Supervisor/Manager | Includes family-member selection for kids' separate orders |
| 5 | Official Order | BBQ Supervisor / Manager | Admin approves billing separately (`approvalStatus`) — resolved 8.2, order always served regardless of approval outcome |
| 6 | Live Kitchen Dashboard — order cards | BBQ Supervisor | accept / prepared actions, per order |
| 7 | Live Kitchen Dashboard — cumulative item counts | BBQ Supervisor | Reads `bbqLiveItemStatus` |
| 8 | Exception Review Queue (cancel-requests + late-preorder-requests) | Manager | New screen — did not exist before this discussion |
| 9 | Table Booking Request | Employee | |
| 10 | Table Booking Approval | Admin | |
| 11 | Table Booking Confirmation | Manager | |
| 12 | Menu Draft | Manager | Builds the week's `bbqEvents.menu` from the `menuItems` catalogue, saves as `draft`/`pending_review` |
| 13 | Menu Approve & Publish | Admin | Separate screen from #12 (locked 10-Jul) — approve/return/publish |

**No-phone / floor-relay scenario (employee can't use their own device):** No new screen needed — this is the existing **Proxy Order screen (#4)**. Confirmed 10-Jul: floor-supervisor tablet access is an administrative decision, and its frontend is deferred to the mobile build phase along with the rest of V1.1–V1.4 mobile — not a V1.4 web concern. For now, this scenario is handled from the fixed terminal only, fed by a paper slip if needed.

**⚠ Flagging plainly:** this is a bigger build than Tea Bar (13 screens vs. 8). Worth knowing that going in, not discovering partway through.

---

## 4. Roles Touched

- `employee` — order (both types), cancel/edit requests, table booking requests
- `bbq_supervisor` — new role, needs adding to `users.role` controlled vocabulary. **Confirmed 10-Jul: one flat role, held by multiple people (typically 4), all with equal rights and interchangeable** — one is usually at the fixed terminal running backend/kitchen coordination, others cover the floor physically, but there is no role-level distinction between them. Accept/prepared actions, cumulative dashboard, official order initiation.
- `manager` — a genuinely separate person from `bbq_supervisor` (confirmed 10-Jul, supervisors report to manager) — override authority (cancel/edit after lock, late-preorder acceptance), exception review queue, table booking confirmation, menu draft, official-order approval alongside supervisor-initiated ones
- `admin` — menu approval/publish, table booking approval, official-order billing approval

**Floor-device access (tablets for supervisors walking table-side) is confirmed as an administrative/procurement decision, and the frontend for it is explicitly deferred to the mobile build phase** (per the existing project convention: "Mobile build for V1.1–V1.4 is bundled at the end of V1 Extension"). Not a V1.4 web-build concern.

---

## 5. Cloud Functions Required (new)

| Function | Trigger | Purpose |
|---|---|---|
| `bbqKitchenTargetLocker` | Scheduled, 17:30 every Friday | Snapshots `bbqLiveItemStatus`'s preorder counts into `bbqEvents.kitchenTargetSnapshot`, locks it |
| `bbqLiveItemAggregator` | On `bbqOrders` write | Updates `bbqLiveItemStatus` — same pattern as `attendanceAggregator` |

**Not built in V1.4:** no `notifications` write anywhere in this backend — confirmed deferred to the collective V1.5 flow (see §7).

---

## 6. Reused vs. New — Transparency Summary

**Reused outright, no changes needed:**
- Group-order-as-one-card kitchen model (café, Tea Bar)
- `orderStatus: placed|accepted|prepared|cancelled` (café)
- `consumerType: self|family_member` (café)
- `cutoffWaived`/`overrideReason`/`overrideByUid` override pattern (mess)
- Events' personal-event three-party approval sequence (table booking)
- `foodTypeCode: BBQ` and `serviceCategories: bbq` — already exist, nothing to add

**Genuinely new:**
- `bbqLiveItemStatus` — the per-item live rollup and its aggregator function
- `bbqKitchenTargetLocker` — the 17:30 scheduled snapshot function
- The Exception Review Queue screen (Manager)
- Order-type split (`preorder`/`live`) as two independently-locked sibling orders — no existing module does this

---

## 7. What's Explicitly Deferred

Feedback, rate entry, billing, **and notifications** for BBQ — all deferred to the collective flow (see §10 for current naming — pending Homi's confirmation on final version numbers). **Confirmed 10-Jul:** no `notifications` document gets written anywhere in the V1.4 BBQ backend. `bbqOrders.preparedAt` still gets recorded (needed for the dashboard and the KPI), it just doesn't fire a notification yet.

---

## 8. Open Items — Need Your Decision Before Build Starts

### 8.1 — RESOLVED (10-Jul) — Option B
Late-preorder requests use `isLateRequest` + `lateRequestApprovalStatus`, not a fifth `orderStatus` value. `orderStatus` keeps its four café-borrowed values everywhere, no exceptions.

### 8.2 — RESOLVED (10-Jul)
Official BBQ orders can be initiated by `bbq_supervisor` or `manager` (both floor-present), approved by Admin via the new `approvalStatus` field. Service is never blocked by this — same as café/Tea Bar, only the cost-centre charge is what's being approved.

### 8.3 — RESOLVED (10-Jul)
Menu Draft (Manager) and Menu Approve & Publish (Admin) are two separate screens (§3, #12–#13).

### 8.4 — RESOLVED (10-Jul)
`walk_in` is not needed for BBQ — confirmed mess-specific (a genuinely unplanned, no-prior-record physical walk-up). BBQ's equivalent scenario (no phone, forgot to order) still involves an identified supervisor booking for an identified employee — that's just `proxy`. `bookingSource` stays `self | proxy | official`, no fourth value.

---

## 9. Version Naming — RESOLVED (10-Jul)

Confirmed: V1.5 stays aligned to its **old** definition (dashboards + analytics + reporting + billing) — the earlier message just meant *adding* the missing pieces to it, not replacing it. Final table:

| Version | Scope |
|---|---|
| V1.3 | Tea Bar only |
| V1.4 | BBQ |
| V1.4b | Tuck Shop |
| V1.4c | Bakery |
| V1.5 | Dashboards + analytics + reporting + billing + rate entry + notification + feedback — collective flow, for **all** flows (mess, café, Tea Bar, BBQ, Tuck Shop, Bakery) |
| V1.6 | Retired — fully absorbed into V1.5, no longer a separate version |

This needs propagating into `V1_Extension_CB.md`'s Build Status table (see next message for that update).

---

## 10. Suggested Next Step

Everything in this document — BBQ design (§8) and version naming (§9) — is now resolved. Next: field-by-field backend build, same discipline as Tea Bar — backend built and tested first, screen by screen after, each verified live before the next opens.
