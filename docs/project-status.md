# Sticker App プロジェクト進捗レポート

## 概要
音楽シールを台紙に貼り付けて楽曲を作成するWebアプリケーション

---

## 解決済みの課題

### 1. Webサービスとしての完成度

| 課題 | 解決策 | 効果 |
|------|--------|------|
| キット・シールの静的データ依存 | 全データをDB管理に移行、API経由で動的取得 | コード変更なしでコンテンツ追加可能 |
| クリエイター認証 | JWT認証 + ロールベース権限管理 | セキュアなコンテンツ管理 |
| 管理者機能 | Admin専用ビュー（ユーザー管理、キット管理、タグ管理） | 運用効率化 |
| キット公開ワークフロー | 下書き→公開のステータス管理、バリデーション | 品質管理の担保 |
| エラーハンドリング | ErrorBoundary、ErrorDisplay、API失敗時リトライUI | ユーザー体験向上 |
| テストカバレッジ | ユニットテスト整備（config, auth, audio） | コード品質担保 |
| CI/CD | GitHub Actions（テスト・ビルド自動化） | 品質ゲート確立 |

### 2. ユーザー体験（UX）

| 課題 | 解決策 | 効果 |
|------|--------|------|
| キットの発見性が低い | KitFinderModal（検索、タグ、キー絞り込み） | 目的のキットに素早くアクセス |
| タグによる分類がない | タグシステム実装（定義済み + カスタムタグ） | 直感的なカテゴリ分け |
| Musical keyの表記揺れ | 正規化処理（単一キー → 平行調形式） | 一貫した表示 |
| シールレイアウトの柔軟性 | LayoutEditor実装（位置・サイズ・回転・枚数） | クリエイターの表現力向上 |
| 音声ライブラリがない | AudioLibrary機能（アップロード、検索、再利用） | 制作効率向上 |
| オンボーディング不足 | WelcomeModal実装（初回ユーザー向けガイド） | 初回離脱率低減 |
| モバイル最適化不足 | タッチ操作改善、レスポンシブUI強化 | モバイルUX向上 |
| 作品保存・共有機能なし | ShareDialog、WorkPage、SNS共有（X, LINE）実装 | バイラル拡散可能 |
| キット共有機能なし | KitShareDialog、URL共有（/?kit=xxx）実装 | クリエイターの宣伝手段 |
| 共有ビューがクロスデバイス非対応 | アスペクト比3:4統一、パーセンテージ座標、基準幅スケーリング | PC/スマホ間で同一表示 |
| PCビューのレイアウトが粗い | 3カラムレイアウト（パレット/台紙/コントロール）、グラスモーフィズムUI | 洗練されたPC体験 |
| 多言語対応なし | react-i18next導入、5言語対応 | グローバル展開可能 |

### 3. セキュリティ

| 課題 | 解決策 | 効果 |
|------|--------|------|
| メール認証なし | AWS SESによるメール認証実装 | 偽メール登録防止 |
| パスワードリセットなし | トークンベースのリセットフロー | パスワード忘れ時の復旧可能 |
| レート制限なし | express-rate-limit導入（login: 5回/15分） | ブルートフォース攻撃対策 |
| セキュリティヘッダーなし | helmet導入（CSP, XSS対策等11種） | OWASP対応強化 |
| 入力検証が不十分 | express-validator導入 | インジェクション対策 |
| アカウント削除機能なし | DELETE /api/auth/delete-account実装 | GDPR/プライバシー対応 |

### 4. スケーラビリティ

| 課題 | 解決策 | 効果 |
|------|--------|------|
| キット数増加時のパフォーマンス | 無限スクロール（ページネーションAPI） | 初期ロード軽量化 |
| 全キット一括取得の非効率 | ページネーションAPI（10件/ページ） | メモリ使用量削減 |
| カードスタック描画負荷 | 表示カード数を最大3枚に制限 | レンダリング最適化 |
| 静的データとDBの二重管理 | 静的データ依存を完全削除 | 単一データソース |
| アセット配信の柔軟性 | CDN対応URL管理（VITE_ASSET_BASE_URL） | 本番環境でCDN利用可能 |
| 画像サイズが大きい | WebP変換（86%削減: 2.27MB→0.31MB） | 読み込み高速化 |
| 全音声の事前ロード | 遅延ロード（キット選択時にプリロード） | 初期化時間短縮 |

