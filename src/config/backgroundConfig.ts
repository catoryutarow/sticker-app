/**
 * backgroundConfig.ts - 背景設定（DB駆動 + 動的登録）
 *
 * 背景はDBから BackgroundDataContext 経由でロードされ、
 * registerDynamicBackground() でこのモジュールに登録される。
 * 既存コードとの互換性のため、同期APIを維持。
 */

import { getBackgroundUrl } from './assetUrl';

export interface BackgroundDefinition {
  id: string;
  name: string;
  nameJa: string;
  filename: string;
  isSpecial?: boolean;
  specialKitId?: string | null;
}

/**
 * デフォルト背景ID
 */
export const DEFAULT_BACKGROUND_ID = 'default';

// 動的に登録される背景（API から）
const dynamicBackgrounds = new Map<string, BackgroundDefinition>();

/**
 * 動的に背景を登録（BackgroundDataContext から呼び出す）
 */
export function registerDynamicBackground(bg: BackgroundDefinition): void {
  dynamicBackgrounds.set(bg.id, bg);
}

/**
 * 動的背景をクリア
 */
export function clearDynamicBackgrounds(): void {
  dynamicBackgrounds.clear();
}

/**
 * 全ての背景を取得（sort_order順ではなく、登録順）
 */
export function getAllBackgrounds(): BackgroundDefinition[] {
  return Array.from(dynamicBackgrounds.values());
}

/**
 * IDから背景定義を取得
 */
export function getBackgroundById(id: string): BackgroundDefinition | undefined {
  return dynamicBackgrounds.get(id);
}

/**
 * IDから背景画像URLを取得（CDN対応）
 */
export function getBackgroundImagePath(id: string): string {
  const bg = getBackgroundById(id);
  if (!bg) {
    // フォールバック: 最初の背景 または レガシーデフォルトファイル
    const fallback = dynamicBackgrounds.get(DEFAULT_BACKGROUND_ID);
    return getBackgroundUrl(fallback?.filename || 'AdobeStock_584852960.jpeg');
  }
  return getBackgroundUrl(bg.filename);
}

/**
 * 全背景IDの配列を取得
 */
export function getAllBackgroundIds(): string[] {
  return Array.from(dynamicBackgrounds.keys());
}

/**
 * 後方互換用: 静的な BACKGROUNDS 配列（空）
 * 既存コードは `BACKGROUNDS` を import している箇所があるが、
 * 新しいコードは getAllBackgrounds() を使うこと
 */
export const BACKGROUNDS: BackgroundDefinition[] = [];
