# 2026-04-21 DB 直接編集と sqlite3 不在問題

> **タイプ**: 運用記録 (障害ではない)
> **影響**: ユーザー影響なし
> **教訓**: コンテナに sqlite3 が無いため、本番 DB 直接操作は「コンテナ停止 → ホストから操作」の手順を踏む必要がある

## 経緯 (journald タイムスタンプから再現)

| 時刻 (UTC) | 出来事 |
|---|---|
| 14:12 | admin が `docker exec encoder sqlite3 ...` で DB 直接操作を試みる |
| 14:15-14:16 | エラー: `sqlite3: executable file not found in $PATH` (コンテナイメージに sqlite3 未インストール) |
| 14:17 | 失敗時のフォレンジック用 snapshot を取得: `server/data/sticker.db.forensic-20260421-141729` (DB + WAL + SHM, 計 ~2MB) |
| 14:22 | ホストに `sudo dnf install -y sqlite` で sqlite3 を導入 |
| 14:32 | encoder コンテナを `docker compose down` で停止 (10秒タイムアウト後 SIGKILL) → ホストから sqlite3 経由で DB 編集 |
| 14:32+ | 復旧前 snapshot 取得: `sticker.db.pre-restore-20260421-143256` |
| その後 | DB 編集完了 → コンテナ再起動 |

## 残された痕跡 (本番 EC2 `~/sticker-app/server/data/`)

```
sticker.db.forensic-20260421-141729       (315KB, 14:17)
sticker.db-shm.forensic-20260421-141729   (32KB,  14:17)
sticker.db-wal.forensic-20260421-141729   (1.9MB, 14:17)
sticker.db.pre-restore-20260421-143256    (315KB, 14:05)  ← mtime と filename の datetime が乖離
sticker.db-shm.pre-restore-20260421-143256
sticker.db-wal.pre-restore-20260421-143256
```

これら 6 ファイルは復旧後も保持されており、トラブル時のロールバック用素材として機能する。`.gitignore` で追跡対象外 (`server/data/sticker.db.{forensic,pre-restore}-*` パターン、`commit ff85ad2`)。

## 教訓と運用ルール

### コンテナに sqlite3 が無い問題

`server/Dockerfile` は最小構成のため `sqlite3` CLI を含まない。本番 DB を直接操作したいときの選択肢:

| 方法 | 手順 | 備考 |
|---|---|---|
| A. ホストから操作 (採用) | コンテナ停止 → ホストから `sqlite3 server/data/sticker.db` | 一時ダウンタイム発生 |
| B. Dockerfile に追加 | `RUN apk add sqlite` | ダウンタイム不要。今後の検討余地あり |
| C. SSH トンネル + GUI | DB Browser 等で接続 | 開発時のみ。本番は非推奨 |

### スナップショット命名規則 (今後のリファレンス)

直接操作前に作るスナップショットは以下の規則で命名すると意図が明確:

- `sticker.db.forensic-<datetime>` — エラー発生時の現状保全 (失敗時の調査用)
- `sticker.db.pre-restore-<datetime>` — 復旧操作直前の状態 (ロールバック用)
- `sticker.db.bak.<datetime>` — 通常のバックアップ

### コンテナ操作の安全プロトコル (推奨)

```bash
# 1. 現状の forensic snapshot を取る (Docker 経由でも可)
sudo cp server/data/sticker.db{,-shm,-wal} /tmp/forensic-$(date +%Y%m%d-%H%M%S)/

# 2. WAL を checkpoint してから停止 (推奨)
sudo docker compose exec encoder sh -c '...'  # ※sqlite3 が無いと不可、現状は手動 down のみ

# 3. コンテナを安全に停止
sudo docker compose down

# 4. ホストから DB 操作
sqlite3 server/data/sticker.db "..."

# 5. 復旧前 snapshot を取る
cp server/data/sticker.db{,-shm,-wal} server/data/pre-restore-$(date +%Y%m%d-%H%M%S)/

# 6. コンテナ再起動
sudo docker compose up -d encoder
```

## 関連リンク

- `.gitignore` で snapshot ファイルを ignore: `commit ff85ad2`
- 本番デプロイ手順: [DEPLOY.md](../DEPLOY.md)
- 全体進捗: [project-status.md](../project-status.md)