---

## 残っている課題

### 1. Webサービスとしての完成度

| 優先度 | 課題 | 現状 | 推奨対応 |
|--------|------|------|----------|
| 高 | 本番メール認証設定 | AWS SES移行完了、サンドボックス解除待ち | 審査通過後に本番運用開始 |
| 中 | ログ・モニタリング | PM2ログのみ | Sentry, CloudWatch等導入 |
| 低 | API ドキュメント | 未整備 | OpenAPI/Swagger導入 |

### 2. ユーザー体験（UX）

| 優先度 | 課題 | 現状 | 推奨対応 |
|--------|------|------|----------|
| 中 | お気に入りキット | 機能なし | ユーザーごとのブックマーク |
| 中 | 再生履歴・最近使用 | 機能なし | 直近使用キットの優先表示 |
| 低 | アクセシビリティ | 基本的なaria-labelのみ | WCAG 2.1準拠 |

### 3. スケーラビリティ

| 優先度 | 課題 | 現状 | 推奨対応 |
|--------|------|------|----------|
| 中 | CDN配信 | Vercel経由で配信中 | CloudFront等専用CDN検討 |
| 中 | DB負荷 | SQLite（本番稼働中） | トラフィック増加時にPostgreSQL移行 |
| 中 | キャッシュ戦略 | なし | Redis導入、APIレスポンスキャッシュ |
| 低 | マイクロサービス化 | モノリス構成 | 機能分離（認証、コンテンツ、エクスポート） |

### 4. 運用・セキュリティ

| 優先度 | 課題 | 現状 | 推奨対応 |
|--------|------|------|----------|
| 高 | DBバックアップ | 手動バックアップのみ | 自動バックアップスクリプト（cron） |
| ~~高~~ | ~~JWT_SECRET~~ | ~~開発用値のまま~~ | ✅ 本番用ランダム文字列に設定済み |
| 中 | EC2セキュリティ | SSH + HTTP/HTTPS開放 | セキュリティグループ見直し |

---

## 完了したフェーズ

### ✅ Phase 1: 安定化（完了）
1. ~~エラーハンドリング強化（API失敗時のUI）~~ → ErrorBoundary, ErrorDisplay実装
2. ~~モバイルタッチ操作の改善~~ → レスポンシブUI強化
3. ~~基本的なユニットテスト追加~~ → config, auth, audio テスト実装

### ✅ Phase 2: 成長準備（完了）
1. ~~CDN導入によるアセット配信最適化~~ → assetUrl.ts でCDN対応URL管理
2. ~~オンボーディング/チュートリアル~~ → WelcomeModal実装
3. ~~作品保存・共有機能~~ → ShareDialog, WorkPage, KitShareDialog実装

### ✅ Phase 2.5: セキュリティ強化（完了）
1. ~~メール認証機能~~ → Resend統合、verify-email/resend-verification API
2. ~~パスワードリセット~~ → forgot-password/reset-password API + フロントエンドページ
3. ~~レート制限~~ → express-rate-limit（login: 5回/15分, signup: 3回/1時間）
4. ~~セキュリティヘッダー~~ → helmet導入（CSP, XSS対策等）
5. ~~入力検証強化~~ → express-validator導入
6. ~~アカウント削除~~ → delete-account API

### ✅ Phase 2.6: パフォーマンス最適化（完了）
1. ~~画像WebP変換~~ → 86%サイズ削減（2.27MB→0.31MB）
2. ~~音声遅延ロード~~ → キット選択時にオンデマンドプリロード
3. ~~クロスデバイス座標システム~~ → パーセンテージ座標でPC/スマホ間統一表示
4. ~~KitCardStack最適化~~ → 表示カード数を最大3枚に制限

