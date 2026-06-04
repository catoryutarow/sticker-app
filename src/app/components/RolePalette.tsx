'use client';

import { useMemo } from 'react';
import { DraggableSticker } from './DraggableSticker';
import { useKitData } from '@/config/KitDataContext';
import {
  StickerDefinition,
  StickerRole,
  RHYTHM_ROLES,
  MELODY_ROLES,
  ROLE_LABELS,
} from '@/config/stickerConfig';

interface RolePaletteProps {
  onDragStart?: () => void;
}

const ROLE_ACCENT: Record<StickerRole, string> = {
  kick:       '#EF4444',
  snare:      '#F97316',
  percussion: '#EAB308',
  bass:       '#0EA5E9',
  chord:      '#8B5CF6',
  lead:       '#EC4899',
  candy:      '#14B8A6',
};

export function RolePalette({ onDragStart }: RolePaletteProps) {
  const { stickers, isLoading, isLoadingMore, hasMore, loadMore, error, retry } = useKitData();

  // 役割未設定のシールは 'lead' に寄せて表示 (Phase 1 マイグレーション後はほぼ存在しないはず)
  const stickersByRole = useMemo(() => {
    const groups: Record<StickerRole, StickerDefinition[]> = {
      kick: [], snare: [], percussion: [],
      bass: [], chord: [], lead: [], candy: [],
    };
    for (const s of stickers) {
      const role: StickerRole = s.role ?? (s.isPercussion ? 'percussion' : 'lead');
      groups[role].push(s);
    }
    return groups;
  }, [stickers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '300px' }}>
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
          <p className="text-sm">シールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-center" style={{ height: '300px' }}>
        <div>
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button onClick={retry} className="text-xs text-blue-600 underline">再読み込み</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryGroup title="リズム" roles={RHYTHM_ROLES} stickersByRole={stickersByRole} onDragStart={onDragStart} />
      <CategoryGroup title="メロディ" roles={MELODY_ROLES} stickersByRole={stickersByRole} onDragStart={onDragStart} />

      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? '読み込み中...' : 'もっと読み込む'}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-1">
        シールをドラッグして台紙に貼り付けよう
      </p>
    </div>
  );
}

interface CategoryGroupProps {
  title: string;
  roles: StickerRole[];
  stickersByRole: Record<StickerRole, StickerDefinition[]>;
  onDragStart?: () => void;
}

function CategoryGroup({ title, roles, stickersByRole, onDragStart }: CategoryGroupProps) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
        {title}
      </div>
      <div className="space-y-2">
        {roles.map(role => (
          <RoleRow
            key={role}
            role={role}
            stickers={stickersByRole[role]}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

interface RoleRowProps {
  role: StickerRole;
  stickers: StickerDefinition[];
  onDragStart?: () => void;
}

function RoleRow({ role, stickers, onDragStart }: RoleRowProps) {
  const accent = ROLE_ACCENT[role];
  return (
    <div
      className="rounded-xl bg-white border border-gray-200 px-3 py-2"
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: accent }}
        />
        <span className="text-xs font-medium text-gray-700">
          {ROLE_LABELS[role].ja}
        </span>
        <span className="text-[10px] text-gray-400 ml-auto">
          {stickers.length}
        </span>
      </div>
      {stickers.length === 0 ? (
        <p className="text-[11px] text-gray-300 py-2 text-center">なし</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto py-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
          {stickers.map(s => (
            <div key={s.id} className="flex-shrink-0" title={s.nameJa || s.name}>
              <DraggableSticker
                type={s.id}
                size={48}
                rotation={0}
                onDragStart={onDragStart}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
