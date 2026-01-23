/**
 * kitConfig.ts - シールキットの定義
 */

export interface KitDefinition {
  id: string;           // '001', '002'
  name: string;         // 'Basic Shapes'
  nameJa: string;       // 'ベーシック'
  color: string;        // カードの背景色アクセント
  description?: string;
}

export const KITS: KitDefinition[] = [
  { id: '001', name: 'Basic Shapes', nameJa: 'ベーシック', color: '#FFE4E1' },
  { id: '002', name: 'Holographic', nameJa: 'ホログラム', color: '#E6E6FA' },
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
