# AdSense 対策エージェント向け ハンドオフ資料

> 作成日: 2026-04-21
> 対象: AdSense（ポリシー審査・収益最適化）の改善案を出すエージェント
> 本ドキュメントの目的: サイト構造・コンテンツ配置・SEO/OGP状態を **コードに当たらずに** 把握できるようにすること

## 🚨 TL;DR — 最重要背景

**過去に記事1本を追加して AdSense 審査を申請したが、不合格**。  
**不合格理由は "有用性の低いコンテンツ（Low value content）" で確定**（AdSense 管理画面「ポリシー違反が見つかりました」表示で2026-04-21 に確認）。

- 「サイトは広告を表示できない状態です」
- 「お客様のサイトは、弊社の定めるサイト運営者ネットワークのご利用要件を満たしていないと判断されました」
- 参考リンクとして提示されたのは:
  - コンテンツの最小要件
  - 独自性のある質の高いコンテンツと優れたユーザーエクスペリエンス
  - ウェブマスター向けの品質に関するガイドライン（質の低いコンテンツ）

**要点**: 技術面（ads.txt / sitemap / OGP / JSON-LD / 所有権）はクリア。純粋に **コンテンツ量と独自性の担保** で落ちている。再申請には「コンテンツ」の強化が必須。§8.5 にアクションプラン。

**外部エージェント評価（2026-04-21）**: §8.5 の戦略について「現在の不合格理由を解消するために必要十分かつ非常に高度な戦略」「方針通りに進めれば合格する可能性は極めて高い」との評価を受領。補足として「独自性を体験に寄せる」「Cookie opt-out の具体化」「インタラクティブ機能の言語化」の3点を §8.5.4 に取り込み済み。

---

## 1. サイト概要

| 項目 | 値 |
|------|------|
| サービス名 | シール帳（旧: シルチョ） |
| 本番ドメイン | `https://www.sirucho.com`（`https://sirucho.com` は **307 redirect → www**。**要301化**：Vercel Domain 設定で対応） |
| API ドメイン | `https://api.sirucho.com`（EC2 + Docker Compose + Nginx） |
| 運営 | 株式会社モテコロ |
| 業種 | 音楽Webアプリ（音楽シールを台紙に貼って楽曲を作る体験型SPA） |
| 収益 | **AdSense 審査 1 回不合格（有用性の低いコンテンツ）、再申請準備中** |
| AdSense サイト登録ホスト | **`sirucho.com`（非www・現状維持）** ← Vercel primary は www。クローラは apex → 307 → www を辿る。AdSense はリダイレクト対応しているため問題なし（§8.5.3） |
| AdSense 所有権確認 | ✅ 完了（AdSense 管理画面で緑チェック） |
| GA4 | `G-MMKXH1LJCZ`（`index.html` に gtag 設置） |
| GSC | 所有権確認済（`google-site-verification: fDowaRJ5TELVxVbFi-5VhHuT9FW27T7Ou0vs6DhQk_o`） |
| AdSense Pub ID | `ca-pub-6401969583966289`（`index.html` と `public/ads.txt` で一致） |

---

## 2. 技術スタックと配信構成

```
┌──────────── Vercel ───────────┐        ┌──────── AWS EC2 ────────┐
│  sirucho.com (SPA)            │        │  api.sirucho.com         │
│  - Vite ビルド成果物 (dist/)   │──AJAX─▶│  - Express (Docker)      │
│  - Edge Middleware (/w/*)     │        │  - SQLite (sticker.db)   │
│  - Serverless /api/ogp        │        │  - Nginx + Let's Encrypt │
└────────────────────────────────┘        └──────────────────────────┘
```

- **Frontend**: React 18 + TypeScript + Vite + Tailwind v4 + Radix UI + react-router-dom v7 + react-helmet-async
- **Backend**: Express.js + SQLite (better-sqlite3) — 記事 CRUD、キット CRUD、認証（JWT）、メール送信（AWS SES）
- **Edge レイヤ（Vercel）**: `middleware.ts`（クローラ判定）、`api/ogp.ts`（作品の動的OGP）
- **i18n**: react-i18next（ja/en/zh/es/ko） — ただし i18n は **UI のみ**、記事/法定ページは日本語固定

---

## 3. ルーティングと "どこにどのページがあるか"

ソース: `src/router/index.tsx`

