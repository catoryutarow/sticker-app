import { useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-4">
      {/* 検索ボックス */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="キット名で検索..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        <svg
          className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <KitCardStack
        onDragStart={onDragStart}
        searchQuery={searchQuery}
      />
    </div>
  );
}
