#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test_slice4_prepared.sh — Café Slice 4 (completion flow) field test
# HomiLabs | Servio | dev only
#
# WHAT THIS TESTS (the locked Slice 4 behaviour):
#   T1  accept happy path        placed   -> accepted        (200)
#   T2  prepare happy path       accepted -> prepared        (200)
#   T3  prepared leaves board    prepared not in GET /kitchen/orders
#   T4  reject double-prepare    prepared -> prepared        (400)
#   T5  reject skip              placed   -> prepared        (400, "must be accepted")
#   T6  reject prepare-cancelled cancelled-> prepared        (400)
#   T7  role boundary            employee calling /prepared  (403)
#   T8  isOverrun flag           accepted >threshold => true (see OVERRUN section)
#
# DISCIPLINE THIS FOLLOWS:
#   - Reuses the project token-fetch approach (Identity Toolkit REST + web API key).
#   - Two identities: an operational role (to accept/prepare) and an employee
#     (to place orders + prove the 403 boundary). Admin cannot exercise the
#     employee-rejection path, so we need a real employee token (Slice 3 lesson).
#   - Does NOT re-implement any date logic. The backend owns pickup-date/PKT.
#   - Creates its own orders; never mutates pre-existing data.
#
# ── YOU MUST FILL THESE IN BEFORE RUNNING ──────────────────────────────────────
# (left as placeholders on purpose — do not commit real secrets)
API_KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"          # dev web API key (public client key)
BASE_URL="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"

# An OPERATIONAL café identity (cafe_supervisor / cafe_waiter / manager / admin).
# Admin works for every positive test. Memory: humayun.shahzad@... / FFL00100 / admin.
OP_EMAIL="humayun.shahzad@fatima-group.com"
OP_PASS="1234@com"

# An EMPLOYEE identity (role 'employee') — needed for T7 (403) and to place orders
# as a normal user. Memory: test2@... maps to FFL00003 Ahmed Khan, role employee.
# (Do NOT assume test2 is admin — that mismapping cost a debug cycle before.)
EMP_EMAIL="test2@fatima-group.com"
EMP_PASS="1234@com"

# A café menu itemId that exists in serviceMenuConfigs/cafe on dev.
# Grep the cafe menu doc or hit GET /cafe/menu to pick a real one.
MENU_ITEM_ID="yaoXMs4GR9fiOEBU8rcJ"
# ───────────────────────────────────────────────────────────────────────────────

set -u
PASS=0; FAIL=0
note() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

# --- token fetch (Identity Toolkit REST) ---------------------------------------
get_token() {
  local email="$1" pass="$2"
  curl -s "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${pass}\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('idToken',''))"
}

# --- helpers -------------------------------------------------------------------
# place a same-day anytime_takeaway order as the employee; echo orderId.
# pickup time is computed by asking the SERVER nothing — we just send a time a
# few hours out and let the backend validate. If the café same-day window has
# closed (after 20:00 PKT) this will fail; run the test before 18:00 PKT ideally,
# or switch orderType to cafe_hours during café hours. We print the raw body so
# a window rejection is visible rather than mysterious.
place_order() {
  local token="$1"
  # NOTE: requestedPickupTime must satisfy same-day rules (>=2h lead, <=23:00).
  # Adjust if your run time makes this invalid; the backend is the authority.
  curl -s -X POST "${BASE_URL}/cafe/orders" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    -d "{\"orderType\":\"anytime_takeaway\",\"menuItemId\":\"${MENU_ITEM_ID}\",\"quantity\":1,\"diningMode\":\"takeaway\",\"requestedPickupTime\":\"22:55\",\"consumerType\":\"self\"}"
}

# extract a json field via python (no jq dependency assumed)
jget() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }

http_code() { # $1=method $2=path $3=token  -> prints status code only
  curl -s -o /dev/null -w '%{http_code}' -X "$1" "${BASE_URL}$2" \
    -H "Authorization: Bearer $3"
}

# ── TOKENS ─────────────────────────────────────────────────────────────────────
note "Fetching tokens…"
OP_TOKEN="$(get_token "$OP_EMAIL" "$OP_PASS")"
EMP_TOKEN="$(get_token "$EMP_EMAIL" "$EMP_PASS")"
[ -n "$OP_TOKEN" ]  && ok "operational token fetched"  || { bad "operational token EMPTY — check creds/API_KEY"; exit 1; }
[ -n "$EMP_TOKEN" ] && ok "employee token fetched"     || { bad "employee token EMPTY — check creds/API_KEY"; exit 1; }

# ── T1: accept happy path ───────────────────────────────────────────────────────
note "T1/T2/T3 — place → accept → prepare → confirm it leaves the board"
RAW="$(place_order "$EMP_TOKEN")"
OID="$(echo "$RAW" | jget "['data']['orderId']")"
if [ -n "$OID" ]; then ok "placed order $OID"; else bad "could not place order. raw: $RAW"; fi

