#!/usr/bin/env bash
# ─────────────────────────────────────────
# Servio V1.1 Slice 3a — Backend Field Test Script
# HomiLabs | Servio
# Run from: /mnt/storage/projects/servio_dev/ (or anywhere on the NAS)
# Usage:
#   bash slice3a_field_test.sh                       # safe tests only (0–14)
#   bash slice3a_field_test.sh --include-destructive # also runs test 15
# ─────────────────────────────────────────

set -u   # die on unset variables. NOT set -e — we want to continue past failures.

# ── Config ─────────────────────────────────────────────────────────────────
BASE_URL="https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api"
WEB_API_KEY="AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o"   # dev, public
TEST_EMAIL="${SERVIO_TEST_EMAIL:-}"   # set via env var to skip prompt
TEST_PASSWORD="${SERVIO_TEST_PASSWORD:-}"

# ── ANSI colours ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

# ── Counters ───────────────────────────────────────────────────────────────
PASSED=0
FAILED=0
SKIPPED=0
FAILED_TESTS=()

# ── Helpers ────────────────────────────────────────────────────────────────

pass() {
  PASSED=$((PASSED+1))
  echo -e "  ${GREEN}✓${RESET} $1"
}

fail() {
  FAILED=$((FAILED+1))
  FAILED_TESTS+=("$1")
  echo -e "  ${RED}✗${RESET} $1"
  echo -e "    ${DIM}HTTP ${HTTP_STATUS} — Response:${RESET}"
  echo "$RESPONSE" | sed 's/^/      /' | head -10
}

skip() {
  SKIPPED=$((SKIPPED+1))
  echo -e "  ${YELLOW}⊘${RESET} $1 ${DIM}(skipped)${RESET}"
}

section() {
  echo ""
  echo -e "${CYAN}── $1 ──${RESET}"
}

# Make an HTTP call. Sets globals: HTTP_STATUS, RESPONSE, RESPONSE_DATA.
# Usage: call METHOD PATH [JSON_BODY]
call() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  local tmp
  tmp=$(mktemp)
  if [ -n "$body" ]; then
    HTTP_STATUS=$(curl -s -o "$tmp" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${BASE_URL}${path}")
  else
    HTTP_STATUS=$(curl -s -o "$tmp" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      "${BASE_URL}${path}")
  fi
  RESPONSE=$(cat "$tmp")
  rm -f "$tmp"
  # Best-effort field extraction (jq if available, falls back to grep).
  if command -v jq >/dev/null 2>&1; then
    RESPONSE_DATA=$(echo "$RESPONSE" | jq -r '.data // empty' 2>/dev/null || echo "")
  fi
}

# jq read with a default. Usage: jq_get '.foo.bar' fallback
# NOTE: jq's // operator treats `false` and `null` as null-ish, so a literal
# boolean false would get replaced by the fallback. We convert to string first
# (which becomes "false"|"true"|"null") before applying //, so booleans survive.
jq_get() {
  local expr="$1"
  local fallback="${2:-}"
  if command -v jq >/dev/null 2>&1; then
    echo "$RESPONSE" | jq -r "($expr | tostring) // \"$fallback\"" 2>/dev/null
  else
    echo "$fallback"
  fi
}

# ── Pre-flight ─────────────────────────────────────────────────────────────

echo -e "${CYAN}Servio V1.1 Slice 3a — Backend Field Test${RESET}"
echo -e "${DIM}Base URL: ${BASE_URL}${RESET}"
echo ""

if ! command -v jq >/dev/null 2>&1; then
  echo -e "${YELLOW}WARNING:${RESET} jq is not installed. Responses will not be parsed."
  echo "  Install with: sudo apt install -y jq"
  echo "  Continuing anyway — some assertions will degrade to HTTP-status-only."
  echo ""
fi

