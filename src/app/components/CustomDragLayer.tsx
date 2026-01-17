import { useDragLayer } from 'react-dnd';
import { StickerShape } from '@/app/components/StickerShape';

export function CustomDragLayer() {
  const { itemType, isDragging, item, clientOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  if (!isDragging || !clientOffset) {
    return null;
  }

  const renderPreview = () => {
    // 配置済みシールの場合は角度を保持、サイズは統一
    if (itemType === 'placed-sticker') {
      const rotation = item.rotation || 0;
      
      return (
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3))',
            opacity: 0.8,
          }}
        >
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt="Sticker" 
              className="w-[80px] h-[80px] object-contain pointer-events-none"
            />
          ) : (
            <div className="pointer-events-none">
              <StickerShape type={item.type} size={80} />
            </div>
          )}
        </div>
      );
    }

    // パレットからの新規シールの場合は通常表示
    if (itemType === 'sticker') {
      return (
        <div
          style={{
            filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3))',
            opacity: 0.8,
          }}
        >
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt="Sticker" 
              className="w-[80px] h-[80px] object-contain pointer-events-none"
            />
          ) : (
            <div className="pointer-events-none">
              <StickerShape type={item.type} size={80} />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed pointer-events-none z-[9999] left-0 top-0"
      style={{
        transform: `translate(${clientOffset.x}px, ${clientOffset.y}px)`,
      }}
    >
      <div
        style={{
          transform: 'translate(-50%, -50%)', // 中心を合わせる
        }}
      >
        {renderPreview()}
      </div>
    </div>
  );
}