#!/usr/bin/env bash
# Targeted re-test of the 7-day ceiling using maxDate+1 (guaranteed over the line).
set -u
API="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"
read -rsp "Ahmed password: " PW; echo
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test2@fatima-group.com\",\"password\":\"$PW\",\"returnSecureToken\":true}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('idToken',''))")
[ -z "$TOKEN" ] && { echo "token fail"; exit 1; }
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

# dates: ceiling = today+7 (should PASS), over = today+8 computed as ceiling+1 (should FAIL)
read CEIL OVER <<<"$(node -e '
const now=new Date(); const pkt=new Date(now.getTime()+5*36e5);
const f=(d)=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
const today=f(pkt);
const ceil=new Date(`${today}T00:00:00+05:00`); ceil.setUTCDate(ceil.getUTCDate()+7);
const over=new Date(`${today}T00:00:00+05:00`); over.setUTCDate(over.getUTCDate()+8);
console.log(f(ceil), f(over));
')"
ITEM=$(curl -s "${AUTH[@]}" "$API/cafe/menu" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['itemId'])")
echo "ceiling(today+7)=$CEIL (expect PASS) | over(today+8)=$OVER (expect REJECT) | item=$ITEM"

echo "-- ceiling (today+7), should be ACCEPTED --"
curl -s -w " [%{http_code}]\n" "${AUTH[@]}" -X POST "$API/cafe/orders" \
  -d "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"$CEIL\",\"consumerType\":\"self\"}" \
  | python3 -c "import sys; line=sys.stdin.read(); import json; 
body=line.rsplit(' [',1)[0]; code=line.rsplit('[',1)[1]
d=json.loads(body); print('  success=',d.get('success'),'pickupDate=',d.get('data',{}).get('requestedPickupDate'),' ['+code.strip())"

echo "-- over (today+8), should be REJECTED with '7 days' --"
curl -s -w " [%{http_code}]\n" "${AUTH[@]}" -X POST "$API/cafe/orders" \
  -d "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"$ITEM\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"12:00\",\"requestedPickupDate\":\"$OVER\",\"consumerType\":\"self\"}"