INCLUDE_DESTRUCTIVE=false
if [ "${1:-}" = "--include-destructive" ]; then
  INCLUDE_DESTRUCTIVE=true
  echo -e "${YELLOW}DESTRUCTIVE mode enabled — test 15 will run.${RESET}"
  echo ""
fi

# ── Get a token ────────────────────────────────────────────────────────────

if [ -z "$TEST_EMAIL" ]; then
  read -r -p "Ahmed Khan's email: " TEST_EMAIL
fi
if [ -z "$TEST_PASSWORD" ]; then
  read -r -s -p "Ahmed Khan's password: " TEST_PASSWORD
  echo ""
fi

echo "Fetching Firebase ID token..."
SIGNIN_TMP=$(mktemp)
SIGNIN_STATUS=$(curl -s -o "$SIGNIN_TMP" -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"returnSecureToken\":true}" \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}")
SIGNIN_BODY=$(cat "$SIGNIN_TMP")
rm -f "$SIGNIN_TMP"

if [ "$SIGNIN_STATUS" != "200" ]; then
  echo -e "${RED}Sign-in failed (HTTP $SIGNIN_STATUS):${RESET}"
  echo "$SIGNIN_BODY"
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  TOKEN=$(echo "$SIGNIN_BODY" | jq -r '.idToken')
else
  # Fallback: regex-extract idToken. Works because Firebase response is flat.
  TOKEN=$(echo "$SIGNIN_BODY" | grep -o '"idToken":"[^"]*"' | sed 's/"idToken":"\(.*\)"/\1/')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Could not extract idToken from sign-in response${RESET}"
  exit 1
fi

echo -e "${GREEN}Token acquired (valid 1 hour).${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════════════════════════════════

section "Sanity"

# ── Test 00 — Sanity: GET marital status ───────────────────────────────────
call GET "/family/marital-status/me"
CURRENT_STATUS=$(jq_get '.data.maritalStatus' '')
if [ "$HTTP_STATUS" = "200" ] && [ -n "$CURRENT_STATUS" ]; then
  pass "00 — GET marital status returns 200 (current: $CURRENT_STATUS)"
else
  fail "00 — GET marital status"
  echo -e "${RED}Aborting: cannot continue without baseline read.${RESET}"
  exit 1
fi

# If Ahmed isn't already 'married', set him there so the suite has a known start.
if [ "$CURRENT_STATUS" != "married" ]; then
  echo -e "${YELLOW}    Resetting Ahmed to 'married' for known start state...${RESET}"
  call PATCH "/family/marital-status/me" '{"maritalStatus":"married"}'
  if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}Could not reset to married. Aborting.${RESET}"
    echo "$RESPONSE"
    exit 1
  fi
fi

section "Marital status vocabulary (tests 01–06)"

# ── Test 01 — married → divorced ───────────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"divorced"}'
STATUS=$(jq_get '.data.maritalStatus' '')
PENDING=$(jq_get '.data.pending' '')
if [ "$HTTP_STATUS" = "200" ] && [ "$STATUS" = "divorced" ] && [ "$PENDING" = "false" ]; then
  pass "01 — Set status to divorced (immediate, pending=false)"
else
  fail "01 — Set status to divorced"
fi

# ── Test 02 — Spouses still active after divorced ─────────────────────────
call GET "/family/me"
if [ "$HTTP_STATUS" = "200" ]; then
  if command -v jq >/dev/null 2>&1; then
    ACTIVE_SPOUSES=$(echo "$RESPONSE" | jq '[.data.members[] | select(.relation=="spouse" and .isActive==true)] | length')
    if [ "$ACTIVE_SPOUSES" -gt 0 ]; then
      pass "02 — Spouses still active after divorce ($ACTIVE_SPOUSES found)"
    else
      fail "02 — Expected at least one active spouse, got 0 (cascade fired wrongly?)"
    fi
  else
    pass "02 — GET /family/me returned 200 (jq unavailable, can't verify spouse count)"
  fi
