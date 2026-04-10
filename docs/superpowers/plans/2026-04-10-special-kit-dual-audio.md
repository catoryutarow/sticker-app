# Special Kit Dual Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only "special kits" whose stickers carry two audio sources — a custom-BPM loop for when only that kit's stickers are on the canvas (2+), and a standard BPM120 loop for mixed scenarios — with real-time switching during playback.

**Architecture:** Add `is_special` + `special_bpm` to the `kits` table and `special_audio_uploaded` to `stickers`. Special audio files live alongside normal ones with a `_special` suffix. The AudioEngine gains a mode-detection layer in `syncWithStickers()` that compares all canvas stickers' kit origins, swaps audio buffers and BPM when the mode flips, and restarts tracks in sync.

**Tech Stack:** SQLite (better-sqlite3), Express.js, React + Vite + TypeScript, Tone.js, Tailwind CSS v4

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `server/db/schema.sql` | Modify | Add `is_special`, `special_bpm` to `kits`; `special_audio_uploaded` to `stickers` |
| `server/routes/kits.js` | Modify | Expose special fields in CRUD; add special audio upload endpoint; include special fields in public API responses |
| `src/api/kitsApi.ts` | Modify | Add `is_special`, `special_bpm` to `Kit` type; `special_audio_uploaded` to `Sticker` type; add `uploadSpecialAudio` API method; add `updateKitSpecial` API method |
| `src/api/publicKitsApi.ts` | Modify | Add `is_special`, `special_bpm` to `PublicKit`; `special_audio_uploaded` to `PublicSticker` |
| `src/config/assetUrl.ts` | Modify | Add `getStickerSpecialAudioUrl()` |
| `src/config/stickerConfig.ts` | Modify | Add `getStickerSpecialAudioPath()`; add `isSpecialKit` to dynamic sticker metadata |
| `src/config/kitConfig.ts` | Modify | Add `isSpecial`, `specialBpm` to `KitDefinition` |
| `src/config/KitDataContext.tsx` | Modify | Pass `is_special`/`special_bpm` through to `KitDefinition` |
| `src/audio/AudioEngine.ts` | Modify | Add special-mode detection, BPM switching, dual-buffer management, mode-transition logic |
| `src/creator/pages/KitDetailPage.tsx` | Modify | Add admin-only "Special Kit" settings panel (toggle, BPM, special audio upload per sticker) |
| `src/i18n/locales/ja.json` | Modify | Add special kit translation keys |
| `src/i18n/locales/en.json` | Modify | Add special kit translation keys |

---

### Task 1: Database Schema Migration

**Files:**
- Modify: `server/db/schema.sql`
- Modify: `server/routes/kits.js` (add migration on startup)

- [ ] **Step 1: Add columns to schema.sql**

Add these columns to the existing CREATE TABLE statements in `server/db/schema.sql`:

In the `kits` table definition, add after `status TEXT DEFAULT 'draft'`:
```sql
  is_special INTEGER DEFAULT 0,             -- スペシャルキットフラグ（admin専用）
  special_bpm INTEGER DEFAULT 120,          -- スペシャルモード時のBPM
```

In the `stickers` table definition, add after `audio_uploaded INTEGER DEFAULT 0`:
```sql
  special_audio_uploaded INTEGER DEFAULT 0, -- スペシャル音源アップロード済み
```

- [ ] **Step 2: Add runtime migration in kits.js**

At the top of `server/routes/kits.js`, after the existing imports and before `const router = Router()`, add the migration block. This pattern ensures columns are added if missing (SQLite has no `IF NOT EXISTS` for ALTER TABLE, so we check pragmatically):

```javascript
// === Migration: Special Kit columns ===
try {
  const kitCols = db.prepare("PRAGMA table_info(kits)").all().map(c => c.name);
  if (!kitCols.includes('is_special')) {
    db.prepare("ALTER TABLE kits ADD COLUMN is_special INTEGER DEFAULT 0").run();
    console.log('Migration: Added is_special to kits');
  }
  if (!kitCols.includes('special_bpm')) {
    db.prepare("ALTER TABLE kits ADD COLUMN special_bpm INTEGER DEFAULT 120").run();
    console.log('Migration: Added special_bpm to kits');
  }
  const stickerCols = db.prepare("PRAGMA table_info(stickers)").all().map(c => c.name);
  if (!stickerCols.includes('special_audio_uploaded')) {
    db.prepare("ALTER TABLE stickers ADD COLUMN special_audio_uploaded INTEGER DEFAULT 0").run();
    console.log('Migration: Added special_audio_uploaded to stickers');
  }
} catch (e) {
  console.error('Migration error:', e);
}
```

