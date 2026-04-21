# AdSense Day 1 (2026-04-22) 実装 下ごしらえメモ

明日 4/22（水）に実行する 3 タスクの詳細設計。**🟦 要決定** のマークがついた項目だけ回答いただければ、即実装に入れる状態。

---

## 既存コードから読み取った規約

- **静的情報ページは i18n を使っていない**（AboutPage / PrivacyPage / TermsPage / ContactPage / ArticlePage / ArticlesPage / NotFoundPage / LatestArticles すべて日本語固定）
  → 今回作る Footer・トップ静的セクションも **日本語固定** でこの方針に合わせる
- **Tailwind v4 + Radix**、カラーは `indigo-600`（アクセント）、背景は `amber-50 / orange-50 / rose-50` グラデーション
- **アイコンは `lucide-react`**（全ページで利用中）
- **リンクは `react-router-dom` の `<Link>`** を使用（SPA内部遷移）
- **外部リンクは `<a target="_blank" rel="noopener noreferrer">`**
- **各ページは `<Helmet>` で title/canonical/og:* を記述**（react-helmet-async）

---

## タスク 1: Footer コンポーネント新規作成

### 実装場所
- 新規: `src/components/Footer.tsx`
- 配置: 以下のすべてに追加
  - `src/app/App.tsx`（トップ / の最下部、LatestArticles の下）
  - `src/pages/AboutPage.tsx` `PrivacyPage.tsx` `TermsPage.tsx` `ContactPage.tsx` `ArticlesPage.tsx` `ArticlePage.tsx` `NotFoundPage.tsx`
  - `src/app/pages/WorkPage.tsx`（作品ビューにも入れるか要決定 🟦）

### 構成案（ドラフト）

```
┌─────────────────────────────────────────────────────────┐
│  シール帳                                                 │
│  音楽シールで楽曲を作る無料Webアプリ                          │
│                                                          │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ サービス       │ 情報          │ 運営          │         │
│  │ • トップ       │ • ブログ       │ • 運営会社    │         │
│  │ • ブログ       │ • このアプリ   │ • 公式サイト  │         │
│  │                │   について     │   （外部）    │         │
│  │                │ • お問い合わせ │ • 利用規約    │         │
│  │                │                │ • プライバシー │         │
│  └──────────────┴──────────────┴──────────────┘         │
│                                                          │
│  © 2026 株式会社モテコロ  All rights reserved.            │
└─────────────────────────────────────────────────────────┘
```

### 🟦 要決定: Footer の内容

1. **メールアドレス表記**: フッターに運営メール（例 `info@motechoro.jp`）を載せるか、`/contact` リンクのみで済ませるか?  
   推奨: `/contact` リンクのみ（スパム対策）。メアド公開は AdSense 審査要件ではない。
2. **会社住所**: フッターに住所を載せるか?  
   推奨: 住所は `/about` の運営会社セクションに追記し、フッターには会社名のみ（＋ AdSense はサイト内どこかに住所があれば OK）。
   - 載せる場合、公開する住所を教えてください（登記住所 / 事業所住所 / 非公開）
3. **SNS リンク**: X（Twitter）/ Instagram / YouTube 等の公式アカウントがあれば載せる?  
   → 教えてください（未運用なら省略）
4. **WorkPage（作品ビュー `/w/:shareId`）に Footer を入れるか**?  
   推奨: **入れる**（全ページ共通の方が AdSense 評価は安定）。ただし作品UIの邪魔にならないよう minimal バージョンで。
5. **ロゴの有無**: `public/logo.png` を左上に表示するか?  
   推奨: **表示する**（視覚的体裁が整う）。サイズは w-8 h-8 程度。

### コンポーネント骨組み（決定次第、確定版を書く）

