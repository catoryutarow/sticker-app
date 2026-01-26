// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://16.176.17.115/api';

export interface PublicKit {
  id: string;
  kit_number: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  color: string;
  musical_key: string;
  status: string;
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

/**
 * 全公開キットとシールを一括取得
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
