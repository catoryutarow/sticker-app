# デプロイガイド

> **2026-05-02 更新**: 旧版は Fly.io 前提だったが、実際の本番は EC2 + Docker Compose + Nginx + Vercel 構成のため全面書き換え。

## 構成図

```
                  Route 53 / お名前.com DNS
                          │
              ┌───────────┴────────────┐
              │                        │
       sirucho.com (canonical:    api.sirucho.com
       www.sirucho.com)
              │                        │
       ┌──────▼─────┐         ┌────────▼──────────┐
       │   Vercel   │         │   AWS EC2         │
       │ (frontend) │  HTTPS  │ ap-southeast-2    │
       │            │ ──────▶ │ 16.176.17.115     │
       │ React SPA  │         │                   │
       │ Vite build │         │ ┌───────────────┐ │
       └────────────┘         │ │ Nginx (host)  │ │
                              │ │ Let's Encrypt │ │
                              │ │ port 443→3001 │ │
                              │ └───────┬───────┘ │
                              │         │         │
                              │ ┌───────▼───────┐ │
                              │ │ Docker        │ │
                              │ │ encoder       │ │
                              │ │ ┌──────────┐  │ │
                              │ │ │ Express  │  │ │
                              │ │ │ FFmpeg   │  │ │
                              │ │ │ SQLite   │  │ │
                              │ │ └──────────┘  │ │
                              │ └───────────────┘ │
                              └───────────────────┘
```

---

## フロントエンド (Vercel)

### デプロイ
- リポジトリ: `catoryutarow/sticker-app`
- ブランチ: `main` push で自動デプロイ
- ビルド: `npm run build` (Vite)
- 出力: `dist/`

### 環境変数 (Vercel ダッシュボード)
| 変数 | 値 | 用途 |
|---|---|---|
| `VITE_API_URL` | `https://api.sirucho.com/api` | API エンドポイント |
| `VITE_ASSET_BASE_URL` | `https://api.sirucho.com` | 画像・音源配信元 (EC2 から直接配信) |

### ドメイン
- `www.sirucho.com` (canonical, SEO 用に統一)
- `sirucho.com` → `www.sirucho.com` にリダイレクト
- `vercel.json` で `/w/:shareId` 等の rewrites 定義済み

### 開発時の env 切り替え
```
.env.development   npm run dev 時
.env.production    npm run build 時
.env.local         全環境 (gitignore 推奨、個人設定用)
.env.test          vitest 実行時
```
ローカル → スマホ実機テストでは `localhost` を `window.location.hostname` に動的置換 (`src/config/apiUrl.ts`)。

---

## バックエンド (AWS EC2)

### インスタンス
| 項目 | 値 |
|---|---|
| リージョン | `ap-southeast-2` (シドニー) |
| パブリック IP | `16.176.17.115` |
| OS | Amazon Linux 2023 |
| 接続 | `ssh -i ~/.ssh/sticker-app-key.pem ec2-user@16.176.17.115` |
| リポジトリ | `~/sticker-app` (`git pull` で更新) |

### サービス構成
- **Nginx** (host installed) — port 443 で SSL 終端、port 3001 へ proxy
- **Docker Compose** (`docker-compose.yml`) — `encoder` サービス
  - イメージ: `node:20-alpine` + FFmpeg
  - 永続化ボリューム: `./server/data:/app/data`、`./public:/data/public`
  - env: `./server/.env` を `env_file` として読み込み
- **certbot** (dnf install) + **systemd timer** (今回追加) で SSL 自動更新

### 環境変数 (`server/.env`)
| 変数 | 説明 | 例 |
|---|---|---|
| `PORT` | Express ポート | `3001` |
| `NODE_ENV` | 実行モード | `production` |
| `JWT_SECRET` | JWT 署名キー (本番は強力なランダム値) | (秘密) |
| `ALLOWED_ORIGINS` | CORS 許可オリジン (カンマ区切り) | `https://www.sirucho.com,https://sirucho.com` |
| `FRONTEND_URL` | メール内リンク用 | `https://www.sirucho.com` |
| `RESEND_API_KEY` | Resend API キー (または AWS SES 認証情報) | (秘密) |
| `EMAIL_FROM` | 送信元アドレス | `シール帳 <noreply@sirucho.com>` |
| `UPLOAD_DIR` | アップロード保存先 (Docker volume にマウント) | `/data` |
| `COOKIE_SAME_SITE` | Cookie SameSite 属性 | `lax` |
| `ANONYMOUS_WORK_RETENTION_DAYS` | 匿名作品の保存期間 | `30` |
| `DATABASE_PATH` | SQLite DB パス | (デフォルトのまま) |

