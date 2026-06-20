#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# test_cafe_slice1.sh — V1.2 Backend Slice 1 endpoint tests
# HomiLabs | Servio
#
# Runs 17 HTTP test cases against dev. Requires:
#   - bash, curl, jq
#   - PKT clock between 18:00 and 22:30 (cafe order window)
#   - Test fixtures already seeded (CAFE_TEST_TEA etc.)
#   - FFL00257 has at least one active, non-deletion-requested family member
#
# Tokens needed:
#   - TOKEN_ADMIN     — FFL00003 (Ahmed Khan, admin)
#   - TOKEN_EMPLOYEE  — FFL00257 (Farrukh Imtiaz, employee)
#
# Usage:
#   1. Fill in TOKEN_ADMIN, TOKEN_EMPLOYEE, FAMILY_MEMBER_ID_FFL00257.
#   2. chmod +x test_cafe_slice1.sh
#   3. ./test_cafe_slice1.sh
#
# Exit code: 0 if all pass, 1 if any fail.
# ─────────────────────────────────────────────────────────────────────────

# ═════════════════════════════════════════════════════════════════════════
# CONFIG — fill these in before running
# ═════════════════════════════════════════════════════════════════════════

# Firebase ID token for FFL00003 (role=admin)
TOKEN_ADMIN="eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlOTA0NmVhZDJlMDUwMDAxMGVkNTA0M2I0ODNkODRiMGM1MmM3YzQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vc2VydmlvLWRldi01NWQyZCIsImF1ZCI6InNlcnZpby1kZXYtNTVkMmQiLCJhdXRoX3RpbWUiOjE3ODE5Mzk0NDUsInVzZXJfaWQiOiJkdXNNTnpEdTVmYUdKUU9RRXVpbUpkb052WUwyIiwic3ViIjoiZHVzTU56RHU1ZmFHSlFPUUV1aW1KZG9OdllMMiIsImlhdCI6MTc4MTkzOTQ0NSwiZXhwIjoxNzgxOTQzMDQ1LCJlbWFpbCI6InRlc3QyQGZhdGltYS1ncm91cC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdDJAZmF0aW1hLWdyb3VwLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.nxFr5QdZUsMdOE3hWCu3OK20FJvdVDVlmRug_58lzCGEV3drLHn7o38nrousmSVTG0XWwCOBoaF_w75KNGwRZ-r0txXHtEvEV0YF0C2EJFxaSwF8cvrVj6vp6NV5aVWax6FHuS3QffCO9o8LA1n_vhZ5a-3QBEes9st1K3bkBLpbio_PEAcHMOr7F9RFoZ8GxobZ7w1_TNYgj2ajOI9PMCMjGbzyJ6KjcrWcEHrinxV5_V4xOPDUwNsTHc4ZhVu1TJPxV3Li6k1VcH-J9SHMFjjC7ZhqF-7EZwpRlJiY8-r7P5EOu2PXAMHdPHekuviBA54IEsOBiHwaYrkv3BNoHA"

# Firebase ID token for FFL00257 (role=employee)
TOKEN_EMPLOYEE="eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlOTA0NmVhZDJlMDUwMDAxMGVkNTA0M2I0ODNkODRiMGM1MmM3YzQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vc2VydmlvLWRldi01NWQyZCIsImF1ZCI6InNlcnZpby1kZXYtNTVkMmQiLCJhdXRoX3RpbWUiOjE3ODE5Mzk0NDYsInVzZXJfaWQiOiI0azFMOXdhanYzYkNCcHdkWjBuVDFtMWtFSDMzIiwic3ViIjoiNGsxTDl3YWp2M2JDQnB3ZFowblQxbTFrRUgzMyIsImlhdCI6MTc4MTkzOTQ0NiwiZXhwIjoxNzgxOTQzMDQ2LCJlbWFpbCI6ImZhcnJ1a2guaW10aWF6QGZhdGltYS1ncm91cC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZmFycnVraC5pbXRpYXpAZmF0aW1hLWdyb3VwLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.hYQL8-e0vchDX8FH-xHtxpReyO4ArS_Gya1-mLexKVj-t2n97ZihXMJoUuW39Nh5rszcTSmhBGc_UDLBHbRxG5bF6t2-UQjsxPg2VKurKCVDmUviJDDGRB8LDZtKNWzE9CiI0LuVE9-7sNTajMulNn5C_hGG6U8KTydRGJUJf0s_Eo1LGHly48CZSXjdZvPJykR_hi_X4XmtzLphEfszNjb6zdkYDcaMTLT_leX2WR0K7VC9TP9s9aztfEbbp1vQPS2mlOixSIXl2vK-ceiREFDu58neNBNbpnQxefr6HdGgZ3G7Ekkp57-Q2YYjF0gsbc8ryDYGWx-LHOMlNwBTbg"

