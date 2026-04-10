'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackgroundData } from '@/config/BackgroundDataContext';
import { useKitData } from '@/config/KitDataContext';
import { getBackgroundImagePath } from '../../config/backgroundConfig';
import type { BackgroundDefinition } from '../../config/backgroundConfig';

interface BackgroundSwitcherProps {
  currentBackgroundId: string;
  onBackgroundChange: (id: string) => void;
  stickers?: Array<{ type: string }>;
}

export function BackgroundSwitcher({
  currentBackgroundId,
  onBackgroundChange,
  stickers = [],
}: BackgroundSwitcherProps) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { backgrounds } = useBackgroundData();
  const { kits } = useKitData();

  // UUID → kit_number マップ
  const uuidToKitNumber = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of kits) {
      if (k.kitUuid) m.set(k.kitUuid, k.id);
    }
    return m;
  }, [kits]);

  // kit_number 毎のシール枚数を集計
  const stickerCountByKit = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stickers) {
      const kitNum = s.type.split('-')[0] || '';
      counts.set(kitNum, (counts.get(kitNum) || 0) + 1);
    }
    return counts;
  }, [stickers]);

  // 背景をフィルタリング（通常背景は常時表示、スペシャル背景は条件付き）
  const visibleBackgrounds = useMemo(() => {
    return backgrounds.filter((bg) => {
      if (!bg.isSpecial) return true;
      // スペシャル背景は、対応キットのシールが2枚以上キャンバス上にある時のみ表示
      if (!bg.specialKitId) return false;
      const kitNum = uuidToKitNumber.get(bg.specialKitId);
      if (!kitNum) return false;
      return (stickerCountByKit.get(kitNum) || 0) >= 2;
    });
  }, [backgrounds, uuidToKitNumber, stickerCountByKit]);

  // 選択中の台紙が見えるようにスクロール
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeIndex = visibleBackgrounds.findIndex((bg) => bg.id === currentBackgroundId);
    if (activeIndex >= 0) {
      const container = scrollRef.current;
      const itemWidth = 56; // w-12 (48px) + gap (8px)
      const scrollPos = activeIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [currentBackgroundId, visibleBackgrounds]);

  // ローカライズされた背景名を取得
  const getLocalizedName = (bg: BackgroundDefinition) => {
    return i18n.language === 'ja' ? bg.nameJa : bg.name;
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-xs text-gray-500 flex-shrink-0">{t('background.label')}:</span>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {visibleBackgrounds.map((bg) => {
          const isActive = bg.id === currentBackgroundId;
          return (
            <button
              key={bg.id}
              onClick={() => onBackgroundChange(bg.id)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                isActive
                  ? 'border-gray-800 ring-2 ring-gray-400 scale-110'
                  : bg.isSpecial
                    ? 'border-purple-400 ring-1 ring-purple-200'
                    : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ scrollSnapAlign: 'center' }}
              title={getLocalizedName(bg)}
            >
              <img
                src={getBackgroundImagePath(bg.id)}
                alt={getLocalizedName(bg)}
                className="w-full h-full object-cover"
              />
              {isActive && <div className="absolute inset-0 bg-black/10" />}
              {bg.isSpecial && !isActive && (
                <div className="absolute top-0 right-0 text-[8px] bg-purple-500 text-white px-1 rounded-bl">
                  ★
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
