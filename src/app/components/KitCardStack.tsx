'use client';

import { useState, useCallback, useEffect } from 'react';
import { StickerKitCard } from './StickerKitCard';
import { KITS, KitDefinition } from '@/config/kitConfig';
import { STICKER_LAYOUT_BY_KIT, STICKER_LAYOUT, StickerLayoutItem } from '@/config/stickerLayout';

interface KitCardStackProps {
  onDragStart?: () => void;
  onStickerUsed?: (paletteId: string) => void;
}

// グローバルコールバック
let globalRemoveStickerCallback: ((paletteId: string) => void) | null = null;
let globalAddStickerCallback: ((stickerId: string, size: number, rotation: number) => void) | null = null;
let globalResetPaletteCallback: (() => void) | null = null;
let globalRemoveStickerByTypeCallback: ((stickerId: string) => void) | null = null;

// 外部からシールを削除するための関数
export function removeStickerFromPalette(paletteId: string) {
  globalRemoveStickerCallback?.(paletteId);
}

// 外部からシールを追加するための関数（台紙に戻す機能用）
export function addStickerToPalette(stickerId: string, size: number, rotation: number) {
  globalAddStickerCallback?.(stickerId, size, rotation);
}

// 外部からパレットを初期状態にリセットするための関数
export function resetPalette() {
  globalResetPaletteCallback?.();
}

// 外部からシールをタイプ（stickerId）で削除するための関数（Redo用）
export function removeStickerByType(stickerId: string) {
  globalRemoveStickerByTypeCallback?.(stickerId);
}

export function KitCardStack({ onDragStart }: KitCardStackProps) {
  const [activeKitIndex, setActiveKitIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);

  // キットごとのレイアウト状態を管理
  const [layoutByKit, setLayoutByKit] = useState<Record<string, StickerLayoutItem[]>>(() => {
    const initial: Record<string, StickerLayoutItem[]> = {};
    KITS.forEach(kit => {
      initial[kit.id] = [...(STICKER_LAYOUT_BY_KIT[kit.id] || [])];
    });
    return initial;
  });

  // グローバルコールバックを登録
  useEffect(() => {
    globalRemoveStickerCallback = (paletteId: string) => {
      setLayoutByKit(prev => {
        const next = { ...prev };
        for (const kitId of Object.keys(next)) {
          next[kitId] = next[kitId].filter(item => item.id !== paletteId);
        }
        return next;
      });
    };

    globalAddStickerCallback = (stickerId: string, size: number, rotation: number) => {
      // stickerIdからキットIDを抽出（例: '001-001' -> '001'）
      const kitId = stickerId.split('-')[0];

      setLayoutByKit(prev => {
        const next = { ...prev };
        const currentLayout = next[kitId] || [];
        const currentIds = new Set(currentLayout.map(item => item.id));

        // STICKER_LAYOUTから同じstickerIdで、現在のlayoutにないアイテムを探す
        const originalItem = STICKER_LAYOUT.find(
          item => item.stickerId === stickerId && !currentIds.has(item.id)
        );

        if (originalItem) {
          next[kitId] = [...currentLayout, { ...originalItem }];
        } else {
          // 見つからない場合はランダムな位置に追加
          const newItem: StickerLayoutItem = {
            id: `returned_${Date.now()}`,
            stickerId,
            x: 10 + Math.random() * 60,
            y: 10 + Math.random() * 60,
            size: Math.round(size),
            rotation: Math.round(rotation),
          };
          next[kitId] = [...currentLayout, newItem];
        }
        return next;
      });
    };

    globalResetPaletteCallback = () => {
      const reset: Record<string, StickerLayoutItem[]> = {};
      KITS.forEach(kit => {
        reset[kit.id] = [...(STICKER_LAYOUT_BY_KIT[kit.id] || [])];
      });
      setLayoutByKit(reset);
    };

    globalRemoveStickerByTypeCallback = (stickerId: string) => {
      const kitId = stickerId.split('-')[0];
      setLayoutByKit(prev => {
        const next = { ...prev };
        const currentLayout = next[kitId] || [];
        const index = currentLayout.findIndex(item => item.stickerId === stickerId);
        if (index !== -1) {
          next[kitId] = [...currentLayout.slice(0, index), ...currentLayout.slice(index + 1)];
        }
        return next;
      });
    };

    return () => {
      globalRemoveStickerCallback = null;
      globalAddStickerCallback = null;
      globalResetPaletteCallback = null;
      globalRemoveStickerByTypeCallback = null;
    };
  }, []);

  // 次のキットへ切り替え
  const handleNextKit = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setExitingIndex(activeKitIndex);

    // アニメーション後に次のキットに切り替え
    setTimeout(() => {
      setActiveKitIndex((prev) => (prev + 1) % KITS.length);
      setExitingIndex(null);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating, activeKitIndex]);

  // キットの順序を計算（アクティブなキットが最前面になるように）
  const getOrderedKits = (): { kit: KitDefinition; stackIndex: number }[] => {
    const result: { kit: KitDefinition; stackIndex: number }[] = [];
    for (let i = 0; i < KITS.length; i++) {
      const index = (activeKitIndex + i) % KITS.length;
      result.push({ kit: KITS[index], stackIndex: i });
    }
    return result;
  };

  const orderedKits = getOrderedKits();

  return (
    <div className="relative">
      {/* カードスタック */}
      <div
        className="relative cursor-pointer"
        style={{ height: '420px' }}
        onClick={handleNextKit}
      >
        {/* 後ろのカードから順に描画（逆順） */}
        {[...orderedKits].reverse().map(({ kit, stackIndex }) => {
          const isExiting = exitingIndex !== null && KITS[exitingIndex].id === kit.id;
          const isActive = stackIndex === 0 && !isExiting;

          return (
            <div
              key={kit.id}
              className="absolute inset-0 transition-all duration-300 ease-out"
              style={{
                transform: isExiting
                  ? 'translateY(-100%) scale(0.95)'
                  : undefined,
                opacity: isExiting ? 0 : 1,
              }}
            >
              <StickerKitCard
                kit={kit}
                layout={layoutByKit[kit.id] || []}
                isActive={isActive}
                stackIndex={stackIndex}
                totalCards={KITS.length}
                onDragStart={onDragStart}
              />
            </div>
          );
        })}
      </div>

      {/* インジケーター（ドット） */}
      <div className="flex justify-center gap-2 mt-4">
        {KITS.map((kit, index) => (
          <button
            key={kit.id}
            onClick={(e) => {
              e.stopPropagation();
              if (!isAnimating && index !== activeKitIndex) {
                setIsAnimating(true);
                setExitingIndex(activeKitIndex);
                setTimeout(() => {
                  setActiveKitIndex(index);
                  setExitingIndex(null);
                  setIsAnimating(false);
                }, 300);
              }
            }}
            className="w-2.5 h-2.5 rounded-full transition-all duration-200"
            style={{
              background: index === activeKitIndex ? kit.color : '#d1d5db',
              border: index === activeKitIndex ? `2px solid ${kit.color}` : '2px solid #d1d5db',
              transform: index === activeKitIndex ? 'scale(1.2)' : 'scale(1)',
              boxShadow: index === activeKitIndex ? `0 0 6px ${kit.color}` : 'none',
            }}
            aria-label={`Switch to ${kit.nameJa}`}
          />
        ))}
      </div>

      {/* ヘルプテキスト */}
      <div className="pt-3">
        <p className="text-xs text-gray-500 text-center">
          シールをドラッグして台紙に貼り付けよう
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          タップで次のキットへ
        </p>
      </div>
    </div>
  );
}
