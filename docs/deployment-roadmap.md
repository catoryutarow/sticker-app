# デプロイメントロードマップ

## 概要
ドメイン取得から本番デプロイまでの作業計画

---

## 現在のアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         ユーザー                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    フロントエンド                             │
│         React 18 + Vite (静的ファイル配信)                    │
│         - SPA (index.html + JS/CSS)                         │
│         - アセット (画像WebP, 音声MP3)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ API呼び出し
┌─────────────────────────▼───────────────────────────────────┐
│                      バックエンド                             │
│              Express.js (Node.js)                           │
│         - REST API                                          │
│         - JWT認証                                            │
│         - ファイルアップロード (multer)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     データベース                              │
│              SQLite (better-sqlite3)                        │
│         - ユーザー、キット、シール、タグ                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 3A: 本番デプロイ準備（1-2日）

### Step 1: ドメイン取得
- [ ] ドメイン名決定
- [ ] レジストラでドメイン購入（お名前.com, Cloudflare, Google Domains等）
- [ ] DNS設定の準備

**推奨ドメイン案:**
- `sticker-music.app`
- `music-sticker.com`
- `sealcho.jp`（シール帳）

### Step 2: ホスティング選定

| サービス | フロントエンド | バックエンド | DB | 月額目安 | 備考 |
|----------|--------------|------------|-----|---------|------|
| **Vercel + Railway** | Vercel (無料) | Railway ($5~) | Railway PostgreSQL | $5-20 | 推奨：シンプル構成 |
| **Cloudflare Pages + Fly.io** | CF Pages (無料) | Fly.io ($5~) | Fly PostgreSQL | $5-15 | 高速CDN |
| **AWS (Amplify + EC2)** | Amplify | EC2/ECS | RDS | $20-50 | スケール重視 |
| **Render** | Render Static | Render Web Service | Render PostgreSQL | $7-25 | オールインワン |

**推奨構成（コスト重視）:**
```
Vercel (フロントエンド) + Railway (バックエンド + PostgreSQL)
```

### Step 3: 環境変数整理

**フロントエンド (.env.production)**
```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_ASSET_BASE_URL=https://cdn.your-domain.com
```

**バックエンド (.env.production)**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-string>
CORS_ORIGIN=https://your-domain.com
```

---

## Phase 3B: インフラ構築（2-3日）

### Step 4: PostgreSQL移行

**作業内容:**
1. PostgreSQL用スキーマ作成（SQLite→PostgreSQLの差異対応）
2. マイグレーションスクリプト作成
3. 既存データの移行
4. バックエンドのDB接続コード更新（better-sqlite3 → pg）

**優先度:** 高（本番では必須）

### Step 5: CDN設定

**Cloudflare を使用する場合:**
1. ドメインをCloudflareに追加
2. SSL/TLS設定（Full strict）
3. キャッシュルール設定
   - `/assets/*` → 1年キャッシュ
   - `/backgrounds/*` → 1年キャッシュ
   - `*.webp`, `*.mp3` → 長期キャッシュ

**または Vercel/Cloudflare Pages の組み込みCDN利用**

### Step 6: デプロイ設定

**Vercel (フロントエンド):**
```json
// vercel.json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Railway (バックエンド):**
- GitHub連携で自動デプロイ
- 環境変数設定
- PostgreSQLアドオン追加

---

## Phase 3C: 本番デプロイ実行（1日）

### Step 7: 初回デプロイ

1. **バックエンド先行デプロイ**
   - Railway にバックエンドをデプロイ
   - PostgreSQL接続確認
   - APIエンドポイント動作確認

2. **フロントエンドデプロイ**
   - Vercel にフロントエンドをデプロイ
   - 環境変数設定（API URL）
   - ビルド確認

3. **ドメイン接続**
   - カスタムドメイン設定
   - SSL証明書発行（自動）
   - DNS伝播待機（最大48時間、通常は数分〜数時間）

### Step 8: 動作確認チェックリスト

- [ ] トップページ表示
- [ ] キット一覧取得
- [ ] シール貼り付け・再生
- [ ] クリエイターログイン
- [ ] キット作成・公開
- [ ] 作品共有URL生成
- [ ] モバイル表示確認
- [ ] HTTPS強制リダイレクト

---

## Phase 3D: 運用準備（1-2日）

### Step 9: モニタリング設定

**無料で始められるサービス:**
- **Sentry** (エラートラッキング) - 無料枠あり
- **Vercel Analytics** (フロントエンド分析) - 無料枠あり
- **UptimeRobot** (死活監視) - 無料

**実装:**
```typescript
// Sentry初期化（フロントエンド）
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});
```

### Step 10: バックアップ設定

- PostgreSQLの自動バックアップ（Railway標準機能）
- アップロードファイルのバックアップ（S3/R2等）

---

## 推奨デプロイ構成図（最終形）

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare DNS                         │
│                   + SSL/TLS + CDN                           │
└────────────┬─────────────────────────────┬──────────────────┘
             │                             │
             │ your-domain.com             │ api.your-domain.com
             │                             │
┌────────────▼────────────┐    ┌───────────▼──────────────────┐
│        Vercel           │    │         Railway              │
│    (フロントエンド)       │    │      (バックエンド)           │
│                         │    │                              │
│  - React SPA            │    │  - Express.js API            │
│  - 静的アセット           │    │  - JWT認証                   │
│  - 自動HTTPS            │    │  - ファイルアップロード         │
└─────────────────────────┘    └──────────────┬───────────────┘
                                              │
                               ┌──────────────▼───────────────┐
                               │      Railway PostgreSQL      │
                               │                              │
                               │  - ユーザー                   │
                               │  - キット/シール              │
                               │  - タグ                      │
                               └──────────────────────────────┘
```

---

## 費用見積もり（月額）

| 項目 | 無料枠 | 有料時 |
|------|-------|--------|
| ドメイン | - | ¥100-1,500/年 |
| Vercel | 100GB帯域/月 | $20/月〜 |
| Railway | $5クレジット | $5-20/月 |
| Cloudflare | 無制限 | 無料 |
| Sentry | 5Kイベント/月 | $26/月〜 |
| **合計** | **$0-5/月** | **$10-50/月** |

**スタート時推奨:** 無料枠で開始し、トラフィック増加に応じてスケール

---

## 次のアクション

1. **今すぐ:** ドメイン名を決定・購入
2. **本日中:** Vercel/Railwayアカウント作成
3. **明日:** PostgreSQL移行作業開始
4. **2-3日後:** 初回デプロイ実行

---

## 参考リンク

- [Vercel ドキュメント](https://vercel.com/docs)
- [Railway ドキュメント](https://docs.railway.app/)
- [Cloudflare DNS設定](https://developers.cloudflare.com/dns/)
- [PostgreSQL移行ガイド](https://node-postgres.com/)

---

*作成日: 2026-01-28*
