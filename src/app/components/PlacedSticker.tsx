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
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'placed-sticker',
    item: { 
      id: sticker.id, 
      type: sticker.type, 
      imageUrl: sticker.imageUrl,
      rotation: sticker.rotation,
      scale: sticker.scale,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [sticker.id, sticker.type, sticker.imageUrl, sticker.rotation, sticker.scale]);

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
        filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.2))',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(sticker.id);
      }}
    >
      {/* 選択時の枠 */}
      {isSelected && (
        <div className="absolute inset-0 -m-2 border-3 border-blue-500 rounded-lg pointer-events-none animate-pulse"
          style={{
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}
      
      {sticker.imageUrl ? (
        <img 
          src={sticker.imageUrl} 
          alt="Sticker" 
          className="w-[80px] h-[80px] object-contain pointer-events-none"
        />
      ) : (
        <div className="pointer-events-none">
          <StickerShape type={sticker.type} size={80} />
        </div>
      )}
    </div>
  );
}