if [ -n "${OID:-}" ]; then
  C="$(http_code PATCH "/cafe/orders/${OID}/accept" "$OP_TOKEN")"
  [ "$C" = "200" ] && ok "T1 accept → 200" || bad "T1 accept → $C (expected 200)"

  # ── T2: prepare happy path ──
  C="$(http_code PATCH "/cafe/orders/${OID}/prepared" "$OP_TOKEN")"
  [ "$C" = "200" ] && ok "T2 prepare → 200" || bad "T2 prepare → $C (expected 200)"

  # ── T3: prepared order no longer on the kitchen board ──
  BOARD="$(curl -s "${BASE_URL}/cafe/kitchen/orders" -H "Authorization: Bearer ${OP_TOKEN}")"
  if echo "$BOARD" | grep -q "$OID"; then
    bad "T3 prepared order still on board (should have left placed+accepted set)"
  else
    ok "T3 prepared order absent from board"
  fi

  # ── T4: double-prepare rejected ──
  C="$(http_code PATCH "/cafe/orders/${OID}/prepared" "$OP_TOKEN")"
  [ "$C" = "400" ] && ok "T4 double-prepare → 400" || bad "T4 double-prepare → $C (expected 400)"
fi

# ── T5: skip placed→prepared rejected ──────────────────────────────────────────
note "T5 — cannot skip accept (placed → prepared must be rejected)"
RAW="$(place_order "$EMP_TOKEN")"
OID2="$(echo "$RAW" | jget "['data']['orderId']")"
if [ -n "$OID2" ]; then
  BODY="$(curl -s -X PATCH "${BASE_URL}/cafe/orders/${OID2}/prepared" -H "Authorization: Bearer ${OP_TOKEN}")"
  C="$(echo "$BODY" | jget "['success']")"
  if echo "$BODY" | grep -qi "must be accepted"; then
    ok "T5 skip rejected with correct message"
  else
    bad "T5 expected 'must be accepted' rejection. body: $BODY"
  fi
else
  bad "T5 setup: could not place order. raw: $RAW"
fi

# ── T6: prepare a cancelled order rejected ─────────────────────────────────────
note "T6 — cannot prepare a cancelled order"
RAW="$(place_order "$EMP_TOKEN")"
OID3="$(echo "$RAW" | jget "['data']['orderId']")"
if [ -n "$OID3" ]; then
  # cancel as the employee (anytime_takeaway is cancellable within the window)
  curl -s -X PATCH "${BASE_URL}/cafe/orders/${OID3}/cancel" \
    -H "Authorization: Bearer ${EMP_TOKEN}" -H 'Content-Type: application/json' \
    -d '{"cancellationReason":"employee_request"}' >/dev/null
  BODY="$(curl -s -X PATCH "${BASE_URL}/cafe/orders/${OID3}/prepared" -H "Authorization: Bearer ${OP_TOKEN}")"
  if echo "$BODY" | grep -qi "cancelled"; then
    ok "T6 prepare-cancelled rejected"
  else
    bad "T6 expected cancelled rejection. body: $BODY"
  fi
else
  bad "T6 setup: could not place order. raw: $RAW"
fi

# ── T7: role boundary — employee cannot call /prepared ─────────────────────────
note "T7 — employee calling /prepared must be 403"
RAW="$(place_order "$EMP_TOKEN")"
OID4="$(echo "$RAW" | jget "['data']['orderId']")"
if [ -n "$OID4" ]; then
  # accept it first (as op) so the order is in a preparable state — proves the
  # 403 is about ROLE, not about order state.
  http_code PATCH "/cafe/orders/${OID4}/accept" "$OP_TOKEN" >/dev/null
  C="$(http_code PATCH "/cafe/orders/${OID4}/prepared" "$EMP_TOKEN")"
  [ "$C" = "403" ] && ok "T7 employee /prepared → 403" || bad "T7 employee /prepared → $C (expected 403)"
  # clean up: mark it prepared as op so it leaves the board
  http_code PATCH "/cafe/orders/${OID4}/prepared" "$OP_TOKEN" >/dev/null
else
  bad "T7 setup: could not place order. raw: $RAW"
fi

# ── T8: isOverrun flag ─────────────────────────────────────────────────────────
# This one is time-dependent. Two honest options — pick ONE:
#
#   OPTION A (no code change, just wait):
#     1. Place an order, accept it, note the orderId.
#     2. Wait 16 minutes.
#     3. GET /cafe/kitchen/orders and confirm that order shows "isOverrun": true.
#
#   OPTION B (temporary threshold drop — faster, but follows your time-gated
#   test discipline: shrink, test, REVERT, grep-verify, redeploy):
#     1. In cafeKitchenService.js set CAFE_OVERRUN_MINUTES = 0 (everything
#        accepted is instantly overrun) OR a small value.
#     2. firebase deploy --only functions
#     3. Place + accept an order, then GET the board; confirm isOverrun true for
#        accepted and false for any still-placed order.
#     4. REVERT to 15, grep-verify on disk (grep -n CAFE_OVERRUN_MINUTES …),
#        redeploy. Do NOT leave 0 deployed.
#
# Below is a read-only helper for OPTION A step 3 — point it at your orderId:
overrun_check() {
  local oid="$1"
  curl -s "${BASE_URL}/cafe/kitchen/orders" -H "Authorization: Bearer ${OP_TOKEN}" \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
for o in d.get('data',{}).get('orders',[]):
    if o.get('orderId')=='$oid':
        print('orderId',o['orderId'],'status',o.get('orderStatus'),'isOverrun',o.get('isOverrun'))
        break
else:
    print('orderId $oid not on board (left via prepared/cancelled, or different pickup date)')
"
}
note "T8 — isOverrun is time-dependent; see comments. Use: overrun_check <orderId>"

# ── SUMMARY ────────────────────────────────────────────────────────────────────
note "RESULT: ${PASS} passed, ${FAIL} failed"
[ "$FAIL" = "0" ] && exit 0 || exit 1
