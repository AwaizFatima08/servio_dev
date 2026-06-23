#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# test_cafe_slice3.sh — V1.2 Web Slice 3 backend (Kitchen pickup-date) tests
# HomiLabs | Servio
#
# Proves the kitchen board now keys off requestedPickupDate (pickup day),
# NOT createdAt (placement day). Uses anytime_takeaway orders ONLY — the only
# path where pickup-date can differ from creation-date, and so the only path
# the Slice 3 fix changes. Runs at ANY hour (subject to 23:00 pickup ceiling).
#
# Accounts (verified 23-Jun): ADMIN = FFL00100 (humayun.shahzad@, uid
# zYGgVXjQc6Pf1Pg6lnnGqjufWZr1); EMPLOYEE = FFL00003. Kitchen endpoint needs an
# admin/supervisor role; the employee account is for PLACING orders only.
#
# Requires: bash, curl, jq, node; CAFE_TEST_TEA seeded; run from core/functions/.
# Usage:  chmod +x scripts/test_cafe_slice3.sh && ./scripts/test_cafe_slice3.sh
# Exit:   0 all pass, 1 any fail.
# ─────────────────────────────────────────────────────────────────────────

BASE_URL="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
ADMIN_EMAIL="humayun.shahzad@fatima-group.com"     # FFL00100 — admin
ADMIN_PASSWORD="1234@com"
EMPLOYEE_EMAIL="farrukh.imtiaz@fatima-group.com"   # FFL00003 — employee
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

TODAY_PKT=$(TZ='Asia/Karachi' date '+%Y-%m-%d')
TOMORROW_PKT=$(TZ='Asia/Karachi' date -d 'tomorrow' '+%Y-%m-%d')
PKT_DISPLAY=$(TZ='Asia/Karachi' date '+%Y-%m-%d %H:%M %Z')

# Same-day anytime_takeaway needs >= 2h lead time. A=now+3h, C=now+2h (C sooner).
PICKUP_A=$(TZ='Asia/Karachi' date -d '+3 hours' '+%H:%M')
PICKUP_C=$(TZ='Asia/Karachi' date -d '+2 hours' '+%H:%M')

echo "PKT now: $PKT_DISPLAY"
echo "today=$TODAY_PKT  tomorrow=$TOMORROW_PKT"
echo "pickup A (today, now+3h)=$PICKUP_A   pickup C (today, now+2h, sooner)=$PICKUP_C"
echo "──────────────────────────────────────────────────────────────────────"
echo ""

PASS=0; FAIL=0; FAIL_DETAIL=(); LAST_RESPONSE=""

run_test() {
  local num="$1" desc="$2" expected="$3" method="$4" path="$5" body="$6" token="$7"
  echo "Test $num: $desc"
  local opts=( -s -w "\n__STATUS__:%{http_code}" -X "$method" -H "Authorization: Bearer $token" )
  if [ -n "$body" ]; then opts+=( -H "Content-Type: application/json" -d "$body" ); fi
  local response; response=$(curl "${opts[@]}" "${BASE_URL}${path}")
  local status="${response##*__STATUS__:}"; local content="${response%__STATUS__:*}"
  if [ "$status" = "$expected" ]; then
    echo "  PASS (HTTP $status)"; PASS=$((PASS + 1)); LAST_RESPONSE="$content"
  else
    echo "  FAIL — expected $expected, got $status"; echo "  Body: $content"
    FAIL=$((FAIL + 1)); FAIL_DETAIL+=( "Test $num: expected $expected, got $status" ); LAST_RESPONSE="$content"
  fi
  echo ""
}
extract_order_id() { echo "$LAST_RESPONSE" | jq -r '.data.orderId // empty'; }

# ── PREP: A today(now+3h), B tomorrow, C today(now+2h, sooner) — placed by employee ──
echo "Prep: employee places three anytime_takeaway orders (A today, B tomorrow, C today-sooner)"

run_test "P-A" "Prep A — anytime takeaway, pickup TODAY ($PICKUP_A)" 201 POST "/cafe/orders" "{
  \"orderType\": \"anytime_takeaway\", \"menuItemId\": \"$ITEM_TEA\", \"quantity\": 1,
  \"diningMode\": \"takeaway\", \"requestedPickupDate\": \"$TODAY_PKT\",
  \"requestedPickupTime\": \"$PICKUP_A\", \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_A=$(extract_order_id)

run_test "P-B" "Prep B — anytime takeaway, pickup TOMORROW" 201 POST "/cafe/orders" "{
  \"orderType\": \"anytime_takeaway\", \"menuItemId\": \"$ITEM_TEA\", \"quantity\": 1,
  \"diningMode\": \"takeaway\", \"requestedPickupDate\": \"$TOMORROW_PKT\",
  \"requestedPickupTime\": \"$PICKUP_A\", \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_B=$(extract_order_id)

run_test "P-C" "Prep C — anytime takeaway, pickup TODAY sooner ($PICKUP_C)" 201 POST "/cafe/orders" "{
  \"orderType\": \"anytime_takeaway\", \"menuItemId\": \"$ITEM_TEA\", \"quantity\": 1,
  \"diningMode\": \"takeaway\", \"requestedPickupDate\": \"$TODAY_PKT\",
  \"requestedPickupTime\": \"$PICKUP_C\", \"consumerType\": \"self\"
}" "$TOKEN_EMPLOYEE"
ORDER_C=$(extract_order_id)