# Family member ID belonging to FFL00257 (active, not pending deletion)
FAMILY_MEMBER_ID_FFL00257="Mf0fPaOhrQ82FD7hPSQn"

# ═════════════════════════════════════════════════════════════════════════
# Fixed values
# ═════════════════════════════════════════════════════════════════════════
BASE_URL="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
ADMIN_EMP="FFL00003"
EMPLOYEE_EMP="FFL00257"
ITEM_TEA="CAFE_TEST_TEA"
ITEM_SANDWICH="CAFE_TEST_SANDWICH"
ITEM_COFFEE="CAFE_TEST_COFFEE"

# ─────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────────────────────────────────
if [ -z "$TOKEN_ADMIN" ] || [ -z "$TOKEN_EMPLOYEE" ] || [ -z "$FAMILY_MEMBER_ID_FFL00257" ]; then
  echo "FATAL: Fill in TOKEN_ADMIN, TOKEN_EMPLOYEE, and FAMILY_MEMBER_ID_FFL00257 in CONFIG block."
  exit 2
fi

PKT_HHMM=$(TZ='Asia/Karachi' date +%H%M)
PKT_DISPLAY=$(TZ='Asia/Karachi' date '+%H:%M %Z')
echo "Current PKT time: $PKT_DISPLAY (HHMM=$PKT_HHMM)"

if [ "$PKT_HHMM" -lt 1800 ] || [ "$PKT_HHMM" -gt 2230 ]; then
  echo "FATAL: Cafe order window is 18:00–22:30 PKT. Cannot run café-window-dependent tests outside this window."
  echo "       Re-run between 18:00 and 22:30 PKT."
  exit 2
fi

PICKUP_PLUS_3H=$(TZ='Asia/Karachi' date -d '+3 hours' +%H:%M)
PICKUP_PLUS_30M=$(TZ='Asia/Karachi' date -d '+30 minutes' +%H:%M)

echo "PICKUP_PLUS_3H = $PICKUP_PLUS_3H   PICKUP_PLUS_30M = $PICKUP_PLUS_30M"
echo "──────────────────────────────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────────────────
# Test infrastructure
# ─────────────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_DETAIL=()
LAST_RESPONSE=""

# Args: num, desc, expected_status, method, path, body, token
run_test() {
  local num="$1" desc="$2" expected="$3" method="$4" path="$5" body="$6" token="$7"

  echo "Test $num: $desc"

  local opts=( -s -w "\n__STATUS__:%{http_code}" -X "$method" -H "Authorization: Bearer $token" )
  if [ -n "$body" ]; then
    opts+=( -H "Content-Type: application/json" -d "$body" )
  fi

  local response
  response=$(curl "${opts[@]}" "${BASE_URL}${path}")
  local status="${response##*__STATUS__:}"
  local content="${response%__STATUS__:*}"

  if [ "$status" = "$expected" ]; then
    echo "  PASS (HTTP $status)"
    PASS=$((PASS + 1))
    LAST_RESPONSE="$content"
  else
    echo "  FAIL — expected $expected, got $status"
    echo "  Body: $content"
    FAIL=$((FAIL + 1))
    FAIL_DETAIL+=( "Test $num: expected $expected, got $status" )
    LAST_RESPONSE="$content"
  fi
  echo ""
}

