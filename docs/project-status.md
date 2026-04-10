# Sticker App プロジェクト進捗レポート

## 概要
音楽シールを台紙に貼り付けて楽曲を作成するWebアプリケーション

---

## 🆕 直近のセッションで実装した主要機能（2026-04-10）

> **次の担当者向けの引き継ぎサマリ**: このセッションでは「クリエイターUX刷新」「スペシャルキット/スペシャル台紙機能」「背景のDB化」「本番デプロイ+データ移行」を実施しました。詳細は後述の各Phase参照。

### 1. クリエイターUX刷新（かんたん作成モード）
- **QuickCreatePage** (`src/creator/pages/QuickCreatePage.tsx`) — 5ステップのウィザード形式:
  1. キット名 + 画像選択（2〜5枚、ImageCropper で正方形トリミング）
  2. 配置プレビュー + レイアウト調整（シャッフル、追加、削除、回転）
  3. 音設定（シールごとにドラム/メロディ切替、再生試聴、PC からの音源アップロード可）
  4. 詳細（説明、テーマカラー、タグ）
  5. 完成（公開）
- **下書き/公開済みキットの再編集にも対応** — `/creator/kits/quick/:kitId` で復元可能
- **DashboardPage** — 大きな「シールをつくる」ボタン + 「上級者向け作成」リンクに整理
- **KitCard** — `MiniPreview` でライブレンダリング（サムネイルとの乖離を防止）。admin は「編集」で `/creator/kits/:id`（上級者ビュー）、一般 creator は `/creator/kits/quick/:id`（かんたん編集）に分岐
- **動的APIURL解決** (`src/config/apiUrl.ts`) — `localhost` を `window.location.hostname` に置換してモバイル実機テスト対応
- **全APIファイルが `API_BASE_URL` を共通利用**するよう統一

### 2. スペシャルキット + スペシャル台紙機能（admin専用の新コンテンツ形式）
**コンセプト**: adminが「スペシャルキット」を指定すると、そのキットのシールは2つの音源を持つ（通常BPM120 + カスタムBPMのスペシャル版）。さらにそのキットに**1対1で紐付く「スペシャル台紙」**を別途作成でき、以下の条件が全て揃ったときだけスペシャルモードが発動する:
1. キャンバスに対応キットのシールが**2枚以上**
2. キャンバスに**他キットのシール無し**
3. 現在選択中の台紙が**そのキットに紐付くスペシャル台紙**

これにより「解禁されたら台紙を切り替える」というゲーム的な体験を実現。

#### DB 変更（本番マイグレーション完了）
- `kits` テーブル: `is_special INTEGER DEFAULT 0`, `special_bpm INTEGER DEFAULT 120`
- `stickers` テーブル: `special_audio_uploaded INTEGER DEFAULT 0`
- 新規 `backgrounds` テーブル: `id`, `name`, `name_ja`, `filename`, `is_special`, `special_kit_id`(FK), `sort_order`
- マイグレーションは `server/routes/kits.js` 先頭で起動時に冪等実行

#### サーバーAPI
- `PUT /api/kits/:kitId` — admin のみ `isSpecial`/`specialBpm` を更新可能
- `POST /api/kits/:kitId/stickers/:stickerId/special-audio` — admin専用のスペシャル音源アップロード
- 新規ルーター `server/routes/backgrounds.js`:
  - `GET /api/backgrounds` — 公開
  - `POST /api/backgrounds` — admin専用（画像 + name + isSpecial + specialKitId）
  - `DELETE /api/backgrounds/:id` — admin専用（legacy 3件はファイル削除せずDBのみ）

#### フロントエンド
- **新規**: `src/api/backgroundsApi.ts`, `src/config/BackgroundDataContext.tsx`, `src/admin/pages/AdminBackgroundsPage.tsx`
- **`src/config/backgroundConfig.ts`** を DB ベースに書き換え（動的レジストリ経由）
- **`src/config/KitDataContext.tsx`** でキット読み込み時に `AudioEngine.registerKitSpecialInfo(kit_number, isSpecial, bpm, kitUuid)` を呼ぶ
- **`src/config/kitConfig.ts`** の `KitDefinition` に `kitUuid`, `isSpecial`, `specialBpm` を追加
- **`src/app/components/BackgroundSwitcher.tsx`** — 以下の可視条件を実装:
  - 対応キットのシールが2枚以上
  - 他キットのシールが0枚（両方満たさないと特殊bgは一覧に出ない）