else
  fail "02 — GET /family/me"
fi

# ── Test 03 — divorced → widowed ──────────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"widowed"}'
STATUS=$(jq_get '.data.maritalStatus' '')
if [ "$HTTP_STATUS" = "200" ] && [ "$STATUS" = "widowed" ]; then
  pass "03 — Set status to widowed"
else
  fail "03 — Set status to widowed"
fi

# ── Test 04 — widowed → married ───────────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"married"}'
STATUS=$(jq_get '.data.maritalStatus' '')
if [ "$HTTP_STATUS" = "200" ] && [ "$STATUS" = "married" ]; then
  pass "04 — Set status back to married"
else
  fail "04 — Set status to married"
fi

# ── Test 05 — Invalid value rejected ───────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"foo"}'
MSG=$(jq_get '.message' '')
if [ "$HTTP_STATUS" = "400" ] && echo "$MSG" | grep -qi "must be one of"; then
  pass "05 — Invalid status 'foo' rejected with proper message"
else
  fail "05 — Invalid status should be rejected with 'must be one of'"
fi

# ── Test 06 — Same status rejected ─────────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"married"}'
MSG=$(jq_get '.message' '')
if [ "$HTTP_STATUS" = "400" ] && echo "$MSG" | grep -qi "already"; then
  pass "06 — Same status ('married' when married) rejected with 'already'"
else
  fail "06 — Same status should be rejected with 'already'"
fi

section "Relation editing (tests 07–13)"

# ── Test 07 — Pick an existing son for relation-edit tests ────────────────
# Family cap is 12 and Ahmed is at the cap from Slice 2 field tests.
# We pick an existing active son (with DOB) and use it as the test target.
# This is closer to the real-world flow anyway: people edit existing members,
# they rarely add-then-immediately-edit.
call GET "/family/me"
if [ "$HTTP_STATUS" = "200" ]; then
  # Pick the first active son with a DOB present.
  PICKED_JSON=$(echo "$RESPONSE" | jq -c '[.data.members[] | select(.relation=="son" and .isActive==true and .dateOfBirth != null)] | .[0] // empty')
  if [ -n "$PICKED_JSON" ] && [ "$PICKED_JSON" != "null" ]; then
    FAMILY_MEMBER_ID=$(echo "$PICKED_JSON" | jq -r '.familyMemberId')
    ORIGINAL_NAME=$(echo "$PICKED_JSON" | jq -r '.fullName')
    ORIGINAL_DOB=$(echo "$PICKED_JSON" | jq -r '.dateOfBirth')
    INITIAL_HIST_LEN=$(echo "$PICKED_JSON" | jq '.relationHistory | length')
    pass "07 — Picked existing son '$ORIGINAL_NAME' (ID: $FAMILY_MEMBER_ID, history: $INITIAL_HIST_LEN entries)"
  else
    fail "07 — Could not find any active son with DOB in Ahmed's family list. Add one manually or free a slot in the cap."
    FAMILY_MEMBER_ID=""
    INITIAL_HIST_LEN=0
  fi
else
  fail "07 — GET /family/me"
  FAMILY_MEMBER_ID=""
  INITIAL_HIST_LEN=0
fi

# ── Test 08 — son → daughter (DOB present) ────────────────────────────────
# Assertion: history grew by exactly 1, last entry is son→daughter.
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"daughter"}'
  REL=$(jq_get '.data.member.relation' '')
  HIST_LEN=$(echo "$RESPONSE" | jq '.data.member.relationHistory | length' 2>/dev/null || echo "0")
  HIST_FROM=$(echo "$RESPONSE" | jq -r '.data.member.relationHistory[-1].from // "missing"')
  HIST_TO=$(echo "$RESPONSE" | jq -r '.data.member.relationHistory[-1].to // "missing"')
  EXPECTED_LEN=$((INITIAL_HIST_LEN + 1))
  if [ "$HTTP_STATUS" = "200" ] && [ "$REL" = "daughter" ] && [ "$HIST_LEN" = "$EXPECTED_LEN" ] && [ "$HIST_FROM" = "son" ] && [ "$HIST_TO" = "daughter" ]; then
    pass "08 — son → daughter; history grew $INITIAL_HIST_LEN → $HIST_LEN; last entry son→daughter"
  else
    fail "08 — son → daughter (rel=$REL, histLen=$HIST_LEN [expected $EXPECTED_LEN], from=$HIST_FROM, to=$HIST_TO)"
  fi