### ✅ Phase 2.7: 多言語対応（完了）
1. ~~react-i18next導入~~ → 5言語対応（日本語/英語/中国語/スペイン語/韓国語）
2. ~~全コンポーネント翻訳適用~~ → 30+ファイル、350+翻訳キー
3. ~~言語切り替えUI~~ → LanguageSwitcher（ドロップダウン/ボタン）

### ✅ Phase 3: 本番デプロイ（完了）
1. ~~ドメイン取得~~ → sirucho.com / api.sirucho.com
2. ~~フロントエンドデプロイ~~ → Vercel（自動デプロイ連携）
3. ~~バックエンドデプロイ~~ → AWS EC2 (Amazon Linux 2023)
4. ~~リバースプロキシ~~ → Nginx設定
5. ~~SSL証明書~~ → Let's Encrypt (Certbot)
6. ~~プロセス管理~~ → PM2
7. ~~DBデータ移行~~ → SCP経由でローカルDB転送

---

## 推奨する次のステップ

### ~~Phase 3A: 本番デプロイ準備~~ ✅ 完了
1. ~~ドメイン取得~~ ✅ sirucho.com / api.sirucho.com
2. ~~ホスティング選定~~ ✅ Vercel（フロント）+ EC2（バックエンド）
3. ~~環境変数整理~~ ✅ 本番.env設定済み

### ~~Phase 3B: インフラ構築~~ ✅ 完了
1. ~~サーバー構築~~ ✅ EC2 + Nginx + PM2
2. ~~SSL設定~~ ✅ Let's Encrypt（Certbot）
3. ~~デプロイ設定~~ ✅ GitHub Actions連携
4. ~~CI/CD整備~~ ✅ GitHub Actions導入済み

### ~~Phase 3C: 本番デプロイ実行~~ ✅ 完了
1. ~~バックエンドデプロイ~~ ✅ EC2（api.sirucho.com）
2. ~~フロントエンドデプロイ~~ ✅ Vercel（sirucho.com）
3. ~~ドメイン接続・SSL設定~~ ✅ HTTPS通信確認済み
4. ~~DBデータ移行~~ ✅ ローカル→本番SCPアップロード完了

### 🔄 Phase 3D: 本番環境での手動テスト（進行中）
全機能を本番環境で動作確認し、エラーを修正する

#### ユーザー向け機能
- [x] トップページ表示・キット一覧読み込み
- [x] キット選択・シール配置
- [x] 音声再生（タップ/クリック）
- [x] 作品エクスポート（画像/動画） ✅ Docker+FFmpeg、Nginx設定で修正
- [x] 作品共有URL生成・表示 ✅ vercel.json rewrites追加で修正
- [ ] キット共有URL生成・表示
- [ ] 言語切り替え（5言語）
- [ ] モバイル表示・タッチ操作

#### 認証機能
- [ ] 新規登録（メール認証フロー）
- [ ] ログイン/ログアウト
- [ ] パスワードリセット
- [ ] アカウント削除

#### クリエイター機能
- [ ] ダッシュボード表示
- [ ] キット新規作成
- [ ] シール追加・編集
- [ ] レイアウト編集
- [ ] キット公開/非公開

#### 管理者機能
- [ ] ユーザー一覧・管理
- [ ] タグ管理

