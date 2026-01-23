/**
 * backgroundConfig.ts - 背景設定の一元管理
 *
 * 背景を追加するには:
 * 1. このファイルのBACKGROUNDS配列にエントリを追加
 * 2. public/backgrounds/{filename} に画像を配置
 */

export interface BackgroundDefinition {
  id: string;
  name: string;
  nameJa: string;
  filename: string;
}

/**
 * 背景定義一覧
 */
export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: 'default',
    name: 'Blue Sky',
    nameJa: '青空',
    filename: 'AdobeStock_584852960.jpeg',
  },
  {
    id: 'panel',
    name: 'Panel',
    nameJa: 'パネル',
    filename: 'panel.jpg',
  },
];

/**
 * デフォルト背景ID
 */
export const DEFAULT_BACKGROUND_ID = 'default';

/**
 * IDから背景定義を取得
 */
export function getBackgroundById(id: string): BackgroundDefinition | undefined {
  return BACKGROUNDS.find((b) => b.id === id);
}

/**
 * IDから背景画像パスを取得
 */
export function getBackgroundImagePath(id: string): string {
  const bg = getBackgroundById(id);
  if (!bg) {
    // フォールバック: デフォルト背景
    const defaultBg = getBackgroundById(DEFAULT_BACKGROUND_ID);
    return `/backgrounds/${defaultBg?.filename || 'AdobeStock_584852960.jpeg'}`;
  }
  return `/backgrounds/${bg.filename}`;
}

/**
 * 全背景IDの配列を取得
 */
export function getAllBackgroundIds(): string[] {
  return BACKGROUNDS.map((b) => b.id);
}
