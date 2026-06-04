/**
 * stickerConfig.ts - シール設定の一元管理
 *
 * シールを追加/削除するには:
 * 1. このファイルのSTICKERS配列にエントリを追加/削除
 * 2. public/assets/stickers/kit-{パッケージID}/{id}.png を配置/削除
 * 3. public/assets/audio/kit-{パッケージID}/{id}.mp3 を配置/削除
 *
 * ID形式: {パッケージID}-{シールID}
 * 例: 001-001, 001-002, 002-001
 * - パッケージID: 3桁（001〜999）
 * - シールID: 3桁（001〜999）
 */

export type StickerRole =
  | 'kick' | 'snare' | 'percussion'   // リズム系（高さが変わる、キー非依存）
  | 'bass' | 'chord' | 'lead' | 'candy'; // メロディ系（キーが変わる）

export type StickerCategory = 'rhythm' | 'melody';

export const RHYTHM_ROLES: StickerRole[] = ['kick', 'snare', 'percussion'];
export const MELODY_ROLES: StickerRole[] = ['bass', 'chord', 'lead', 'candy'];
export const ALL_STICKER_ROLES: StickerRole[] = [...RHYTHM_ROLES, ...MELODY_ROLES];

export const ROLE_LABELS: Record<StickerRole, { en: string; ja: string }> = {
  kick:       { en: 'Kick',       ja: 'キック' },
  snare:      { en: 'Snare',      ja: 'スネア' },
  percussion: { en: 'Percussion', ja: 'パーカッション' },
  bass:       { en: 'Bass',       ja: 'ベース' },
  chord:      { en: 'Chord',      ja: 'コード' },
  lead:       { en: 'Lead',       ja: 'リード' },
  candy:      { en: 'Candy',      ja: 'キャンディー' },
};

export function getRoleCategory(role: StickerRole): StickerCategory {
  return RHYTHM_ROLES.includes(role) ? 'rhythm' : 'melody';
}

export interface StickerDefinition {
  id: string;
  name: string;
  nameJa: string;
  color: string;
  isPercussion?: boolean;  // パーカッション（キーなし）の場合true（互換用、role があれば role を優先）
  role?: StickerRole | null;
}

// 動的に追加されるシール定義を保持するマップ
const dynamicStickers = new Map<string, StickerDefinition>();

/**
 * 動的にシール定義を追加（KitDataContextから呼び出される）
 */
export function registerDynamicSticker(sticker: StickerDefinition) {
  dynamicStickers.set(sticker.id, sticker);
}

/**
 * 動的シールをクリア
 */
export function clearDynamicStickers() {
  dynamicStickers.clear();
}

/**
 * シール定義一覧
 * 追加・削除はここで管理
 * ID形式: {パッケージID}-{シールID} (例: 001-001)
 */
export const STICKERS: StickerDefinition[] = [
  // === kit-001 ===
  { id: '001-001', name: 'Star', nameJa: 'スター', color: '#FFD700', isPercussion: true },
  { id: '001-002', name: 'Heart', nameJa: 'ハート', color: '#FF69B4' },
  { id: '001-003', name: 'Circle', nameJa: 'サークル', color: '#87CEEB' },
  { id: '001-004', name: 'Square', nameJa: 'スクエア', color: '#90EE90' },
  { id: '001-005', name: 'Triangle', nameJa: 'トライアングル', color: '#DDA0DD' },
  { id: '001-006', name: 'Flower', nameJa: 'フラワー', color: '#FFB6C1', isPercussion: true },

  // === kit-002 ===
  { id: '002-001', name: 'Sticker 1', nameJa: 'シール1', color: '#FF6B6B', isPercussion: true },
  { id: '002-002', name: 'Sticker 2', nameJa: 'シール2', color: '#4ECDC4', isPercussion: true },
  { id: '002-003', name: 'Sticker 3', nameJa: 'シール3', color: '#45B7D1' },
  { id: '002-004', name: 'Sticker 4', nameJa: 'シール4', color: '#96CEB4' },
  { id: '002-005', name: 'Sticker 5', nameJa: 'シール5', color: '#FFEAA7' },
  { id: '002-006', name: 'Sticker 6', nameJa: 'シール6', color: '#DDA0DD', isPercussion: true },
  { id: '002-007', name: 'Sticker 7', nameJa: 'シール7', color: '#98D8C8' },
  { id: '002-008', name: 'Sticker 8', nameJa: 'シール8', color: '#F7DC6F' },

  // === kit-003 ===
  { id: '003-001', name: 'Sticker 1', nameJa: 'シール1', color: '#00FF88', isPercussion: true },
  { id: '003-002', name: 'Sticker 2', nameJa: 'シール2', color: '#FF00AA' },
  { id: '003-003', name: 'Sticker 3', nameJa: 'シール3', color: '#00AAFF' },
  { id: '003-004', name: 'Sticker 4', nameJa: 'シール4', color: '#FFAA00' },
  { id: '003-005', name: 'Sticker 5', nameJa: 'シール5', color: '#AA00FF' },
  { id: '003-006', name: 'Sticker 6', nameJa: 'シール6', color: '#00FFAA' },
  { id: '003-007', name: 'Sticker 7', nameJa: 'シール7', color: '#FF5500', isPercussion: true },
  { id: '003-008', name: 'Sticker 8', nameJa: 'シール8', color: '#55FF00' },
];

