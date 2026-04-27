#!/usr/bin/env bash
# 稼働中の本番 API に対する非破壊スモークテスト。
# server/scripts/smoke-test.js (CI/コンテナ内テスト) とは役割が違い、
# こちらは「本番デプロイ後に本物のホストに向けて軽く叩く」用途。
#
# 副作用なし:
#   - GET だけ、または CSRF/認証/CORS で必ず拒否されるリクエストのみ送信
#   - DB に何も書き込まない
#
# 使い方:
#   bash scripts/api-smoke-test.sh
#   API_BASE=https://api.example.com bash scripts/api-smoke-test.sh
#   ALLOWED_ORIGIN=https://www.example.com bash scripts/api-smoke-test.sh
#
# 終了コード:
#   0  全テスト pass
#   1  1つ以上 fail

set -uo pipefail   # -e は付けない: 1つ失敗しても残りを実行したい

# ------- 設定 -------
API_BASE="${API_BASE:-https://api.sirucho.com}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-https://www.sirucho.com}"
ALLOWED_ORIGIN_ALT="${ALLOWED_ORIGIN_ALT:-https://sirucho.com}"
EVIL_ORIGIN="${EVIL_ORIGIN:-https://evil.example.com}"

# ------- 色付きヘルパ -------
red()    { printf '\033[0;31m%s\033[0m' "$*"; }
green()  { printf '\033[0;32m%s\033[0m' "$*"; }
blue()   { printf '\033[0;34m%s\033[0m' "$*"; }
gray()   { printf '\033[0;90m%s\033[0m' "$*"; }

PASS=0
FAIL=0
FAILED_TESTS=()

pass() {
  green '  ✓ '
  printf '%s\n' "$1"
  PASS=$((PASS + 1))
}

fail() {
  red '  ✗ '
  printf '%s\n' "$1"
  if [ -n "${2-}" ]; then
    gray '    '
    printf '%s\n' "$2"
  fi
  FAIL=$((FAIL + 1))
  FAILED_TESTS+=("$1")
}

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass "$desc (status=$actual)"
  else
    fail "$desc" "expected status=$expected actual=$actual"
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    pass "$desc"
  else
    fail "$desc" "missing '$needle' in: $haystack"
  fi
}

assert_not_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if ! printf '%s' "$haystack" | grep -qF -- "$needle"; then
    pass "$desc"
  else
    fail "$desc" "unexpectedly contains '$needle'"
  fi
}

# pass if status is in the given comma-separated list
assert_status_in() {
  local desc="$1" allowed="$2" actual="$3"
  case ",$allowed," in
    *",$actual,"*) pass "$desc (status=$actual)" ;;
    *)             fail "$desc" "expected one of [$allowed] actual=$actual" ;;
  esac
}

# ------- 開始 -------
blue '====='; printf ' '; blue 'API smoke test'; printf ' '; blue '====='; printf '\n'
gray "  base:           $API_BASE"; printf '\n'
gray "  allowed origin: $ALLOWED_ORIGIN"; printf '\n'
gray "  evil origin:    $EVIL_ORIGIN"; printf '\n'
echo

# ---- 1. ヘルスチェック ----
blue '[1] Health check'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' "$API_BASE/health" || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'GET /health' '200' "$STATUS"
assert_contains "GET /health body has 'status'" '"status":"ok"' "$BODY"
echo

# ---- 2. 公開エンドポイント (GET) ----
blue '[2] Public endpoint (read-only)'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' "$API_BASE/api/kits/public?limit=1" || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'GET /api/kits/public?limit=1' '200' "$STATUS"
assert_contains 'kits array present' '"kits"' "$BODY"
assert_contains 'pagination metadata present' '"pagination"' "$BODY"
echo

# ---- 3. CORS preflight from allowed origin ----
blue '[3] CORS preflight: allowed origin echoed back'; printf '\n'
TMP_HDR=$(mktemp)
curl -sS -D "$TMP_HDR" -o /dev/null -X OPTIONS "$API_BASE/api/works" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' || true
HDRS=$(cat "$TMP_HDR")
rm -f "$TMP_HDR"
ALLOW_ORIGIN_HEADER=$(printf '%s' "$HDRS" | grep -i '^access-control-allow-origin:' | head -1 | tr -d '\r')
ALLOW_CREDS_HEADER=$(printf '%s' "$HDRS" | grep -i '^access-control-allow-credentials:' | head -1 | tr -d '\r')
assert_contains 'Access-Control-Allow-Origin echoes allowed origin' "$ALLOWED_ORIGIN" "$ALLOW_ORIGIN_HEADER"
assert_contains 'Access-Control-Allow-Credentials: true' 'true' "$ALLOW_CREDS_HEADER"
echo