- [ ] **Step 3: Restart Docker and verify migration**

Run: `docker compose restart`

Verify by checking the Docker logs for the migration messages or by querying:
```bash
docker compose exec app node -e "const db = require('better-sqlite3')('/data/sticker.db'); console.log(db.prepare('PRAGMA table_info(kits)').all().map(c=>c.name))"
```

Expected: Column list includes `is_special` and `special_bpm`.

- [ ] **Step 4: Commit**

```bash
git add server/db/schema.sql server/routes/kits.js
git commit -m "feat: add special kit schema columns (is_special, special_bpm, special_audio_uploaded)"
```

---

### Task 2: Server API — Special Kit CRUD & Audio Upload

**Files:**
- Modify: `server/routes/kits.js`

- [ ] **Step 1: Expose special fields in kit responses**

The `attachKitDetails()` function (line ~40) already returns all columns from `SELECT * FROM kits`, so `is_special` and `special_bpm` are automatically included. Same for individual kit GETs (`SELECT * FROM kits WHERE id = ?`).

No changes needed for reads — `SELECT *` picks up the new columns.

Verify: The `GET /api/kits/public/all` and `GET /api/kits/public/:kitId/stickers` responses will include `is_special` and `special_bpm` because they use `SELECT *`.

- [ ] **Step 2: Add special field updates to PUT /api/kits/:kitId**

In the `PUT /:kitId` handler (around line 421), destructure the new fields from `req.body`:

Change:
```javascript
    const { name, nameJa, description, color, musicalKey, status } = req.body;
```

To:
```javascript
    const { name, nameJa, description, color, musicalKey, status, isSpecial, specialBpm } = req.body;
```

Then update the SQL UPDATE statement (around line 531). Change:
```javascript
    db.prepare(`
      UPDATE kits
      SET name = COALESCE(?, name),
          name_ja = COALESCE(?, name_ja),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          musical_key = COALESCE(?, musical_key),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nameJa, description, color, keyToSave, status, kitId);
```

To:
```javascript
    // isSpecial/specialBpm はadminのみ変更可能
    const isSpecialValue = (req.user.role === 'admin' && isSpecial !== undefined)
      ? (isSpecial ? 1 : 0)
      : undefined;
    const specialBpmValue = (req.user.role === 'admin' && specialBpm !== undefined)
      ? specialBpm
      : undefined;

    db.prepare(`
      UPDATE kits
      SET name = COALESCE(?, name),
          name_ja = COALESCE(?, name_ja),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          musical_key = COALESCE(?, musical_key),
          status = COALESCE(?, status),
          is_special = COALESCE(?, is_special),
          special_bpm = COALESCE(?, special_bpm),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nameJa, description, color, keyToSave, status, isSpecialValue, specialBpmValue, kitId);
```

- [ ] **Step 3: Add special audio upload endpoint**

Add this new route before the `export default router` at the bottom of the file (around line 1327):

```javascript
/**
 * POST /api/kits/:kitId/stickers/:stickerId/special-audio
 * スペシャル音源アップロード（admin専用）
 */
router.post('/:kitId/stickers/:stickerId/special-audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    // admin専用
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (!kit) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    if (!kit.is_special) {
      return res.status(400).json({ error: 'Kit is not marked as special' });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // 音声形式チェック
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'application/octet-stream'];
    const allowedExtensions = ['.mp3', '.wav'];
    const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));

    if (!allowedTypes.includes(req.file.mimetype) && !allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid audio type. Allowed: MP3, WAV' });
    }

    const dirPath = join(projectRoot, 'public', 'assets', 'audio', `kit-${kit.kit_number}`);
    const filePath = join(dirPath, `${sticker.full_id}_special.mp3`);

    await mkdir(dirPath, { recursive: true });
    await writeFile(filePath, req.file.buffer);

    db.prepare('UPDATE stickers SET special_audio_uploaded = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stickerId);

    const updatedSticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);

    res.json({
      sticker: updatedSticker,
      audioPath: `/assets/audio/kit-${kit.kit_number}/${sticker.full_id}_special.mp3`,
    });
  } catch (error) {
    console.error('Upload special audio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/kits.js
git commit -m "feat: server API for special kit fields and special audio upload"
```

---

### Task 3: Frontend Types & API Methods

**Files:**
- Modify: `src/api/kitsApi.ts`
- Modify: `src/api/publicKitsApi.ts`
- Modify: `src/config/assetUrl.ts`

- [ ] **Step 1: Update Kit and Sticker types in kitsApi.ts**

In `src/api/kitsApi.ts`, add to the `Kit` interface (after `status`):
```typescript
  is_special: number;       // 0 or 1
  special_bpm: number;      // BPM for special mode
```

Add to the `Sticker` interface (after `audio_uploaded`):
```typescript
  special_audio_uploaded: number;
```

Add to `UpdateKitRequest`:
```typescript
  isSpecial?: boolean;
  specialBpm?: number;
```

- [ ] **Step 2: Add uploadSpecialAudio method in kitsApi.ts**

Add to the `kitsApi` object, after `uploadStickerAudio`:

```typescript
  /**
   * スペシャル音声アップロード（admin専用）
   */
  uploadSpecialAudio: async (
    kitId: string,
    stickerId: string,
    file: File
  ): Promise<{ sticker: Sticker; audioPath: string }> => {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/special-audio`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ sticker: Sticker; audioPath: string }>(response);
  },
