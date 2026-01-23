'use client';

import { DraggableSticker } from '@/app/components/DraggableSticker';
import { KitDefinition } from '@/config/kitConfig';
import { StickerLayoutItem } from '@/config/stickerLayout';

interface StickerKitCardProps {
  kit: KitDefinition;
  layout: StickerLayoutItem[];
  isActive: boolean;
  stackIndex: number;
  totalCards: number;
  onDragStart?: () => void;
}

export function StickerKitCard({
  kit,
  layout,
  isActive,
  stackIndex,
  totalCards,
  onDragStart,
}: StickerKitCardProps) {
  // 非アクティブなカードのスケールとオフセット
  const scale = isActive ? 1 : 0.95;
  const offsetY = isActive ? 0 : 8 * (stackIndex + 1);
  const opacity = isActive ? 1 : 0.7;
  const zIndex = totalCards - stackIndex;

  return (
    <div
      className="absolute inset-0 rounded-xl overflow-hidden transition-all duration-300 ease-out"
      style={{
        transform: `translateY(${offsetY}px) scale(${scale})`,
        opacity,
        zIndex,
        pointerEvents: isActive ? 'auto' : 'none',
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
      {/* キットカラーのアクセント（上部に薄いライン） */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: kit.color }}
      />

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
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
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

      {/* キット番号ラベル */}
      <div className="absolute top-3 left-4 z-20">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: kit.color,
            color: '#333',
          }}
        >
          {kit.id}
        </span>
      </div>

      {/* シール一覧 */}
      <div className="relative p-4 pt-10" style={{ height: '380px' }}>
        {layout.map((item) => (
          <div
            key={item.id}
            className="absolute"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `rotate(${item.rotation}deg)`,
              zIndex: 10,
            }}
          >
            <DraggableSticker
              type={item.stickerId}
              size={item.size}
              rotation={item.rotation}
              paletteId={item.id}
              onDragStart={onDragStart}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