### 3.1 公開ページ（AdSense が実際にクロールする対象）

| Path | コンポーネント | ソース | 備考 |
|------|--------------|--------|------|
| `/` | `App` | `src/app/App.tsx` | **メインSPA**。StickerAlbum（インタラクティブ）+ LatestArticles（記事3件） |
| `/w/:shareId` | `WorkPage` | `src/app/pages/WorkPage.tsx` | 作品共有ページ。クローラには OGP HTML を返す（後述） |
| `/about` | `AboutPage` | `src/pages/AboutPage.tsx` | サービス概要・運営会社。**静的テキスト** |
| `/privacy` | `PrivacyPage` | `src/pages/PrivacyPage.tsx` | **静的テキスト**。AdSense 節あり（§4） |
| `/terms` | `TermsPage` | `src/pages/TermsPage.tsx` | **静的テキスト** |
| `/contact` | `ContactPage` | `src/pages/ContactPage.tsx` | 外部フォーム（formbase.jp）へのリンク中心 |
| `/articles` | `ArticlesPage` | `src/pages/ArticlesPage.tsx` | 記事一覧。API `/api/articles` から fetch |
| `/articles/:slug` | `ArticlePage` | `src/pages/ArticlePage.tsx` | 記事詳細。Markdown → react-markdown で描画 |
| `*` | `NotFoundPage` | `src/pages/NotFoundPage.tsx` | 404 |

### 3.2 非公開ページ（`robots.txt` で Disallow）

| Prefix | 役割 | ガード |
|--------|------|--------|
| `/creator/*` | クリエイター（ログインユーザの作成UI） | `AuthGuard` |
| `/admin/*` | 管理者UI（ユーザ管理・背景・記事・タグ） | `AdminGuard` |

---

## 4. ファイル構造（AdSense関連の要点だけ抜粋）

```
sticker-app/
├── index.html                     # AdSense/GA4/GSC/OGP/JSON-LD 全部ここ
├── vercel.json                    # SPA フォールバック rewrites + キャッシュヘッダ
├── middleware.ts                  # /w/:shareId でクローラ検知 → /api/ogp へ rewrite
├── api/
│   └── ogp.ts                     # 作品の動的 OGP HTML 生成（クローラ専用）
├── public/
│   ├── ads.txt                    # AdSense 認証ファイル（pub-6401969583966289）
│   ├── robots.txt                 # Disallow /admin /creator, Sitemap 指定
│   ├── sitemap.xml                # 静的5件のみ (/, /privacy, /terms, /contact, /about)
│   ├── logo.png                   # JSON-LD で Organization.logo に使用
│   ├── ogp.png                    # トップの OGP 画像 (og:image)
│   ├── og-default.png             # /w/:shareId のサムネ無いときのフォールバック
│   ├── page-backgrounds/          # ページ背景画像（single: background.png）
│   ├── backgrounds/               # 作品台紙（legacy 3枚 + necometal）
│   └── assets/
│       ├── stickers/              # キット別シール画像（kit-001..005, kit-029）
│       ├── audio/                 # キット別音源（webp/mp3）
│       └── thumbnails/            # キットサムネ（kit-001..009 の png/webp 両形式）
├── src/
│   ├── main.tsx                   # React entry
│   ├── router/index.tsx           # 全ルート定義
│   ├── app/                       # "メインアプリ" (= "/" のコンテンツ)
│   │   ├── App.tsx                # 背景レイヤ + StickerAlbum + LatestArticles
│   │   ├── components/
│   │   │   ├── StickerAlbum.tsx          # 中心UI
│   │   │   ├── LatestArticles.tsx        # トップ下部に記事3件（SEO用）
│   │   │   ├── ControlPanel.tsx, StickerPalette.tsx, StickerSheet.tsx, ...
│   │   │   ├── BackgroundSwitcher.tsx    # 台紙切替（スペシャル台紙ロック解禁含む）
│   │   │   ├── ExportDialog.tsx, ShareDialog.tsx, KitShareDialog.tsx
│   │   │   └── WelcomeModal.tsx          # 初回オンボーディング
│   │   └── pages/WorkPage.tsx            # /w/:shareId
│   ├── pages/                     # "情報ページ群"（法定・記事・404）
│   │   ├── AboutPage.tsx
│   │   ├── PrivacyPage.tsx        # AdSense §4 に言及あり
│   │   ├── TermsPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── ArticlesPage.tsx       # /articles
│   │   ├── ArticlePage.tsx        # /articles/:slug
│   │   └── NotFoundPage.tsx
│   ├── creator/                   # ユーザがキット作成するビュー（/creator/*）
│   ├── admin/                     # 管理UI（/admin/*、記事エディタ含む）
│   ├── api/                       # クライアント側 API クライアント
│   ├── config/                    # apiUrl, assetUrl, KitDataContext, BackgroundDataContext
│   ├── audio/AudioEngine.ts       # Tone.js 音再生エンジン
│   ├── auth/                      # JWT 認証コンテキスト
│   ├── i18n/                      # react-i18next セットアップ
│   └── styles/
├── server/                        # Express バックエンド
│   ├── index.js
│   ├── routes/
│   │   ├── articles.js            # ★ブログ記事の公開/管理API
│   │   ├── kits.js, stickers.js 等
│   │   ├── backgrounds.js, tags.js, works.js, audioLibrary.js
│   │   ├── auth.js, admin.js
│   ├── db/                        # SQLite + スキーマ + マイグレーション
│   └── services/email.js          # AWS SES
└── docs/
    ├── project-status.md          # プロジェクト全体進捗（参照だが AdSense ID は古い）
    ├── DEPLOY.md, deployment-roadmap.md
    ├── asset-guide.md
    └── adsense-handoff.md         # ◀ 本ファイル
```

