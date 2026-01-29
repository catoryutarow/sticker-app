'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StickerKitCard } from './StickerKitCard';
import { KitDefinition } from '@/config/kitConfig';
import { StickerLayoutItem } from '@/config/stickerLayout';
import { useKitData } from '@/config/KitDataContext';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import AudioEngine from '@/audio/AudioEngine';

interface KitCardStackProps {
  onDragStart?: () => void;
  onStickerUsed?: (paletteId: string) => void;
  searchQuery?: string;
  selectedKitNumber?: string | null;
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

export function KitCardStack({ onDragStart, searchQuery = '', selectedKitNumber = null }: KitCardStackProps) {
  const { t } = useTranslation();
  const { kits: ALL_KITS, layoutByKit: initialLayoutByKit, isLoading, isLoadingMore, hasMore, loadMore, error, retry } = useKitData();

  // 検索でキットをフィルタリング（名前、説明、タグで検索）
  const KITS = useMemo(() => {
    if (!searchQuery.trim()) return ALL_KITS;
    const query = searchQuery.toLowerCase();
    return ALL_KITS.filter(kit =>
      kit.name.toLowerCase().includes(query) ||
      kit.nameJa.toLowerCase().includes(query) ||
      kit.description?.toLowerCase().includes(query) ||
      kit.tags?.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [ALL_KITS, searchQuery]);

  const [activeKitIndex, setActiveKitIndex] = useState(0);

  // 検索クエリが変わったときだけインデックスをリセット（追加読み込み時はリセットしない）
  useEffect(() => {
    setActiveKitIndex(0);
  }, [searchQuery]);

  // 選択されたキット番号が変わったらそのキットを表示
  useEffect(() => {
    if (selectedKitNumber) {
      const index = KITS.findIndex(kit => kit.id === selectedKitNumber);
      if (index >= 0) {
        setActiveKitIndex(index);
      }
    }
  }, [selectedKitNumber, KITS]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);

  // キットごとのレイアウト状態を管理
  const [layoutByKit, setLayoutByKit] = useState<Record<string, StickerLayoutItem[]>>({});

  // Contextのデータが変わったらレイアウトを初期化
  useEffect(() => {
    const initial: Record<string, StickerLayoutItem[]> = {};
    KITS.forEach(kit => {
      initial[kit.id] = [...(initialLayoutByKit[kit.id] || [])];
    });
    setLayoutByKit(initial);
  }, [KITS, initialLayoutByKit]);

  // 全シールレイアウト（フラット）
  const STICKER_LAYOUT = useMemo(() => {
    return Object.values(initialLayoutByKit).flat();
  }, [initialLayoutByKit]);

  // 音声プリロード済みキットを追跡
  const preloadedKits = useRef<Set<string>>(new Set());

  // アクティブなキットの音声を遅延プリロード
  useEffect(() => {
    if (KITS.length === 0) return;

    const activeKit = KITS[activeKitIndex];
    if (!activeKit) return;

    // 既にプリロード済みならスキップ
    if (preloadedKits.current.has(activeKit.id)) return;

    // アクティブキットのシールIDリストを取得
    const stickerIds = (initialLayoutByKit[activeKit.id] || [])
      .map(item => item.stickerId)
      .filter((id, index, arr) => arr.indexOf(id) === index); // 重複除去

    if (stickerIds.length === 0) return;

    // 非同期でプリロード実行（UIをブロックしない）
    const engine = AudioEngine.getInstance();
    engine.preloadAudioBuffers(stickerIds).then((loaded) => {
      if (loaded.length > 0) {
        preloadedKits.current.add(activeKit.id);
      }
    });

    // 次のキットも先読み（オプショナル）
    const nextIndex = (activeKitIndex + 1) % KITS.length;
    const nextKit = KITS[nextIndex];
    if (nextKit && !preloadedKits.current.has(nextKit.id)) {
      const nextStickerIds = (initialLayoutByKit[nextKit.id] || [])
        .map(item => item.stickerId)
        .filter((id, index, arr) => arr.indexOf(id) === index);

      if (nextStickerIds.length > 0) {
        // 少し遅延させて優先度を下げる
        setTimeout(() => {
          engine.preloadAudioBuffers(nextStickerIds).then((loaded) => {
            if (loaded.length > 0) {
              preloadedKits.current.add(nextKit.id);
            }
          });
        }, 500);
      }
    }
  }, [activeKitIndex, KITS, initialLayoutByKit]);

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
        reset[kit.id] = [...(initialLayoutByKit[kit.id] || [])];
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
  }, [KITS, initialLayoutByKit, STICKER_LAYOUT]);

  // 次のキットへ切り替え
  const handleNextKit = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setExitingIndex(activeKitIndex);

    // アニメーション後に次のキットに切り替え
    setTimeout(() => {
      const nextIndex = (activeKitIndex + 1) % KITS.length;
      setActiveKitIndex(nextIndex);
      setExitingIndex(null);
      setIsAnimating(false);

      // 最後から2番目のキットに達したら追加読み込み
      if (nextIndex >= KITS.length - 2 && hasMore && !isLoadingMore) {
        loadMore();
      }
    }, 300);
  }, [isAnimating, activeKitIndex, KITS.length, hasMore, isLoadingMore, loadMore]);

  // キットの順序を計算（アクティブなキットが最前面になるように）
  // パフォーマンスのため、表示するカードは最大3枚に制限
  const MAX_VISIBLE_CARDS = 3;
  const getOrderedKits = (): { kit: KitDefinition; stackIndex: number }[] => {
    const result: { kit: KitDefinition; stackIndex: number }[] = [];
    const visibleCount = Math.min(KITS.length, MAX_VISIBLE_CARDS);
    for (let i = 0; i < visibleCount; i++) {
      const index = (activeKitIndex + i) % KITS.length;
      result.push({ kit: KITS[index], stackIndex: i });
    }
    return result;
  };

  const orderedKits = getOrderedKits();

  if (isLoading) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center" style={{ height: '420px' }}>
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
            <p className="text-sm">{t('kitFinder.loadingKits')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center" style={{ height: '420px' }}>
          <ErrorDisplay
            message={error}
            onRetry={retry}
            variant="full"
          />
        </div>
      </div>
    );
  }

  if (KITS.length === 0) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center" style={{ height: '420px' }}>
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">{t('kitFinder.noMatchingKits', { query: searchQuery })}</p>
          </div>
        </div>
      </div>
    );
  }

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

      {/* ヘルプテキスト */}
      <div className="pt-16">
        <p className="text-xs text-gray-500 text-center">
          {t('kitFinder.dragToPlace')}
        </p>
        <p className="text-xs text-gray-400 text-center mt-1.5">
          {t('kitFinder.tapForNext')}
        </p>
        {/* 追加読み込み中インジケーター */}
        {isLoadingMore && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-gray-400">{t('common.loading')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
