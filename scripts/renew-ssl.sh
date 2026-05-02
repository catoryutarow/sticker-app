#!/usr/bin/env bash
# api.sirucho.com の Let's Encrypt 証明書を EC2 上で更新するスクリプト。
#
# 設計:
#   - 3 段階(diagnose -> dry-run -> renew)で実行し、dry-run が落ちたら本番更新に進まない
#   - 各段階の前後で `openssl s_client` を叩いて、ローカルから見た証明書も比較する
#   - 鍵パス/ホスト/ユーザは環境変数で上書き可能
#
# 使い方:
#   bash scripts/renew-ssl.sh                  # 全段階を順に実行(対話で確認あり)
#   STAGE=diagnose bash scripts/renew-ssl.sh   # 診断だけ(read-only)
#   STAGE=dryrun   bash scripts/renew-ssl.sh   # 診断 + dry-run まで
#   STAGE=renew    bash scripts/renew-ssl.sh   # 全段階(明示)
#   ASSUME_YES=1   bash scripts/renew-ssl.sh   # 対話プロンプトを skip(CI 用)
#
# 環境変数:
#   SSH_HOST   接続先(default: ec2-user@16.176.17.115)
#   SSH_KEY    秘密鍵パス(default: ~/.ssh/sticker-app-key.pem)
#   API_HOST   検証する FQDN(default: api.sirucho.com)
#   STAGE      diagnose | dryrun | renew (default: renew)
#   ASSUME_YES 非対話モード

set -euo pipefail

SSH_HOST="${SSH_HOST:-ec2-user@16.176.17.115}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sticker-app-key.pem}"
API_HOST="${API_HOST:-api.sirucho.com}"
STAGE="${STAGE:-renew}"
ASSUME_YES="${ASSUME_YES:-0}"

# ------- ヘルパ -------
log()  { printf '\033[1;34m[ssl]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[ssl]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[ssl]\033[0m %s\n' "$*" >&2; }

confirm() {
  if [ "$ASSUME_YES" = "1" ]; then return 0; fi
  printf '\033[1;36m[ssl]\033[0m %s [y/N]: ' "$1"
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

ssh_run() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_HOST" "$@"
}

show_remote_cert() {
  log "remote cert (certbot certificates):"
  ssh_run "sudo certbot certificates 2>&1 | sed -n '/Certificate Name:/,/Expiry Date:/p'" || true
}

show_local_cert() {
  log "cert as seen from local (openssl s_client -> $API_HOST):"
  echo | openssl s_client -servername "$API_HOST" -connect "$API_HOST:443" 2>/dev/null \
    | openssl x509 -noout -dates -subject -issuer 2>&1 || warn "openssl probe failed"
}

# ------- 前提チェック -------
[ -f "$SSH_KEY" ] || { err "SSH 鍵が見つからない: $SSH_KEY"; exit 1; }
command -v ssh >/dev/null || { err "ssh コマンドが無い"; exit 1; }
command -v openssl >/dev/null || { err "openssl コマンドが無い"; exit 1; }

log "host=$SSH_HOST key=$SSH_KEY api=$API_HOST stage=$STAGE"

# ===== Stage 1: diagnose =====
log "=== Stage 1: diagnose (read-only) ==="
show_local_cert
log "certbot timer status:"
ssh_run "sudo systemctl status certbot.timer --no-pager 2>&1 | head -20 || sudo systemctl status snap.certbot.renew.timer --no-pager 2>&1 | head -20 || echo 'no certbot timer found'"
log "recent certbot logs:"
ssh_run "sudo tail -n 40 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo 'no certbot log'"
show_remote_cert
log "nginx config test:"
ssh_run "sudo nginx -t 2>&1"

if [ "$STAGE" = "diagnose" ]; then
  log "STAGE=diagnose で終了。次は STAGE=dryrun か STAGE=renew で実行してください"
  exit 0
fi

# ===== Stage 2: dry-run =====
log "=== Stage 2: dry-run renewal ==="
warn "Let's Encrypt のステージング検証で renewal が通るかを確認します(本番証明書は変わりません)"
confirm "dry-run を実行する?" || { warn "中断"; exit 0; }
ssh_run "sudo certbot renew --dry-run 2>&1 | tail -40"

if [ "$STAGE" = "dryrun" ]; then
  log "STAGE=dryrun で終了。問題なければ STAGE=renew で実行してください"
  exit 0
fi

# ===== Stage 3: real renewal =====
log "=== Stage 3: real renewal ==="
warn "本番証明書を更新し、Nginx を reload します"
confirm "本番更新を実行する?" || { warn "中断"; exit 0; }

# --force-renewal: cert が既に期限切れの場合でも renew を強制する
ssh_run "sudo certbot renew --force-renewal 2>&1 | tail -40"

log "reload nginx:"
ssh_run "sudo nginx -t && sudo systemctl reload nginx"

log "=== 検証 ==="
sleep 2
show_local_cert
log "API health check:"
if curl -sS --max-time 10 -o /tmp/sticker-ssl-renew-health.txt -w "HTTP %{http_code}\n" "https://$API_HOST/health"; then
  cat /tmp/sticker-ssl-renew-health.txt; echo
  log "✅ 完了"
else
  err "ヘルスチェック失敗。手動で確認してください"
  exit 1
fi