- **`src/app/components/StickerAlbum.tsx`** — 可視条件を満たさなくなったら `setBackgroundId(DEFAULT_BACKGROUND_ID)` で自動復帰（auto-revert useEffect）
- **`src/app/components/StickerSheet.tsx`** — 背景レンダリングを `useBackgroundData()` 経由に変更（以前は空配列の `BACKGROUNDS` をマップしていたバグを修正）

#### AudioEngine の変更 (`src/audio/AudioEngine.ts`)
- **動的BPM/ループ長**: `DEFAULT_BPM = 120` を base にしつつ `calcLoopParams(bpm)` で動的計算
- **スペシャルモード検知**: `detectSpecialMode(stickers)` が「2枚以上 + 同一キット + そのキットが special + 現在背景の kitUuid が一致」を全て満たせば `isSpecial=true` を返す
- **バッファの二重管理**: `audioBuffers`(通常) + `specialAudioBuffers`(スペシャル)
- **モード遷移**: `handleModeTransition()` が全トラック停止 → BPM 変更 → スペシャル音源プリロード → 再開、を実行
- **遷移中のロック**: `modeTransitionInProgress` フラグで競合防止。遷移中の `syncWithStickers` 呼び出しは stickerStates 更新のみ
- **オフセット同期**: `startTrack()` は `trackNode.player.buffer.duration` をループ長として使用（BPM計算値ではない）。これにより 16小節@BPM181 等の任意長の音源でも正しくループする
- **スペシャルモード中の新規シール追加対応**: `startTrackWithLoad()` が `isSpecialMode=true` の場合、スペシャルバッファもオンデマンドロード
- **背景連動**: `setCurrentBackgroundKit(kitUuid|null)` で AudioEngine に現在背景の紐付きキット UUID を通知、モード再判定をトリガー

#### 管理UI
- 新規 `/admin/backgrounds` ページ — 背景一覧、アップロードフォーム（画像 + name + isSpecial + スペシャルキット選択）、削除。AdminLayout のナビに「台紙」を追加
- `KitDetailPage.tsx` に admin 専用パネル追加:
  - スペシャルキットトグル
  - `special_bpm` 入力
  - シールごとのスペシャル音源アップロード

### 3. i18n ガイド刷新
- ダッシュボードの「シールキットの作り方」ガイドが旧フロー（新規作成→シール追加→音選択→公開）のままだったため、新しいかんたん作成フローに合わせて**全5言語更新**:
  - step1: 「シールをつくる」をタップ
  - step2: 画像を選ぶ（正方形トリミング）
  - step3: 配置と音を決める（ドラム/メロディ切替）
  - step4: 詳細を設定して公開
- 旧キー（`keyInfo`, `audioTypeLabel`, `fromLibrary`, `libraryHint` 等）を新キー（`step1Info`, `step2Info`, `step3Info`, `melodyBadge`, `drumBadge`, `step2Info1/2`）に改名
- `src/creator/pages/DashboardPage.tsx` の TSX 構造も更新（step1=時計アイコン付き所要時間、step2=画像ヒントリスト、step3=音種バッジ）

### 4. デプロイと本番データ移行
- **本番環境確認** — fly.toml は古い名残で実際は **EC2 + Docker + Nginx** (`api.sirucho.com`)
- **docker-compose.yml 修正** — `env_file: ./server/.env` を追加。これ以前は `FRONTEND_URL`, `RESEND_API_KEY`, `EMAIL_FROM` がコンテナに渡されておらず、メール認証リンクが `http://localhost:5173` にフォールバックしていた長年の問題を解決
- **マイグレーション実行** — 本番EC2 で `git pull` → `docker compose build && up -d` を実行、起動時マイグレーションで新カラム追加 + backgrounds シード成功
- **kit-029 データ移行** — ローカルから本番DBへ以下を直接INSERT（ローカル/本番の admin UUID が一致していたため ID マッピング不要）:
  - Kit `ネコメタル-オッドアイ` (is_special=1, special_bpm=181)
  - 6 stickers (Drum/Bass/guitar/pad/vocal1/vocal2, 全て special_audio_uploaded=1)
  - 6 sticker_layouts
  - 1 kit_tag（ネコメタル）
  - 1 background `necometal` (is_special=1, special_kit_id=kit-029)
