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
 * シールパレット内の配置設定
 */
export const STICKER_LAYOUT: StickerLayoutItem[] = [
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
];

/**
 * シールタイプごとのデフォルトサイズと回転を取得
 * （最初に見つかった設定を使用）
 */
export function getDefaultStickerProps(stickerId: string): { size: number; rotation: number } {
  const item = STICKER_LAYOUT.find((i) => i.stickerId === stickerId);
  return item ? { size: item.size, rotation: item.rotation } : { size: 80, rotation: 0 };
}
