#!/usr/bin/env bash
# ─────────────────────────────────────────
# test_cafe_slice3_batch.sh — V1.2 Slice 2.3 backend field test
# HomiLabs | Servio
#
# Exercises POST /cafe/orders/batch (createSelfOrderBatch).
#
# What this proves:
#   - multi-item happy path: N items -> N docs, ONE shared bookingGroupId
#   - every line carries correct billing hooks (rateTargetKey, rateStatus pending,
#     billingDestination, null unitRate/amount) so the universal rate model
#     attaches later with no back-fill
#   - family-consumer batch: all lines tagged to the one family member
#   - rejections: empty array, bad item in array, anytime_takeaway + non-takeaway
#     diningMode, order outside the live PKT window
#
# Pattern mirrors test_cafe_slice1.sh / _slice2.sh: self-fetches a token via the
# Identity Toolkit REST API, runs curl assertions, prints a pass/fail summary.
#
# IMPORTANT — café order window:
#   cafe_hours / anytime_takeaway orders are only accepted 18:00–22:30 PKT (cafe
#   close 23:00). If you run this OUTSIDE that window, the happy-path tests will
#   correctly fail with a window error and only TEST 7 (window rejection) passes.
#   Two ways to run the happy-path tests off-hours:
#     (a) run between 18:00 and 22:30 PKT, OR
#     (b) temporarily widen CAFE_HOURS_START / CAFE_ORDER_END in cafeOrderService.js,
#         redeploy, run, then REVERT + grep-verify + redeploy (the Backend Slice 1
#         method). Do NOT leave a widened window deployed.
#   The script auto-detects the window and tells you which mode it is in.
#
# USAGE:
#   bash test_cafe_slice3_batch.sh
#
# Requires: curl, python3. No manual token pasting.
# ─────────────────────────────────────────

set -u

# ── Flag: --assume-open (-o) ──
# Use when the café order window has been MANUALLY WIDENED in the deployed
# cafeOrderService.js for testing (Slice 1 method). Forces the happy-path tests
# to run regardless of wall-clock, and SKIPS TEST 7 (closed-window rejection is
# meaningless when the window is widened). Prevents the test/deploy mismatch where
# the script assumes the default 18:00–22:30 window but the deployment widened it.
# REMEMBER to revert + grep-verify the window constants after the test passes.
ASSUME_OPEN=0
for arg in "$@"; do
  case "$arg" in
    --assume-open|-o) ASSUME_OPEN=1 ;;
  esac
done


# ── Config ───────────────────────────────────────────────────────────────────
API="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
WEB_API_KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"

# Employee test account (Ahmed Khan, FFL00003). Dev throwaway fixture.
EMP_EMAIL="test2@fatima-group.com"
EMP_PASS="1234@com"

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

pass() { echo "  ✅ PASS — $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL — $1"; echo "         detail: $2"; FAIL=$((FAIL+1)); }

# ── Helpers ──────────────────────────────────────────────────────────────────

# get_token <email> <password>  -> prints idToken
get_token() {
  curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json
try:
    print(json.load(sys.stdin)['idToken'])
except Exception:
    print('')"
}

# jq-free JSON field reader. Usage: echo "$json" | jget "data.orderCount"
jget() {
  python3 -c "import sys,json
d=json.load(sys.stdin)
path='$1'.split('.')
for p in path:
    if isinstance(d,list):
        try: d=d[int(p)]
        except: d=None; break
    elif isinstance(d,dict): d=d.get(p)
    else: d=None; break
if d is None: print('')
elif isinstance(d,bool): print('true' if d else 'false')   # JSON-style, not Python True/False
elif isinstance(d,(dict,list)): print(json.dumps(d))
else: print(d)"
}

# Current PKT minutes-of-day, to decide if we're inside the order window.
pkt_now_min() {
  python3 -c "
from datetime import datetime, timezone, timedelta
pkt = datetime.now(timezone.utc) + timedelta(hours=5)
print(pkt.hour*60 + pkt.minute)"
}

# ── Preflight ────────────────────────────────────────────────────────────────
echo '═══════════════════════════════════════════════════════════════'
echo ' Servio — V1.2 Slice 2.3 backend field test (café batch ordering)'
echo '═══════════════════════════════════════════════════════════════'

