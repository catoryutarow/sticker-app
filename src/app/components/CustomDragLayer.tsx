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
          <div className="pointer-events-none">
            <StickerShape type={item.type} size={80} />
          </div>
        </div>
      );
    }

    // パレットからの新規シールの場合（角度とサイズを引き継ぐ）
    if (itemType === 'sticker') {
      const rotation = item.rotation || 0;
      const size = item.size || 80;

      return (
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3))',
            opacity: 0.8,
          }}
        >
          <div className="pointer-events-none">
            <StickerShape type={item.type} size={size} />
          </div>
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
