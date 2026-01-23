'use client';

import { BACKGROUNDS, getBackgroundImagePath } from '../../config/backgroundConfig';

interface BackgroundSwitcherProps {
  currentBackgroundId: string;
  onBackgroundChange: (id: string) => void;
}

export function BackgroundSwitcher({
  currentBackgroundId,
  onBackgroundChange,
}: BackgroundSwitcherProps) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-xs text-gray-500 mr-1">台紙:</span>
      <div className="flex gap-2">
        {BACKGROUNDS.map((bg) => {
          const isActive = bg.id === currentBackgroundId;
          return (
            <button
              key={bg.id}
              onClick={() => onBackgroundChange(bg.id)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                isActive
                  ? 'border-gray-800 ring-2 ring-gray-400 scale-110'
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              title={bg.nameJa}
            >
              <img
                src={getBackgroundImagePath(bg.id)}
                alt={bg.nameJa}
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