- **バイナリ転送** — kit-029 のアセット（音源12ファイル、シール画像6×2フォーマット、背景画像）は git 経由でコミット/push/pull 済み
- **backup**: 本番DBは `server/data/sticker.db.bak-20260410-125459` と `.bak-checkpoint-20260410-125514` としてEC2上に保管

### 5. 現時点で本番確認済みの項目
- ✅ admin ログイン（`admin@example.com`）
- ✅ `/api/backgrounds` 公開API が 4件返却（default/panel/p0436/necometal）
- ✅ 既存API (`/health`, `/api/kits/public`) 互換性維持
- ✅ スペシャルキット+スペシャル台紙の音源切替（基本ケース）
- ✅ 非対応シール追加時の auto-revert（BackgroundSwitcher + StickerAlbum）
- ✅ メール認証リンク → 正しく `https://sirucho.com/verify-email?token=...` に飛ぶように

### 6. 既知の懸念 / 未検証
- **5言語全てのガイド表記**: ja/en 以外（ko/es/zh）は新キーに沿って翻訳済みだが実機確認未了
- **kit-029 以外の複数スペシャルキット** のケース（現時点で本番には1件のみ）
- **ローカル `docker-compose.yml` と `.env.development`** は未コミット状態のまま（開発用オーバーライドとして保持）。次回 `git status` に常に M で見えるが意図通り

### 7. このセッション中のコミット（mainブランチ）
```
8374a86 fix(guide): correct image crop description — squares, not circles
b429499 docs(guide): rewrite creator guide to match Quick Create flow
22282e9 fix: hide special background when foreign sticker present, auto-revert
325dfd6 debug: add console logs to auto-revert effect (後続でクリーンアップ済)
1903fb4 feat(stickers): auto-revert to default bg when foreign-kit sticker is added
e95a2bd fix(audio): preload special buffer for stickers added during special mode
cc4ef46 fix(audio): use buffer duration for offset sync and lock mode transitions
9fd5721 fix: load env vars from server/.env in docker-compose
e5c7fe0 Merge feature/creator-improvements: special kit + dual audio + backgrounds
3b3ee51 feat: add kit-029 (ネコメタル-オッドアイ) assets and necometal special background
ba7f05d fix: StickerSheet uses dynamic backgrounds from BackgroundDataContext
772a261 feat: creator improvements (quick create, refactored kit card, dynamic API URL)
86dcffe feat: admin backgrounds management page
ce34977 feat: dynamic BackgroundSwitcher with lock-gated special backgrounds
f4be6e3 feat: gate special audio mode on matching background selection
f22b1b4 feat: dynamic backgrounds loading via API and context provider
8a12934 feat: backgrounds DB schema, seed migration, and admin API
2083609 feat: admin UI for special kit settings and special audio upload
5e8f6ff feat: wire kit special info from KitDataContext into AudioEngine
a69d2ab feat: AudioEngine special mode detection, BPM switching, dual-buffer playback
e967c06 feat: frontend types and API methods for special kit dual audio
45f1703 feat: add special kit DB columns, server API, and special audio upload endpoint
```

### 8. 次のエージェントへの注意事項
- **Docker の再ビルドが必要**: ローカルで `server/` のコードを変更したら `docker compose build encoder && up -d encoder`（ボリュームマウントではなく COPY ビルド方式）
- **本番デプロイフロー**: main に push → Vercel は自動デプロイ / EC2 は `ssh → cd ~/sticker-app → git pull → docker compose build encoder && up -d encoder`
- **ローカルのシール/音源アセット**: `kit-006` 〜 `kit-028` は未コミット。本番の同じ kit_number に別データが存在するため**絶対にコミットしない**（競合防止）
- **superpowers の writing-plans プラグイン**で作成した詳細計画: `docs/superpowers/plans/2026-04-10-special-kit-dual-audio.md`

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
| ~~高~~ | ~~本番メール認証設定~~ | ✅ AWS SES本番稼働中 | サンドボックス解除完了 |
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
6. ~~プロセス管理~~ → ~~PM2~~ Docker Compose に移行済み
7. ~~DBデータ移行~~ → SCP経由でローカルDB転送