#### 発見した問題
| 問題 | ステータス | 対応 |
|------|----------|------|
| 共有URL（/w/:shareId）で404エラー | ✅ 解決 | vercel.json に rewrites 追加 |
| 動画エクスポート失敗（FFmpegなし） | ✅ 解決 | Docker Compose + Alpine FFmpeg で解決 |
| 動画エクスポートCORSエラー | ✅ 解決 | docker-compose.yml に ALLOWED_ORIGINS 追加 |
| 動画エクスポート413エラー | ✅ 解決 | Nginx client_max_body_size 100M 設定 |
| 動画エクスポート台紙フォーマット不整合 | ✅ 解決 | パーセンテージ座標対応 + 固定出力サイズ(720x960) |
| クリエイター: 画像プレビュー表示されない | ✅ 解決 | サーバー静的配信追加 + WebP変換 + VITE_ASSET_BASE_URL設定 |
| クリエイター: 音声ライブラリが空 | ✅ 解決 | UPLOAD_DIR環境変数対応 + publicディレクトリマウント |
| 認証: メール送信されない | ⏳ 進行中 | AWS SES移行完了、サンドボックス解除審査中 |

### Phase 3E: 運用準備
1. [ ] モニタリング設定（Sentry）
2. [ ] DBバックアップ自動化
3. [x] JWT_SECRET本番値設定 ✅ 設定済み
4. [x] メール送信設定 ✅ AWS SES移行完了（サンドボックス解除審査中）

### Phase 4: グロース（今後）
1. お気に入り・履歴機能
2. ログ・モニタリング強化
3. ~~多言語対応~~ ✅ 完了

---

## 本番デプロイ構成（稼働中）

```
┌─────────────────────────────────────────────────────────────┐
│                  Route 53 / お名前.com DNS                    │
└────────────┬─────────────────────────────────────┬──────────┘
             │                                     │
             │ sirucho.com                         │ api.sirucho.com
             │                                     │
┌────────────▼────────────┐    ┌───────────────────▼──────────┐
│        Vercel           │    │         AWS EC2              │
│    (フロントエンド)       │    │      (バックエンド)           │
│                         │    │                              │
│  - React SPA            │    │  - Nginx (リバースプロキシ)    │
│  - 静的アセット           │    │  - PM2 (プロセス管理)         │
│  - 自動HTTPS            │    │  - Express.js API            │
│  - GitHub連携デプロイ     │    │  - SQLite (sticker.db)       │
│                         │    │  - Let's Encrypt SSL         │
└─────────────────────────┘    └──────────────────────────────┘
```

**現在の費用:**
- Vercel: 無料（Hobby）
- EC2: 無料枠（t2.micro）
- ドメイン: 約¥1,500/年

詳細は [deployment-roadmap.md](./deployment-roadmap.md) を参照

---

## 技術スタック現状

| レイヤー | 技術 |
|----------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| UI Components | Radix UI (Dialog等) |
| State | React Context |
| Audio | Web Audio API |
| Backend | Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + メール認証（AWS SES） |
| Security | helmet, express-rate-limit, express-validator |
| Testing | Vitest + React Testing Library |
| i18n | react-i18next（5言語: 日/英/中/西/韓） |

---

## i18n対応状況（完了）

### 対応言語（5言語）
| 言語 | コード | フラグ | ファイル |
|------|--------|--------|----------|
| 日本語 | ja | 🇯🇵 | ja.json (678行) |
| English | en | 🇺🇸 | en.json (678行) |
| 中文 | zh | 🇨🇳 | zh.json (678行) |
| Español | es | 🇪🇸 | es.json (678行) |
| 한국어 | ko | 🇰🇷 | ko.json (678行) |

### 翻訳適用済みコンポーネント（30+ファイル）

#### メインアプリ・公開ページ
- ✅ StickerAlbum.tsx, StickerPalette.tsx
- ✅ ExportDialog.tsx, ShareDialog.tsx, KitShareDialog.tsx
- ✅ WorkPage.tsx, KitFinderModal.tsx, KitCardStack.tsx
- ✅ WelcomeModal.tsx, BackgroundSwitcher.tsx

#### クリエイタービュー
- ✅ CreatorLayout.tsx, DashboardPage.tsx
- ✅ KitsPage.tsx, NewKitPage.tsx, KitDetailPage.tsx
- ✅ SignupPage.tsx, ForgotPasswordPage.tsx
- ✅ ResetPasswordPage.tsx, VerifyEmailPage.tsx

