/**
 * AudioControls.tsx - 再生/一時停止UI
 */

import { Play, Pause } from 'lucide-react';
import { StickerType, STICKER_SOUNDS } from '../../audio';

interface AudioControlsProps {
  isPlaying: boolean;
  isInitialized: boolean;
  activeTracks: Map<StickerType, number>;
  saturationAmount?: number;
  onToggle: () => void;
  onInitialize: () => Promise<void>;
}

export function AudioControls({
  isPlaying,
  isInitialized,
  activeTracks,
  saturationAmount = 0,
  onToggle,
  onInitialize,
}: AudioControlsProps) {
  // アクティブなシールタイプをカウント
  const activeCount = Array.from(activeTracks.values()).filter((count) => count > 0).length;

  const handlePlayClick = async () => {
    if (!isInitialized) {
      await onInitialize();
    }
    onToggle();
  };

  return (
    <div className="flex items-center gap-3">
      {/* 再生/停止ボタン */}
      <button
        onClick={handlePlayClick}
        disabled={activeCount === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
          activeCount > 0
            ? 'bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg active:scale-95'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={isPlaying ? '停止' : '再生'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        <span className="hidden sm:inline">{isPlaying ? '停止' : '再生'}</span>
      </button>

      {/* アクティブトラック表示 */}
      {activeCount > 0 && (
        <div className="hidden md:flex items-center gap-1">
          {Array.from(activeTracks.entries())
            .filter(([, count]) => count > 0)
            .map(([type]) => (
              <div
                key={type}
                className={`w-3 h-3 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: STICKER_SOUNDS[type].color }}
                title={`${STICKER_SOUNDS[type].nameJa}`}
              />
            ))}
        </div>
      )}

      {/* サチュレーション表示 */}
      {isPlaying && saturationAmount > 0 && (
        <div
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: `rgba(255, ${Math.round(100 - saturationAmount * 100)}, 0, ${0.2 + saturationAmount * 0.3})`,
            color: `rgb(${Math.round(180 + saturationAmount * 75)}, ${Math.round(80 - saturationAmount * 40)}, 0)`,
          }}
          title={`サチュレーション: ${Math.round(saturationAmount * 100)}%`}
        >
          <span className="animate-pulse">SAT</span>
          <span>{Math.round(saturationAmount * 100)}%</span>
        </div>
      )}
    </div>
  );
}