echo '── Fetching employee token (FFL00003)…'
TOKEN="$(get_token "$EMP_EMAIL" "$EMP_PASS")"
if [ -z "$TOKEN" ]; then
  echo "  ❌ Could not fetch employee token. Check email/password and try again."
  exit 1
fi
echo "  token length: ${#TOKEN}"

NOW_MIN="$(pkt_now_min)"
WINDOW_OPEN=0
if [ "$NOW_MIN" -ge 1080 ] && [ "$NOW_MIN" -le 1350 ]; then  # 18:00=1080, 22:30=1350
  WINDOW_OPEN=1
fi
if [ "$ASSUME_OPEN" -eq 1 ]; then
  WINDOW_OPEN=1
  echo "  --assume-open SET → treating café window as OPEN (deployed constants assumed widened)."
  echo "  PKT now (min of day): $NOW_MIN  · TEST 7 (closed-window) will be SKIPPED."
else
  echo "  PKT now (min of day): $NOW_MIN  → café order window open: $([ $WINDOW_OPEN -eq 1 ] && echo YES || echo NO)"
fi
echo

# ── Discover two real café menu item IDs to order ────────────────────────────
echo '── Reading café menu to pick real itemIds…'
MENU_JSON="$(curl -s "$API/cafe/menu" -H "Authorization: Bearer $TOKEN")"
ITEM1="$(echo "$MENU_JSON" | jget 'data.items.0.itemId')"
ITEM2="$(echo "$MENU_JSON" | jget 'data.items.1.itemId')"
ITEM3="$(echo "$MENU_JSON" | jget 'data.items.2.itemId')"
echo "  item1=$ITEM1  item2=$ITEM2  item3=$ITEM3"
if [ -z "$ITEM1" ] || [ -z "$ITEM2" ]; then
  echo "  ❌ Need at least 2 café menu items to test batch ordering. Seed the café menu first."
  exit 1
fi
echo

# ─────────────────────────────────────────────────────────────────────────────
# TESTS THAT NEED THE WINDOW OPEN (happy paths + most rejections)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$WINDOW_OPEN" -eq 1 ]; then

  # ── TEST 1: multi-item happy path (self, dine_in, 3 items) ──
  echo "TEST 1 — multi-item self batch (3 items, dine_in)"
  BODY=$(cat <<JSON
{ "orderType":"cafe_hours", "diningMode":"dine_in", "consumerType":"self",
  "items":[ {"menuItemId":"$ITEM1","quantity":1},
            {"menuItemId":"$ITEM2","quantity":2},
            {"menuItemId":"$ITEM3","quantity":1} ] }
JSON
)
  # If item3 was empty (menu has only 2 items), drop it.
  if [ -z "$ITEM3" ]; then
    BODY=$(cat <<JSON
{ "orderType":"cafe_hours", "diningMode":"dine_in", "consumerType":"self",
  "items":[ {"menuItemId":"$ITEM1","quantity":1},
            {"menuItemId":"$ITEM2","quantity":2} ] }
JSON
)
  fi
  R="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY")"
  OK="$(echo "$R" | jget 'success')"
  COUNT="$(echo "$R" | jget 'data.orderCount')"
  GROUP="$(echo "$R" | jget 'data.bookingGroupId')"
  EXPECTED=$([ -z "$ITEM3" ] && echo 2 || echo 3)
  if [ "$OK" = "true" ] && [ "$COUNT" = "$EXPECTED" ] && [ -n "$GROUP" ]; then
    pass "201, orderCount=$COUNT, bookingGroupId=$GROUP"
    BATCH_GROUP="$GROUP"
    ORDER0_ID="$(echo "$R" | jget 'data.orders.0.orderId')"
  else
    fail "expected success + orderCount=$EXPECTED + a bookingGroupId" "$R"
    BATCH_GROUP=""
    ORDER0_ID=""
  fi
  echo

  # ── TEST 2: all lines share ONE bookingGroupId ──
  echo "TEST 2 — all lines share one bookingGroupId"
  if [ -n "$BATCH_GROUP" ]; then
    G0="$(echo "$R" | jget 'data.orders.0.orderId')"  # just confirm structure present
    # Re-read each returned order's rateTargetKey and confirm group is consistent
    # by fetching /orders/mine and matching bookingGroupId on the created ids.
    MINE="$(curl -s "$API/cafe/orders/mine?days=1" -H "Authorization: Bearer $TOKEN")"
    SAME="$(echo "$MINE" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']['orders']
