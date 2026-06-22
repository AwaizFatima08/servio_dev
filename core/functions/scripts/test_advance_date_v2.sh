#!/usr/bin/env bash
# ─────────────────────────────────────────
# Field test — anytime advance-date ordering slice
# Run on the NAS against live dev. Computes dates in PKT at runtime.
# Exercises every locked rule + the anytime cancel path + #21 (bookingGroupId/createdByRole).
# ─────────────────────────────────────────
set -u
API="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"

# --- token: Ahmed (employee) ---
EMAIL="test2@fatima-group.com"
read -rsp "Ahmed (test2@fatima-group.com) password: " PW; echo
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"returnSecureToken\":true}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('idToken',''))")
if [ -z "$TOKEN" ]; then echo "TOKEN FETCH FAILED — check password"; exit 1; fi
echo "token ok"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

# --- dates computed in PKT, on this machine, right now ---
read TODAY TOM FAR NOWHHMM NOWMIN <<<"$(node -e '
const now=new Date(); const pkt=new Date(now.getTime()+5*36e5);
const f=(d)=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
const today=f(pkt);
const tom=new Date(`${today}T00:00:00+05:00`); tom.setUTCDate(tom.getUTCDate()+1);
const far=new Date(`${today}T00:00:00+05:00`); far.setUTCDate(far.getUTCDate()+8);
const hh=String(pkt.getUTCHours()).padStart(2,"0"), mm=String(pkt.getUTCMinutes()).padStart(2,"0");
console.log(today, f(tom), f(far), hh+":"+mm, pkt.getUTCHours()*60+pkt.getUTCMinutes());
')"
echo "PKT now: $TODAY $NOWHHMM (min $NOWMIN) | tomorrow=$TOM | far(+8)=$FAR"

# --- grab a real café menu item id ---
ITEM=$(curl -s "${AUTH[@]}" "$API/cafe/menu" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',{}).get('items',[]); print(items[0]['itemId'] if items else '')")
if [ -z "$ITEM" ]; then echo "NO MENU ITEM FOUND — is the café menu seeded?"; exit 1; fi
echo "using menuItemId: $ITEM"
echo

pass=0; fail=0
# expect_status <label> <expected_substring_or_HTTP> <curl-json-body>
run() {
  local label="$1"; local expect="$2"; local body="$3"
  local resp; resp=$(curl -s -w "\n%{http_code}" "${AUTH[@]}" -X POST "$API/cafe/orders" -d "$body")
  local code; code=$(echo "$resp" | tail -1)
  local json; json=$(echo "$resp" | sed '$d')
  if echo "$json$code" | grep -qi "$expect"; then
    echo "PASS  $label  [$code]"
    pass=$((pass+1))
  else
    echo "FAIL  $label  [$code]  expected ~ '$expect'"
    echo "      got: $json"
    fail=$((fail+1))
  fi
}

# helper to compute now+Nh as HH:MM (PKT) for same-day lead tests
hhplus() { node -e "const n=$NOWMIN+$1; const h=Math.floor(n/60)%24,m=n%60; console.log(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'))"; }

PICK_3H=$(hhplus 180)   # now+3h  → valid same-day lead
PICK_1H=$(hhplus 60)    # now+1h  → too short same-day

echo "── ANYTIME same-day rules ──"
# 1 same-day valid (>=2h lead, before 20:00, time <=23:00). Only meaningful if now<20:00 and now+3h<=23:00.
run "sameday valid (+3h)" '"success":true' \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"$PICK_3H\",\"requestedPickupDate\":\"$TODAY\",\"consumerType\":\"self\"}"

# 2 same-day too-short lead
run "sameday short lead (+1h) rejected" "2 hours lead" \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"$PICK_1H\",\"requestedPickupDate\":\"$TODAY\",\"consumerType\":\"self\"}"

echo "── ANYTIME future-date rules ──"
# 3 tomorrow, early time, lead waived (e.g. 09:00 even if <2h from now is irrelevant next day)
run "future-date lead waived (tomorrow 09:00)" '"success":true' \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"09:00\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}"

# 4 future-date after close (23:30) rejected
run "future-date after 23:00 rejected" "23:00" \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"23:30\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}"

# 5 past date rejected
run "past date rejected" "past" \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"2026-06-01\",\"consumerType\":\"self\"}"

# 6 too far (+8) rejected
run "too-far +8 rejected" "7 days" \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"$FAR\",\"consumerType\":\"self\"}"

# 7 bad date format rejected
run "bad date format rejected" "YYYY-MM-DD" \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"22-06-2026\",\"consumerType\":\"self\"}"

# 8 missing date defaults to today (should behave same-day; use +3h to pass lead)
run "missing date defaults today (+3h)" '"success":true' \
  "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"$PICK_3H\",\"consumerType\":\"self\"}"

echo
echo "── CANCEL PATH (future-date order should be cancellable now) ──"
# place a tomorrow order, capture orderId, cancel it
PLACE=$(curl -s "${AUTH[@]}" -X POST "$API/cafe/orders" \
  -d "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"10:00\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}")
OID=$(echo "$PLACE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('orderId',''))")
echo "placed tomorrow order: $OID"
echo "  requestedPickupDate in response: $(echo "$PLACE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('requestedPickupDate','MISSING'))")"
echo "  cancellationWindowExpiresAt:     $(echo "$PLACE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('cancellationWindowExpiresAt','MISSING'))")"
if [ -n "$OID" ]; then
  CANC=$(curl -s -w "\n%{http_code}" "${AUTH[@]}" -X PATCH "$API/cafe/orders/$OID/cancel" \
    -d '{"cancellationReason":"employee_request"}')
  echo "cancel result: $(echo "$CANC" | sed '$d')  [$(echo "$CANC" | tail -1)]"
fi

echo
echo "── #21 listMyOrders: bookingGroupId + createdByRole present? ──"
# place a 2-item batch, then list and inspect
BATCH=$(curl -s "${AUTH[@]}" -X POST "$API/cafe/orders/batch" \
  -d "{\"orderType\":\"anytime_takeaway\",\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"10:00\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\",\"items\":[{\"menuItemId\":\"$ITEM\",\"quantity\":1},{\"menuItemId\":\"$ITEM\",\"quantity\":2}]}")
echo "batch bookingGroupId: $(echo "$BATCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('bookingGroupId','MISSING'))")"
curl -s "${AUTH[@]}" "$API/cafe/orders/mine?days=1" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{}).get('orders',[])
print('orders returned:', len(d))
if d:
    o=d[0]
    print('  has bookingGroupId :', 'bookingGroupId' in o, '->', o.get('bookingGroupId'))
    print('  has createdByRole  :', 'createdByRole'  in o, '->', o.get('createdByRole'))
    print('  has requestedPickupDate:', 'requestedPickupDate' in o, '->', o.get('requestedPickupDate'))
"

echo
echo "RESULT: $pass passed, $fail failed (of 8 validation cases; cancel + #21 are manual-inspect above)"
