#!/usr/bin/env bash
# EC2上で sticker-app のAPI(Docker)を再ビルド・入れ替えするデプロイスクリプト。
#
# 前提:
#   - リポジトリのルート(docker-compose.yml がある場所)で実行する
#   - server/.env が存在し、JWT_SECRET / ALLOWED_ORIGINS / NODE_ENV=production が設定済み
#   - sudo で docker / docker compose を呼び出せる
#
# 使い方:
#   bash scripts/ec2-deploy.sh
#   PULL=1 bash scripts/ec2-deploy.sh                # git fetch + pull --ff-only も実行
#   ROLLBACK=main bash scripts/ec2-deploy.sh         # 指定ブランチに切り戻して再ビルド
#   SKIP_HEALTH=1 bash scripts/ec2-deploy.sh         # ヘルスチェックを飛ばす
#   HEALTH_URL=https://api.example.com/health bash scripts/ec2-deploy.sh
#
# 環境変数 (デフォルトを上書き可能):
#   HEALTH_URL       ヘルスチェック先 (default: https://api.sirucho.com/health)
#   SERVICE_NAME     compose サービス名      (default: encoder)
#   EXPECTED_BRANCH  期待するブランチ名      (default: security-0427)
#   PULL             "1" のとき git pull する
#   ROLLBACK         空でない値で指定ブランチへ git switch + pull する
#   SKIP_HEALTH      "1" のときヘルスチェックを省略

set -euo pipefail

# ------- 設定 -------
HEALTH_URL="${HEALTH_URL:-https://api.sirucho.com/health}"
SERVICE_NAME="${SERVICE_NAME:-encoder}"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-security-0427}"
PULL="${PULL:-0}"
ROLLBACK="${ROLLBACK:-}"
SKIP_HEALTH="${SKIP_HEALTH:-0}"
LOG_TAIL_LINES="${LOG_TAIL_LINES:-100}"

# ------- ヘルパ -------
log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; }

# ------- 前提チェック -------
[ -f docker-compose.yml ] || { err "docker-compose.yml が見つからない。リポジトリのルートで実行してください"; exit 1; }
[ -f server/.env ] || { err "server/.env が見つからない"; exit 1; }
command -v docker >/dev/null || { err "docker コマンドが見つからない"; exit 1; }
command -v git >/dev/null || { err "git コマンドが見つからない"; exit 1; }

if sudo docker compose version >/dev/null 2>&1; then
  COMPOSE=(sudo docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(sudo docker-compose)
else
  err "docker compose v2 も docker-compose v1 も使えない"
  exit 1
fi

# ------- ロールバック / pull -------
if [ -n "$ROLLBACK" ]; then
  log "ROLLBACK: ブランチを '$ROLLBACK' に切り替え"
  git fetch origin "$ROLLBACK"
  git switch "$ROLLBACK"
  git pull --ff-only origin "$ROLLBACK"
elif [ "$PULL" = "1" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  log "git fetch & pull --ff-only on '$CURRENT_BRANCH'"
  git fetch origin "$CURRENT_BRANCH"
  git pull --ff-only origin "$CURRENT_BRANCH"
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_SHA=$(git rev-parse --short HEAD)
log "branch=$CURRENT_BRANCH sha=$CURRENT_SHA"

if [ -z "$ROLLBACK" ] && [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  warn "現在のブランチ '$CURRENT_BRANCH' は期待値 '$EXPECTED_BRANCH' と違います"
  warn "続行する場合は Enter / 中止する場合は Ctrl+C"
  read -r _
fi

# ------- .env バックアップ -------
BACKUP_PATH="server/.env.bak.$(date +%Y%m%d-%H%M%S)"
cp server/.env "$BACKUP_PATH"
log "backed up server/.env -> $BACKUP_PATH"

# ------- 必須envの追記(冪等) -------
# ROLLBACK時は旧コードでも未使用なので追記してOK(無害)
if ! grep -q '^COOKIE_SAME_SITE=' server/.env; then
  echo 'COOKIE_SAME_SITE=lax' >> server/.env
  log "added COOKIE_SAME_SITE=lax"
fi
if ! grep -q '^ANONYMOUS_WORK_RETENTION_DAYS=' server/.env; then
  echo 'ANONYMOUS_WORK_RETENTION_DAYS=30' >> server/.env
  log "added ANONYMOUS_WORK_RETENTION_DAYS=30"
fi

# ------- compose 構文チェック -------
log "validating docker-compose config"
"${COMPOSE[@]}" config >/dev/null

# ------- ビルド + 再起動 -------
log "building and recreating service '$SERVICE_NAME'"
"${COMPOSE[@]}" up -d --build --force-recreate "$SERVICE_NAME"

# ------- 起動ログ確認 -------
log "container status:"
"${COMPOSE[@]}" ps
log "recent logs (last $LOG_TAIL_LINES lines):"
"${COMPOSE[@]}" logs --tail "$LOG_TAIL_LINES" "$SERVICE_NAME" || true

# 起動完了を少し待つ(Express の listen は基本即時だが念のため)
sleep 3

# ------- ヘルスチェック -------
if [ "$SKIP_HEALTH" = "1" ]; then
  log "SKIP_HEALTH=1 のためヘルスチェックを省略"
else
  log "health check: $HEALTH_URL"
  HTTP_STATUS=$(curl -sS -o /tmp/sticker-deploy-health.txt -w "%{http_code}" "$HEALTH_URL" || echo "000")
  BODY=$(cat /tmp/sticker-deploy-health.txt 2>/dev/null || echo "")
  if [ "$HTTP_STATUS" = "200" ]; then
    log "health OK: $HTTP_STATUS $BODY"
  else
    err "health FAILED: status=$HTTP_STATUS body=$BODY"
    err "詳細ログ: ${COMPOSE[*]} logs --tail 200 $SERVICE_NAME"
    err "ロールバック: ROLLBACK=main bash scripts/ec2-deploy.sh"
    exit 1
  fi
fi

log "deploy complete (branch=$CURRENT_BRANCH sha=$CURRENT_SHA)"