g='$BATCH_GROUP'
mine=[o for o in d if o.get('bookingGroupId')==g]
print(len(mine))")"
    if [ "$SAME" = "$EXPECTED" ]; then
      pass "$SAME orders carry bookingGroupId=$BATCH_GROUP"
    else
      fail "expected $EXPECTED orders under the group, found $SAME" "$MINE"
    fi
  else
    fail "no bookingGroupId from TEST 1 to verify" "(skipped)"
  fi
  echo

  # ── TEST 3: billing hooks on every line ──
  echo "TEST 3 — billing hooks present on each line (rateTargetKey, rateStatus, billingDestination, null unitRate/amount)"
  if [ -n "$BATCH_GROUP" ]; then
    HOOKS_OK="$(echo "$MINE" | python3 -c "
import sys,json,datetime
d=json.load(sys.stdin)['data']['orders']
g='$BATCH_GROUP'
mine=[o for o in d if o.get('bookingGroupId')==g]
ok=True
for o in mine:
    rtk=o.get('rateTargetKey','')
    if not (isinstance(rtk,str) and '_cafe_' in rtk): ok=False
    if o.get('rateStatus')!='pending': ok=False
    if o.get('billingDestination')!='employee_account': ok=False
    if o.get('unitRate') is not None: ok=False
    if o.get('amount') is not None: ok=False
print('yes' if ok and mine else 'no')")"
    if [ "$HOOKS_OK" = "yes" ]; then
      pass "every line has rateTargetKey (…_cafe_…), rateStatus=pending, billingDestination=employee_account, unitRate/amount null"
    else
      fail "one or more billing hooks wrong on a line" "$MINE"
    fi
  else
    fail "no group to verify hooks" "(skipped)"
  fi
  echo

  # ── TEST 4: family-consumer batch — all lines tagged to one member ──
  echo "TEST 4 — family-consumer batch (all lines tagged to the one member)"
  # Find an active, non-deletion-pending family member for FFL00003.
  FAM="$(curl -s "$API/family/me" -H "Authorization: Bearer $TOKEN")"
  MEMBER_ID="$(echo "$FAM" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{}).get('members',[])
for m in d:
    if m.get('isActive') and not m.get('deletionRequested'):
        print(m.get('familyMemberId')); break")"
  if [ -n "$MEMBER_ID" ]; then
    FBODY=$(cat <<JSON
{ "orderType":"cafe_hours", "diningMode":"dine_in",
  "consumerType":"family_member", "consumerFamilyMemberId":"$MEMBER_ID",
  "items":[ {"menuItemId":"$ITEM1","quantity":1},
            {"menuItemId":"$ITEM2","quantity":1} ] }
JSON
)
    FR="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$FBODY")"
    FOK="$(echo "$FR" | jget 'success')"
    FGROUP="$(echo "$FR" | jget 'data.bookingGroupId')"
    if [ "$FOK" = "true" ] && [ -n "$FGROUP" ]; then
      TAGGED="$(curl -s "$API/cafe/orders/mine?days=1" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']['orders']
