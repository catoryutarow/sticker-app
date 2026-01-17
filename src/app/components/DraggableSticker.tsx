import { useDrag } from 'react-dnd';
import { StickerShape } from '@/app/components/StickerShape';
import { useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';

interface DraggableStickerProps {
  type: string;
  imageUrl?: string;
  onDragStart?: () => void;
}

export function DraggableSticker({ type, imageUrl, onDragStart }: DraggableStickerProps) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'sticker',
    item: { type, imageUrl },
    end: (item, monitor) => {
      // ドロップが成功しても、元のシールは残す
      // 何もしない
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [type, imageUrl]);

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
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow border-2 border-amber-100">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Custom sticker" 
            className="w-[60px] h-[60px] object-contain"
          />
        ) : (
          <StickerShape type={type} size={60} />
        )}
      </div>
    </div>
  );
}