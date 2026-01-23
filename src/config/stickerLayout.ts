/**
 * stickerLayout.ts - シールパレット内の配置設定
 *
 * 開発者モードで調整した配置をここに保存
 * 開発者モードをオフにするとJSONがダウンロードされるので、
 * その内容をこのファイルに貼り付けて更新する
 *
 * 開発者モード有効化: ブラウザコンソールで window.enableStickerDevMode() を実行
 */

export interface StickerLayoutItem {
  id: string;
  stickerId: string;
  x: number; // パーセント (0-100)
  y: number; // パーセント (0-100)
  size: number; // ピクセル (40-120)
  rotation: number; // 度 (-45 to 45)
}

/**
 * キットごとのシールレイアウト
 */
export const STICKER_LAYOUT_BY_KIT: Record<string, StickerLayoutItem[]> = {
  '001': [
    { id: '1', stickerId: '001-001', x: 0, y: 0, size: 120, rotation: -8 },
    { id: '2', stickerId: '001-002', x: 68.5, y: 18.2, size: 78, rotation: 12 },
    { id: '3', stickerId: '001-003', x: 4.9, y: 34.1, size: 47, rotation: -3 },
    { id: '4', stickerId: '001-004', x: 45.8, y: 33.4, size: 102, rotation: 23 },
    { id: '5', stickerId: '001-005', x: 10, y: 70.2, size: 120, rotation: -12 },
    { id: '6', stickerId: '001-006', x: 70, y: 79.5, size: 78, rotation: 5 },
    { id: '7', stickerId: '001-006', x: 57.3, y: 65.3, size: 78, rotation: -18 },
    { id: '8', stickerId: '001-006', x: 73.5, y: 51.6, size: 78, rotation: 14 },
    { id: '9', stickerId: '001-003', x: 6.5, y: 46.9, size: 47, rotation: -3 },
    { id: '10', stickerId: '001-003', x: 26.1, y: 27.7, size: 47, rotation: -3 },
    { id: '11', stickerId: '001-003', x: 27.6, y: 41.2, size: 47, rotation: -3 },
    { id: '12', stickerId: '001-002', x: 65.4, y: 0, size: 78, rotation: -11 },
    { id: '13', stickerId: '001-002', x: 46.2, y: 10, size: 78, rotation: 0 },
    { id: '14', stickerId: '001-003', x: 2.6, y: 59.3, size: 47, rotation: -3 },
    { id: '15', stickerId: '001-003', x: 24.9, y: 54.1, size: 47, rotation: -3 },
  ],
  '002': [
    { id: '16', stickerId: '002-001', x: 5, y: 5, size: 90, rotation: -5 },
    { id: '17', stickerId: '002-002', x: 55, y: 0, size: 85, rotation: 8 },
    { id: '18', stickerId: '002-003', x: 30, y: 20, size: 80, rotation: -3 },
    { id: '19', stickerId: '002-004', x: 65, y: 25, size: 95, rotation: 12 },
    { id: '20', stickerId: '002-005', x: 10, y: 40, size: 100, rotation: -8 },
    { id: '21', stickerId: '002-006', x: 50, y: 45, size: 75, rotation: 5 },
    { id: '22', stickerId: '002-007', x: 5, y: 65, size: 85, rotation: -10 },
    { id: '23', stickerId: '002-008', x: 45, y: 70, size: 90, rotation: 6 },
  ],
  '003': [
    { id: '24', stickerId: '003-001', x: 5, y: 5, size: 90, rotation: -8 },
    { id: '25', stickerId: '003-002', x: 55, y: 0, size: 85, rotation: 10 },
    { id: '26', stickerId: '003-003', x: 25, y: 22, size: 80, rotation: -5 },
    { id: '27', stickerId: '003-004', x: 65, y: 28, size: 95, rotation: 15 },
    { id: '28', stickerId: '003-005', x: 8, y: 42, size: 100, rotation: -10 },
    { id: '29', stickerId: '003-006', x: 52, y: 48, size: 75, rotation: 3 },
    { id: '30', stickerId: '003-007', x: 5, y: 68, size: 85, rotation: -12 },
    { id: '31', stickerId: '003-008', x: 48, y: 72, size: 90, rotation: 8 },
  ],
};

/**
 * 全シールのレイアウト（後方互換性のため）
 */
export const STICKER_LAYOUT: StickerLayoutItem[] = Object.values(STICKER_LAYOUT_BY_KIT).flat();

/**
 * キットIDに対応するレイアウトを取得
 */
export function getLayoutByKit(kitId: string): StickerLayoutItem[] {
  return STICKER_LAYOUT_BY_KIT[kitId] || [];
}

/**
 * シールタイプごとのデフォルトサイズと回転を取得
 * （最初に見つかった設定を使用）
 */
export function getDefaultStickerProps(stickerId: string): { size: number; rotation: number } {
  const item = STICKER_LAYOUT.find((i) => i.stickerId === stickerId);
  return item ? { size: item.size, rotation: item.rotation } : { size: 80, rotation: 0 };
}
