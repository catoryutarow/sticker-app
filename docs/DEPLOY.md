# デプロイガイド

## 概要

本アプリは **2コンポーネント構成** です:

1. **フロントエンド**: 静的ファイル配信 (Vercel推奨)
2. **エンコードサーバー**: Docker + FFmpeg (Fly.io推奨)

---

## 推奨構成: Vercel + Fly.io

### Step 1: エンコードサーバーをFly.ioにデプロイ

```bash
# Fly CLIインストール
brew install flyctl

# ログイン
flyctl auth login

# serverディレクトリで初期化
cd server
flyctl launch --name sticker-encoder --region nrt

# アプリ名を確認（デプロイ後のURL用）
# 例: sticker-encoder.fly.dev

# CORS用の許可オリジンを設定（Vercelデプロイ後に更新）
flyctl secrets set ALLOWED_ORIGINS=https://your-app.vercel.app

# デプロイ
flyctl deploy
```

**ヘルスチェック確認:**
```bash
curl https://sticker-encoder.fly.dev/health
# => {"status":"ok"}
```

### Step 2: フロントエンドをVercelにデプロイ

1. [vercel.com](https://vercel.com) でアカウント作成
2. GitHubリポジトリを接続
3. 環境変数を設定:
   - `VITE_ENCODER_URL` = `https://sticker-encoder.fly.dev`
4. デプロイ

### Step 3: CORSを更新

Vercelのデプロイ完了後、Fly.ioのCORS設定を更新:

```bash
cd server
flyctl secrets set ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

## 代替構成

### Railway（シンプル）

1. [railway.app](https://railway.app) でアカウント作成
2. GitHubリポジトリ接続
3. 2つのサービスを作成:
   - **Frontend**: Root `/`, Build `npm run build`
   - **Encoder**: Root `/server`, Dockerfile使用
4. 環境変数設定

**料金**: $5/月〜

### VPS（低コスト）

単一VPSで両方を動かす場合:

```bash
# Docker インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# リポジトリをクローン
git clone <repo> && cd sticker-app

# フロントエンドビルド
npm install && npm run build

# Nginx設定（dist配信）
sudo apt install nginx
# /etc/nginx/sites-available/default を編集
# root /path/to/sticker-app/dist;

# エンコードサーバー起動
cd server
docker build -t encoder .
docker run -d -p 3001:3001 --restart=unless-stopped encoder
```

---

## 環境変数一覧

### フロントエンド

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `VITE_ENCODER_URL` | エンコードサーバーURL | `https://sticker-encoder.fly.dev` |

### エンコードサーバー

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `PORT` | サーバーポート | `3001` |
| `ALLOWED_ORIGINS` | CORS許可オリジン（カンマ区切り） | `https://app.vercel.app,https://example.com` |

---

## ローカル開発

```bash
# フロントエンド開発サーバー
npm run dev

# エンコードサーバー（Docker）
docker compose up -d

# または直接起動
cd server && npm install && npm start
```

---

## デプロイ前チェックリスト

- [ ] `npm run build` が成功する
- [ ] `dist/` 内にアセット（audio, stickers）が含まれている
- [ ] エンコードサーバーの `/health` が応答する
- [ ] `VITE_ENCODER_URL` が正しく設定されている
- [ ] `ALLOWED_ORIGINS` が本番ドメインを含んでいる
- [ ] HTTPSで動作確認

---

## トラブルシューティング

### エクスポートが失敗する

1. エンコードサーバーのヘルスチェック確認
2. ブラウザのネットワークタブでCORSエラー確認
3. `ALLOWED_ORIGINS` に本番ドメインが含まれているか確認

### 音声が再生されない

- ブラウザの自動再生ポリシー制限
- 画面タップ後に再生ボタンを押す

### ビルドサイズ警告

Viteビルド時の警告は正常です。必要に応じて:
- コード分割の検討
- `build.chunkSizeWarningLimit` の調整
