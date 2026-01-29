'use client';

import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKGROUNDS, getBackgroundImagePath } from '../../config/backgroundConfig';

interface BackgroundSwitcherProps {
  currentBackgroundId: string;
  onBackgroundChange: (id: string) => void;
}

export function BackgroundSwitcher({
  currentBackgroundId,
  onBackgroundChange,
}: BackgroundSwitcherProps) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 選択中の台紙が見えるようにスクロール
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeIndex = BACKGROUNDS.findIndex((bg) => bg.id === currentBackgroundId);
    if (activeIndex >= 0) {
      const container = scrollRef.current;
      const itemWidth = 56; // w-12 (48px) + gap (8px)
      const scrollPos = activeIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [currentBackgroundId]);

  // Get localized background name
  const getLocalizedName = (bg: typeof BACKGROUNDS[0]) => {
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
        {BACKGROUNDS.map((bg) => {
          const isActive = bg.id === currentBackgroundId;
          return (
            <button
              key={bg.id}
              onClick={() => onBackgroundChange(bg.id)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                isActive
                  ? 'border-gray-800 ring-2 ring-gray-400 scale-110'
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
              {isActive && (
                <div className="absolute inset-0 bg-black/10" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