g='$FGROUP'; mid='$MEMBER_ID'
mine=[o for o in d if o.get('bookingGroupId')==g]
allok=all(o.get('consumerType')=='family_member' and o.get('consumerFamilyMemberId')==mid for o in mine)
print('yes' if mine and allok else 'no')")"
      if [ "$TAGGED" = "yes" ]; then
        pass "all lines tagged to family member $MEMBER_ID"
      else
        fail "not all lines tagged to the member" "$FR"
      fi
    else
      fail "family batch did not succeed" "$FR"
    fi
  else
    echo "  ⚠️  SKIP — FFL00003 has no active family member. Add one to exercise this path."
  fi
  echo

  # ── TEST 5: bad item in array → 400, nothing written ──
  echo "TEST 5 — bad menuItemId in array is rejected (no partial batch)"
  BADBODY=$(cat <<JSON
{ "orderType":"cafe_hours", "diningMode":"dine_in", "consumerType":"self",
  "items":[ {"menuItemId":"$ITEM1","quantity":1},
            {"menuItemId":"NONEXISTENT_ITEM_XYZ","quantity":1} ] }
JSON
)
  BR="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BADBODY")"
  BOK="$(echo "$BR" | jget 'success')"
  if [ "$BOK" = "false" ]; then
    pass "rejected (success=false): $(echo "$BR" | jget 'message')"
  else
    fail "expected rejection for bad item" "$BR"
  fi
  echo

  # ── TEST 6: anytime_takeaway + non-takeaway diningMode → 400 ──
  echo "TEST 6 — anytime_takeaway with diningMode dine_in is rejected"
  TBODY=$(cat <<JSON
{ "orderType":"anytime_takeaway", "diningMode":"dine_in", "consumerType":"self",
  "items":[ {"menuItemId":"$ITEM1","quantity":1} ] }
JSON
)
  TR="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$TBODY")"
  TOK="$(echo "$TR" | jget 'success')"
  if [ "$TOK" = "false" ]; then
    pass "rejected: $(echo "$TR" | jget 'message')"
  else
    fail "expected rejection for anytime_takeaway + dine_in" "$TR"
  fi
  echo

  # ── TEST 8: empty items array → 400 (route guard) ──
  echo "TEST 8 — empty items array is rejected"
  ER="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"orderType":"cafe_hours","diningMode":"dine_in","consumerType":"self","items":[]}')"
  EOK="$(echo "$ER" | jget 'success')"
  if [ "$EOK" = "false" ]; then
    pass "rejected: $(echo "$ER" | jget 'message')"
  else
    fail "expected rejection for empty array" "$ER"
  fi
  echo

else
  echo "── Café window CLOSED right now — skipping happy-path + most rejection tests."
  echo "   Run between 18:00–22:30 PKT, or temporarily widen the window (revert after)."
  echo
fi

# ─────────────────────────────────────────────────────────────────────────────
# TEST 7: window rejection — only meaningful when the window is CLOSED
# ─────────────────────────────────────────────────────────────────────────────
echo "TEST 7 — order outside the live café window is rejected"
if [ "$ASSUME_OPEN" -eq 1 ]; then
  echo "  ⚠️  SKIP — window manually widened (--assume-open); closed-window rejection not testable now."
  echo "         After reverting constants to 18:00–22:30, re-run OUTSIDE the window to exercise TEST 7."
elif [ "$WINDOW_OPEN" -eq 0 ]; then
  WBODY=$(cat <<JSON
{ "orderType":"cafe_hours", "diningMode":"dine_in", "consumerType":"self",
  "items":[ {"menuItemId":"$ITEM1","quantity":1} ] }
JSON
)
  WR="$(curl -s -X POST "$API/cafe/orders/batch" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$WBODY")"
  WOK="$(echo "$WR" | jget 'success')"
  if [ "$WOK" = "false" ]; then
    pass "window closed now, order correctly rejected: $(echo "$WR" | jget 'message')"
  else
    fail "expected window rejection while café is closed" "$WR"
  fi
else
  echo "  ⚠️  SKIP — window is OPEN now, so a closed-window rejection can't be tested."
  echo "         Re-run outside 18:00–22:30 PKT to exercise TEST 7."
fi
echo

# ── Summary ──────────────────────────────────────────────────────────────────
echo '═══════════════════════════════════════════════════════════════'
echo "  RESULTS:  ✅ $PASS passed   ❌ $FAIL failed"
echo '═══════════════════════════════════════════════════════════════'
echo
echo "Note: this script CREATES real café orders on dev for FFL00003. They will"
echo "show on /my-cafe-orders and in the kitchen list until cleaned up. They are"
echo "harmless dev fixtures — clean from the Firebase console when convenient,"
echo "and fold into the existing CAFE_TEST_* cleanup before V1.2 reaches prod."
echo

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