#### クリエイターコンポーネント
- ✅ KitForm.tsx, KitCard.tsx
- ✅ StickerCard.tsx, StickerGrid.tsx
- ✅ AudioSelector.tsx, FileUploader.tsx
- ✅ TagSelector.tsx, ImageCropper.tsx
- ✅ LayoutEditor.tsx, LayoutPreview.tsx

#### その他
- ✅ AudioEngine.ts（音声エンジン）
- ✅ LanguageSwitcher.tsx（言語切替UI）

### 翻訳キーカテゴリ（約350キー）
- `common.*` - 共通UI（保存、キャンセル、削除等）
- `nav.*` - ナビゲーション
- `app.*` - アプリ全般
- `control.*` - コントロール操作
- `audio.*` - 音声関連
- `export.*` - エクスポート機能
- `share.*`, `kitShare.*` - 共有機能
- `welcome.*` - オンボーディング
- `kitFinder.*` - キット検索
- `auth.*`, `forgotPassword.*`, `resetPassword.*`, `verifyEmail.*` - 認証
- `dashboard.*`, `guide.*` - ダッシュボード
- `kits.*`, `kitForm.*`, `kitDetail.*`, `kitCard.*` - キット管理
- `sticker.*`, `stickerCard.*`, `stickerGrid.*` - シール管理
- `layout.*`, `imageCropper.*` - レイアウト・画像
- `tagSelector.*`, `fileUploader.*` - その他コンポーネント
- `admin.*`, `error.*`, `work.*`, `creator.*` - システム

---

## 最近の主な実装履歴

| 日付 | 機能 |
|------|------|
| 2026-01-30 | **AWS SES移行完了**（Resendから移行、IAMロール認証、ドメイン認証完了） |
| 2026-01-30 | JWT_SECRET本番値設定、trust proxy設定 |
| 2026-01-29 | **エクスポート座標システム修正（パーセンテージ基準統一）** |
| 2026-01-29 | **本番環境稼働開始** (sirucho.com / api.sirucho.com) |
| 2026-01-29 | EC2 + Nginx + PM2 + Let's Encrypt構築完了 |
| 2026-01-29 | 本番DBデータ移行（ローカル→EC2） |
| 2026-01-29 | **韓国語対応追加（5言語目）** |
| 2026-01-29 | **i18n全コンポーネント適用完了（Phase 2.7完了）** |
| 2026-01-29 | i18n Phase A-1完了: CreatorLayout, KitDetailPage, AudioSelector |
| 2026-01-29 | 多言語対応（react-i18next: 日英中西4言語） |
| 2026-01-29 | コミット整理（セキュリティ、アセット最適化、UI改善を機能単位でコミット） |
| 2026-01-29 | クロスデバイス座標システム（パーセンテージ座標でPC/スマホ間統一表示） |
| 2026-01-28 | メール認証・パスワードリセット機能（Resend統合） |
| 2026-01-28 | セキュリティ強化（helmet, rate-limit, express-validator） |
| 2026-01-28 | アカウント削除機能 |
| 2026-01-28 | 画像WebP変換（86%サイズ削減） |
| 2026-01-28 | 音声遅延ロード（オンデマンドプリロード） |
| 2026-01-28 | CI/CD整備（GitHub Actions） |
| 2026-01-28 | キット共有機能（KitShareDialog, URL共有） |
| 2026-01-28 | 作品共有機能（ShareDialog, WorkPage, SNS連携） |
| 2026-01-27 | WelcomeModal（オンボーディング） |
| 2026-01-27 | CDN対応URL管理（assetUrl.ts） |
| 2026-01-27 | Phase 1安定化完了（エラーハンドリング、モバイルUX） |

---

*最終更新: 2026-01-30（Phase 3E: AWS SES移行完了、サンドボックス解除審査中）*

---

## 関連ドキュメント

- [デプロイメントロードマップ](./deployment-roadmap.md) - ドメイン取得〜本番デプロイの詳細計画
