import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchPublicKitsPaginated, PublicKit, PublicSticker, PaginationInfo } from '@/api/publicKitsApi';
import { KitDefinition, registerDynamicKit, clearDynamicKits } from './kitConfig';
import { StickerLayoutItem } from './stickerLayout';
import { StickerDefinition, registerDynamicSticker, clearDynamicStickers } from './stickerConfig';

interface KitDataContextType {
  kits: KitDefinition[];
  stickers: StickerDefinition[];
  layoutByKit: Record<string, StickerLayoutItem[]>;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const KitDataContext = createContext<KitDataContextType>({
  kits: [],
  stickers: [],
  layoutByKit: {},
  isLoading: true,
  isLoadingMore: false,
  error: null,
  pagination: null,
  loadMore: async () => {},
  hasMore: false,
});

export function useKitData() {
  return useContext(KitDataContext);
}

interface KitDataProviderProps {
  children: ReactNode;
}

/**
 * APIから取得したキットデータをフロントエンド形式に変換
 */
function convertKitToDefinition(kit: PublicKit & { tags?: Array<{ name: string; isCustom: boolean }> }): KitDefinition {
  return {
    id: kit.kit_number, // '004' など
    name: kit.name,
    nameJa: kit.name_ja || kit.name,
    color: kit.color,
    description: kit.description || undefined,
    musicalKey: kit.musical_key,
    tags: kit.tags || [],
  };
}

/**
 * APIから取得したシールデータをフロントエンド形式に変換
 */
function convertStickerToDefinition(sticker: PublicSticker): StickerDefinition {
  return {
    id: sticker.full_id, // '004-001' など
    name: sticker.name,
    nameJa: sticker.name_ja || sticker.name,
    color: sticker.color,
    isPercussion: sticker.is_percussion === 1,
  };
}

/**
 * シールからレイアウトを生成
 * 新形式（layouts配列）があればそれを使用、なければ旧形式からフォールバック
 */
function generateLayoutForKit(kitNumber: string, stickers: PublicSticker[]): StickerLayoutItem[] {
  const layout: StickerLayoutItem[] = [];

  stickers.forEach((sticker) => {
    // 新形式のレイアウト（layouts配列）があればそれを使用
    if (sticker.layouts && sticker.layouts.length > 0) {
      sticker.layouts.forEach((l, i) => {
        layout.push({
          id: l.id || `${sticker.full_id}-${i}`,
          stickerId: sticker.full_id,
          x: l.x,
          y: l.y,
          size: l.size,
          rotation: l.rotation,
        });
      });
    } else {
      // 旧形式からフォールバック（後方互換）
      const x = sticker.layout_x ?? 10;
      const y = sticker.layout_y ?? 10;
      const size = sticker.layout_size ?? 80;
      const rotation = sticker.layout_rotation ?? 0;
      const count = sticker.layout_count ?? 2;

      for (let i = 0; i < count; i++) {
        layout.push({
          id: `${sticker.full_id}-${i}`,
          stickerId: sticker.full_id,
          x: x + (i * 8),
          y: y + (i * 5),
          size,
          rotation: rotation + (i * 3),
        });
      }
    }
  });

  return layout;
}

// ページネーションの設定
const KITS_PER_PAGE = 10;

export function KitDataProvider({ children }: KitDataProviderProps) {
  const [kits, setKits] = useState<KitDefinition[]>([]);
  const [stickers, setStickers] = useState<StickerDefinition[]>([]);
  const [layoutByKit, setLayoutByKit] = useState<Record<string, StickerLayoutItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadedKitIds, setLoadedKitIds] = useState<Set<string>>(new Set());

  /**
   * キットデータを変換（ページネーションAPIから直接取得したデータを使用）
   */
  const convertKits = useCallback((publicKits: PublicKit[]) => {
    const apiKits: KitDefinition[] = [];
    const apiStickers: StickerDefinition[] = [];
    const apiLayout: Record<string, StickerLayoutItem[]> = {};

    for (const kit of publicKits) {
      apiKits.push(convertKitToDefinition(kit));
      if (kit.stickers) {
        kit.stickers.forEach(s => apiStickers.push(convertStickerToDefinition(s)));
        apiLayout[kit.kit_number] = generateLayoutForKit(kit.kit_number, kit.stickers);
      }
    }

    return { apiKits, apiStickers, apiLayout };
  }, []);

  /**
   * 初期ロード
   */
  useEffect(() => {
    async function loadInitialKits() {
      try {
        setIsLoading(true);

        // ページネーション付きで最初のページを取得
        const result = await fetchPublicKitsPaginated({ page: 1, limit: KITS_PER_PAGE });

        if (result.kits.length > 0) {
          // キットデータを変換
          const { apiKits, apiStickers, apiLayout } = convertKits(result.kits);

          // グローバル登録
          clearDynamicKits();
          clearDynamicStickers();
          apiKits.forEach(kit => registerDynamicKit(kit));
          apiStickers.forEach(sticker => registerDynamicSticker(sticker));

          setKits(apiKits);
          setStickers(apiStickers);
          setLayoutByKit(apiLayout);
          setPagination(result.pagination);
          setLoadedKitIds(new Set(apiKits.map(k => k.id)));
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load kits from API:', err);
        setError('キットの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialKits();
  }, [convertKits]);

  /**
   * 追加読み込み（無限スクロール用）
   */
  const loadMore = useCallback(async () => {
    if (!pagination || !pagination.hasNext || isLoadingMore) return;

    try {
      setIsLoadingMore(true);

      const result = await fetchPublicKitsPaginated({
        page: pagination.page + 1,
        limit: KITS_PER_PAGE
      });

      if (result.kits.length > 0) {
        // 新しいキットのみフィルタリング
        const newKits = result.kits.filter(k => !loadedKitIds.has(k.kit_number));

        if (newKits.length > 0) {
          // キットデータを変換
          const { apiKits, apiStickers, apiLayout } = convertKits(newKits);

          // 既存データに追加
          setKits(prev => {
            const updated = [...prev];
            apiKits.forEach(apiKit => {
              if (!updated.find(k => k.id === apiKit.id)) {
                updated.push(apiKit);
              }
            });
            return updated;
          });

          setStickers(prev => {
            const updated = [...prev];
            apiStickers.forEach(apiSticker => {
              if (!updated.find(s => s.id === apiSticker.id)) {
                updated.push(apiSticker);
              }
            });
            return updated;
          });

          setLayoutByKit(prev => ({ ...prev, ...apiLayout }));

          // グローバル登録
          apiKits.forEach(kit => registerDynamicKit(kit));
          apiStickers.forEach(sticker => registerDynamicSticker(sticker));

          setLoadedKitIds(prev => {
            const updated = new Set(prev);
            apiKits.forEach(k => updated.add(k.id));
            return updated;
          });
        }

        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to load more kits:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination, isLoadingMore, loadedKitIds, convertKits]);

  const hasMore = pagination?.hasNext ?? false;

  return (
    <KitDataContext.Provider value={{
      kits,
      stickers,
      layoutByKit,
      isLoading,
      isLoadingMore,
      error,
      pagination,
      loadMore,
      hasMore,
    }}>
      {children}
    </KitDataContext.Provider>
  );
}