if [ -z "$ORDER_A" ] || [ -z "$ORDER_B" ] || [ -z "$ORDER_C" ]; then
  echo "FATAL: Could not create all prep orders (A=$ORDER_A B=$ORDER_B C=$ORDER_C)."
  echo "       If A/C failed on lead-time/ceiling, re-run earlier in the day."
  for OID in "$ORDER_A" "$ORDER_B" "$ORDER_C"; do
    [ -n "$OID" ] && curl -s -X PATCH -H "Authorization: Bearer $TOKEN_EMPLOYEE" -H "Content-Type: application/json" \
      -d '{"cancellationReason":"data_correction","cancellationNote":"slice3 prep-abort cleanup"}' \
      "${BASE_URL}/cafe/orders/${OID}/cancel" > /dev/null
  done
  exit 1
fi
echo "Prep orders: A=$ORDER_A (today)  B=$ORDER_B (tomorrow)  C=$ORDER_C (today, sooner)"
echo ""

# ── Test 1 CORE: A present, B absent, date=today ──
echo "Test 1 [CORE]: Admin GET /cafe/kitchen/orders — A present, B absent, date=today"
LAST_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" "${BASE_URL}/cafe/kitchen/orders")
BOARD_DATE=$(echo "$LAST_RESPONSE" | jq -r '.data.date // empty')
HAS_A=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_A" '[.data.orders[]? | select(.orderId == $id)] | length')
HAS_B=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_B" '[.data.orders[]? | select(.orderId == $id)] | length')
if [ "$HAS_A" = "1" ] && [ "$HAS_B" = "0" ] && [ "$BOARD_DATE" = "$TODAY_PKT" ]; then
  echo "  PASS (A present=$HAS_A, B present=$HAS_B, board date=$BOARD_DATE)"; PASS=$((PASS + 1))
else
  echo "  FAIL — A present=$HAS_A (want 1), B present=$HAS_B (want 0), board date=$BOARD_DATE (want $TODAY_PKT)"
  echo "  Body: $LAST_RESPONSE"; FAIL=$((FAIL + 1)); FAIL_DETAIL+=( "Test 1 CORE: pickup-date filter incorrect" )
fi
echo ""

# ── Test 2 SORT: C above A ──
echo "Test 2 [SORT]: C (sooner) appears above A (later) on the board"
POS_A=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_A" '[.data.orders[]?.orderId] | index($id)')
POS_C=$(echo "$LAST_RESPONSE" | jq --arg id "$ORDER_C" '[.data.orders[]?.orderId] | index($id)')
if [ -n "$POS_A" ] && [ -n "$POS_C" ] && [ "$POS_C" != "null" ] && [ "$POS_A" != "null" ] && [ "$POS_C" -lt "$POS_A" ]; then
  echo "  PASS (C at index $POS_C, A at index $POS_A — sooner pickup is higher)"; PASS=$((PASS + 1))
else
  echo "  FAIL — C index=$POS_C, A index=$POS_A (expected C < A)"; echo "  Body: $LAST_RESPONSE"
  FAIL=$((FAIL + 1)); FAIL_DETAIL+=( "Test 2 SORT: ordering incorrect" )
fi
echo ""

# ── Test 3 DISPLAY: pickup time carried ──
echo "Test 3 [DISPLAY]: order A carries requestedPickupTime=$PICKUP_A on the board"
A_PICKUP=$(echo "$LAST_RESPONSE" | jq -r --arg id "$ORDER_A" '.data.orders[]? | select(.orderId == $id) | .requestedPickupTime // empty')
if [ "$A_PICKUP" = "$PICKUP_A" ]; then
  echo "  PASS (A requestedPickupTime=$A_PICKUP)"; PASS=$((PASS + 1))
else
  echo "  FAIL — A requestedPickupTime=$A_PICKUP (expected $PICKUP_A)"
  FAIL=$((FAIL + 1)); FAIL_DETAIL+=( "Test 3 DISPLAY: pickup time missing" )
fi
echo ""

# ── Cleanup: cancel as EMPLOYEE (owner) ──
echo "Cleanup: cancelling test orders A, B, C (as employee/owner)"
for OID in "$ORDER_A" "$ORDER_B" "$ORDER_C"; do
  RESP=$(curl -s -X PATCH -H "Authorization: Bearer $TOKEN_EMPLOYEE" -H "Content-Type: application/json" \
    -d '{"cancellationReason":"data_correction","cancellationNote":"slice 3 test cleanup"}' \
    "${BASE_URL}/cafe/orders/${OID}/cancel")
  OK=$(echo "$RESP" | jq -r '.success // false')
  echo "  $OID → cancelled: $OK"
done
echo ""

echo "──────────────────────────────────────────────────────────────────────"
echo "Summary: PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo ""; echo "Failures:"; for d in "${FAIL_DETAIL[@]}"; do echo "  - $d"; done; exit 1
fi
exit 0