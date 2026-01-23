import { RotateCw, ZoomIn, Check, Undo2, Music } from 'lucide-react';
import type { Sticker } from '@/app/components/StickerAlbum';
import { useState, useEffect, useRef } from 'react';
import { addStickerToPalette } from './StickerPalette';
import { getDefaultStickerProps } from '../../config/stickerLayout';

interface StickerEditorProps {
  sticker: Sticker;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onPreview?: (id: string, updates: Partial<Sticker>) => void;
  onClose?: () => void;
  onDelete?: (id: string) => void;
}

export function StickerEditor({ sticker, onUpdate, onPreview, onClose, onDelete }: StickerEditorProps) {
  const [rotation, setRotation] = useState(sticker.rotation);
  const [scale, setScale] = useState(sticker.scale);
  const [pitch, setPitch] = useState(sticker.pitch ?? 0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // stickerが変わったら内部stateを更新
  useEffect(() => {
    setRotation(sticker.rotation);
    setScale(sticker.scale);
    setPitch(sticker.pitch ?? 0);
  }, [sticker.id, sticker.rotation, sticker.scale, sticker.pitch]);

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

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = Number(e.target.value);
    setPitch(newPitch);

    // 即座にプレビューを更新（履歴には残さない）
    if (onPreview) {
      onPreview(sticker.id, { pitch: newPitch });
    }

    // デバウンス: 500ms後に履歴に反映
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(sticker.id, { pitch: newPitch });
    }, 500);
  };

  return (
    <div className="mb-4 lg:mb-6">
      {/* フォトリアル光沢紙 */}
      <div
        className="relative rounded-xl overflow-hidden"
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
                165deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0) 35%,
                rgba(255,255,255,0.95) 42%,
                rgba(255,255,255,1) 45%,
                rgba(255,255,255,0.95) 48%,
                rgba(255,255,255,0) 55%,
                rgba(255,255,255,0) 100%
              )
            `,
          }}
        />
        {/* 上部ハイライト */}
        <div
          className="absolute inset-x-0 top-0 h-16 pointer-events-none"
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
          {/* ヘッダー: タイトルとボタン */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base lg:text-lg font-bold text-gray-900">
              シール調整
            </h3>
            <div className="flex gap-1.5">
              {onDelete && (
                <button
                  className="flex items-center gap-1 px-2 py-1.5 bg-amber-100 rounded-lg text-amber-700 hover:bg-amber-200 active:scale-95 transition-transform text-xs font-medium"
                  onClick={() => {
                    // シールを初期サイズでパレットに戻す
                    const defaultProps = getDefaultStickerProps(sticker.type);
                    addStickerToPalette(sticker.type, defaultProps.size, defaultProps.rotation);
                    onDelete(sticker.id);
                  }}
                  title="パレットに戻す"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">戻す</span>
                </button>
              )}
              {onClose && (
                <button
                  className="p-1.5 bg-gray-800 rounded-full text-white hover:bg-gray-900 active:scale-95 transition-transform"
                  onClick={onClose}
                  title="閉じる"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* 角度調整 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <RotateCw className="w-4 h-4" />
                  角度
                </label>
                <span className="text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded">
                  {Math.round(rotation)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={rotation}
                onChange={handleRotationChange}
                className="w-full h-3 lg:h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-800"
                style={{
                  background: `linear-gradient(to right, #d1d5db 0%, #374151 50%, #d1d5db 100%)`,
                }}
              />
            </div>

            {/* 大きさ調整 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ZoomIn className="w-4 h-4" />
                  サイズ
                </label>
                <span className="text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded">
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
                className="w-full h-3 lg:h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-800"
                style={{
                  background: `linear-gradient(to right, #d1d5db 0%, #374151 50%, #d1d5db 100%)`,
                }}
              />
            </div>

            {/* キー調整 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Music className="w-4 h-4" />
                  キー
                </label>
                <span className="text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded">
                  {pitch > 0 ? `+${pitch}` : pitch}
                </span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                step="1"
                value={pitch}
                onChange={handlePitchChange}
                className="w-full h-3 lg:h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-800"
                style={{
                  background: `linear-gradient(to right, #d1d5db 0%, #374151 50%, #d1d5db 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}