else
  skip "08 — son → daughter (no familyMemberId from test 07)"
fi

# ── Test 09 — daughter → spouse ───────────────────────────────────────────
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"spouse"}'
  REL=$(jq_get '.data.member.relation' '')
  HIST_LEN=$(echo "$RESPONSE" | jq '.data.member.relationHistory | length' 2>/dev/null || echo "0")
  EXPECTED_LEN=$((INITIAL_HIST_LEN + 2))
  if [ "$HTTP_STATUS" = "200" ] && [ "$REL" = "spouse" ] && [ "$HIST_LEN" = "$EXPECTED_LEN" ]; then
    pass "09 — daughter → spouse; history now $HIST_LEN (expected $EXPECTED_LEN)"
  else
    fail "09 — daughter → spouse (rel=$REL, histLen=$HIST_LEN [expected $EXPECTED_LEN])"
  fi
else
  skip "09 — daughter → spouse"
fi

# ── Test 10 — spouse → daughter with DOB cleared (must reject) ────────────
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"daughter","dateOfBirth":null}'
  MSG=$(jq_get '.message' '')
  if [ "$HTTP_STATUS" = "400" ] && echo "$MSG" | grep -qi "dateofbirth is required"; then
    pass "10 — spouse→daughter with null DOB correctly rejected"
  else
    fail "10 — Should reject DOB-cleared change to daughter (got HTTP $HTTP_STATUS, msg: $MSG)"
  fi
else
  skip "10 — DOB safeguard"
fi

# ── Test 11 — Edit fullName only (no history change) ──────────────────────
# Sneakily uses this step to restore the picked member's original name.
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" "{\"fullName\":\"$ORIGINAL_NAME\"}"
  NAME=$(jq_get '.data.member.fullName' '')
  HIST_LEN=$(echo "$RESPONSE" | jq '.data.member.relationHistory | length' 2>/dev/null || echo "0")
  EXPECTED_LEN=$((INITIAL_HIST_LEN + 2))
  if [ "$HTTP_STATUS" = "200" ] && [ "$NAME" = "$ORIGINAL_NAME" ] && [ "$HIST_LEN" = "$EXPECTED_LEN" ]; then
    pass "11 — Name-only edit (restored to '$ORIGINAL_NAME'); history unchanged at $HIST_LEN"
  elif [ "$HTTP_STATUS" = "400" ]; then
    # Name didn't actually change (someone else may have already renamed via UI).
    # Try renaming to something different and check that.
    call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"fullName":"Temp Rename Test"}'
    NAME=$(jq_get '.data.member.fullName' '')
    HIST_LEN=$(echo "$RESPONSE" | jq '.data.member.relationHistory | length' 2>/dev/null || echo "0")
    if [ "$HTTP_STATUS" = "200" ] && [ "$NAME" = "Temp Rename Test" ] && [ "$HIST_LEN" = "$EXPECTED_LEN" ]; then
      pass "11 — Name-only edit (used fallback name); history unchanged at $HIST_LEN"
      # Restore
      call PATCH "/family/me/$FAMILY_MEMBER_ID" "{\"fullName\":\"$ORIGINAL_NAME\"}"
    else
      fail "11 — fullName edit (name=$NAME, histLen=$HIST_LEN, expected $EXPECTED_LEN)"
    fi
  else
    fail "11 — fullName edit (name=$NAME, histLen=$HIST_LEN, expected $EXPECTED_LEN, HTTP=$HTTP_STATUS)"
  fi
