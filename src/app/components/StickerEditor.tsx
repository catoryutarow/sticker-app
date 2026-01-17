import { RotateCw, ZoomIn, Check } from 'lucide-react';
import type { Sticker } from '@/app/components/StickerAlbum';
import { useState, useEffect, useRef } from 'react';

interface StickerEditorProps {
  sticker: Sticker;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onPreview?: (id: string, updates: Partial<Sticker>) => void;
  onClose?: () => void;
}

export function StickerEditor({ sticker, onUpdate, onPreview, onClose }: StickerEditorProps) {
  const [rotation, setRotation] = useState(sticker.rotation);
  const [scale, setScale] = useState(sticker.scale);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // stickerが変わったら内部stateを更新
  useEffect(() => {
    setRotation(sticker.rotation);
    setScale(sticker.scale);
  }, [sticker.id, sticker.rotation, sticker.scale]);

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRotation = Number(e.target.value);
    setRotation(newRotation);
    
    // 即座にプレビューを更新（履歴には残さない）
    if (onPreview) {
      onPreview(sticker.id, { rotation: newRotation });
    }
    
    // デバウンス: 500ms後に履歴に反映
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(sticker.id, { rotation: newRotation });
    }, 500);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = Number(e.target.value);
    setScale(newScale);
    
    // 即座にプレビューを更新（履歴には残さない）
    if (onPreview) {
      onPreview(sticker.id, { scale: newScale });
    }
    
    // デバウンス: 500ms後に履歴に反映
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(sticker.id, { scale: newScale });
    }, 500);
  };

  return (
    <div className="mb-4 lg:mb-6">
      <div 
        className="relative rounded-none lg:rounded-lg shadow-xl overflow-hidden"
        style={{
          background: '#fef3c7',
        }}
      >
        <div 
          className="relative p-3 lg:p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 250, 245, 0.85) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <h3 className="text-base lg:text-lg font-bold text-amber-900 mb-3 text-center">
            シール調整
          </h3>
          
          <div className="space-y-3">
            {/* 角度調整 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <RotateCw className="w-4 h-4" />
                  角度
                </label>
                <span className="text-sm font-mono text-amber-700 bg-white px-2 py-1 rounded">
                  {Math.round(rotation)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={rotation}
                onChange={handleRotationChange}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                style={{
                  background: `linear-gradient(to right, #fcd34d 0%, #fb7185 50%, #fcd34d 100%)`,
                }}
              />
            </div>

            {/* 大きさ調整 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <ZoomIn className="w-4 h-4" />
                  大きさ
                </label>
                <span className="text-sm font-mono text-amber-700 bg-white px-2 py-1 rounded">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.1"
                value={scale}
                onChange={handleScaleChange}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{
                  background: `linear-gradient(to right, #fcd34d 0%, #a855f7 50%, #fcd34d 100%)`,
                }}
              />
            </div>
          </div>
          
          {/* 閉じるボタン */}
          {onClose && (
            <button
              className="absolute top-3 right-3 p-1 bg-amber-100 rounded-full text-amber-500 hover:bg-amber-200"
              onClick={onClose}
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}