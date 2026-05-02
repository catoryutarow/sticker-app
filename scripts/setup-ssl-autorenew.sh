#!/usr/bin/env bash
# api.sirucho.com の Let's Encrypt 証明書自動更新を EC2 上に setup する。
#
# 背景:
#   AL2023 の `dnf install certbot` は systemd timer を同梱しないため、
#   このスクリプトで明示的に作成・有効化する。
#
# 仕様:
#   - certbot-renew.service    oneshot で `certbot renew` を実行
#   - certbot-renew.timer      毎日 00:00 と 12:00、最大 12h ランダム遅延
#                              Persistent=true で停止中に missed した場合も次回起動時に復旧
#   - nginx の reload は /etc/letsencrypt/renewal/api.sirucho.com.conf の
#     deploy-hook(installer = nginx)で certbot 自身が処理する
#
# 使い方:
#   bash scripts/setup-ssl-autorenew.sh                  # setup + verify
#   STAGE=verify bash scripts/setup-ssl-autorenew.sh     # 既存設定の確認のみ(read-only)
#
# 環境変数:
#   SSH_HOST   接続先(default: ec2-user@16.176.17.115)
#   SSH_KEY    秘密鍵パス(default: ~/.ssh/sticker-app-key.pem)
#   STAGE      setup | verify (default: setup)

set -euo pipefail

SSH_HOST="${SSH_HOST:-ec2-user@16.176.17.115}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sticker-app-key.pem}"
STAGE="${STAGE:-setup}"

log()  { printf '\033[1;34m[autorenew]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[autorenew]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[autorenew]\033[0m %s\n' "$*" >&2; }

ssh_run() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_HOST" "$@"
}

[ -f "$SSH_KEY" ] || { err "SSH 鍵が見つからない: $SSH_KEY"; exit 1; }

# ===== verify (read-only) =====
verify() {
  log "=== verification ==="
  log "timer status:"
  ssh_run "systemctl is-enabled certbot-renew.timer 2>&1 || true; systemctl is-active certbot-renew.timer 2>&1 || true"
  log "next scheduled runs:"
  ssh_run "systemctl list-timers certbot-renew.timer --no-pager 2>&1"
  log "renewal conf (deploy hook):"
  ssh_run "sudo grep -E '^(installer|renew_hook|authenticator)' /etc/letsencrypt/renewal/api.sirucho.com.conf 2>&1 || echo 'not found'"
  log "dry-run renew (確認):"
  ssh_run "sudo certbot renew --dry-run 2>&1 | tail -10"
}

if [ "$STAGE" = "verify" ]; then
  verify
  exit 0
fi

# ===== setup =====
log "=== setup systemd units ==="

# unit ファイル本体は heredoc で remote に書き込む
# Description / OnCalendar / RandomizedDelaySec は upstream certbot.timer に揃える
log "writing /etc/systemd/system/certbot-renew.service"
ssh_run "sudo tee /etc/systemd/system/certbot-renew.service >/dev/null" <<'UNIT'
[Unit]
Description=Certbot renew (sticker-app)
Documentation=https://eff-certbot.readthedocs.io/

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
# certbot 自体が renew_hook で nginx reload する想定
# 失敗時は systemd ログに残るので journalctl で追える
PrivateTmp=true
UNIT

log "writing /etc/systemd/system/certbot-renew.timer"
ssh_run "sudo tee /etc/systemd/system/certbot-renew.timer >/dev/null" <<'UNIT'
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
ssh_run "sudo systemctl daemon-reload"

log "enable + start timer"
ssh_run "sudo systemctl enable --now certbot-renew.timer"

# ===== verify =====
verify

log "✅ auto-renewal setup complete"
