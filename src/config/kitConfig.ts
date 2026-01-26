/**
 * kitConfig.ts - シールキットの定義
 */

export interface KitDefinition {
  id: string;           // '001', '002'
  name: string;         // 'Basic Shapes'
  nameJa: string;       // 'ベーシック'
  color: string;        // カードの背景色アクセント
  description?: string;
  musicalKey?: string;  // 'C/Am', 'G/Em' など（並行調フォーマット）
}

// musicalKeyは並行調フォーマット（メジャー/マイナー）
export const KITS: KitDefinition[] = [
  { id: '001', name: 'Basic Shapes', nameJa: 'ベーシック', color: '#FFE4E1', musicalKey: 'C/Am' },
  { id: '002', name: 'Holographic', nameJa: 'ホログラム', color: '#E6E6FA', musicalKey: 'D/Bm' },
  { id: '003', name: 'Neon', nameJa: 'ネオン', color: '#E0FFE0', musicalKey: 'Bb/Gm' },
];

// 動的に追加されるキット定義を保持するマップ
const dynamicKits = new Map<string, KitDefinition>();

/**
 * 動的にキット定義を追加
 */
export function registerDynamicKit(kit: KitDefinition) {
  dynamicKits.set(kit.id, kit);
}

/**
 * 動的キットをクリア
 */
export function clearDynamicKits() {
  dynamicKits.clear();
}

/**
 * IDでキットを取得（動的キットも含む）
 */
export function getKitById(id: string): KitDefinition | undefined {
  // まず動的キットをチェック
  const dynamic = dynamicKits.get(id);
  if (dynamic) return dynamic;
  // 静的キットをチェック
  return KITS.find(kit => kit.id === id);
}

/**
 * キットIDからシールIDのプレフィックスを生成
 */
export function getStickerPrefix(kitId: string): string {
  return `${kitId}-`;
}

/**
 * 並行調から半音オフセットを取得（C/Am=0基準）
 */
const KEY_TO_SEMITONE: Record<string, number> = {
  'C/Am': 0,
  'G/Em': -5,
  'D/Bm': 2,
  'A/F#m': -3,
  'E/C#m': 4,
  'B/G#m': -1,
  'F#/D#m': 6,
  'F/Dm': 5,
  'Bb/Gm': -2,
  'Eb/Cm': 3,
  'Ab/Fm': -4,
  'Db/Bbm': 1,
};

/**
 * キットのベース半音オフセットを取得
 */
export function getKitBaseSemitone(kitId: string): number {
  const kit = getKitById(kitId);
  if (!kit?.musicalKey) return 0;
  return KEY_TO_SEMITONE[kit.musicalKey] ?? 0;
}
