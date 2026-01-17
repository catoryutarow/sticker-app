import { useDrop } from 'react-dnd';
import type { Sticker } from '@/app/components/StickerAlbum';
import { PlacedSticker } from '@/app/components/PlacedSticker';
import { StickerEditor } from '@/app/components/StickerEditor';

interface StickerSheetProps {
  stickers: Sticker[];
  onAddSticker: (type: string, x: number, y: number, imageUrl?: string) => void;
  onSelectSticker?: (id: string) => void;
  onDeselectSticker?: () => void;
  onUpdateSticker?: (id: string, updates: Partial<Sticker>) => void;
  onUpdateStickerWithHistory?: (id: string, updates: Partial<Sticker>) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  selectedStickerId?: string | null;
}

export function StickerSheet({ stickers, onAddSticker, onSelectSticker, onDeselectSticker, onUpdateSticker, onUpdateStickerWithHistory, selectedStickerId, onMoveSticker }: StickerSheetProps) {
  const selectedSticker = stickers.find(s => s.id === selectedStickerId);
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['sticker', 'placed-sticker'],
    drop: (item: { type: string; imageUrl?: string; id?: string }, monitor) => {
      const offset = monitor.getClientOffset();
      const dropTargetRef = document.getElementById('sticker-sheet');
      
      if (offset && dropTargetRef) {
        const rect = dropTargetRef.getBoundingClientRect();
        const x = offset.x - rect.left;
        const y = offset.y - rect.top;
        
        // 配置済みシールの移動か新規追加かを判定
        if (monitor.getItemType() === 'placed-sticker' && item.id) {
          // 既存シールの移動
          onMoveSticker?.(item.id, x, y);
        } else {
          // 新しいシールのインスタンスを毎回作成
          onAddSticker(item.type, x, y, item.imageUrl);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onAddSticker, onMoveSticker]);

  return (
    <div className="relative">
      {/* バインダーリング装飾 */}
      <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-around items-center py-12">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="relative">
            {/* リング */}
            <div className="w-6 h-12 rounded-full border-4 border-white bg-gradient-to-br from-gray-100 to-gray-300 shadow-lg"></div>
            {/* リングのハイライト */}
            <div className="absolute top-1 left-1 w-3 h-4 rounded-full bg-white opacity-60"></div>
          </div>
        ))}
      </div>
      
      {/* メインの台紙 */}
      <div
        id="sticker-sheet"
        ref={drop}
        className={`relative rounded-lg overflow-hidden transition-all ${
          isOver ? 'ring-4 ring-blue-300 ring-opacity-50' : ''
        }`}
        style={{
          minHeight: '800px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.85) 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(255, 255, 255, 0.5)
          `,
          border: '2px solid rgba(255, 255, 255, 0.5)',
        }}
      >
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

        {/* 穴あき部分の装飾 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-around items-center py-12">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="w-8 h-8 rounded-full bg-white shadow-inner"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          ))}
        </div>

        {/* シールを配置 */}
        <div className="pl-12">
          {stickers.map((sticker) => (
            <PlacedSticker
              key={sticker.id}
              sticker={sticker}
              isSelected={sticker.id === selectedStickerId}
              onSelect={onSelectSticker}
            />
          ))}
        </div>

        {/* 選択されたシールの近くにエディター表示（デスクトップのみ） */}
        {selectedSticker && onUpdateStickerWithHistory && (
          <div
            className="hidden lg:block absolute z-50"
            style={{
              left: `${Math.min(Math.max(selectedSticker.x + 60, 200), 400)}px`,
              top: `${Math.max(selectedSticker.y - 80, 20)}px`,
            }}
          >
            <StickerEditor
              sticker={selectedSticker}
              onUpdate={onUpdateStickerWithHistory}
              onPreview={onUpdateSticker}
              onClose={onDeselectSticker}
            />
          </div>
        )}
      </div>
    </div>
  );
}