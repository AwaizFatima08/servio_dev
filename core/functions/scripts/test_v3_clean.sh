#!/usr/bin/env bash
set -u
API="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"
read -rsp "Ahmed password: " PW; echo
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test2@fatima-group.com\",\"password\":\"$PW\",\"returnSecureToken\":true}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('idToken',''))")
[ -z "$TOKEN" ] && { echo "TOKEN FAIL"; exit 1; }
echo "token ok"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

# CORRECT helper: pktDateStr-corrected, matches production addDaysToDateStr
read TODAY TOM CEIL OVER NOWMIN <<<"$(node -e '
function pktDateStr(d){const p=new Date(d.getTime()+5*36e5);return `${p.getUTCFullYear()}-${String(p.getUTCMonth()+1).padStart(2,"0")}-${String(p.getUTCDate()).padStart(2,"0")}`;}
function addDays(s,n){const d=new Date(`${s}T00:00:00+05:00`);d.setUTCDate(d.getUTCDate()+n);return pktDateStr(d);}
const now=new Date(); const today=pktDateStr(now);
const pkt=new Date(now.getTime()+5*36e5); const nowMin=pkt.getUTCHours()*60+pkt.getUTCMinutes();
console.log(today, addDays(today,1), addDays(today,7), addDays(today,8), nowMin);
')"
echo "today=$TODAY tomorrow=$TOM ceiling+7=$CEIL over+8=$OVER nowMin=$NOWMIN"
ITEM=$(curl -s "${AUTH[@]}" "$API/cafe/menu" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['itemId'])")
echo "item=$ITEM"; echo

hhplus(){ node -e "const n=$NOWMIN+$1;const h=Math.floor(n/60)%24,m=n%60;console.log(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'))"; }
PICK_3H=$(hhplus 180); PICK_1H=$(hhplus 60)
pass=0; fail=0
run(){ local l="$1" e="$2" b="$3" r c j
  r=$(curl -s -w "\n%{http_code}" "${AUTH[@]}" -X POST "$API/cafe/orders" -d "$b")
  c=$(echo "$r"|tail -1); j=$(echo "$r"|sed '$d')
  if echo "$j$c"|grep -qi "$e"; then echo "PASS  $l  [$c]"; pass=$((pass+1))
  else echo "FAIL  $l  [$c] exp~'$e'"; echo "      $j"; fail=$((fail+1)); fi; }

echo "── same-day ──"
run "sameday valid +3h" '"success":true' "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"$PICK_3H\",\"requestedPickupDate\":\"$TODAY\",\"consumerType\":\"self\"}"
run "sameday short lead +1h reject" "2 hours lead" "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"$PICK_1H\",\"requestedPickupDate\":\"$TODAY\",\"consumerType\":\"self\"}"
echo "── future-date ──"
run "tomorrow 09:00 lead waived" '"success":true' "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"09:00\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}"
run "ceiling +7 accepted" '"success":true' "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"$CEIL\",\"consumerType\":\"self\"}"
run "over +8 rejected" "7 days" "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"$OVER\",\"consumerType\":\"self\"}"
run "tomorrow after 23:00 rejected" "23:00" "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"23:30\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}"

echo; echo "── FUTURE-DATE CANCEL (key case) ──"
P=$(curl -s "${AUTH[@]}" -X POST "$API/cafe/orders" -d "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"10:00\",\"requestedPickupDate\":\"$TOM\",\"consumerType\":\"self\"}")
OID=$(echo "$P"|python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('orderId',''))")
echo "placed $OID pickupDate=$(echo "$P"|python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('requestedPickupDate','?'))") cancelWin=$(echo "$P"|python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('cancellationWindowExpiresAt','?'))")"
echo "  (cancelWin should be ${TOM}T05:00:00Z = 10:00 PKT tomorrow, NOT now+1h)"
if [ -n "$OID" ]; then
  CR=$(curl -s -w "\n%{http_code}" "${AUTH[@]}" -X PATCH "$API/cafe/orders/$OID/cancel" -d '{"cancellationReason":"employee_request"}')
  echo "  cancel: $(echo "$CR"|sed '$d') [$(echo "$CR"|tail -1)]"
  echo "$CR"|grep -qi '"success":true' && { echo "  PASS future cancel"; pass=$((pass+1)); } || { echo "  FAIL future cancel"; fail=$((fail+1)); }
else echo "  FAIL no orderId"; fail=$((fail+1)); fi
echo; echo "RESULT: $pass passed, $fail failed"
