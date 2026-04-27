# Sticker App

音楽シールを台紙に貼って、再生・共有・公開できる Web アプリです。  
フロントエンド、クリエイター画面、管理画面、Express API を同じリポジトリで管理しています。

## 構成

- `src/app`: 公開アプリ本体
- `src/creator`: クリエイター向け機能
- `src/admin`: 管理画面
- `src/pages`: 固定ページ、記事ページ
- `server`: Express API、認証、DB、アップロード、エンコード API
- `public/assets`: 公開アセット
- `docs`: 引き継ぎ・運用メモ

## 開発環境

### フロントエンド

```bash
npm install
npm run dev
```

### API サーバー

```bash
cd server
npm install
npm start
```

### Docker で API を動かす場合

```bash
docker compose up -d
```

## よく使うコマンド

```bash
npm run dev
npm run test:run
npm run build
```

## 動作確認

- フロントエンド: `http://localhost:5173`
- API: `http://localhost:3001`
- ヘルスチェック: `http://localhost:3001/health`

## 環境変数

フロントエンドは `VITE_API_URL` と `VITE_ASSET_BASE_URL` を参照します。  
開発環境では `localhost` が自動的に現在ホストへ置換されるため、スマホ実機検証にも対応しています。実装は [src/config/apiUrl.ts](/Users/ryutaro/sticker-app/src/config/apiUrl.ts:1) を参照してください。

サーバー側の代表的な環境変数は以下です。

- `ALLOWED_ORIGINS`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `UPLOAD_DIR`

詳細は [docs/DEPLOY.md](/Users/ryutaro/sticker-app/docs/DEPLOY.md:1) と `server/.env` を参照してください。

## 品質チェック

- フロントエンドの単体テストは `Vitest`
- CI では `npm run test:run` と `npm run build` を実行
- サーバー側は依存インストール後に構文チェックを実行

## 現状メモ

- 進捗・引き継ぎは [docs/project-status.md](/Users/ryutaro/sticker-app/docs/project-status.md:1)
- 本番運用情報は [docs/DEPLOY.md](/Users/ryutaro/sticker-app/docs/DEPLOY.md:1)
- このリポジトリには画像・音源アセットが多く、生成物や検証ログをコミットしない運用が前提です
  