```

- [ ] **Step 3: Update PublicKit and PublicSticker types in publicKitsApi.ts**

In `src/api/publicKitsApi.ts`, add to `PublicKit` (after `status`):
```typescript
  is_special: number;
  special_bpm: number;
```

Add to `PublicSticker` (after `audio_uploaded`):
```typescript
  special_audio_uploaded: number;
```

- [ ] **Step 4: Add getStickerSpecialAudioUrl in assetUrl.ts**

In `src/config/assetUrl.ts`, add after `getStickerAudioUrl`:

```typescript
/**
 * スペシャル音声のURLを生成
 * @param kitId - キット番号（例: '001'）
 * @param stickerId - シールID（例: '001-001'）
 * @param cacheBuster - キャッシュバスティング用のタイムスタンプ（オプション）
 */
export function getStickerSpecialAudioUrl(kitId: string, stickerId: string, cacheBuster?: string | number): string {
  const path = `/assets/audio/kit-${kitId}/${stickerId}_special.mp3`;
  const url = getAssetUrl(path);
  return cacheBuster ? `${url}?t=${cacheBuster}` : url;
}
```

- [ ] **Step 5: Add getStickerSpecialAudioPath in stickerConfig.ts**

In `src/config/stickerConfig.ts`, add after `getStickerAudioPath`:

```typescript
import { getStickerSpecialAudioUrl } from './assetUrl';

export function getStickerSpecialAudioPath(id: string): string {
  const kitId = getKitIdFromStickerId(id);
  return getStickerSpecialAudioUrl(kitId, id);
}
```

Note: `getStickerSpecialAudioUrl` needs to be imported. The existing `import { getStickerImageUrl, getStickerAudioUrl } from './assetUrl'` line should be updated to also import `getStickerSpecialAudioUrl`.

- [ ] **Step 6: Update KitDefinition and KitDataContext**

In `src/config/kitConfig.ts`, add to `KitDefinition` (after `tags`):
```typescript
  isSpecial?: boolean;
  specialBpm?: number;
