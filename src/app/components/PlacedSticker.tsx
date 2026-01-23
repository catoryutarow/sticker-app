import type { Sticker } from '@/app/components/StickerAlbum';
import { StickerShape } from '@/app/components/StickerShape';
import { useDrag } from 'react-dnd';
import { useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';

interface PlacedStickerProps {
  sticker: Sticker;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function PlacedSticker({ sticker, isSelected, onSelect }: PlacedStickerProps) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: 'placed-sticker',
      item: {
        id: sticker.id,
        type: sticker.type,
        rotation: sticker.rotation,
        scale: sticker.scale,
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [sticker.id, sticker.type, sticker.rotation, sticker.scale]
  );

  // デフォルトのドラッグプレビューを無効化
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={drag}
      className={`absolute cursor-move transition-all ${isSelected ? 'z-10' : 'z-0'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{
        left: `${sticker.x}px`,
        top: `${sticker.y}px`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
        // リアルなシール影: 台紙に密着した柔らかい影
        filter: `
          drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15))
          drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1))
          drop-shadow(0 0 1px rgba(0, 0, 0, 0.08))
        `,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(sticker.id);
      }}
    >
      {/* 選択時のハイライト - 控えめなグロー効果 */}
      {isSelected && (
        <div
          className="absolute inset-0 -m-1 rounded-full pointer-events-none"
          style={{
            boxShadow: '0 0 8px 2px rgba(59, 130, 246, 0.4)',
          }}
        />
      )}

      <div className="pointer-events-none">
        <StickerShape type={sticker.type} size={80} />
      </div>
    </div>
  );
}
