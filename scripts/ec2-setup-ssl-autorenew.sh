#!/usr/bin/env bash
# api.sirucho.com の Let's Encrypt 証明書自動更新を EC2 上で直接 setup するスクリプト。
#
# scripts/setup-ssl-autorenew.sh のローカル(SSH 越し)版に対応する EC2-side 版。
# EC2 ホストにログイン済みの状態で実行する想定。
#
# 背景:
#   AL2023 の `dnf install certbot` は systemd timer を同梱しないため、
#   このスクリプトで明示的に作成・有効化する。
#
# 仕様:
#   - certbot-renew.service    oneshot で `certbot renew --quiet` を実行
#   - certbot-renew.timer      毎日 00:00 と 12:00、最大 12h ランダム遅延
#                              Persistent=true で停止中に missed した場合も次回起動時に復旧
#   - nginx reload は /etc/letsencrypt/renewal/<host>.conf の installer=nginx に委譲
#
# 使い方:
#   sudo bash scripts/ec2-setup-ssl-autorenew.sh                # setup + verify
#   STAGE=verify sudo bash scripts/ec2-setup-ssl-autorenew.sh   # 既存設定の確認のみ
#
# 環境変数:
#   API_HOST  検証する FQDN (default: api.sirucho.com)
#   STAGE     setup | verify (default: setup)

set -euo pipefail

API_HOST="${API_HOST:-api.sirucho.com}"
STAGE="${STAGE:-setup}"

log()  { printf '\033[1;34m[autorenew]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[autorenew]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[autorenew]\033[0m %s\n' "$*" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "このスクリプトは root 権限が必要です。 sudo bash $0 で実行してください"
  exit 1
fi

command -v certbot     >/dev/null || { err "certbot が無い"; exit 1; }
command -v systemctl   >/dev/null || { err "systemctl が無い(systemd 必須)"; exit 1; }

verify() {
  log "=== verification ==="
  log "timer status:"
  systemctl is-enabled certbot-renew.timer 2>&1 || true
  systemctl is-active  certbot-renew.timer 2>&1 || true
  log "next scheduled runs:"
  systemctl list-timers certbot-renew.timer --no-pager 2>&1
  log "renewal conf (deploy hook):"
  grep -E '^(installer|renew_hook|authenticator)' "/etc/letsencrypt/renewal/$API_HOST.conf" 2>&1 || echo 'not found'
  log "dry-run renew (確認):"
  certbot renew --dry-run 2>&1 | tail -10
}

if [ "$STAGE" = "verify" ]; then
  verify
  exit 0
fi

# ===== setup =====
log "=== setup systemd units ==="

log "writing /etc/systemd/system/certbot-renew.service"
cat > /etc/systemd/system/certbot-renew.service <<'UNIT'
[Unit]
Description=Certbot renew (sticker-app)
Documentation=https://eff-certbot.readthedocs.io/

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
# certbot 自体が installer=nginx で reload する想定
PrivateTmp=true
UNIT

log "writing /etc/systemd/system/certbot-renew.timer"
cat > /etc/systemd/system/certbot-renew.timer <<'UNIT'
[Unit]
Description=Run certbot renew twice daily (sticker-app)
Documentation=https://eff-certbot.readthedocs.io/

[Timer]
OnCalendar=*-*-* 00,12:00:00
# 0〜12時間のランダム遅延で Let's Encrypt サーバへの thundering herd を避ける
RandomizedDelaySec=12h
# マシン停止中に missed した場合、起動時に復旧実行する
Persistent=true

[Install]
WantedBy=timers.target
UNIT

log "reloading systemd daemon"
systemctl daemon-reload

log "enable + start timer"
systemctl enable --now certbot-renew.timer

verify

log "✅ auto-renewal setup complete"
