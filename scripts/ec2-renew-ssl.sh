#!/usr/bin/env bash
# api.sirucho.com の Let's Encrypt 証明書を EC2 上で直接更新するスクリプト。
#
# scripts/renew-ssl.sh のローカル(SSH 越し)版に対応する EC2-side 版。
# EC2 ホストにログイン済みの状態で実行する想定。
#
# 設計:
#   - 3 段階(diagnose -> dry-run -> renew)で実行し、dry-run が落ちたら本番更新に進まない
#   - nginx reload は certbot の installer=nginx (renew_hook) に委譲する
#
# 使い方:
#   sudo bash scripts/ec2-renew-ssl.sh                  # 全段階(対話確認あり)
#   STAGE=diagnose sudo bash scripts/ec2-renew-ssl.sh   # 診断のみ(read-only)
#   STAGE=dryrun   sudo bash scripts/ec2-renew-ssl.sh   # 診断 + dry-run
#   STAGE=renew    sudo bash scripts/ec2-renew-ssl.sh   # 全段階(明示)
#   ASSUME_YES=1   sudo bash scripts/ec2-renew-ssl.sh   # 対話 skip(緊急復旧用)
#
# 環境変数:
#   API_HOST   検証する FQDN (default: api.sirucho.com)
#   STAGE      diagnose | dryrun | renew (default: renew)
#   ASSUME_YES 非対話モード

set -euo pipefail

API_HOST="${API_HOST:-api.sirucho.com}"
STAGE="${STAGE:-renew}"
ASSUME_YES="${ASSUME_YES:-0}"

log()  { printf '\033[1;34m[ssl]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[ssl]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[ssl]\033[0m %s\n' "$*" >&2; }

confirm() {
  if [ "$ASSUME_YES" = "1" ]; then return 0; fi
  printf '\033[1;36m[ssl]\033[0m %s [y/N]: ' "$1"
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

# ------- 前提チェック -------
command -v certbot >/dev/null || { err "certbot コマンドが無い"; exit 1; }
command -v nginx   >/dev/null || warn "nginx が見つからない(reload 検証ができない)"
command -v openssl >/dev/null || { err "openssl コマンドが無い"; exit 1; }

# sudo で実行されているか(certbot は root 権限必須)
if [ "$(id -u)" -ne 0 ]; then
  err "このスクリプトは root 権限が必要です。 sudo bash $0 で実行してください"
  exit 1
fi

show_cert_via_dns() {
  log "cert via DNS ($API_HOST):"
  echo | openssl s_client -servername "$API_HOST" -connect "$API_HOST:443" 2>/dev/null \
    | openssl x509 -noout -dates -subject -issuer 2>&1 || warn "openssl probe failed"
}

show_cert_files() {
  log "cert on disk (certbot certificates):"
  certbot certificates 2>&1 | sed -n '/Certificate Name:/,/Expiry Date:/p' || true
}

log "host=$(hostname) api=$API_HOST stage=$STAGE"

# ===== Stage 1: diagnose =====
log "=== Stage 1: diagnose (read-only) ==="
show_cert_via_dns
show_cert_files
log "renewal conf:"
grep -E '^(authenticator|installer|renew_hook)' "/etc/letsencrypt/renewal/$API_HOST.conf" 2>/dev/null || warn "renewal conf 見つからず"
log "nginx config test:"
nginx -t 2>&1 || warn "nginx test failed"

if [ "$STAGE" = "diagnose" ]; then
  log "STAGE=diagnose で終了"
  exit 0
fi

# ===== Stage 2: dry-run =====
log "=== Stage 2: dry-run renewal ==="
warn "Let's Encrypt のステージング検証で renewal が通るかを確認します(本番証明書は変わりません)"
confirm "dry-run を実行する?" || { warn "中断"; exit 0; }
certbot renew --dry-run

if [ "$STAGE" = "dryrun" ]; then
  log "STAGE=dryrun で終了"
  exit 0
fi

# ===== Stage 3: real renewal =====
log "=== Stage 3: real renewal ==="
warn "本番証明書を更新します(nginx reload は certbot installer=nginx に委譲)"
confirm "本番更新を実行する?" || { warn "中断"; exit 0; }

# --force-renewal: cert が既に期限切れの場合でも renew を強制する
certbot renew --force-renewal

# certbot の installer=nginx で reload 済みのはずだが、念のため明示的に config test
log "nginx config recheck:"
nginx -t

log "=== 検証 ==="
sleep 2
show_cert_via_dns
log "API health check:"
if curl -sS --max-time 10 -o /tmp/sticker-ssl-renew-health.txt -w "HTTP %{http_code}\n" "https://$API_HOST/health"; then
  cat /tmp/sticker-ssl-renew-health.txt; echo
  log "✅ 完了"
else
  err "ヘルスチェック失敗。手動で確認してください"
  exit 1
fi
