# アセット追加・管理ガイド

シールキットと背景の追加・削除・差し替え手順を説明します。

---

## ディレクトリ構造

```
public/
├── assets/
│   ├── stickers/
│   │   ├── kit-001/          ← シールキット1
│   │   │   ├── 001-001.png
│   │   │   ├── 001-002.png
│   │   │   └── ...
│   │   ├── kit-002/          ← シールキット2（拡張用）
│   │   └── ...
│   └── audio/
│       ├── kit-001/          ← 音源キット1
│       │   ├── 001-001.mp3
│       │   ├── 001-002.mp3
│       │   └── ...
│       ├── kit-002/          ← 音源キット2（拡張用）
│       └── ...
└── backgrounds/              ← 背景画像
    ├── AdobeStock_584852960.jpeg
    └── panel.jpg

src/config/
├── stickerConfig.ts          ← シール定義
├── stickerLayout.ts          ← パレットレイアウト
└── backgroundConfig.ts       ← 背景定義
```

---

## ID命名規則

| 項目 | 形式 | 例 |
|------|------|-----|
| キットID | 3桁の数字 | `001`, `002`, `010` |
| シールID | `{キットID}-{3桁}` | `001-001`, `002-015` |
| 背景ID | 任意の英数字 | `default`, `space` |

---

## シールキットの追加

### Step 1: ファイルを配置

```bash
# シール画像
public/assets/stickers/kit-002/
├── 002-001.png
├── 002-002.png
└── 002-003.png

# 音源
public/assets/audio/kit-002/
├── 002-001.mp3
├── 002-002.mp3
└── 002-003.mp3
```

**画像仕様:**
- 形式: PNG（透過推奨）
- サイズ: 200x200px 以上推奨
- 正方形が望ましい

**音源仕様:**
- 形式: MP3
- 長さ: **16秒**（8小節 @ BPM120）
- サンプルレート: 44100Hz
- ループ再生されるため、始点と終点が繋がるように

### Step 2: 設定ファイルを更新

`src/config/stickerConfig.ts`:

```typescript
export const STICKERS: StickerDefinition[] = [
  // === kit-001 ===
  { id: '001-001', name: 'Star', nameJa: 'スター', color: '#FFD700' },
  { id: '001-002', name: 'Heart', nameJa: 'ハート', color: '#FF69B4' },
  // ...

  // === kit-002（新規追加）===
  { id: '002-001', name: 'Cat', nameJa: 'ネコ', color: '#FFA500' },
  { id: '002-002', name: 'Dog', nameJa: 'イヌ', color: '#8B4513' },
  { id: '002-003', name: 'Bird', nameJa: 'トリ', color: '#87CEEB' },
];
```

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `id` | キットID-シールID | `'002-001'` |
| `name` | 英語名 | `'Cat'` |
| `nameJa` | 日本語名 | `'ネコ'` |
| `color` | テーマカラー（フォールバック用） | `'#FFA500'` |

### Step 3: パレットレイアウトを設定

`src/config/stickerLayout.ts`:

```typescript
export const STICKER_LAYOUT: StickerLayoutItem[] = [
  // kit-001
  { id: '1', stickerId: '001-001', x: 0, y: 0, size: 120, rotation: -8 },
  // ...

  // kit-002（新規）
  { id: '7', stickerId: '002-001', x: 10, y: 60, size: 100, rotation: 5 },
  { id: '8', stickerId: '002-002', x: 50, y: 65, size: 90, rotation: -3 },
];
```

| プロパティ | 説明 |
|-----------|------|
| `id` | パレット内のユニークID |
| `stickerId` | シールID（stickerConfig.tsのid） |
| `x`, `y` | パレット内の位置（%） |
| `size` | 表示サイズ（px） |
| `rotation` | 回転角度（度） |

---

## 背景の追加

### Step 1: ファイルを配置

```bash
public/backgrounds/
├── AdobeStock_584852960.jpeg  # 既存
├── panel.jpg                   # 既存
└── space.jpg                   # 新規
```

**推奨仕様:**
- 形式: JPEG または PNG
- サイズ: 1920x1080 以上
- アスペクト比: 縦長推奨（モバイル対応）

### Step 2: 設定ファイルを更新

`src/config/backgroundConfig.ts`:

```typescript
export const BACKGROUNDS: BackgroundDefinition[] = [
  { id: 'default', name: 'Blue Sky', nameJa: '青空', filename: 'AdobeStock_584852960.jpeg' },
  { id: 'panel', name: 'Panel', nameJa: 'パネル', filename: 'panel.jpg' },
  // 新規追加
  { id: 'space', name: 'Space', nameJa: '宇宙', filename: 'space.jpg' },
];
```

### デフォルト背景を変更

```typescript
export const DEFAULT_BACKGROUND_ID = 'space';
```

---

## 削除・差し替え

### シールの削除
1. `stickerConfig.ts` から該当エントリを削除
2. `stickerLayout.ts` から該当エントリを削除
3. `public/assets/stickers/kit-{id}/` から画像を削除
4. `public/assets/audio/kit-{id}/` から音源を削除

### シールの差し替え
ファイルを上書きするだけでOK（設定変更不要）

### 背景の削除
1. `backgroundConfig.ts` から該当エントリを削除
2. `public/backgrounds/` から画像を削除

---

## 現在のシール一覧 (kit-001)

| ID | 名前 | 英語名 | カラー |
|------|------|------|--------|
| 001-001 | スター | Star | #FFD700 |
| 001-002 | ハート | Heart | #FF69B4 |
| 001-003 | サークル | Circle | #87CEEB |
| 001-004 | スクエア | Square | #90EE90 |
| 001-005 | トライアングル | Triangle | #DDA0DD |
| 001-006 | フラワー | Flower | #FFB6C1 |

---

## チェックリスト

### シール追加時
- [ ] PNG画像を `public/assets/stickers/kit-{キットID}/` に配置
- [ ] MP3音源を `public/assets/audio/kit-{キットID}/` に配置
- [ ] `stickerConfig.ts` に定義を追加
- [ ] `stickerLayout.ts` にレイアウトを追加
- [ ] `npm run dev` で動作確認

### 背景追加時
- [ ] 画像を `public/backgrounds/` に配置
- [ ] `backgroundConfig.ts` に定義を追加
- [ ] `npm run dev` で動作確認

---

## トラブルシューティング

| 症状 | 確認ポイント |
|------|------------|
| シールが表示されない | ファイルパスとIDの一致、大文字小文字 |
| 音が鳴らない | MP3ファイルの存在、16秒の長さ |
| 背景が表示されない | `filename` とファイル名の一致 |
| エクスポート動画に反映されない | ブラウザキャッシュをクリア |

**フォールバック動作:**
- PNG画像がない → 設定の `color` で円を描画
- MP3音源がない → 音声なし（エラーにはならない）