### ⚠️ 既知の落とし穴
1. **本番 `FRONTEND_URL` が `https://sirucho.com` (www なし) のまま** — www 統一に追従が必要
2. **AL2023 `dnf install certbot` は systemd timer を同梱しない** — 2026-04-29 にこれが原因で cert 期限切れ。現在は `scripts/ec2-setup-ssl-autorenew.sh` で timer 設置済み。詳細は [SSL/TLS](#ssltls) 節
3. **コンテナに sqlite3 が無い** — DB 直接編集は コンテナ停止 → ホストから操作。詳細は [docs/incidents/2026-04-21-db-intervention.md](./incidents/2026-04-21-db-intervention.md)
4. **本番限定アセット**: `kit-006`〜`kit-028`, `kit-030`, `kit-032` のシール画像/音源は EC2 ディスクのみに存在 (DB 上では公開済み)。コミットしないこと

---

## デプロイ

### 通常デプロイ (コード変更時)

```bash
ssh -i ~/.ssh/sticker-app-key.pem ec2-user@16.176.17.115
cd ~/sticker-app
PULL=1 bash scripts/ec2-deploy.sh
```

`scripts/ec2-deploy.sh` がやること:
1. `server/.env` のバックアップ作成 (`server/.env.bak.<datetime>`)
2. 必須 env (`COOKIE_SAME_SITE`, `ANONYMOUS_WORK_RETENTION_DAYS`) を冪等追記
3. `docker-compose config` で構文チェック
4. `docker compose build encoder && up -d --force-recreate encoder`
5. 起動ログ表示
6. `https://api.sirucho.com/health` で 200 確認

### ロールバック

```bash
ROLLBACK=main bash scripts/ec2-deploy.sh
```

または特定の commit にロールバックしたい場合:
```bash
git checkout <commit-sha>
sudo docker compose build encoder && sudo docker compose up -d encoder
```

### コードに変更がない場合 (アセット同期のみなど)

```bash
git pull --ff-only origin main
# Docker は再起動不要 (volume mount で public/ と server/data/ は反映される)
```

---

## SSL/TLS

### 構成
- Let's Encrypt 証明書 (`certbot 2.6.0` AL2023 dnf 版)
- 証明書: `/etc/letsencrypt/live/api.sirucho.com/{fullchain,privkey}.pem`
- Nginx config: `/etc/nginx/conf.d/api.sirucho.com.conf`
- 自動更新: `certbot-renew.timer` (systemd) — 毎日 0:00 と 12:00 + ランダム遅延 12h
- Renewal hook: `installer = nginx` で certbot が更新後に nginx を自動 reload

### 証明書状態確認
```bash
# ローカルから
echo | openssl s_client -servername api.sirucho.com -connect api.sirucho.com:443 2>/dev/null | openssl x509 -noout -dates

# EC2 上から
sudo certbot certificates
```

### 手動更新 (緊急時)
ローカルから:
```bash
bash scripts/renew-ssl.sh
```

EC2 上で直接:
```bash
sudo bash scripts/ec2-renew-ssl.sh
```

両スクリプトとも 3 段階 (`STAGE=diagnose|dryrun|renew`) で実行できる。

### Auto-renewal タイマー再構築
```bash
sudo bash scripts/ec2-setup-ssl-autorenew.sh
```

### 監視
```bash
# 次回実行時刻
sudo systemctl list-timers certbot-renew.timer

# 過去の実行履歴
sudo journalctl -u certbot-renew.service --since '7 days ago'
```

---

## データベース

### SQLite ファイル
- パス: `~/sticker-app/server/data/sticker.db` (host)
- マウント: `/app/data/sticker.db` (container)
- ライブ DB なので WAL/SHM ファイルが付帯する

### バックアップ命名規則
| 接尾辞 | 用途 |
|---|---|
| `.bak.<datetime>` | 通常バックアップ |
| `.forensic-<datetime>` | エラー発生時の現状保全 (調査用) |
| `.pre-restore-<datetime>` | 復旧操作直前のロールバック用 |

これらは `.gitignore` で追跡対象外。

### DB 直接編集が必要な場合
コンテナに sqlite3 が無いため以下のフロー:
```bash
# 1. forensic snapshot
cp server/data/sticker.db{,-shm,-wal} /tmp/forensic-$(date +%Y%m%d-%H%M%S)/

# 2. コンテナ停止
sudo docker compose down

# 3. ホストから操作
sqlite3 server/data/sticker.db

# 4. pre-restore snapshot
cp server/data/sticker.db{,-shm,-wal} server/data/pre-restore-$(date +%Y%m%d-%H%M%S)/

# 5. コンテナ再起動
sudo docker compose up -d encoder
```

詳細は [docs/incidents/2026-04-21-db-intervention.md](./incidents/2026-04-21-db-intervention.md)。

### 自動バックアップ (未実装)
**TODO**: 現在 DB のバックアップは手動のみ。cron で日次 rsync を S3 等に送る仕組みが望ましい (Phase 3G)。

---

## トラブルシューティング

### シール / キット一覧が表示されない
1. cert 期限を確認: `openssl s_client -connect api.sirucho.com:443` (60 番台 SSL エラーなら cert 問題)
2. API 直接叩く: `curl -v https://api.sirucho.com/health`
3. CORS エラー: ブラウザコンソールで `ALLOWED_ORIGINS` のずれを確認
4. **過去事例**: 2026-04-29 cert 期限切れ → `scripts/renew-ssl.sh` で復旧

### 動画エクスポートが失敗
1. encoder コンテナが起動しているか: `sudo docker compose ps`
2. FFmpeg がイメージに含まれているか: `sudo docker compose exec encoder which ffmpeg`
3. nginx の `client_max_body_size` 確認 (現在 100M)
4. CORS: `ALLOWED_ORIGINS` に本番ドメイン両方 (`sirucho.com` と `www.sirucho.com`) を含めること

### メール認証が届かない / リンクが localhost
- `server/.env` の `FRONTEND_URL` を確認 (`http://localhost:5173` ではないこと)
- Resend / AWS SES 側で送信ドメインの認証状態を確認
- 過去事例: docker-compose.yml に `env_file` が無く環境変数が伝わっていなかった (2026-04-10 修正済み)

### コンテナログ
```bash
sudo docker compose logs --tail=200 encoder
sudo docker compose logs -f encoder
```

---

## 災害復旧 (Disaster Recovery)

### EC2 インスタンス全損時
1. 新しい EC2 を AL2023 で立ち上げ、Docker / Nginx / certbot をインストール
2. `git clone` でリポジトリ取得
3. `server/.env` を再作成 (バックアップから復元 or `.env.example` から手動作成)
4. **DB 復元**: 別途バックアップしてあるなら `server/data/` に配置
5. **アセット復元**: `kit-006`〜 のバイナリは git に無いため、別バックアップ必須 ⚠️
6. `bash scripts/ec2-deploy.sh` でコンテナ起動
7. `bash scripts/ec2-setup-ssl-autorenew.sh` で SSL timer 再設定
8. certbot で新規 cert 発行 (`sudo certbot --nginx -d api.sirucho.com`)
9. DNS の A レコード更新 (新 IP へ)

### Vercel プロジェクト全損
- GitHub から再連携で復元可能 (環境変数の再設定だけ手動)

---

## 関連ドキュメント
- 進捗・引き継ぎ: [project-status.md](./project-status.md)
- 4/21 DB 操作の運用ログ: [incidents/2026-04-21-db-intervention.md](./incidents/2026-04-21-db-intervention.md)
- アセット管理: [asset-guide.md](./asset-guide.md)
- AdSense 関連: [adsense-handoff.md](./adsense-handoff.md)