### ✅ Phase 4: クリエイターUX刷新（完了・2026-04-10）
1. ~~QuickCreate ウィザード~~ → 5ステップの簡易作成フロー実装
2. ~~Dashboard リデザイン~~ → 大型「シールをつくる」ボタン + 上級者向けリンク
3. ~~KitCard 刷新~~ → MiniPreview でライブレンダリング、admin/creator で編集先分岐
4. ~~下書き/公開済み編集対応~~ → `/creator/kits/quick/:kitId` で復元編集
5. ~~動的APIURL解決~~ → モバイル実機テスト対応（localhost → window.location.hostname）
6. ~~「上級者向け作成」整理~~ → 全ページで統一、NewKitPage 簡素化

### ✅ Phase 5: スペシャルキット + スペシャル台紙機能（完了・2026-04-10）
1. ~~DB スキーマ拡張~~ → `kits.is_special`, `kits.special_bpm`, `stickers.special_audio_uploaded`
2. ~~backgrounds テーブル新規作成~~ → 既存3背景を legacy ID 保持でシード
3. ~~Server API~~ → admin 専用 CRUD + スペシャル音源アップロード + 背景 CRUD
4. ~~AudioEngine 拡張~~ → 動的BPM、デュアルバッファ、モード検知、遷移ロック
5. ~~BackgroundSwitcher~~ → 可視条件（2枚以上 + 他キット無し）でロック/解禁
6. ~~Admin UI~~ → `/admin/backgrounds` ページ、KitDetailPage のスペシャル設定パネル
7. ~~本番デプロイ + データ移行~~ → kit-029 + necometal 台紙を本番に完全移行

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
- [x] ダッシュボード表示 ✅ かんたん作成ボタン中心に刷新
- [x] キット新規作成 ✅ QuickCreate ウィザードで動作確認
- [x] シール追加・編集 ✅ QuickCreate 内および上級者ビューから
- [x] レイアウト編集 ✅ QuickCreate Step2 + 上級者ビュー
- [x] キット公開/非公開 ✅ 公開 → 再編集（下書きに戻す）フロー対応
- [x] スペシャルキット設定 ✅ admin 専用、KitDetailPage から

#### 管理者機能
- [ ] ユーザー一覧・管理
- [ ] タグ管理
- [x] 台紙（背景）管理 ✅ `/admin/backgrounds` ページ追加

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
| 認証: メール送信されない | ✅ 解決 | AWS SES移行完了、サンドボックス解除完了 |

### ✅ Phase 3E: AdSense審査対応（完了）
1. [x] メタデータ強化（OGP, Twitter Card, JSON-LD）
2. [x] 法定ページ作成（プライバシーポリシー、利用規約、お問い合わせ、運営者情報）
3. [x] 技術ファイル（robots.txt, sitemap.xml, ads.txt）
4. [x] 動的OGP生成（Edge Middleware + API）
5. [x] 404ページ作成
6. [x] OGP画像配置（ogp.png, og-default.png, logo.png）

### ✅ Phase 3F: アナリティクス・収益化設定（完了）
1. [x] Google Analytics 4 (GA4) 導入 → G-MMKXH1LJCZ
2. [x] Google Search Console (GSC) 登録・所有権確認完了
3. [x] AdSenseコード設置（ca-pub-9855000353509090）→ 審査申請可能状態
4. [x] サイト名変更（シルチョ → シール帳）