---

## 5. "AdSense が見るもの" ＝ HEAD/メタの実態

### 5.1 `index.html`（全SPAルートが初期HTMLとして受け取る）

- Title: `シール帳 - 音楽シールで楽曲を作ろう`
- `<meta name="description">` あり、日本語150字程度
- OGP: `og:type=website`, `og:image=https://sirucho.com/ogp.png`
- Twitter Card: `summary_large_image`
- JSON-LD: `WebApplication` + `Organization` + `WebSite`（`@graph` 形式）
- Robots: `index, follow`
- Canonical: `https://sirucho.com/`（**非www固定** — 実ホストは www.sirucho.com）
- AdSense タグ: `ca-pub-6401969583966289` を非同期ロード
- GA4 gtag: 設置済
- 日本語フォント: DotGothic16 / WDXL Lubrifont を Google Fonts から preconnect

### 5.2 CSR で head を上書きするページ（react-helmet-async）

`/privacy`, `/terms`, `/about`, `/contact`, `/articles`, `/articles/:slug` は **JS実行後** に title/canonical/OGP が差し替わる。初期HTMLはすべて `index.html` のデフォルトなので:

- 本番で `curl https://www.sirucho.com/articles` すると `<title>シール帳 - 音楽シールで楽曲を作ろう</title>` と **canonical=sirucho.com/** のまま返る（実測済 2026-04-21）
- Googlebot は JS 実行するので最終的には読むが、AdSense 審査クローラは JS 非実行のことがある。**審査観点では要改善**

### 5.3 `/w/:shareId`（作品共有ページ）の特殊扱い

`middleware.ts` が UA に `bot|crawl|facebookexternalhit|twitterbot|...|googlebot` 等を検知したら `/api/ogp?id=:shareId` に **rewrite** → `api/ogp.ts` が API からワーク情報を取得して OGP 付きミニHTMLを返し `<script>window.location.replace(...)` で実ページに戻す。
- OGP画像・タイトル・JSON-LD (`CreativeWork`) あり
- リダイレクト先は non-www `https://sirucho.com/w/:shareId`（ホスト不一致）

---

## 6. `public/` 静的ファイル

| ファイル | 内容 | AdSense 観点 |
|---------|------|--------------|
| `ads.txt` | `google.com, pub-6401969583966289, DIRECT, f08c47fec0942fa0` | **OK**。`www.sirucho.com` でも `sirucho.com` でも同じ内容を返す必要あり（www redirect 経由で配信） |
| `robots.txt` | `Allow: /`, `Disallow: /admin /creator`, `Sitemap: https://sirucho.com/sitemap.xml` | Sitemap URL が non-www。ホスト正規化と要整合 |
| `sitemap.xml` | **静的5件のみ**: `/`, `/privacy`, `/terms`, `/contact`, `/about`。全部 `lastmod=2026-02-03` で止まっている | **要改善**: `/articles`, `/articles/:slug`, 可能なら `/w/:shareId` が抜けている |
| `ogp.png`, `og-default.png`, `logo.png` | 設置済み | OK |

---

## 7. ブログ（コンテンツ）の実態

AdSense 審査で最重要な "十分なコンテンツ量" の観点:

- **本番DBの記事数: 1件のみ**（API `/api/articles` で確認、2026-04-21時点）
  - `slug: sirucho-boom-reason` / 「令和に再燃！『シール帳』ブームが再来。大人も子どもも『シル活』に夢中になる理由」 / published_at: 2026-02-14
  - `thumbnail: null`（サムネイル画像なし → SNSシェア時にフォールバック画像になる）
- ローカル dev DB には記事0件（記事は本番に直接登録されている運用）
- 記事編集UI: `/admin/articles`（`AdminArticlesPage.tsx` + `ArticleEditPage.tsx`）、画像アップロードや slug 編集も可能
- 記事本文は Markdown、`react-markdown` + `remark-gfm` で描画
- 記事詳細ページ(`ArticlePage.tsx`)の head:
  - title `{article.title} | シール帳`
  - `og:type=article`
  - JSON-LD `BlogPosting`（author/publisher は "シール帳"）
  - canonical `https://sirucho.com/articles/:slug`（non-www）

### トップページ `/` にも記事への導線あり
`src/app/App.tsx` が最下部で `<LatestArticles />` をレンダリング → API `/api/articles?limit=3` から取得し3件カード表示。`/articles` への全記事リンクあり。**ただしトップ内容の主軸は StickerAlbum（インタラクティブUI）** で、テキスト情報は少ない。

---

## 8. 法定ページの状況（AdSense 必須要件）

| ページ | 在処 | 内容充実度 | 備考 |
|--------|------|------------|------|
| プライバシーポリシー | `/privacy` | ○ | §4 に Google AdSense Cookie の説明あり、Googleポリシーへの外部リンクあり |
| 利用規約 | `/terms` | ○ | 158行 |
| お問い合わせ | `/contact` | △ | 外部フォーム（formbase.jp）リンク + メール連絡先。ページ自体のコンテンツは薄い |
| 運営者情報 | `/about` | ○ | 株式会社モテコロ記載、公式サイトへの外部リンクあり |

---

## 8.5. 🚨 AdSense 審査落ち ── 確定情報と再申請戦略

### 8.5.1 確定した不合格理由

AdSense 管理画面のスクリーンショット（2026-04-21 確認）より:

| 項目 | 内容 |
|------|------|
| 登録サイト | **`sirucho.com`**（非www） |
| 現状ステータス | 「サイトは広告を表示できない状態です」 |
| 所有権確認 | ✅ 完了 |
| ポリシー違反 | ❗ **「ポリシー違反が見つかりました」** |
| **違反の具体名** | **「有用性の低いコンテンツ」** |
| Google の説明 | 「お客様のサイトは、弊社の定めるサイト運営者ネットワークのご利用要件を満たしていないと判断されました」 |
| 参照ガイドライン（公式リンク） | ① コンテンツの最小要件<br>② 独自性のある質の高いコンテンツと優れたユーザーエクスペリエンス<br>③ ウェブマスター向けの品質に関するガイドライン（質の低いコンテンツ） |

**判定の意味**: 技術設定（ads.txt / sitemap / OGP / 所有権）には問題なし。**純粋にコンテンツ量 + 独自価値で不合格**。Google は文章量・独自性・ユーザー価値を見ている。

### 8.5.2 なぜ落ちたのか（根本原因の推定）

前回申請時の状態は以下のはず:

| 要素 | 状態 | AdSense が見たとき |
|------|------|------------------|
| 公開記事数 | **1本のみ**（`sirucho-boom-reason`） | 「記事コーナーが事実上存在しない」 |
| 記事の質 | 冒頭引用 + 数百字〜1000字規模（要確認） | 独自性判定が厳しい |
| トップページ | StickerAlbum（インタラクティブUI）＋ LatestArticles（記事3件カードのみ） | **初期HTMLではテキストがほとんど出ない**（SPA） |
| `/about`, `/privacy`, `/terms`, `/contact` | 定型の法定文章のみ | 「独自コンテンツ」としては評価されない |
| SPAサブページの初期HTML | 全部同じ index.html（CSR依存） | クローラがJS非実行時、**全ページが同じ内容に見える** = 低品質扱い |
| フッター導線 | トップにフッターなし | 内部リンクグラフが薄い |

つまり Google 側の理屈は「**インタラクティブアプリ + 法定ページ + 記事1本 = 広告を貼るに値する独自コンテンツがない**」。

### 8.5.3 AdSense 登録ホスト（`sirucho.com` 非www）について

結論: **このままで問題ない。変更しない。**

- AdSense 登録は `sirucho.com`（apex）。本番実配信は `www.sirucho.com`（Vercel primary）。apex → www は 307 リダイレクト。
- **AdSense クローラはリダイレクトを追う** ため、登録が apex でも最終的に評価されるのは www 側のコンテンツ。この点で不利益はない。
- 所有権確認済みの登録を触ると（www を追加／apex を削除すると）再検証が必要になり、既存の「問題を修正しました → 審査をリクエスト」ボタンが使えなくなる可能性がある。
- **不合格理由は "有用性の低いコンテンツ" であってホスト問題ではない**。ここを触ってもポリシー違反は消えない。

つまり:

| 要素 | 現状 | アクション |
|------|------|-----------|
| AdSense 登録 | `sirucho.com`（apex）で所有権確認済 | **維持**。再申請もこの登録のボタンから |
| Vercel primary | `www.sirucho.com` | **維持** |
| コード canonical / OGP / sitemap | `www.sirucho.com`（2026-04-21 に統一） | **維持**。AdSense はリダイレクトを辿るのでこれで問題なし |
| apex → www の 307 | 307（一時） | 🟠 可能なら Vercel Domain 設定で 308 化。ただし必須ではない |

**本当に直すべきは「有用性の低いコンテンツ」の中身**。§8.5.4 を参照。

### 8.5.4 再申請前チェックリスト（不合格理由ベース）

#### 🔴 必須（"有用性の低いコンテンツ" を解消するため、ここが本丸）

##### 記事の量と質

- [ ] **記事を最低 10〜15 本に増やす**（AdSense 通過の実績値。1本は明らかに不足）
  - 1本あたり **2000〜3000 字**、オリジナル文章、画像2〜3枚
  - 書く場所: `/admin/articles/new`
  - テーマ案:
    1. シール帳の使い方・チュートリアル（画面キャプチャ入り）
    2. シールで音楽を作るって何？ 初心者向け解説
    3. "スペシャルキット" の楽しみ方
    4. 音楽理論のやさしい入門（BPM、ループ、ビート感）
    5. 音楽アプリで子どもと遊ぶアイデア
    6. ワークショップ事例・活用例（運営のモテコロ実績と連動）
    7. シール帳で作った作品のベストピック（月1）
    8. 更新情報・新機能紹介（連載）
  - **すべての記事にサムネイル画像を設定**（現状 `thumbnail=null`、審査・SNSシェアの両方で不利）

##### 記事・ページの "独自性（体験）" を担保する必須要素

Google は「他サイトの焼き直し」を厳しく弾く。すべての記事・ページで以下を**最低1つ**満たすこと:

- [ ] **シール帳アプリ内の実スクリーンショット**: 汎用フリー素材ではなく、実際に楽曲を作成中の画面／管理UI／作品共有画面など「このアプリでしか撮れない」画像を多用する。
- [ ] **E-E-A-T の発揮**: 記事の文章中に **株式会社モテコロとしての専門性**（音楽コンサルティング・ワークショップ実績・QOML経営理念）を織り込む。具体的には:
  - 「なぜこのアプリを作ったのか」開発ストーリー
  - 音楽教育・セラピーへの活用可能性
  - 著者の経歴（運営者プロフィール）を `/about` から辿れるように
- [ ] **インタラクティブ機能の言語化**: クローラは "音楽を奏でる体験" を理解できない。以下のような言語情報をアプリ紹介記事・About・チュートリアル記事に厚めに配置する:
  - 「シールをタップすると音が鳴ります」
  - 「このシールは BPM120 のドラムループです」
  - 「台紙を切り替えることで曲の雰囲気が変わります」
  - 「2枚以上同じキットのシールを置くと "スペシャルモード" が解禁されます」
  - 操作手順を **テキスト + 画像 + 必要なら動画キャプチャ** で表現

##### SPA の弱点を埋める静的HTML化

- [ ] **トップページ（`/`）の静的テキスト量を増やす**
  - `src/app/App.tsx` の下部（LatestArticles の前後）に「このアプリとは」「できること」「使い方の流れ」「よくある質問」等のセクションを追加
  - **初期HTML（JS実行前）** に日本語本文が数百字以上入ることが重要
  - 前項「インタラクティブ機能の言語化」をここに直接入れてもよい
- [ ] **`/about` をリッチ化**
  - 現状はサービス概要＋3つの特徴＋運営会社リンクで短め
  - 追加すべき内容: サービスの着想ストーリー、運営者の専門性（音楽コンサルタント/モテコロの事業）、更新ポリシー、コンタクト、E-E-A-T 要素
- [ ] **フッターコンポーネントを新規作成**（全ページ共通）
  - リンク: Articles / About / Privacy / Terms / Contact / 運営会社公式
  - コピーライト、運営会社名、住所（登記住所 or 事業所住所）
  - 実装場所案: `src/components/Footer.tsx` を新規作成し、`src/app/App.tsx` と各 `src/pages/*` に配置
- [ ] **`/contact` を FAQ 付きに拡張**
  - 返信目安（例: 3営業日以内）
  - よくあるご質問セクション（使い方／著作権／アカウント／技術的問題）
  - 問い合わせフォーム（formbase.jp）は残してOKだが、**ページ自体に独自文章を足す**

#### 🟠 強く推奨（技術面の補強）

- [ ] **AdSense 登録は現状維持**（`sirucho.com` のまま。§8.5.3 参照）
- [ ] **Vercel で apex→www を 307 → 308 恒久化**（Vercel ダッシュボード → Domain → `sirucho.com` を Redirect に設定）。AdSense はリダイレクトを辿るので必須ではないが、恒久化した方がクローラの扱いが素直になる
- [ ] **SPAサブページのSSR対応**（クローラに正しい title/canonical/OGP を返す）
  - `middleware.ts` のクローラ UA 検知対象に `/articles/*`, `/about`, `/privacy`, `/terms`, `/contact` を追加
  - 新規 `api/page-ogp.ts` または `api/article-ogp.ts` で SSR ミニHTML を返す
  - `api/ogp.ts`（作品共有ページ用）と同パターンで実装可能
- [ ] **動的 sitemap 生成**: `api/sitemap.ts` を作成し記事を自動列挙。`vercel.json` で `/sitemap.xml` → `/api/sitemap` を rewrite。

#### 🟡 中優先（品質の底上げ）

- [ ] **UGC ポリシーの明文化**: `/terms` に「アップロード音源は権利所有分のみ」「違反コンテンツの削除プロセス」を追加。AdSense 面だけでなく法務面でも必要。
- [ ] **プライバシーポリシーの Cookie 記述を具体化**（AdSense はここを厳格にチェックする）
  - 現状 `src/pages/PrivacyPage.tsx` §4 には「第三者配信の広告サービス（Google AdSense）を利用する場合があります」「Googleの広告に関するポリシー」へのリンクしかない。**以下を明記すること**:
    - **パーソナライズ広告の無効化手順** — Google 広告設定（`https://adssettings.google.com/`）へのリンクと、「ここから広告のパーソナライズを無効にできる」旨の明記
    - **Cookie を無効化する具体的手順** — ブラウザごとの設定方法 or 案内リンク
    - **収集するデータの種類** — IPアドレス、訪問履歴、デバイス情報など
    - **データ保持期間** — AdSense / GA4 の保持設定（GA4 のデフォルト: 2ヶ月〜14ヶ月）
    - **EEA（欧州）ユーザー向けの同意管理** — GDPR 対応として、Google 公式 CMP（Funding Choices）等の導入検討。日本語サイトでも EEA からのアクセスがある限り要件
- [ ] **AdSense 広告ユニット `<ins class="adsbygoogle">` の実配置**: 審査通過前でも配置はOK。配置候補:
  - `/articles/:slug` の記事下・記事中
  - `/articles` 一覧のカード間
  - `/about` サイドバー
- [ ] **記事のカテゴリ分けとパンくずナビ**（タグ機能は既にDBにあるので活用可能 — `tags` テーブル）。

#### 🟢 低優先（長期継続）

- [ ] hreflang 実装（多言語 SEO）
- [ ] 記事の内部リンク相互ネットワーク化
- [ ] Core Web Vitals（LCP/CLS/INP）計測と改善

### 8.5.5 再申請までの段階的ロードマップ

外部エージェントの評価（2026-04-21）で推奨された実施順を採用。**並列化できるタスクは並列化**して合計期間を短縮する。

#### Stage 1: 空っぽ状態の脱出（1〜2週間）
ゴール: クローラが来たときに「まっとうなサイト」と見えるようにする。

- [ ] **記事 5 本を公開**（まずは空っぽ脱出が最優先。1本だけの状態が最も危険）
  - 独自スクリーンショット＋E-E-A-T 要素＋インタラクティブ機能の言語化 を含める
  - サムネ画像は全記事に設定
- [ ] 並列で: **トップページの静的テキストセクション追加**（`src/app/App.tsx`）
- [ ] 並列で: **共通フッターコンポーネント新規作成**（`src/components/Footer.tsx`）

#### Stage 2: クローラに "各ページが独立した価値を持つ" ことを示す（Stage 1 と並列可）
ゴール: "全ページが同じHTML" 問題を潰す。

- [ ] **SSR / Edge Middleware 対応**: `middleware.ts` に `/articles/*`, `/about` 等を追加。`api/page-ogp.ts` で SSR ミニHTML 返却
- [ ] **動的 sitemap**: `api/sitemap.ts` + `vercel.json` rewrite
- [ ] **プライバシーポリシーの Cookie opt-out 具体化**（§8.5.4 中優先参照）

#### Stage 3: コンテンツ最終増強（さらに 1〜2 週間）
ゴール: 記事 10〜15 本体制を完成させる。

- [ ] 追加で **記事 5〜10 本**
- [ ] `/about` / `/contact` の本文リッチ化
- [ ] 本番デプロイ後、**GSC の「URL検査」→「インデックス登録をリクエスト」** を新規/更新ページ全部に対して実施

#### Stage 4: 再申請
ゴール: 一発合格。

- [ ] GSC の「インデックス済みページ」が10以上に増えていることを確認
- [ ] AdSense 管理画面で「**問題を修正しました**」チェック → 「**審査をリクエスト**」
- [ ] 審査は通常 **1〜4 週間**

**注意**: 同じサイトで短期間に何度も「審査をリクエスト」すると印象が悪い（ガイドライン外だが経験則）。**一発で通すつもりで万全にしてから押す**。

---

## 9. 既知の AdSense / SEO 注意点（エージェントへの依頼事項の叩き台）

### 9.1 ✅ 2026-04-21 に実施済みの修正

1. ✅ **AdSense ID の docs 同期**: `docs/project-status.md` を `pub-6401969583966289` に訂正（`ads.txt`/`index.html` が真実）。
2. ✅ **canonical/OGP URLを `https://www.sirucho.com` に統一**:
   - `index.html`（canonical, og:url, og:image, twitter:image, JSON-LD `@id`/`url`/`logo`）
   - `src/pages/*.tsx`（About/Privacy/Terms/Contact/Articles/Article）
   - `src/app/pages/WorkPage.tsx`（`SITE_URL` 定数）
   - `api/ogp.ts`（`SITE_URL` 定数）
3. ✅ **sitemap.xml 更新**:
   - 全URLを `www.sirucho.com` に統一
   - `/articles`（一覧）と `/articles/sirucho-boom-reason`（既存記事）を追加
   - `lastmod` を `2026-04-21` に更新
4. ✅ **robots.txt の Sitemap URL を www に統一**。

### 9.2 未解決 — エージェントに検討依頼したい項目

1. **Vercel の apex→www リダイレクトが 307（一時）**:
   - AdSense/SEO 的には **301/308 恒久** が望ましい。
   - Vercel ダッシュボードの Domain 設定（apex を "Redirect" にして destination を www に）で対応。コードだけでは直せない。
2. **本番 EC2 `server/.env` の `FRONTEND_URL` 更新**:
   - 現状 `https://sirucho.com` のまま。メール認証・パスワードリセットのリンクが apex を踏む→307 で www に飛ぶ経路になっている。
   - `FRONTEND_URL=https://www.sirucho.com` に更新 → `docker compose up -d --force-recreate` で反映。
3. **SPAサブページの head が CSR のみ**: `/articles`, `/articles/:slug`, `/privacy`, `/terms`, `/about`, `/contact` の初期HTMLにルート別の title/canonical/OGP が出ない。対策案:
   - `/w/:shareId` と同様に Edge Middleware でクローラ UA を検知し、`/api/articles/ogp?slug=...` 等で SSR ミニHTMLを返す。
   - もしくは Vercel の Rewrite + Serverless で主要ページだけ静的 HTML を事前生成。
   - （大規模には Next.js 移行も選択肢だが、現状 Vite SPA。）
4. **動的 Sitemap 化（任意）**: `public/sitemap.xml` は静的なので、記事追加のたびに手動更新が必要。`api/sitemap.ts`（Serverless）で `/api/articles` を列挙して動的に生成できる。`vercel.json` の rewrites で `/sitemap.xml` → `/api/sitemap` を張ればURL互換。
5. **記事コンテンツ量**: 公開記事 **1件のみ** — AdSense 審査合格ラインとしては不足気味と推定。コンテンツ計画（ジャンル／頻度）を相談。
6. **記事サムネ未設定**: 1件ある記事も `thumbnail=null`。SNSシェアと審査時の見栄えに影響。
7. **AdSense 表示位置の計画が未定**: 現状 `adsbygoogle.js` は読み込むだけで `<ins class="adsbygoogle">` 配置は未実装。どのページのどこに広告スロットを置くかの方針未定（アプリ中心のSPAなので `/articles/*`, `/about`, `/privacy` 等の情報ページが妥当か）。
8. **アプリ本体の文字情報量**: トップ `/` は StickerAlbum 中心でテキストは少なめ。`LatestArticles` で補っているが、さらに "使い方" 系の紹介ブロックを静的HTMLに入れる等の余地あり。
9. **`/contact` の内容が薄い**: 外部フォームリンクしかない。問い合わせ方針・返信目安・SLA などを記述するとAdSense的に安心。
10. **hreflang 未設定**: i18n は UI のみで 5言語あるが、コンテンツ翻訳版URL は存在しない（`/en/...` のようなルートなし）。AdSense とは別軸だが、国際SEOとしては余地あり。

---

## 10. AdSense エージェントが触るべきファイル（クイックリファレンス）

| 目的 | 触るファイル |
|------|--------------|
| AdSense スクリプト挿入・ID変更 | `index.html`（7–9行目） |
| 広告ユニット（`<ins class="adsbygoogle">`）の埋め込み | `src/app/App.tsx`, `src/pages/ArticlePage.tsx`, `src/pages/ArticlesPage.tsx`, `src/pages/AboutPage.tsx` 等ターゲットページ |
| ads.txt | `public/ads.txt` |
| robots | `public/robots.txt` |
| sitemap | `public/sitemap.xml`（もし動的化するなら `api/sitemap.ts` 追加 + `vercel.json` に rewrite） |
| クローラ判定 / SSR | `middleware.ts`, `api/ogp.ts` |
| プライバシー §4 広告節 | `src/pages/PrivacyPage.tsx`（66–84行） |
| Vercel のキャッシュ/rewrites | `vercel.json` |
| 記事データ（本番） | `https://api.sirucho.com/api/articles` で確認。編集は `/admin/articles` UI 経由 |
| JSON-LD（ルート） | `index.html`（48–88行） |
| i18n キー（もし広告ラベル多言語化するなら） | `src/i18n/locales/ja.json` 他 |

---

## 11. コマンド／確認クエリ集（調査用）

```bash
# 本番記事一覧
curl -s "https://api.sirucho.com/api/articles?limit=50" | jq

# 本番キット数
curl -s "https://api.sirucho.com/api/kits/public?limit=100" | jq '.pagination'

# 本番 ads.txt / robots.txt / sitemap.xml
curl -L https://www.sirucho.com/ads.txt
curl -L https://www.sirucho.com/robots.txt
curl -L https://www.sirucho.com/sitemap.xml

# SPAサブページの初期HTML確認（CSR前のheadを見るため）
curl -s https://www.sirucho.com/articles | grep -iE "canonical|og:|title"

# non-www の redirect status 確認
curl -sI https://sirucho.com/ | head -3

# ローカル DB 統計
sqlite3 server/data/sticker.db "SELECT COUNT(*) FROM articles; SELECT COUNT(*) FROM kits;"
```

---

*最終更新: 2026-04-21 — AdSense 対策エージェントへの引き継ぎ用に新規作成*