```tsx
import { Link } from 'react-router-dom';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-gray-200 py-8 px-4 mt-12">
      <div className="max-w-5xl mx-auto">
        {/* ブランド */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="シール帳" className="w-8 h-8" />
          <div>
            <div className="font-bold text-gray-900">シール帳</div>
            <div className="text-xs text-gray-500">音楽シールで楽曲を作る無料Webアプリ</div>
          </div>
        </div>

        {/* リンクカラム */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">サービス</h3>
            <ul className="space-y-1">
              <li><Link to="/" className="text-gray-600 hover:text-indigo-600">トップ</Link></li>
              <li><Link to="/articles" className="text-gray-600 hover:text-indigo-600">ブログ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">情報</h3>
            <ul className="space-y-1">
              <li><Link to="/about" className="text-gray-600 hover:text-indigo-600">このアプリについて</Link></li>
              <li><Link to="/contact" className="text-gray-600 hover:text-indigo-600">お問い合わせ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">運営</h3>
            <ul className="space-y-1">
              <li><a href="https://motechoro.jp/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600">株式会社モテコロ</a></li>
              <li><Link to="/terms" className="text-gray-600 hover:text-indigo-600">利用規約</Link></li>
              <li><Link to="/privacy" className="text-gray-600 hover:text-indigo-600">プライバシーポリシー</Link></li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
          © {year} 株式会社モテコロ All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

---

## タスク 2: PrivacyPage §4 Cookie opt-out 具体化

### 実装場所
- 修正: `src/pages/PrivacyPage.tsx` の §4（現状66〜84行）

### 現状の §4（簡素）

> 本サービスでは、第三者配信の広告サービス（Google AdSense）を利用する場合があります。広告配信事業者は、ユーザーの興味に基づいた広告を表示するためにCookieを使用することがあります。
> 
> Google AdSenseの詳細については、Googleの広告に関するポリシーをご確認ください。

### 書き換え後のドラフト

```
4. 広告について

本サービスでは、第三者配信の広告サービス「Google AdSense」を利用しています。
Google AdSense はユーザーの興味・関心に基づいた広告（パーソナライズ広告）を表示するため、
Cookie および類似技術を使用して、ブラウザ情報・訪問履歴・IPアドレス等のデータを収集することがあります。

4.1 パーソナライズ広告の無効化方法
お客様は、Google 広告設定ページ（https://adssettings.google.com/）からいつでも
パーソナライズ広告を無効にすることができます。無効化しても広告の表示は続きますが、
お客様の興味・関心に合わせた最適化は行われなくなります。

4.2 Cookie の無効化方法
お使いのブラウザ設定から Cookie を無効にすることができます。主要ブラウザでの設定方法は以下をご参照ください。
- Google Chrome: https://support.google.com/chrome/answer/95647
- Safari: https://support.apple.com/ja-jp/guide/safari/sfri11471/mac
- Firefox: https://support.mozilla.org/ja/kb/cookies
なお、Cookie を無効化するとサービスの一部機能が利用できなくなる場合があります。

4.3 データ保持期間
本サービスで利用する広告・分析関連データの保持期間は、Google のサービス規約に準じます。
- Google AdSense / Google Analytics 4 のデータは、Google の設定に従い保管されます。
- 詳細は Google のプライバシーポリシー（https://policies.google.com/privacy）をご確認ください。

4.4 欧州経済領域（EEA）のユーザーについて
EEA および英国からアクセスされるユーザーには、GDPR に基づく追加の権利（データへのアクセス・訂正・削除等の請求権）が認められています。
お問い合わせは /contact ページよりご連絡ください。

