import { useDrop } from 'react-dnd';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Sticker } from '@/app/components/StickerAlbum';
import { PlacedSticker, BASE_SHEET_WIDTH } from '@/app/components/PlacedSticker';
import { StickerEditor } from '@/app/components/StickerEditor';
import { getBackgroundImagePath, BACKGROUNDS } from '../../config/backgroundConfig';

export type AspectRatio = '3:4' | '1:1';

interface StickerSheetProps {
  stickers: Sticker[];
  backgroundId?: string;
  aspectRatio?: AspectRatio;
  onAddSticker: (type: string, x: number, y: number, size?: number, rotation?: number, paletteId?: string) => void;
  onSelectSticker?: (id: string) => void;
  onDeselectSticker?: () => void;
  onUpdateSticker?: (id: string, updates: Partial<Sticker>) => void;
  onUpdateStickerWithHistory?: (id: string, updates: Partial<Sticker>) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onDeleteSticker?: (id: string) => void;
  selectedStickerId?: string | null;
}

export function StickerSheet({
  stickers,
  backgroundId = 'default',
  aspectRatio = '3:4',
  onAddSticker,
  onSelectSticker,
  onDeselectSticker,
  onUpdateSticker,
  onUpdateStickerWithHistory,
  onMoveSticker,
  onDeleteSticker,
  selectedStickerId,
}: StickerSheetProps) {
  const selectedSticker = stickers.find((s) => s.id === selectedStickerId);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetWidth, setSheetWidth] = useState(BASE_SHEET_WIDTH);

  // 台紙幅を追跡（シールサイズ計算用）
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (sheetRef.current) {
        setSheetWidth(sheetRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 全背景画像を初回マウント時にプリロード
  const [imagesLoaded, setImagesLoaded] = useState(false);
  useEffect(() => {
    const promises = BACKGROUNDS.map((bg) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // エラーでも続行
        img.src = getBackgroundImagePath(bg.id);
      });
    });
    Promise.all(promises).then(() => setImagesLoaded(true));
  }, []);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ['sticker', 'placed-sticker'],
      drop: (item: { type: string; id?: string; size?: number; rotation?: number; paletteId?: string }, monitor) => {
        const offset = monitor.getClientOffset();
        // refを使って正しいsticker-sheetを取得（複数インスタンス対応）
        const dropTarget = sheetRef.current;

        if (offset && dropTarget) {
          const rect = dropTarget.getBoundingClientRect();
          // パーセンテージ座標に変換（0-100）- クロスデバイス互換
          const x = ((offset.x - rect.left) / rect.width) * 100;
          const y = ((offset.y - rect.top) / rect.height) * 100;

          // 振動フィードバック（ドロップ成功）
          if ('vibrate' in navigator) {
            navigator.vibrate(15);
          }

          // 配置済みシールの移動か新規追加かを判定
          if (monitor.getItemType() === 'placed-sticker' && item.id) {
            // 既存シールの移動
            onMoveSticker?.(item.id, x, y);
          } else {
            // 新しいシールのインスタンスを毎回作成（パレットのサイズと回転を引き継ぐ）
            onAddSticker(item.type, x, y, item.size, item.rotation, item.paletteId);
          }
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onAddSticker, onMoveSticker]
  );

  // 複数のrefを組み合わせる（dropとsheetRef）
  const setRefs = (element: HTMLDivElement | null) => {
    drop(element);
    (sheetRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
  };

  return (
    <div className="relative">
      {/* メインの台紙 */}
      <div
        ref={setRefs}
        className={`relative rounded-lg overflow-hidden transition-all ${
          isOver ? 'ring-4 ring-blue-300 ring-opacity-50' : ''
        }`}
        style={{
          aspectRatio: '3 / 4',  // Fixed for cross-device compatibility
          width: '100%',         // Fill parent width, height determined by aspect ratio
          backdropFilter: 'blur(10px)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(255, 255, 255, 0.5)
          `,
          border: '2px solid rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* 背景画像レイヤー（全画像を重ねて、選択中のみ表示） */}
        {BACKGROUNDS.map((bg) => (
          <div
            key={bg.id}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${getBackgroundImagePath(bg.id)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: bg.id === backgroundId ? 1 : 0,
              transition: imagesLoaded ? 'opacity 300ms ease-in-out' : 'none',
            }}
          />
        ))}
        {/* 透明感のある光沢表現 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.5) 0%,
                transparent 30%,
                transparent 70%,
                rgba(200, 220, 255, 0.2) 100%
              )
            `,
          }}
        />

        {/* グリッドパターン（薄く） */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(100, 150, 200, 0.15) 19px, rgba(100, 150, 200, 0.15) 20px),
              repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(100, 150, 200, 0.15) 19px, rgba(100, 150, 200, 0.15) 20px)
            `,
          }}
        />

        {/* シールを配置 */}
        <div>
          {stickers.map((sticker) => (
            <PlacedSticker
              key={sticker.id}
              sticker={sticker}
              sheetWidth={sheetWidth}
              isSelected={sticker.id === selectedStickerId}
              onSelect={onSelectSticker}
            />
          ))}
        </div>

        {/* 選択されたシールの近くにエディター表示 */}
        {selectedSticker && onUpdateStickerWithHistory && (
          <div
            className="absolute z-50 w-44 lg:w-auto"
            style={{
              left:
                selectedSticker.x > 180
                  ? `${Math.max(selectedSticker.x - 200, 10)}px`
                  : `${Math.min(selectedSticker.x + 50, 200)}px`,
              top: `${Math.max(selectedSticker.y - 40, 20)}px`,
            }}
          >
            <StickerEditor
              sticker={selectedSticker}
              onUpdate={onUpdateStickerWithHistory}
              onPreview={onUpdateSticker}
              onClose={onDeselectSticker}
              onDelete={onDeleteSticker}
            />
          </div>
        )}
      </div>
    </div>
  );
}
