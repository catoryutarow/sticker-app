import { useDrag } from 'react-dnd';
import { StickerShape } from '@/app/components/StickerShape';
import { useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';

interface DraggableStickerProps {
  type: string;
  size?: number;
  rotation?: number;
  paletteId?: string; // パレット内のシールID（有限シール用）
  onDragStart?: () => void;
}

export function DraggableSticker({ type, size = 80, rotation = 0, paletteId, onDragStart }: DraggableStickerProps) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: 'sticker',
      item: { type, size, rotation, paletteId },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [type, size, rotation, paletteId]
  );

  // デフォルトのドラッグプレビューを無効化
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  useEffect(() => {
    if (isDragging && onDragStart) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  return (
    <div
      ref={drag}
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:scale-110'
      }`}
      style={{
        touchAction: 'none',
      }}
    >
      <div
        className="transition-all hover:scale-110"
        style={{
          filter: `
            drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12))
            drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))
          `,
        }}
      >
        <StickerShape type={type} size={size} />
      </div>
    </div>
  );
}
