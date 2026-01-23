import { useState } from 'react';
import { Undo2, Redo2, Save, FolderOpen, RotateCcw, Download } from 'lucide-react';
import { AudioControls } from './AudioControls';
import { StickerType } from '../../audio';

interface ControlPanelProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  // Audio props
  isPlaying: boolean;
  isAudioInitialized: boolean;
  activeTracks: Map<StickerType, number>;
  saturationAmount?: number;
  onAudioToggle: () => void;
  onAudioInitialize: () => Promise<void>;
  // Export props
  onExport: () => void;
  hasStickers: boolean;
}

export function ControlPanel({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onClear,
  // Audio props
  isPlaying,
  isAudioInitialized,
  activeTracks,
  saturationAmount = 0,
  onAudioToggle,
  onAudioInitialize,
  // Export props
  onExport,
  hasStickers,
}: ControlPanelProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetClick = () => {
    setShowResetDialog(true);
  };

  const handleConfirmReset = () => {
    setShowResetDialog(false);
    onClear();
  };

  return (
    <div className="mb-0 lg:mb-6">
      <div className="relative">
        {/* 装飾と背景 - フォトリアル光沢紙 */}
        <div
          className="relative rounded-none lg:rounded-xl overflow-hidden"
          style={{
            background: '#fefefe',
            boxShadow: `
              0 25px 50px -12px rgba(0,0,0,0.25),
              0 12px 24px -8px rgba(0,0,0,0.15),
              0 4px 6px -2px rgba(0,0,0,0.1),
              inset 0 2px 4px rgba(255,255,255,0.9),
              inset 0 -2px 4px rgba(0,0,0,0.02)
            `,
            border: '1px solid rgba(255,255,255,0.8)',
          }}
        >
          {/* メイン光沢グラデーション */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(
                  95deg,
                  rgba(255,255,255,0) 0%,
                  rgba(255,255,255,0) 30%,
                  rgba(255,255,255,0.9) 45%,
                  rgba(255,255,255,1) 50%,
                  rgba(255,255,255,0.9) 55%,
                  rgba(255,255,255,0) 70%,
                  rgba(255,255,255,0) 100%
                )
              `,
            }}
          />
          {/* 上部ハイライト */}
          <div
            className="absolute inset-x-0 top-0 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)',
            }}
          />
          {/* 微細なテクスチャ感 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative p-3 lg:p-4">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
              {/* 戻る/進む */}
              <div className="flex gap-2">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    canUndo
                      ? 'bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="元に戻す"
                >
                  <Undo2 className="w-5 h-5" />
                  <span className="hidden sm:inline">戻る</span>
                </button>

                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    canRedo
                      ? 'bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="やり直す"
                >
                  <Redo2 className="w-5 h-5" />
                  <span className="hidden sm:inline">進む</span>
                </button>
              </div>

              {/* 区切り */}
              <div className="w-px h-8 bg-gray-400"></div>

              {/* オーディオコントロール */}
              <AudioControls
                isPlaying={isPlaying}
                isInitialized={isAudioInitialized}
                activeTracks={activeTracks}
                saturationAmount={saturationAmount}
                onToggle={onAudioToggle}
                onInitialize={onAudioInitialize}
              />

              {/* 区切り */}
              <div className="w-px h-8 bg-gray-400"></div>

              {/* 保存/読込 */}
              <div className="flex gap-2">
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  title="保存"
                >
                  <Save className="w-5 h-5" />
                  <span className="hidden sm:inline">保存</span>
                </button>

                <button
                  onClick={onLoad}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  title="読込"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="hidden sm:inline">読込</span>
                </button>
              </div>

              {/* 区切り */}
              <div className="w-px h-8 bg-gray-400"></div>

              {/* エクスポート */}
              <button
                onClick={onExport}
                disabled={!hasStickers}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  hasStickers
                    ? 'bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title="動画エクスポート"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">動画</span>
              </button>

              {/* 区切り */}
              <div className="w-px h-8 bg-gray-400"></div>

              {/* 初期化 */}
              <button
                onClick={handleResetClick}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                title="初期化"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="hidden sm:inline">初期化</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 初期化確認ダイアログ */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">初期化の確認</h3>
            <p className="text-gray-600 mb-4">
              本当に初期化しますか？
              <span className="block text-amber-600 text-sm mt-1">
                ※台紙に貼られたシールがすべて削除されます
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetDialog(false)}
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors"
              >
                初期化する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
