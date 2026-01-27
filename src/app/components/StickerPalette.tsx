import { useState } from 'react';
import {
  KitCardStack,
  removeStickerFromPalette as _removeStickerFromPalette,
  addStickerToPalette as _addStickerToPalette,
  resetPalette as _resetPalette,
  removeStickerByType as _removeStickerByType,
} from './KitCardStack';
import { KitFinderModal } from './KitFinderModal';

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
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [selectedKitNumber, setSelectedKitNumber] = useState<string | null>(null);

  const handleSelectKit = (kitNumber: string) => {
    // 選択したキットを直接表示
    setSelectedKitNumber(kitNumber);
    setSearchQuery(''); // 検索クエリをクリア
  };

  return (
    <div className="space-y-4">
      {/* 検索ボックス */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedKitNumber(null); // 検索時は選択をクリア
            }}
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

        {/* キットを探すボタン */}
        <button
          onClick={() => setIsFinderOpen(true)}
          className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-1.5"
          title="タグで絞り込み"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="hidden sm:inline">探す</span>
        </button>
      </div>

      <KitCardStack
        onDragStart={onDragStart}
        searchQuery={searchQuery}
        selectedKitNumber={selectedKitNumber}
      />

      {/* キットを探すモーダル */}
      <KitFinderModal
        isOpen={isFinderOpen}
        onClose={() => setIsFinderOpen(false)}
        onSelectKit={handleSelectKit}
      />
    </div>
  );
}
