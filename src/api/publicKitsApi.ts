// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface PublicKitTag {
  name: string;
  isCustom: boolean;
}

export interface PublicKit {
  id: string;
  kit_number: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  color: string;
  musical_key: string;
  status: string;
  sticker_count?: number;
  tags?: PublicKitTag[];
  stickers?: PublicSticker[];
}

export interface PublicStickerLayout {
  id: string;
  sticker_id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  sort_order: number;
}

export interface PublicSticker {
  id: string;
  kit_id: string;
  sticker_number: string;
  full_id: string;
  name: string;
  name_ja: string | null;
  color: string;
  is_percussion: number;
  image_uploaded: number;
  audio_uploaded: number;
  sort_order: number;
  // 新レイアウト情報
  layouts?: PublicStickerLayout[];
  // 旧レイアウト情報（後方互換）
  layout_x: number;
  layout_y: number;
  layout_size: number;
  layout_rotation: number;
  layout_count: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FetchKitsOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

export interface FetchKitsResult {
  kits: PublicKit[];
  pagination: PaginationInfo;
}

/**
 * 公開キット一覧を取得（ページネーション対応）
 */
export async function fetchPublicKitsPaginated(options: FetchKitsOptions = {}): Promise<FetchKitsResult> {
  const { page = 1, limit = 10, search = '', tags = [] } = options;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (tags.length > 0) params.set('tags', tags.join(','));

  try {
    const response = await fetch(`${API_BASE_URL}/kits/public?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch public kits');
    }
    const data = await response.json();
    return {
      kits: data.kits || [],
      pagination: data.pagination || {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  } catch (error) {
    console.error('Error fetching public kits:', error);
    return {
      kits: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    };
  }
}

/**
 * 特定キットのシール詳細を取得（オンデマンド読み込み用）
 */
export async function fetchKitStickers(kitId: string): Promise<{ kit: PublicKit; stickers: PublicSticker[] } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/kits/public/${kitId}/stickers`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();

    // シールにレイアウト情報を追加取得（別APIがないので全件取得を使う）
    // TODO: 将来的にはシール個別APIでレイアウトも返すように改善
    return data;
  } catch (error) {
    console.error('Error fetching kit stickers:', error);
    return null;
  }
}

/**
 * 全公開キットとシールを一括取得（レガシー：後方互換用）
 */
export async function fetchPublicKits(): Promise<PublicKit[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/kits/public/all`);
    if (!response.ok) {
      throw new Error('Failed to fetch public kits');
    }
    const data = await response.json();
    return data.kits || [];
  } catch (error) {
    console.error('Error fetching public kits:', error);
    return [];
  }
}
