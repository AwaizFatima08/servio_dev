#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# test_cafe_slice2.sh — V1.2 Backend Slice 2 (Kitchen Dashboard) tests
# HomiLabs | Servio
#
# Runs 11 HTTP test cases against dev. Tokens are fetched automatically via
# get_token.js — no manual config needed.
#
# Requires:
#   - bash, curl, jq, node
#   - PKT clock between 18:00 and 22:30 (cafe order window — needed to
#     place the test orders this script creates)
#   - Test fixtures already seeded (CAFE_TEST_TEA etc.)
#
# Usage:
#   chmod +x test_cafe_slice2.sh
#   ./test_cafe_slice2.sh
#
# Exit code: 0 if all pass, 1 if any fail.
# ─────────────────────────────────────────────────────────────────────────

BASE_URL="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
ADMIN_EMAIL="test2@fatima-group.com"
ADMIN_PASSWORD="1234@com"
EMPLOYEE_EMAIL="farrukh.imtiaz@fatima-group.com"
EMPLOYEE_PASSWORD="1234@com"
ITEM_TEA="CAFE_TEST_TEA"

echo "Fetching tokens..."
TOKEN_ADMIN=$(node scripts/get_token.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
TOKEN_EMPLOYEE=$(node scripts/get_token.js "$EMPLOYEE_EMAIL" "$EMPLOYEE_PASSWORD")

if [ -z "$TOKEN_ADMIN" ] || [ -z "$TOKEN_EMPLOYEE" ]; then
  echo "FATAL: Failed to fetch one or both tokens. Check get_token.js output above."
  exit 2
fi
echo "Tokens fetched OK."
echo ""

PKT_HHMM=$(TZ='Asia/Karachi' date +%H%M)
PKT_DISPLAY=$(TZ='Asia/Karachi' date '+%H:%M %Z')
echo "Current PKT time: $PKT_DISPLAY (HHMM=$PKT_HHMM)"

if [ "$PKT_HHMM" -lt 1800 ] || [ "$PKT_HHMM" -gt 2230 ]; then
  echo "FATAL: Cafe order window is 18:00–22:30 PKT. Cannot place test orders outside this window."
  echo "       Re-run between 18:00 and 22:30 PKT."
  exit 2
fi
echo "──────────────────────────────────────────────────────────────────────"
echo ""

PASS=0
FAIL=0
FAIL_DETAIL=()
LAST_RESPONSE=""

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
# PREP — place two fresh orders to test against
# ═════════════════════════════════════════════════════════════════════════
echo "Prep: employee places two fresh cafe_hours orders"
run_test "P1" "Prep order A" 201 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_A=$(extract_order_id)

run_test "P2" "Prep order B" 201 POST "/cafe/orders" "{
  \"orderType\": \"cafe_hours\",
  \"menuItemId\": \"$ITEM_TEA\",
  \"quantity\": 1,
  \"diningMode\": \"dine_in\",
  \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_B=$(extract_order_id)

if [ -z "$ORDER_A" ] || [ -z "$ORDER_B" ]; then
  echo "FATAL: Could not create prep orders. Aborting remaining tests."
  exit 1
fi

# ═════════════════════════════════════════════════════════════════════════
# TESTS
# ═════════════════════════════════════════════════════════════════════════

# Test 1: Employee tries kitchen-orders list — role rejection
run_test 1 "Employee GET /cafe/kitchen/orders (role rejection)" 403 GET "/cafe/kitchen/orders" "" "$TOKEN_EMPLOYEE"

# Test 2: Admin GET kitchen orders — both prep orders should appear
echo "Test 2: Admin GET /cafe/kitchen/orders includes both prep orders"
LAST_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" "${BASE_URL}/cafe/kitchen/orders")
HAS_A=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_A" '.data.orders[] | select(.orderId == $id)' | jq -s 'length')
HAS_B=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_B" '.data.orders[] | select(.orderId == $id)' | jq -s 'length')
UNACK=$(echo "$LAST_RESPONSE" | jq -r '.data.unacknowledgedCount // 0')
if [ "$HAS_A" -ge 1 ] && [ "$HAS_B" -ge 1 ] && [ "$UNACK" -ge 2 ]; then
  echo "  PASS (orderA present=$HAS_A, orderB present=$HAS_B, unacknowledgedCount=$UNACK)"
  PASS=$((PASS + 1))
else
  echo "  FAIL — orderA present=$HAS_A, orderB present=$HAS_B, unacknowledgedCount=$UNACK (expected both present, count>=2)"
  echo "  Body: $LAST_RESPONSE"
  FAIL=$((FAIL + 1))
  FAIL_DETAIL+=( "Test 2: kitchen list missing expected orders or wrong count" )
fi
echo ""

# Test 3: Employee tries to accept an order — role rejection
run_test 3 "Employee PATCH accept (role rejection)" 403 PATCH "/cafe/orders/$ORDER_A/accept" "" "$TOKEN_EMPLOYEE"

# Test 4: Admin accepts order A
run_test 4 "Admin accepts order A" 200 PATCH "/cafe/orders/$ORDER_A/accept" "" "$TOKEN_ADMIN"

# Test 5: Admin tries to accept order A again — already accepted
run_test 5 "Admin re-accepts order A (already accepted)" 400 PATCH "/cafe/orders/$ORDER_A/accept" "" "$TOKEN_ADMIN"

# Test 6: Admin cancels order B (admin override, from Slice 1)
run_test 6 "Admin cancels order B" 200 PATCH "/cafe/orders/$ORDER_B/cancel" "{
  \"cancellationReason\": \"data_correction\",
  \"cancellationNote\": \"slice 2 test cleanup\"
}" "$TOKEN_ADMIN"

# Test 7: Admin tries to accept cancelled order B
run_test 7 "Admin accepts cancelled order B (should fail)" 400 PATCH "/cafe/orders/$ORDER_B/accept" "" "$TOKEN_ADMIN"

# Test 8: Admin tries to accept a non-existent order
run_test 8 "Admin accepts non-existent order" 400 PATCH "/cafe/orders/NONEXISTENT_xyz_999/accept" "" "$TOKEN_ADMIN"

# Test 9: Final kitchen list check — A should be accepted, B excluded (cancelled)
echo "Test 9: Final kitchen list — order A accepted, order B excluded (cancelled)"
LAST_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" "${BASE_URL}/cafe/kitchen/orders")
A_STATUS=$(echo "$LAST_RESPONSE" | jq -r --arg id "$ORDER_A" '.data.orders[] | select(.orderId == $id) | .orderStatus')
HAS_B_FINAL=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_B" '.data.orders[] | select(.orderId == $id)' | jq -s 'length')
if [ "$A_STATUS" = "accepted" ] && [ "$HAS_B_FINAL" -eq 0 ]; then
  echo "  PASS (order A status=$A_STATUS, order B present in list=$HAS_B_FINAL)"
  PASS=$((PASS + 1))
else
  echo "  FAIL — order A status=$A_STATUS (expected accepted), order B present=$HAS_B_FINAL (expected 0)"
  echo "  Body: $LAST_RESPONSE"
  FAIL=$((FAIL + 1))
  FAIL_DETAIL+=( "Test 9: final kitchen list state incorrect" )
fi
echo ""

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