/**
 * IDからシール定義を取得（動的シールも含む）
 */
export function getStickerById(id: string): StickerDefinition | undefined {
  // まず動的シールをチェック
  const dynamic = dynamicStickers.get(id);
  if (dynamic) return dynamic;
  // 静的シールをチェック
  return STICKERS.find((s) => s.id === id);
}

/**
 * 有効なシールIDかどうかを判定（動的シールも含む）
 */
export function isValidStickerId(id: string): boolean {
  if (dynamicStickers.has(id)) return true;
  return STICKERS.some((s) => s.id === id);
}

/**
 * 全シールIDの配列を取得（静的+動的を返す）
 */
export function getAllStickerIds(): string[] {
  const staticIds = STICKERS.map((s) => s.id);
  const dynamicIds = Array.from(dynamicStickers.keys());
  return [...new Set([...staticIds, ...dynamicIds])];
}

import { getStickerImageUrl, getStickerAudioUrl, getStickerSpecialAudioUrl } from './assetUrl';

/**
 * IDからキットIDを抽出
 */
export function getKitIdFromStickerId(id: string): string {
  const parts = id.split('-');
  return parts[0] || '001';
}

/**
 * アセットURLを生成（CDN対応）
 */
export function getStickerImagePath(id: string): string {
  const kitId = getKitIdFromStickerId(id);
  return getStickerImageUrl(kitId, id);
}

export function getStickerAudioPath(id: string): string {
  const kitId = getKitIdFromStickerId(id);
  return getStickerAudioUrl(kitId, id);
}

export function getStickerSpecialAudioPath(id: string): string {
  const kitId = getKitIdFromStickerId(id);
  return getStickerSpecialAudioUrl(kitId, id);
}

/**
 * シールの役割を取得（未設定なら null）
 */
export function getStickerRole(stickerId: string): StickerRole | null {
  const sticker = getStickerById(stickerId);
  return sticker?.role ?? null;
}

/**
 * シールのカテゴリ（rhythm/melody）を取得
 * role があればそこから導出、無ければ isPercussion を見る互換挙動
 */
export function getStickerCategory(stickerId: string): StickerCategory {
  const role = getStickerRole(stickerId);
  if (role) return getRoleCategory(role);
  return isStickerPercussionLegacy(stickerId) ? 'rhythm' : 'melody';
}

function isStickerPercussionLegacy(stickerId: string): boolean {
  const sticker = getStickerById(stickerId);
  return sticker?.isPercussion ?? false;
}

/**
 * シールがパーカッション（リズム系）かどうかを判定
 * role 優先、無ければ既存 isPercussion フィールドにフォールバック。
 * これによりオーディオ側の callsite (StickerEditor / StickerAlbum / WorkPage / AudioMixer) は無変更で動く。
 */
export function isStickerPercussion(stickerId: string): boolean {
  return getStickerCategory(stickerId) === 'rhythm';
}

/**
 * 半音オフセット→並行調マッピング（C/Am=0基準）
 */
const SEMITONE_TO_KEY: Record<number, string> = {
  [-6]: 'F# / D#m',
  [-5]: 'G / Em',
  [-4]: 'Ab / Fm',
  [-3]: 'A / F#m',
  [-2]: 'Bb / Gm',
  [-1]: 'B / G#m',
  [0]: 'C / Am',
  [1]: 'Db / Bbm',
  [2]: 'D / Bm',
  [3]: 'Eb / Cm',
  [4]: 'E / C#m',
  [5]: 'F / Dm',
  [6]: 'F# / D#m',
};

/**
 * 半音オフセットから並行調名を取得
 */
export function semitoneToKey(semitone: number): string {
  const clamped = Math.max(-6, Math.min(6, semitone));
  return SEMITONE_TO_KEY[clamped] ?? 'C / Am';
}
