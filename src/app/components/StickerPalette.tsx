import {
  KitCardStack,
  removeStickerFromPalette as _removeStickerFromPalette,
  addStickerToPalette as _addStickerToPalette,
  resetPalette as _resetPalette,
  removeStickerByType as _removeStickerByType,
} from './KitCardStack';

interface StickerPaletteProps {
  onDragStart?: () => void;
  onStickerUsed?: (paletteId: string) => void;
}

// 外部からシールを削除するための関数をエクスポート
export function removeStickerFromPalette(paletteId: string) {
  _removeStickerFromPalette(paletteId);
}

// 外部からシールを追加するための関数をエクスポート（台紙に戻す機能用）
export function addStickerToPalette(stickerId: string, size: number, rotation: number) {
  _addStickerToPalette(stickerId, size, rotation);
}

// 外部からパレットを初期状態にリセットするための関数をエクスポート
export function resetPalette() {
  _resetPalette();
}

// 外部からシールをタイプ（stickerId）で削除するための関数をエクスポート（Redo用）
export function removeStickerByType(stickerId: string) {
  _removeStickerByType(stickerId);
}

export function StickerPalette({ onDragStart }: StickerPaletteProps) {
  return (
    <KitCardStack
      onDragStart={onDragStart}
    />
  );
}
