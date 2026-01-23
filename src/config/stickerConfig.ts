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

export interface StickerDefinition {
  id: string;
  name: string;
  nameJa: string;
  color: string;
}

/**
 * シール定義一覧
 * 追加・削除はここで管理
 * ID形式: {パッケージID}-{シールID} (例: 001-001)
 */
export const STICKERS: StickerDefinition[] = [
  { id: '001-001', name: 'Star', nameJa: 'スター', color: '#FFD700' },
  { id: '001-002', name: 'Heart', nameJa: 'ハート', color: '#FF69B4' },
  { id: '001-003', name: 'Circle', nameJa: 'サークル', color: '#87CEEB' },
  { id: '001-004', name: 'Square', nameJa: 'スクエア', color: '#90EE90' },
  { id: '001-005', name: 'Triangle', nameJa: 'トライアングル', color: '#DDA0DD' },
  { id: '001-006', name: 'Flower', nameJa: 'フラワー', color: '#FFB6C1' },
];

/**
 * IDからシール定義を取得
 */
export function getStickerById(id: string): StickerDefinition | undefined {
  return STICKERS.find((s) => s.id === id);
}

/**
 * 有効なシールIDかどうかを判定
 */
export function isValidStickerId(id: string): boolean {
  return STICKERS.some((s) => s.id === id);
}

/**
 * 全シールIDの配列を取得
 */
export function getAllStickerIds(): string[] {
  return STICKERS.map((s) => s.id);
}

/**
 * IDからキットIDを抽出
 */
function getKitId(id: string): string {
  const parts = id.split('-');
  return parts[0] || '001';
}

/**
 * アセットパスを生成
 */
export function getStickerImagePath(id: string): string {
  const kitId = getKitId(id);
  return `/assets/stickers/kit-${kitId}/${id}.png`;
}

export function getStickerAudioPath(id: string): string {
  const kitId = getKitId(id);
  return `/assets/audio/kit-${kitId}/${id}.mp3`;
}
