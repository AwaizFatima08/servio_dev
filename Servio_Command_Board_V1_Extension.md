
## Update — 29-Jun-2026 (Slice 7 official café meals — DESIGN-LOCKED, not yet built)

### Reframed: backend-first, multi-item (NOT web-only)
The 27-Jun single-item backend (a9f4e79) is superseded for normal use. Decided:
an order is an order — item count is irrelevant. Official orders use items[] N≥1,
same model as proxy. So Slice 7 reopens backend before web.

### LOCKED DESIGN

**Backend (build first, curl-prove, commit):**
1. NEW `createOfficialOrderBatch` — COPIED from createProxyOrderBatch (additive
   "1a", zero risk to proxy). Drops all family/consumer params (official is
   always consumerType=self). Account holder = sponsoringEmployeeNumber
   (required; resolved via _getEmployee — active + same-tenant). Passes official
   fields to _buildOrderDoc, which needs ZERO change (already has defaulted
   params from 27-Jun): subjectType=OFFICIAL_MEAL, billingDestination=
   OFFICIAL_ACCOUNT, costCentreCode (free-text note), sponsoringEmployeeNumber,
   sponsoringEmployeeName, officialGuestName; approvalStatus auto-sets
   pending_approval; bookingSource=OFFICIAL. One shared bookingGroupId, atomic
   batch. Returns { bookingGroupId, orderCount, orders:[...] }.
2. NEW group-approval fns: approveOfficialOrderGroup + rejectOfficialOrderGroup
   (mirror acceptOrderGroup). WHOLE-ORDER approval keyed on bookingGroupId —
   batch-flip every doc pending_approval→approved|rejected. Guards VERIFY all
   docs are official_meal && pending_approval (don't assume — kitchen-group
   precedent).
3. listOfficialPending stays FLAT (existing index, no query rewrite). Group in
   the WEB (kitchen in-memory grouping pattern).
4. Routes (additive, specific-before-parameterised):
   - POST  /cafe/orders/official/batch            (cafe_supervisor/manager/admin)
   - PATCH /cafe/orders/group/:bookingGroupId/approve-official  (admin)
   - PATCH /cafe/orders/group/:bookingGroupId/reject-official   (admin)
   Single-item createOfficialCafeMeal + /orders/official + per-doc approve/reject
   (a9f4e79) KEPT, marked dead → retire in cleanup slice (kitchen-singles
   precedent).
5. Index: pending list unchanged → likely no new index. VERIFY on disk before
   deploy.

**Web (after backend committed):**
- Supervisor page `/cafe-official` — copied CafeProxyOrderPage skeleton
  (search → ordering → success). NO consumer dropdown (official=self). The
  SEARCHED employee IS the sponsor (structural — "billed to their official
  account"). + cost-centre free-text ("as communicated", optional) +
  officialGuestName free-text ("guest/occasion", optional descriptive).
  Calls createOfficialBatchOrder.
- Admin page `/cafe-official-pending` — NEW admin sidebar entry "Café Approvals"
  (distinct from mess "Guest Approvals"). Pending official orders grouped
  in-memory one-card-per-bookingGroupId; whole-order Approve / Reject (reject
  opens note field). Pending-only this slice — approved/rejected history PARKED
  (would need new backend).
- Services (per-screen convention): cafeOfficialService.js
  (createOfficialBatchOrder) + cafeOfficialApprovalService.js
  (listOfficialPending + approve + reject group).
- Wiring: App.jsx +2 imports +2 routes (RE-GREP App.jsx after edit — 27-Jun
  restore-rollback lesson). Sidebar +2 entries.

**Model note:** approval is BILLING-ONLY, parallel to the kitchen (Option A).
The meal flows placed→accepted→prepared on the board like any order regardless
of approval; reject → charge disposition is accounts-supervisor manual ERP call.
NO "issue" step on the official page. Official orders inherit the whole-order
kitchen board + cancel walls for free (one bookingGroupId = one card).

### NEXT SESSION = BUILD
Backend first: read createProxyOrderBatch + _buildOrderDoc on disk → write
additive → node --check → grep-verify → firebase use (dev) → deploy functions →
curl-prove (multi-item write N=2 + N=1 + missing-sponsor 400 + employee 403 +
pending-list + group-approve flips both + group-reject + note + double-approve
guard + regression: normal order still self/employee_account/null) → commit.
Then web: build pages+services → npm run build:dev (NEVER bare) → deploy hosting
→ field-test in-window (18:00–22:30) → commit.