extract_order_id() {
  echo "$LAST_RESPONSE" | jq -r '.data.orderId // empty'
}

# ═════════════════════════════════════════════════════════════════════════
# TESTS
# ═════════════════════════════════════════════════════════════════════════

# Test 1: Admin self cafe_hours dine_in (verifies any role can order)
run_test 1 "Admin self cafe_hours dine_in" 201 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_ADMIN"
ORDER_1_ID_ADMIN=$(extract_order_id)

# Test 2: Employee self cafe_hours dine_in (primary use case)
run_test 2 "Employee self cafe_hours dine_in" 201 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_SANDWICH\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_2_ID_EMP=$(extract_order_id)

# Test 3: Employee anytime_takeaway 30-min lead (fail)
run_test 3 "Employee anytime_takeaway 30-min lead (lead-time fail)" 400 POST "/cafe/orders" "{
  \"orderType\": \"anytime_takeaway\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"takeaway\",
  \"requestedPickupTime\": \"$PICKUP_PLUS_30M\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"

# Test 4: Employee anytime_takeaway 3-hr lead (pass)
run_test 4 "Employee anytime_takeaway 3-hr lead" 201 POST "/cafe/orders" "{
  \"orderType\": \"anytime_takeaway\",
  \"menuItemId\": \"$ITEM_COFFEE\",
  \"quantity\": 1,
  \"diningMode\": \"takeaway\",
  \"requestedPickupTime\": \"$PICKUP_PLUS_3H\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_4_ID_EMP=$(extract_order_id)

# Test 5: Employee missing menuItemId
run_test 5 "Employee missing menuItemId" 400 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"

# Test 6: Employee invalid menuItemId
run_test 6 "Employee invalid menuItemId" 400 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"NOT_A_REAL_ITEM_xyz\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"

# Test 7: Admin tries to use FFL00257's family member on their own self order
#         — should fail (ownership)
run_test 7 "Admin self order using another employee's family member (ownership fail)" 400 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"family_member\",
  \"consumerFamilyMemberId\": \"$FAMILY_MEMBER_ID_FFL00257\"
}" "$TOKEN_ADMIN"

# Test 8: Employee uses own family member (positive)
run_test 8 "Employee self order with own family member" 201 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"family_member\",
  \"consumerFamilyMemberId\": \"$FAMILY_MEMBER_ID_FFL00257\"
}" "$TOKEN_EMPLOYEE"

# Test 9: Admin proxy for FFL00257 with FFL00257's family member
run_test 9 "Admin proxy for FFL00257, family member consumer" 201 POST "/cafe/orders/proxy" "{
  \"targetEmployeeNumber\": \"$EMPLOYEE_EMP\",
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 2,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"family_member\",
  \"consumerFamilyMemberId\": \"$FAMILY_MEMBER_ID_FFL00257\"
}" "$TOKEN_ADMIN"

# Test 10: Admin walk-in for FFL00257
run_test 10 "Admin walk-in for FFL00257, self consumer" 201 POST "/cafe/orders/walk-in" "{
  \"targetEmployeeNumber\": \"$EMPLOYEE_EMP\",
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_SANDWICH\",
  \"quantity\": 1,
  \"diningMode\": \"outdoor_seating\",
  \"requestedPickupTime\": \"$PICKUP_PLUS_3H\",
  \"consumerType\": \"self\"
}" "$TOKEN_ADMIN"

# Test 11: Employee tries to call proxy endpoint — should be rejected by role middleware
run_test 11 "Employee tries proxy endpoint (role rejection)" 403 POST "/cafe/orders/proxy" "{
  \"targetEmployeeNumber\": \"$ADMIN_EMP\",
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"