### Phase 3G: 運用準備（今後）
1. [ ] モニタリング設定（Sentry）
2. [ ] DBバックアップ自動化

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
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI (Dialog等) |
| State | React Context（KitDataContext, BackgroundDataContext, AuthContext） |
| Audio | Tone.js + Web Audio API（AudioEngine シングルトン、デュアルバッファ、動的BPM） |
| Backend | Express.js (Docker Compose) |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + メール認証（Resend / AWS SES） |
| Security | helmet, express-rate-limit, express-validator |
| Testing | Vitest + React Testing Library |
| i18n | react-i18next（5言語: 日/英/中/西/韓） |
| Deploy | Vercel (front) + EC2 Docker Compose (back) |

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
| 2026-04-10 | **シールキット作り方ガイド刷新**（全5言語、新かんたん作成フローに対応） |
| 2026-04-10 | **スペシャル台紙 auto-revert**（可視条件を満たさないと自動で通常台紙に戻る） |
| 2026-04-10 | **AudioEngine 修正**（buffer.duration 同期、モード遷移ロック、オンデマンド特殊バッファロード） |
| 2026-04-10 | **docker-compose env_file 修正**（FRONTEND_URL 他の環境変数が渡らないバグ解決 → メール認証リンク正常化） |
| 2026-04-10 | **kit-029 + necometal 台紙を本番に移行**（DB直接INSERT + バイナリgit転送） |
| 2026-04-10 | **スペシャル台紙機能**（DB化された backgrounds + 1:1 スペシャルキット紐付け + ロック解禁UI） |
| 2026-04-10 | **スペシャルキット + デュアル音源**（admin 専用、BPM可変、シールごと2音源） |
| 2026-04-10 | **背景をDB化**（新規 backgrounds テーブル、admin /backgrounds 管理ページ、BackgroundDataContext） |
| 2026-04-10 | **QuickCreate ウィザード**（かんたん作成5ステップ、下書き/公開済み再編集対応） |
| 2026-04-10 | **KitCard 刷新**（MiniPreview ライブレンダリング、編集先 admin/creator 分岐） |
| 2026-04-10 | **動的APIURL解決**（`apiUrl.ts` でモバイル実機テスト対応） |
| 2026-02-03 | **サイト名変更**（シルチョ → シール帳） |
| 2026-02-03 | **GA4/GSC/AdSense設定完了**（G-MMKXH1LJCZ, ca-pub-9855000353509090） |
| 2026-02-03 | **AdSense審査対応完了**（メタデータ、法定ページ、動的OGP、技術ファイル） |
| 2026-02-03 | **動的OGP生成**（Edge Middleware + Serverless API でクローラ向けOGP返却） |
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

*最終更新: 2026-04-10（Phase 4 + 5 完了: クリエイターUX刷新、スペシャルキット/スペシャル台紙機能、本番デプロイ&データ移行）*

---

## GA4・GSC 登録手順

### ✅ Google Analytics 4 (GA4) — 設定完了

- **Measurement ID**: `G-MMKXH1LJCZ`
- `index.html` にgtagスクリプト設置済み

### ✅ Google Search Console (GSC) — 設定完了

- **所有権確認**: HTMLメタタグ方式（`fDowaRJ5TELVxVbFi-5VhHuT9FW27T7Ou0vs6DhQk_o`）
- サイトマップ送信: `https://sirucho.com/sitemap.xml`

### AdSense — コード設置完了（審査未申請）

- **Publisher ID**: `ca-pub-9855000353509090`
- `index.html` にAdSenseスクリプト設置済み
- `public/ads.txt` 更新済み
- **審査申請**: 未実施（記事コンテンツ追加後に申請予定）

---

## 残推奨タスク

### 高優先度
| タスク | 現状 | 対応 |
|--------|------|------|
| ~~GA4導入~~ | ✅ 完了 | G-MMKXH1LJCZ 設定済み |
| ~~GSC登録~~ | ✅ 完了 | 所有権確認完了 |
| ~~AWS SESサンドボックス解除~~ | ✅ 完了 | 本番メール送信可能 |
| DBバックアップ自動化 | 手動のみ | cronスクリプト作成 |

### 中優先度
| タスク | 現状 | 対応 |
|--------|------|------|
| ~~AdSenseコード設置~~ | ✅ 完了 | ca-pub-9855000353509090 設定済み |
| AdSense審査申請 | 未実施 | 記事コンテンツ追加後に申請 |
| Sentry導入 | 未実施 | エラー監視設定 |
| 本番手動テスト | 一部未確認 | 認証・クリエイター機能の確認 |

### 低優先度
| タスク | 現状 | 対応 |
|--------|------|------|
| sitemap動的生成 | 静的ファイル | /w/:shareId を含む自動生成 |
| hreflang対応 | 未実施 | 多言語SEO強化 |
| お気に入り機能 | 未実施 | ユーザー機能拡張 |
| ヘルプ/使い方ページ | 未実施 | AdSense審査通過率向上のためのコンテンツ |

---

## 関連ドキュメント

- [デプロイメントロードマップ](./deployment-roadmap.md) - ドメイン取得〜本番デプロイの詳細計画