```

In `src/config/KitDataContext.tsx`, update `convertKitToDefinition`:
```typescript
function convertKitToDefinition(kit: PublicKit & { tags?: Array<{ name: string; isCustom: boolean }> }): KitDefinition {
  return {
    id: kit.kit_number,
    name: kit.name,
    nameJa: kit.name_ja || kit.name,
    color: kit.color,
    description: kit.description || undefined,
    musicalKey: kit.musical_key,
    tags: kit.tags || [],
    isSpecial: kit.is_special === 1,
    specialBpm: kit.special_bpm,
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/api/kitsApi.ts src/api/publicKitsApi.ts src/config/assetUrl.ts src/config/stickerConfig.ts src/config/kitConfig.ts src/config/KitDataContext.tsx
git commit -m "feat: frontend types and API methods for special kit dual audio"
```

---

### Task 4: AudioEngine — Special Mode Detection & BPM Switching

**Files:**
- Modify: `src/audio/AudioEngine.ts`

This is the core of the feature. The AudioEngine needs to:
1. Track which kit each sticker belongs to
2. Detect when all canvas stickers (2+) are from the same special kit
3. Switch BPM and audio sources when the mode changes
4. Do this in real-time during playback

- [ ] **Step 1: Make BPM and loop duration dynamic**

At the top of `src/audio/AudioEngine.ts`, change the constants from fixed values to a function-based approach. Replace lines 16-21:

```typescript
// Constants (defaults — may be overridden by special mode)
const DEFAULT_BPM = 120;
const BEATS_PER_MEASURE = 4;
const MEASURES_PER_LOOP = 8;

function calcLoopParams(bpm: number) {
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * BEATS_PER_MEASURE;
  const loopDuration = secondsPerMeasure * MEASURES_PER_LOOP;
  return { secondsPerBeat, secondsPerMeasure, loopDuration };
}
```

Keep the exported constants for backward compatibility but derive them from the default:
```typescript
const { secondsPerMeasure: SECONDS_PER_MEASURE, loopDuration: LOOP_DURATION } = calcLoopParams(DEFAULT_BPM);
export { LOOP_DURATION, SECONDS_PER_MEASURE };
export const BPM = DEFAULT_BPM;
```

- [ ] **Step 2: Add special-mode state and kit metadata to the AudioEngine class**

Add new private fields to the `AudioEngine` class (after `private sheetWidth`):

```typescript
  // Special mode state
  private currentBpm: number = DEFAULT_BPM;
  private isSpecialMode: boolean = false;
  private specialKitNumber: string | null = null;  // e.g. "004" when in special mode
  private specialAudioBuffers: Map<string, Tone.ToneAudioBuffer> = new Map(); // sticker type -> special buffer

  // Kit metadata (populated externally)
  private kitSpecialInfo: Map<string, { isSpecial: boolean; specialBpm: number }> = new Map();
```

- [ ] **Step 3: Add method to register kit special info**

Add a public method to the AudioEngine class:

```typescript
  /**
   * キットのスペシャル情報を登録（KitDataContextから呼び出す）
   */
  registerKitSpecialInfo(kitNumber: string, isSpecial: boolean, specialBpm: number): void {
    this.kitSpecialInfo.set(kitNumber, { isSpecial, specialBpm });
  }

  /**
   * キットのスペシャル情報をクリア
   */
  clearKitSpecialInfo(): void {
    this.kitSpecialInfo.clear();
  }
```

- [ ] **Step 4: Add special audio buffer management**

Add methods for loading/managing special audio buffers:

```typescript
  /**
   * スペシャル音声バッファをプリロード
   */
  async preloadSpecialAudioBuffers(stickerIds: string[]): Promise<string[]> {
    const loadedIds: string[] = [];

    const loadPromises = stickerIds.map(async (id) => {
      if (this.specialAudioBuffers.has(id)) {
        loadedIds.push(id);
        return;
      }

      try {
        const audioPath = getStickerSpecialAudioPath(id);
        const buffer = new Tone.ToneAudioBuffer(audioPath);
        await buffer.load(audioPath);
        this.specialAudioBuffers.set(id, buffer);
        loadedIds.push(id);
      } catch (error) {
        console.warn(`Failed to preload special audio for ${id}:`, error);
      }
    });

    await Promise.all(loadPromises);
    return loadedIds;
  }
```

Add this import at the top (alongside the existing stickerConfig import):
```typescript
import { getStickerAudioPath, getStickerSpecialAudioPath, isValidStickerId } from '../config/stickerConfig';
```

- [ ] **Step 5: Add special mode detection logic**

Add the core detection method:

```typescript
  /**
   * キャンバス上のシールからスペシャルモード判定
   * 全シールが同一スペシャルキット出身 AND 2枚以上 → スペシャルモード
   */
  private detectSpecialMode(stickers: StickerState[]): { isSpecial: boolean; kitNumber: string | null; bpm: number } {
    if (stickers.length < 2) {
      return { isSpecial: false, kitNumber: null, bpm: DEFAULT_BPM };
    }

    // 全シールのキット番号を抽出
    const kitNumbers = new Set<string>();
    for (const sticker of stickers) {
      const kitNumber = sticker.type.split('-')[0] || '001';
      kitNumbers.add(kitNumber);
    }

    // 全シールが同一キットでない場合は通常モード
    if (kitNumbers.size !== 1) {
      return { isSpecial: false, kitNumber: null, bpm: DEFAULT_BPM };
    }

    const kitNumber = kitNumbers.values().next().value;
    const kitInfo = this.kitSpecialInfo.get(kitNumber);

    // スペシャルキットでない場合は通常モード
    if (!kitInfo || !kitInfo.isSpecial) {
      return { isSpecial: false, kitNumber: null, bpm: DEFAULT_BPM };
    }

    return { isSpecial: true, kitNumber, bpm: kitInfo.specialBpm };
  }
```

- [ ] **Step 6: Modify syncWithStickers to handle mode transitions**

Replace the existing `syncWithStickers` method with this version that adds mode detection:

```typescript
  /**
   * シール一覧から状態を同期（スペシャルモード対応）
   */
  syncWithStickers(stickers: StickerState[]): void {
    // スペシャルモード判定
    const modeResult = this.detectSpecialMode(stickers);
    const modeChanged = modeResult.isSpecial !== this.isSpecialMode
      || modeResult.kitNumber !== this.specialKitNumber;

    if (modeChanged) {
      this.handleModeTransition(modeResult, stickers);
      return; // handleModeTransition takes care of everything
    }

    // --- 通常の同期処理（既存コードをそのまま維持） ---

    // 現在のシールIDセット
    const currentIds = new Set(stickers.map((s) => s.id));

    // 削除されたシールのトラックを完全に削除
    const stickersToRemove: string[] = [];
    for (const stickerId of this.stickerStates.keys()) {
      if (!currentIds.has(stickerId)) {
        stickersToRemove.push(stickerId);
      }
    }
    for (const stickerId of stickersToRemove) {
      this.removeTrack(stickerId);
    }

    // タイプごとのカウントをリセット
    const newCounts = new Map<string, number>();

    // 新しいトラック用の共通基準時刻（同期精度向上）
    const referenceTime = Tone.now();

    // 各シールの状態を更新または追加
    for (const sticker of stickers) {
      if (!isStickerType(sticker.type) && !isValidStickerId(sticker.type)) continue;

      const count = newCounts.get(sticker.type) || 0;
      newCounts.set(sticker.type, count + 1);

      const existingTrack = this.trackNodes.get(sticker.id);

      if (this.isPlaying) {
        if (existingTrack) {
          this.updateTrack(sticker);
        } else {
          this.startTrackWithLoad(sticker, true, referenceTime);
        }
      } else {
        this.stickerStates.set(sticker.id, sticker);
      }
    }

    this.stickerCounts = newCounts;
    this.updateMasterEffects();
  }
```

- [ ] **Step 7: Implement handleModeTransition**

```typescript
  /**
   * スペシャルモード ↔ 通常モード の遷移処理
   * 全トラック停止 → BPM変更 → バッファ差替え → 全トラック再開
   */
  private async handleModeTransition(
    modeResult: { isSpecial: boolean; kitNumber: string | null; bpm: number },
    stickers: StickerState[]
  ): Promise<void> {
    const wasPlaying = this.isPlaying;

    // 1. 全トラック停止
    for (const trackNode of this.trackNodes.values()) {
      this.disposeTrackNode(trackNode);
    }
    this.trackNodes.clear();

    // 2. モード状態を更新
    this.isSpecialMode = modeResult.isSpecial;
    this.specialKitNumber = modeResult.kitNumber;
    this.currentBpm = modeResult.bpm;

    // 3. BPMを変更
    Tone.getTransport().bpm.value = this.currentBpm;

    // 4. シール状態を更新
    this.stickerStates.clear();
    this.stickerCounts.clear();

    const newCounts = new Map<string, number>();
    for (const sticker of stickers) {
      if (!isStickerType(sticker.type) && !isValidStickerId(sticker.type)) continue;
      this.stickerStates.set(sticker.id, sticker);
      const count = newCounts.get(sticker.type) || 0;
      newCounts.set(sticker.type, count + 1);
    }
    this.stickerCounts = newCounts;

    // 5. スペシャルモードならスペシャル音声をプリロード
    if (modeResult.isSpecial) {
      const stickerTypes = [...new Set(stickers.map(s => s.type))];
      await this.preloadSpecialAudioBuffers(stickerTypes);
    }

    // 6. 再生中だった場合は再開
    if (wasPlaying) {
      // Transportをリセット＆再開
      Tone.getTransport().stop();
      Tone.getTransport().start();

      const referenceTime = Tone.now();
      for (const sticker of this.stickerStates.values()) {
        this.startTrack(sticker, true, referenceTime);
      }
    }

    this.updateMasterEffects();
    this.notifyStateChange();
  }
```

- [ ] **Step 8: Modify createTrackNode to use correct audio buffer**

In the existing `createTrackNode` method, change the buffer lookup to use the correct source based on mode:

Replace:
```typescript
    const buffer = this.audioBuffers.get(sticker.type);
    if (!buffer) return null;
```

With:
```typescript
    // スペシャルモード時はスペシャルバッファを優先
    let buffer: Tone.ToneAudioBuffer | undefined;
    if (this.isSpecialMode) {
      buffer = this.specialAudioBuffers.get(sticker.type);
    }
    // スペシャルバッファがない場合（またはノーマルモード）は通常バッファ
    if (!buffer) {
      buffer = this.audioBuffers.get(sticker.type);
    }
    if (!buffer) return null;
```

- [ ] **Step 9: Update getTimeToNextMeasure to use dynamic BPM**

Replace the existing `getTimeToNextMeasure` method:

```typescript
  private getTimeToNextMeasure(): number {
    if (!this.isPlaying) return 0;
    const { secondsPerMeasure } = calcLoopParams(this.currentBpm);
    const position = Tone.getTransport().seconds;
    const measurePosition = position % secondsPerMeasure;
    return secondsPerMeasure - measurePosition;
  }
```

- [ ] **Step 10: Update startTrack to use dynamic loop duration**

In the `startTrack` method, change the offset calculation to use dynamic loop duration:

Replace:
```typescript
    const offset = startPosition % LOOP_DURATION;
```

With:
```typescript
    const { loopDuration } = calcLoopParams(this.currentBpm);
    const offset = startPosition % loopDuration;
```

- [ ] **Step 11: Update play() to use currentBpm**

In the `play()` method, ensure BPM is set correctly before starting:

After `Tone.getTransport().start();` add:
```typescript
    Tone.getTransport().bpm.value = this.currentBpm;
```

- [ ] **Step 12: Clean up special buffers in reset() and dispose()**

In the `reset()` method, add:
```typescript
    this.isSpecialMode = false;
    this.specialKitNumber = null;
    this.currentBpm = DEFAULT_BPM;
```

In the `dispose()` method, add buffer cleanup (after the existing `this.audioBuffers.clear()`):
```typescript
    for (const buffer of this.specialAudioBuffers.values()) {
      try { buffer.dispose(); } catch (e) { /* ignore */ }
    }
    this.specialAudioBuffers.clear();
    this.kitSpecialInfo.clear();
    this.isSpecialMode = false;
    this.specialKitNumber = null;
    this.currentBpm = DEFAULT_BPM;
```

- [ ] **Step 13: Add isSpecialMode to AudioEngineState**

Update the `AudioEngineState` interface:
```typescript
export interface AudioEngineState {
  isPlaying: boolean;
  isInitialized: boolean;
  masterVolume: number;
  activeTracks: Map<string, number>;
  totalVolume: number;
  saturationAmount: number;
  isSpecialMode: boolean;  // NEW
  specialBpm: number;      // NEW
}
```

Update `getState()`:
```typescript
  getState(): AudioEngineState {
    return {
      isPlaying: this.isPlaying,
      isInitialized: this.isInitialized,
      masterVolume: this.masterVolume,
      activeTracks: new Map(this.stickerCounts),
      totalVolume: this.totalVolume,
      saturationAmount: 0,
      isSpecialMode: this.isSpecialMode,
      specialBpm: this.currentBpm,
    };
  }
```

- [ ] **Step 14: Commit**

```bash
git add src/audio/AudioEngine.ts
git commit -m "feat: AudioEngine special mode detection, BPM switching, dual-buffer playback"
```

---

### Task 5: Wire Kit Special Info into AudioEngine

**Files:**
- Modify: `src/config/KitDataContext.tsx`
- Modify: `src/audio/useAudioEngine.ts`

The AudioEngine needs to know which kits are special. This data flows from the API → KitDataContext → AudioEngine.

- [ ] **Step 1: Register kit special info when kits are loaded**

In `src/config/KitDataContext.tsx`, import AudioEngine:
```typescript
import AudioEngine from '@/audio/AudioEngine';
```

In the `convertKits` callback, after kits are converted, register special info with the engine. Update the `loadInitialKits` function (inside the `useEffect`). After `apiKits.forEach(kit => registerDynamicKit(kit))`, add:

```typescript
          // Register special kit info with AudioEngine
          const engine = AudioEngine.getInstance();
          engine.clearKitSpecialInfo();
          apiKits.forEach(kit => {
            if (kit.isSpecial) {
              engine.registerKitSpecialInfo(kit.id, true, kit.specialBpm || 120);
            }
          });
```

Similarly in `loadMore`, after `apiKits.forEach(kit => registerDynamicKit(kit))`, add:
```typescript
          const engine = AudioEngine.getInstance();
          apiKits.forEach(kit => {
            if (kit.isSpecial) {
              engine.registerKitSpecialInfo(kit.id, true, kit.specialBpm || 120);
            }
          });
```

- [ ] **Step 2: Expose isSpecialMode in useAudioEngine hook**

In `src/audio/useAudioEngine.ts`, update the `UseAudioEngineReturn` interface to add:
```typescript
  isSpecialMode: boolean;
  specialBpm: number;
```

Update the return object:
```typescript
    isSpecialMode: state.isSpecialMode,
    specialBpm: state.specialBpm,
```

- [ ] **Step 3: Commit**

```bash
git add src/config/KitDataContext.tsx src/audio/useAudioEngine.ts
git commit -m "feat: wire kit special info from KitDataContext into AudioEngine"
```

---

### Task 6: Admin UI — Special Kit Settings in KitDetailPage

**Files:**
- Modify: `src/creator/pages/KitDetailPage.tsx`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add translation keys**

In `src/i18n/locales/ja.json`, add inside the top-level object:
```json
  "specialKit": {
    "title": "スペシャルキット設定",
    "description": "スペシャルキットのシールだけで揃えると、通常のBPM120ループとは異なる音源が再生されます",
    "enable": "スペシャルキットにする",
    "bpm": "スペシャルBPM",
    "bpmHelp": "スペシャルモード時のBPM（通常は120）",
    "specialAudio": "スペシャル音源",
    "uploadSpecialAudio": "スペシャル音源をアップロード",
    "specialAudioUploaded": "アップロード済み",
    "specialAudioNotUploaded": "未アップロード",
    "saving": "保存中...",
    "saved": "保存しました"
  }
```

In `src/i18n/locales/en.json`, add:
```json
  "specialKit": {
    "title": "Special Kit Settings",
    "description": "When only stickers from this special kit are on the canvas, a unique audio track plays instead of the standard BPM120 loop",
    "enable": "Mark as Special Kit",
    "bpm": "Special BPM",
    "bpmHelp": "BPM for special mode (default is 120)",
    "specialAudio": "Special Audio",
    "uploadSpecialAudio": "Upload Special Audio",
    "specialAudioUploaded": "Uploaded",
    "specialAudioNotUploaded": "Not uploaded",
    "saving": "Saving...",
    "saved": "Saved"
  }
```

- [ ] **Step 2: Add special kit settings panel to KitDetailPage**

In `src/creator/pages/KitDetailPage.tsx`, add state for special kit management. After the existing state declarations (around line 60), add:

```typescript
  const [isSpecial, setIsSpecial] = useState(false);
  const [specialBpm, setSpecialBpm] = useState(120);
  const [specialSaving, setSpecialSaving] = useState(false);
```

In the `loadKit` callback, after kit is loaded, initialize special state:
```typescript
      setIsSpecial(!!data.kit.is_special);
      setSpecialBpm(data.kit.special_bpm || 120);
```

Add a handler to save special settings:
```typescript
  const handleSaveSpecialSettings = async () => {
    if (!kit) return;
    setSpecialSaving(true);
    try {
      await kitsApi.updateKit(kit.id, {
        isSpecial,
        specialBpm,
      });
      // Refresh kit data
      const data = await kitsApi.getKit(kit.id);
      setKit(data.kit);
    } catch (error) {
      console.error('Failed to save special settings:', error);
    } finally {
      setSpecialSaving(false);
    }
  };
```

Add a handler for special audio upload:
```typescript
  const handleSpecialAudioUpload = async (sticker: Sticker, file: File) => {
    if (!kit) return;
    try {
      const result = await kitsApi.uploadSpecialAudio(kit.id, sticker.id, file);
      // Update sticker in local state
      setStickers(prev => prev.map(s =>
        s.id === result.sticker.id ? result.sticker : s
      ));
    } catch (error) {
      console.error('Failed to upload special audio:', error);
    }
  };
```

- [ ] **Step 3: Render the Special Kit settings section**

In the JSX, add the following section after the kit info card and before the sticker grid. Only show for admin users:

```tsx
            {/* スペシャルキット設定（admin専用） */}
            {isAdmin && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('specialKit.title')}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('specialKit.description')}
                  </p>

                  {/* スペシャルキット有効化トグル */}
                  <div className="flex items-center gap-3 mb-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSpecial}
                        onChange={(e) => setIsSpecial(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {t('specialKit.enable')}
                    </span>
                  </div>

                  {/* BPM設定（スペシャル有効時のみ） */}
                  {isSpecial && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('specialKit.bpm')}
                      </label>
                      <input
                        type="number"
                        value={specialBpm}
                        onChange={(e) => setSpecialBpm(Number(e.target.value))}
                        min={60}
                        max={200}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">{t('specialKit.bpmHelp')}</p>
                    </div>
                  )}

                  {/* 保存ボタン */}
                  <button
                    onClick={handleSaveSpecialSettings}
                    disabled={specialSaving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {specialSaving ? t('specialKit.saving') : t('specialKit.saved').replace('しました', '') || 'Save'}
                  </button>

                  {/* スペシャル音源アップロード（スペシャル有効時） */}
                  {isSpecial && stickers.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        {t('specialKit.specialAudio')}
                      </h3>
                      <div className="space-y-3">
                        {stickers.map((sticker) => (
                          <div key={sticker.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900">{sticker.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({sticker.full_id})</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              sticker.special_audio_uploaded
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {sticker.special_audio_uploaded
                                ? t('specialKit.specialAudioUploaded')
                                : t('specialKit.specialAudioNotUploaded')}
                            </span>
                            <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                              {t('specialKit.uploadSpecialAudio')}
                              <input
                                type="file"
                                accept=".mp3,.wav"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleSpecialAudioUpload(sticker, file);
                                }}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
```

- [ ] **Step 4: Commit**

```bash
git add src/creator/pages/KitDetailPage.tsx src/i18n/locales/ja.json src/i18n/locales/en.json
git commit -m "feat: admin UI for special kit settings and special audio upload"
```

---

### Task 7: Integration Testing & Verification

- [ ] **Step 1: Verify DB migration**

Restart Docker and check logs:
```bash
docker compose restart
docker compose logs --tail=20 app
```

Expected: Migration log messages for `is_special`, `special_bpm`, `special_audio_uploaded`.

- [ ] **Step 2: Verify API — mark kit as special**

Use the admin account to update a kit. In the browser console or via curl:
```bash
curl -b cookies.txt -X PUT http://localhost:3001/api/kits/<kit-id> \
  -H 'Content-Type: application/json' \
  -d '{"isSpecial": true, "specialBpm": 90}'
```

Expected: Response includes `is_special: 1, special_bpm: 90`.

- [ ] **Step 3: Verify admin UI**

1. Log in as admin
2. Navigate to a kit's detail page
3. Verify the "Special Kit Settings" panel appears
4. Toggle "Mark as Special Kit" on
5. Set BPM to 90
6. Save
7. Upload special audio files for each sticker
8. Verify upload status badges update

- [ ] **Step 4: Verify playback mode switching**

1. Go to the sticker album page
2. Place 2+ stickers from the special kit on the canvas
3. Press play → should hear special audio at the special BPM
4. Add a sticker from a different kit → should switch to BPM120 normal audio
5. Remove the non-special sticker → should switch back to special mode
6. Verify transitions are smooth (brief pause is acceptable)

- [ ] **Step 5: Verify edge cases**

1. Single sticker from special kit → normal mode (BPM120)
2. Two stickers from different special kits → normal mode
3. Two stickers from same special kit + no special audio uploaded → falls back to normal audio buffer
4. Start playing in normal mode → add special kit stickers to trigger transition during playback

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify special kit dual audio integration"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | schema.sql, kits.js | DB migration — add 3 new columns |
| 2 | kits.js | Server API — CRUD for special fields + special audio upload endpoint |
| 3 | kitsApi.ts, publicKitsApi.ts, assetUrl.ts, stickerConfig.ts, kitConfig.ts, KitDataContext.tsx | Frontend types, API methods, URL helpers |
| 4 | AudioEngine.ts | Core: mode detection, BPM switching, dual-buffer playback |
| 5 | KitDataContext.tsx, useAudioEngine.ts | Wire kit metadata into AudioEngine |
| 6 | KitDetailPage.tsx, ja.json, en.json | Admin UI for special settings + audio upload |
| 7 | (manual testing) | Integration testing & edge case verification |