# ---- 4. CORS preflight from evil origin ----
blue '[4] CORS preflight: evil origin not echoed'; printf '\n'
TMP_HDR=$(mktemp)
curl -sS -D "$TMP_HDR" -o /dev/null -X OPTIONS "$API_BASE/api/works" \
  -H "Origin: $EVIL_ORIGIN" \
  -H 'Access-Control-Request-Method: POST' || true
HDRS=$(cat "$TMP_HDR")
rm -f "$TMP_HDR"
ALLOW_ORIGIN_HEADER=$(printf '%s' "$HDRS" | grep -i '^access-control-allow-origin:' | head -1 | tr -d '\r')
assert_not_contains "Access-Control-Allow-Origin does NOT echo $EVIL_ORIGIN" "$EVIL_ORIGIN" "$ALLOW_ORIGIN_HEADER"
echo

# ---- 5. Cross-origin POST is rejected (defense in depth: CORS+CSRF) ----
# CORS middleware fires first for browsers' Origin-bearing requests and
# blocks evil.example.com with 500 "Not allowed by CORS". The CSRF
# middleware is the second line of defense. Either layer rejecting is success.
blue '[5] Defense in depth: cookie POST from evil Origin → rejected'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' -X POST "$API_BASE/api/works" \
  -H 'Content-Type: application/json' \
  -H "Origin: $EVIL_ORIGIN" \
  -H 'Cookie: token=fake-but-present-token' \
  -d '{}' || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status_in 'POST /api/works (cookie, evil origin)' '403,500' "$STATUS"
echo

# ---- 6. CSRF middleware: no Origin, no Referer → 403 ----
# CORS passes when Origin is absent (cors middleware allows non-browser
# requests by default). CSRF middleware then rejects because it cannot
# verify the request's origin against trustedOrigins.
blue '[6] CSRF: cookie POST with no Origin/Referer → 403'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' -X POST "$API_BASE/api/works" \
  -H 'Content-Type: application/json' \
  -H 'Cookie: token=fake-but-present-token' \
  -d '{}' || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'POST /api/works (cookie, no origin)' '403' "$STATUS"
assert_contains "body says 'CSRF validation failed'" 'CSRF validation failed' "$BODY"
echo

# ---- 7. CSRF middleware: evil Referer with no Origin → 403 ----
# Tests CSRF middleware in isolation (CORS passes since Origin is absent).
# Verifies the Referer fallback path in server/index.js CSRF check.
blue '[7] CSRF: cookie POST with evil Referer (no Origin) → 403'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' -X POST "$API_BASE/api/works" \
  -H 'Content-Type: application/json' \
  -H "Referer: $EVIL_ORIGIN/foo" \
  -H 'Cookie: token=fake-but-present-token' \
  -d '{}' || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'POST /api/works (cookie, evil referer)' '403' "$STATUS"
assert_contains "body says 'CSRF validation failed'" 'CSRF validation failed' "$BODY"
echo

# ---- 8. 認証必須エンドポイントへの未認証アクセス ----
blue '[8] Auth required: GET /api/auth/me without cookie → 401'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' "$API_BASE/api/auth/me" || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'GET /api/auth/me' '401' "$STATUS"
assert_contains "body says 'Authentication required'" 'Authentication required' "$BODY"
echo

# ---- 9. Admin endpoint without auth → 401 ----
blue '[9] Admin endpoint: GET /api/admin/stats without cookie → 401'; printf '\n'
TMP_BODY=$(mktemp)
STATUS=$(curl -sS -o "$TMP_BODY" -w '%{http_code}' "$API_BASE/api/admin/stats" || echo 000)
BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"
assert_status 'GET /api/admin/stats' '401' "$STATUS"
echo

# ---- 10. Security headers ----
blue '[10] Security headers (helmet)'; printf '\n'
TMP_HDR=$(mktemp)
curl -sS -D "$TMP_HDR" -o /dev/null "$API_BASE/health" || true
HDRS=$(cat "$TMP_HDR")
rm -f "$TMP_HDR"
assert_contains 'X-Content-Type-Options: nosniff'    'X-Content-Type-Options' "$HDRS"
assert_contains 'Strict-Transport-Security present'  'Strict-Transport-Security' "$HDRS"
assert_contains 'X-Frame-Options present'            'X-Frame-Options' "$HDRS"
assert_contains 'Content-Security-Policy present'    'Content-Security-Policy' "$HDRS"
echo

# ---- まとめ ----
blue '===== Summary ====='; printf '\n'
green "  pass: $PASS"; printf '\n'
if [ "$FAIL" -gt 0 ]; then
  red "  fail: $FAIL"; printf '\n'
  for t in "${FAILED_TESTS[@]}"; do
    red '    - '
    printf '%s\n' "$t"
  done
  exit 1
else
  green '  fail: 0'; printf '\n'
  echo
  green '  ✓ all tests passed'; printf '\n'
  exit 0
fi