else
  skip "11 — Name edit"
fi

# ── Test 12 — Invalid relation rejected ───────────────────────────────────
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"foo"}'
  MSG=$(jq_get '.message' '')
  if [ "$HTTP_STATUS" = "400" ] && echo "$MSG" | grep -qi "relation must be one of"; then
    pass "12 — Invalid relation rejected"
  else
    fail "12 — Invalid relation should be rejected (got HTTP $HTTP_STATUS, msg: $MSG)"
  fi
else
  skip "12 — Invalid relation"
fi

# ── Test 13 — Relation set to same value (no-op or 400) ──────────────────
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"spouse"}'
  EXPECTED_LEN=$((INITIAL_HIST_LEN + 2))
  # Either 400 "No valid fields to update" OR 200 with unchanged history is acceptable.
  if [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "200" ]; then
    if [ "$HTTP_STATUS" = "200" ] && command -v jq >/dev/null 2>&1; then
      HIST_LEN=$(echo "$RESPONSE" | jq '.data.member.relationHistory | length' 2>/dev/null || echo "0")
      if [ "$HIST_LEN" != "$EXPECTED_LEN" ]; then
        fail "13 — Same-value edit returned 200 but history grew to $HIST_LEN (should stay $EXPECTED_LEN)"
      else
        pass "13 — Same-value relation edit (HTTP 200, history unchanged at $HIST_LEN)"
      fi
    else
      pass "13 — Same-value relation edit (HTTP $HTTP_STATUS)"
    fi
  else
    fail "13 — Unexpected HTTP $HTTP_STATUS for same-value edit"
  fi
else
  skip "13 — Same-value relation edit"
fi

section "Restore picked test member (cleanup)"

# Restore the picked member's relation to 'son' so the family list looks the
# same as before the test ran (apart from relationHistory which will grow).
if [ -n "$FAMILY_MEMBER_ID" ]; then
  call PATCH "/family/me/$FAMILY_MEMBER_ID" '{"relation":"son"}'
  REL=$(jq_get '.data.member.relation' '')
  if [ "$HTTP_STATUS" = "200" ] && [ "$REL" = "son" ]; then
    pass "Restore — picked member is back to son"
  else
    fail "Restore — could not restore picked member to son (HTTP $HTTP_STATUS)"
    echo -e "    ${YELLOW}Manual fix needed: PATCH the member back to son via Firebase console.${RESET}"
  fi
fi

section "Cleanup (test 14)"

# ── Test 14 — Set status to single ─────────────────────────────────────────
call PATCH "/family/marital-status/me" '{"maritalStatus":"single"}'
STATUS=$(jq_get '.data.maritalStatus' '')
if [ "$HTTP_STATUS" = "200" ] && [ "$STATUS" = "single" ]; then
  pass "14 — Set status to single"
else
  fail "14 — Set status to single"
fi