# Test 12: GET /orders/mine as employee — should have at least 3 own orders (tests 2, 4, 8)
echo "Test 12: GET /orders/mine as employee returns FFL00257's own orders"
LAST_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_EMPLOYEE" "${BASE_URL}/cafe/orders/mine")
COUNT=$(echo "$LAST_RESPONSE" | jq -r '.data.count // 0')
if [ "$COUNT" -ge 3 ]; then
  echo "  PASS (count=$COUNT, expected >= 3)"
  PASS=$((PASS + 1))
else
  echo "  FAIL — count=$COUNT, expected >= 3"
  echo "  Body: $LAST_RESPONSE"
  FAIL=$((FAIL + 1))
  FAIL_DETAIL+=( "Test 12: count=$COUNT, expected >= 3" )
fi
echo ""

# Test 13: Employee tries to cancel own cafe_hours order — no-cancel rule
run_test 13 "Employee cancel own cafe_hours order (no-cancel rule)" 400 PATCH "/cafe/orders/$ORDER_2_ID_EMP/cancel" "{
  \"cancellationReason\": \"employee_request\"
}" "$TOKEN_EMPLOYEE"

# Test 14: Employee cancels own anytime_takeaway within window
run_test 14 "Employee cancel own anytime_takeaway within window" 200 PATCH "/cafe/orders/$ORDER_4_ID_EMP/cancel" "{
  \"cancellationReason\": \"employee_request\",
  \"cancellationNote\": \"test cancellation\"
}" "$TOKEN_EMPLOYEE"

# Test 15: Try to cancel already-cancelled order
run_test 15 "Cancel already-cancelled order" 400 PATCH "/cafe/orders/$ORDER_4_ID_EMP/cancel" "{
  \"cancellationReason\": \"employee_request\"
}" "$TOKEN_EMPLOYEE"

# Test 16: Admin cancels own cafe_hours order (admin override)
run_test 16 "Admin cancel own cafe_hours order (override)" 200 PATCH "/cafe/orders/$ORDER_1_ID_ADMIN/cancel" "{
  \"cancellationReason\": \"data_correction\",
  \"cancellationNote\": \"admin override test\"
}" "$TOKEN_ADMIN"

# Test 17: Employee tries to cancel admin's order — ownership fail
#         (Need an admin order that is still 'placed'. ORDER_1_ID_ADMIN was just
#         cancelled in test 16, so this test must use a fresh admin order.
#         Place one inline here, then try to cancel as employee.)
echo "Test 17 prep: admin places a fresh order to be cancelled by employee"
PREP_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN_ADMIN" -H "Content-Type: application/json" \
  -d "{
    \"orderType\": \"cafe_hours\",
    \"menuItemId\": \"$ITEM_TEA\",
    \"quantity\": 1,
    \"diningMode\": \"dine_in\",
    \"consumerType\": \"self\"
  }" \
  "${BASE_URL}/cafe/orders")
ORDER_PREP_ID=$(echo "$PREP_RESPONSE" | jq -r '.data.orderId // empty')

if [ -z "$ORDER_PREP_ID" ]; then
  echo "  PREP FAIL — could not create admin order for test 17."
  echo "  Body: $PREP_RESPONSE"
  FAIL=$((FAIL + 1))
  FAIL_DETAIL+=( "Test 17 prep failed — could not create admin order" )
else
  echo "  Prep order created: $ORDER_PREP_ID"
  echo ""
  run_test 17 "Employee tries to cancel admin's order (ownership fail)" 400 PATCH "/cafe/orders/$ORDER_PREP_ID/cancel" "{
    \"cancellationReason\": \"employee_request\"
  }" "$TOKEN_EMPLOYEE"
fi

# ═════════════════════════════════════════════════════════════════════════
# Summary
# ═════════════════════════════════════════════════════════════════════════
echo "──────────────────────────────────────────────────────────────────────"
echo "Summary: PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  for d in "${FAIL_DETAIL[@]}"; do echo "  - $d"; done
  exit 1
fi
exit 0