4.5 参考リンク
- Google の広告に関するポリシー: https://policies.google.com/technologies/ads
- Google のプライバシーポリシー: https://policies.google.com/privacy
```

### 🟦 要決定: Privacy

1. **GA4 のデータ保持期間** — 現在の GA4 ダッシュボード設定（デフォルト2ヶ月 or 14ヶ月）を教えていただけるか、もしくは "Google のデフォルト設定に準じます" でぼかすか?  
   推奨: **ぼかす**（上のドラフトはぼかし版）。ピンポイント数字を書くと変更時に齟齬が出る。
2. **EEA/GDPR 対応を「現時点では Funding Choices 等の CMP は未導入」と明記するか**?  
   推奨: **書かない**（上のドラフトは非言及）。「追加の権利がある」ことだけ触れ、詳細な同意管理は将来導入時に追記。
3. **連絡先の記載方法**: /contact 経由 or 専用メールアドレス明記?  
   推奨: `/contact` 誘導のみ（スパム対策）。

---

## タスク 3: トップページ静的テキストセクション追加

### 実装場所
- 修正: `src/app/App.tsx`（現状は StickerAlbum + LatestArticles のみ）
- 挿入位置: **LatestArticles の前**（記事カードより先に「このアプリとは」を読ませる流れ）

### 構成案（4セクション）

```
┌──────────────────────────────────────────────┐
│ このアプリとは                                  │
│ シール帳は、音楽シールを台紙に貼って楽曲を作れる   │
│ 無料の Web アプリ。専門知識なしで、タップだけで   │
│ 音が鳴るインタラクティブな楽曲制作体験を提供します。│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ できること（3アイコンカード）                     │
│ 🎵 シールで作曲    🎨 台紙で世界観     📤 共有   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 使い方の流れ（4ステップ）                         │
│ 1. キットを選ぶ → 2. シールを貼る                │
│ 3. 台紙を切り替える → 4. 作品として共有           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ よくある質問（FAQ 4件、accordion）                │
│ Q. 無料で使えますか？                              │
│ Q. ログイン無しで使えますか？                      │
│ Q. スマホでも使えますか？                          │
│ Q. 作った作品は共有できますか？                    │
└──────────────────────────────────────────────┘
```

### 🟦 要決定: トップページ静的セクション

1. **セクション配置**: 上の4セクション全部 or "できること" + "使い方の流れ" の2つだけ（FAQは /contact に寄せる）?  
   推奨: **全部 /（AdSense 観点で文章量稼ぎたい）**
2. **FAQ 4問の回答方針**:
   - Q. 無料で使えますか？ → A. 無料で使えます（AdSense 広告表示で運営）
   - Q. ログイン無しで使えますか？ → A. 基本機能は使える／クリエイター登録すると作品公開・キット作成可能
   - Q. スマホでも使えますか？ → A. iOS/Android のブラウザで動作
   - Q. 作った作品は共有できますか？ → A. 作品URLが発行される、SNSシェア可
   この方向で OK?
3. **"使い方の流れ" は4ステップ / 5ステップどちら?**  
   推奨: 4ステップ（キットを選ぶ → シールを貼る → 台紙を切り替える → 共有する）。簡潔で AdSense クローラにも読ませやすい。
4. **インタラクティブ機能の言語化（外部エージェント指摘）をどこに入れるか**:
   - 案A: "できること" のカード内に詳しい説明文を入れる
   - 案B: "使い方の流れ" の各ステップで「タップすると音が鳴ります」「2枚以上貼るとスペシャルモード」を明記
   - 推奨: **案B**（流れと一緒に読むと腹落ちする）
5. **画像の有無**: アイコン（lucide-react）だけで済ませる or 実際のアプリスクショを埋め込む?  
   推奨: **Day 1 はアイコンのみ**。スクショ埋込は記事1本目（4/26）のときに撮って使い回す方が効率的。

---

## 次の動き

- 上記 🟦 要決定 に回答ください（即答できない項目は "推奨でOK" で進めます）
- 明日 4/22 朝、回答を受けて **3タスクを一気に実装 → ビルド → コミット** まで進めます
- 予想工数: Claude 2.5h（CSVの見積通り）

---

*作成: 2026-04-21 / 対象: 2026-04-22 Day 1 実装分*
