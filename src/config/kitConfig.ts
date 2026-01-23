/**
 * kitConfig.ts - シールキットの定義
 */

export interface KitDefinition {
  id: string;           // '001', '002'
  name: string;         // 'Basic Shapes'
  nameJa: string;       // 'ベーシック'
  color: string;        // カードの背景色アクセント
  description?: string;
  musicalKey?: string;  // 'Am', 'Bm' など（キット全体のキー）
}

export const KITS: KitDefinition[] = [
  { id: '001', name: 'Basic Shapes', nameJa: 'ベーシック', color: '#FFE4E1', musicalKey: 'Am' },
  { id: '002', name: 'Holographic', nameJa: 'ホログラム', color: '#E6E6FA', musicalKey: 'Bm' },
  { id: '003', name: 'Neon', nameJa: 'ネオン', color: '#E0FFE0', musicalKey: 'Gm' },
];

/**
 * IDでキットを取得
 */
export function getKitById(id: string): KitDefinition | undefined {
  return KITS.find(kit => kit.id === id);
}

/**
 * キットIDからシールIDのプレフィックスを生成
 */
export function getStickerPrefix(kitId: string): string {
  return `${kitId}-`;
}

/**
 * キー名から半音オフセットを取得（Am=0基準）
 */
const KEY_TO_SEMITONE: Record<string, number> = {
  'Am': 0,
  'A#m': 1, 'Bbm': 1,
  'Bm': 2,
  'Cm': 3,
  'C#m': 4, 'Dbm': 4,
  'Dm': 5,
  'D#m': 6, 'Ebm': 6,
  'Em': -5,
  'Fm': -4,
  'F#m': -3, 'Gbm': -3,
  'Gm': -2,
  'G#m': -1, 'Abm': -1,
};

/**
 * キットのベース半音オフセットを取得
 */
export function getKitBaseSemitone(kitId: string): number {
  const kit = getKitById(kitId);
  if (!kit?.musicalKey) return 0;
  return KEY_TO_SEMITONE[kit.musicalKey] ?? 0;
}
