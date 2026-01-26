import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchPublicKits, PublicKit, PublicSticker } from '@/api/publicKitsApi';
import { KITS as STATIC_KITS, KitDefinition, registerDynamicKit, clearDynamicKits } from './kitConfig';
import { STICKER_LAYOUT_BY_KIT as STATIC_LAYOUT, StickerLayoutItem } from './stickerLayout';
import { STICKERS as STATIC_STICKERS, StickerDefinition, registerDynamicSticker, clearDynamicStickers } from './stickerConfig';

interface KitDataContextType {
  kits: KitDefinition[];
  stickers: StickerDefinition[];
  layoutByKit: Record<string, StickerLayoutItem[]>;
  isLoading: boolean;
  error: string | null;
}

const KitDataContext = createContext<KitDataContextType>({
  kits: STATIC_KITS,
  stickers: STATIC_STICKERS,
  layoutByKit: STATIC_LAYOUT,
  isLoading: false,
  error: null,
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
function convertKitToDefinition(kit: PublicKit): KitDefinition {
  return {
    id: kit.kit_number, // '004' など
    name: kit.name,
    nameJa: kit.name_ja || kit.name,
    color: kit.color,
    description: kit.description || undefined,
    musicalKey: kit.musical_key,
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

export function KitDataProvider({ children }: KitDataProviderProps) {
  const [kits, setKits] = useState<KitDefinition[]>(STATIC_KITS);
  const [stickers, setStickers] = useState<StickerDefinition[]>(STATIC_STICKERS);
  const [layoutByKit, setLayoutByKit] = useState<Record<string, StickerLayoutItem[]>>(STATIC_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKits() {
      try {
        setIsLoading(true);
        const publicKits = await fetchPublicKits();

        if (publicKits.length > 0) {
          // APIからのキットをフロントエンド形式に変換
          const apiKits: KitDefinition[] = publicKits.map(convertKitToDefinition);

          // APIからのシールをフロントエンド形式に変換
          const apiStickers: StickerDefinition[] = publicKits.flatMap(
            kit => (kit.stickers || []).map(convertStickerToDefinition)
          );

          // APIからのレイアウトを生成
          const apiLayout: Record<string, StickerLayoutItem[]> = {};
          publicKits.forEach(kit => {
            if (kit.stickers && kit.stickers.length > 0) {
              apiLayout[kit.kit_number] = generateLayoutForKit(kit.kit_number, kit.stickers);
            }
          });

          // 静的データとAPIデータをマージ（APIデータを優先）
          const mergedKits = [...STATIC_KITS];
          apiKits.forEach(apiKit => {
            const existingIndex = mergedKits.findIndex(k => k.id === apiKit.id);
            if (existingIndex >= 0) {
              mergedKits[existingIndex] = apiKit;
            } else {
              mergedKits.push(apiKit);
            }
          });

          const mergedStickers = [...STATIC_STICKERS];
          apiStickers.forEach(apiSticker => {
            const existingIndex = mergedStickers.findIndex(s => s.id === apiSticker.id);
            if (existingIndex >= 0) {
              mergedStickers[existingIndex] = apiSticker;
            } else {
              mergedStickers.push(apiSticker);
            }
          });

          const mergedLayout = { ...STATIC_LAYOUT, ...apiLayout };

          // 動的キット・シールをグローバルに登録（getKitById, isStickerPercussion等で参照するため）
          clearDynamicKits();
          clearDynamicStickers();
          apiKits.forEach(kit => registerDynamicKit(kit));
          apiStickers.forEach(sticker => registerDynamicSticker(sticker));

          setKits(mergedKits);
          setStickers(mergedStickers);
          setLayoutByKit(mergedLayout);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load kits from API:', err);
        setError('キットの読み込みに失敗しました');
        // 静的データをフォールバックとして使用
      } finally {
        setIsLoading(false);
      }
    }

    loadKits();
  }, []);

  return (
    <KitDataContext.Provider value={{ kits, stickers, layoutByKit, isLoading, error }}>
      {children}
    </KitDataContext.Provider>
  );
}