# ── Test 15 — DESTRUCTIVE — setEmployeeStatus carries cascade count ───────
if [ "$INCLUDE_DESTRUCTIVE" = "true" ]; then
  section "DESTRUCTIVE (test 15)"
  echo -e "${YELLOW}This will deactivate Ahmed Khan, then reactivate him AND his family.${RESET}"
  echo -e "${DIM}Reminder: backend cascades deactivation but does NOT cascade reactivation.${RESET}"
  echo -e "${DIM}This script will compensate by manually reactivating each family member after.${RESET}"
  read -r -p "Proceed? (y/N) " ans
  if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
    # Capture which family members are active BEFORE the destructive call,
    # so we can restore them precisely afterwards (don't reactivate any
    # member the user had deliberately left deactivated).
    call GET "/family/me"
    PRE_ACTIVE_IDS=$(echo "$RESPONSE" | jq -r '.data.members[] | select(.isActive==true) | .familyMemberId')
    PRE_ACTIVE_COUNT=$(echo "$PRE_ACTIVE_IDS" | grep -c . || true)
    echo -e "${DIM}    ${PRE_ACTIVE_COUNT} family member(s) were active before; will restore those after.${RESET}"

    call PATCH "/employees/FFL00003/status" '{"isActive":false}'
    if [ "$HTTP_STATUS" = "200" ]; then
      # Use jq -r so the value comes out as a raw string (e.g. "3" or "null"),
      # not a JSON-encoded value (e.g. "\"3\"" or "null"). Then validate it's
      # a non-negative integer — that's the real success criterion.
      FAM_COUNT=$(echo "$RESPONSE" | jq -r '.data.familyMembersDeactivated // "missing"')
      if [[ "$FAM_COUNT" =~ ^[0-9]+$ ]]; then
        pass "15 — Response carries familyMembersDeactivated=$FAM_COUNT (V1.1 carry can be closed)"
      else
        fail "15 — Response missing or non-numeric familyMembersDeactivated (got: '$FAM_COUNT')"
      fi

      # Reactivate Ahmed himself.
      echo -e "${DIM}Reactivating Ahmed...${RESET}"
      call PATCH "/employees/FFL00003/status" '{"isActive":true}'
      if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}    Ahmed reactivated.${RESET}"
      else
        echo -e "${RED}    WARNING: reactivate failed. Reactivate manually via Firebase console.${RESET}"
      fi

      # Restore each family member that was active before the test.
      # Backend cascade deactivates but does NOT cascade reactivate (by design),
      # so we have to undo the family side ourselves to leave the dataset clean.
      if [ -n "$PRE_ACTIVE_IDS" ]; then
        RESTORED=0
        FAILED_RESTORES=0
        for FM_ID in $PRE_ACTIVE_IDS; do
          call PATCH "/family/me/$FM_ID/status" '{"isActive":true}'
          if [ "$HTTP_STATUS" = "200" ]; then
            RESTORED=$((RESTORED + 1))
          else
            FAILED_RESTORES=$((FAILED_RESTORES + 1))
          fi
        done
        if [ "$FAILED_RESTORES" = "0" ]; then
          echo -e "${GREEN}    Restored ${RESTORED} family member(s).${RESET}"
        else
          echo -e "${RED}    Restored ${RESTORED}, failed to restore ${FAILED_RESTORES}. Check Firebase console.${RESET}"
        fi
      fi
    elif [ "$HTTP_STATUS" = "403" ]; then
      fail "15 — 403 Access denied. Ahmed needs admin/super_admin role on dev."
    elif [ "$HTTP_STATUS" = "404" ]; then
      fail "15 — Route not found at PATCH /employees/FFL00003/status"
    else
      fail "15 — setEmployeeStatus"
    fi
  else
    skip "15 — User declined destructive test"
  fi
else
  skip "15 — Destructive test (pass --include-destructive to enable)"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}── Summary ──${RESET}"
echo -e "  ${GREEN}Passed:${RESET}  $PASSED"
echo -e "  ${RED}Failed:${RESET}  $FAILED"
echo -e "  ${YELLOW}Skipped:${RESET} $SKIPPED"

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed tests:${RESET}"
  for t in "${FAILED_TESTS[@]}"; do
    echo "  - $t"
  done
  exit 1
fi

echo ""
echo -e "${GREEN}All run tests passed.${RESET}"
echo -e "${DIM}Reminder: Ahmed's status is now 'single'. Reset to 'married' via Firebase console if needed.${RESET}"
echo -e "${DIM}The picked test member has been restored to 'son', but its relationHistory will have grown by 3 entries (son→daughter→spouse→son). This is audit data; safe to ignore on dev.${RESET}"
exit 0