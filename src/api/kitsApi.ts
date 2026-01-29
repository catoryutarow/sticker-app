// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

// プレビュー用のレイアウト型（sticker_layouts + sticker情報）
export interface LayoutPreviewItem {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  sticker_id: string;
  full_id: string;
  name: string;
  color: string;
  image_uploaded: number;
}

export interface Kit {
  id: string;
  kit_number: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  color: string;
  musical_key: string;
  creator_id: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  sticker_count?: number;
  layouts?: LayoutPreviewItem[]; // プレビュー用
}

export interface StickerLayout {
  id: string;
  sticker_id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  sort_order: number;
  created_at: string;
}

export interface Sticker {
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
  // レイアウト情報（旧形式、後方互換用）
  layout_x: number;
  layout_y: number;
  layout_size: number;
  layout_rotation: number;
  layout_count: number;
  // 新レイアウト情報
  layouts?: StickerLayout[];
  created_at: string;
  updated_at: string;
}

export interface CreateKitRequest {
  name: string;
  nameJa?: string;
  description?: string;
  color?: string;
  musicalKey?: string;
}

export interface UpdateKitRequest {
  name?: string;
  nameJa?: string;
  description?: string;
  color?: string;
  musicalKey?: string;
  status?: 'draft' | 'published';
}

export interface CreateStickerRequest {
  name: string;
  nameJa?: string;
  color?: string;
  isPercussion?: boolean;
}

export interface UpdateStickerRequest {
  name?: string;
  nameJa?: string;
  color?: string;
  isPercussion?: boolean;
  sortOrder?: number;
}

export interface CreateLayoutRequest {
  x?: number;
  y?: number;
  size?: number;
  rotation?: number;
}

export interface UpdateLayoutRequest {
  x?: number;
  y?: number;
  size?: number;
  rotation?: number;
}

export interface FallbackAssignment {
  stickerId: string;
  stickerName: string;
  assignedSound: string;
}

export interface UpdateKitResponse {
  kit: Kit;
  fallbackAssignments?: FallbackAssignment[];
}

class KitsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'KitsApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new KitsApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const kitsApi = {
  // ================================
  // Kit APIs
  // ================================

  /**
   * キット一覧取得
   */
  getKits: async (): Promise<{ kits: Kit[] }> => {
    const response = await fetch(`${API_BASE_URL}/kits`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ kits: Kit[] }>(response);
  },

  /**
   * キット作成
   */
  createKit: async (request: CreateKitRequest): Promise<{ kit: Kit }> => {
    const response = await fetch(`${API_BASE_URL}/kits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ kit: Kit }>(response);
  },

  /**
   * キット詳細取得
   */
  getKit: async (kitId: string): Promise<{ kit: Kit; stickers: Sticker[] }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ kit: Kit; stickers: Sticker[] }>(response);
  },

  /**
   * キット更新
   */
  updateKit: async (kitId: string, request: UpdateKitRequest): Promise<UpdateKitResponse> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<UpdateKitResponse>(response);
  },

  /**
   * キット削除
   */
  deleteKit: async (kitId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * サムネイル再生成
   */
  regenerateThumbnail: async (kitId: string): Promise<{ message: string; thumbnailPath: string }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/regenerate-thumbnail`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string; thumbnailPath: string }>(response);
  },

  // ================================
  // Sticker APIs
  // ================================

  /**
   * シール一覧取得
   */
  getStickers: async (kitId: string): Promise<{ stickers: Sticker[] }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ stickers: Sticker[] }>(response);
  },

  /**
   * シール作成
   */
  createSticker: async (kitId: string, request: CreateStickerRequest): Promise<{ sticker: Sticker }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ sticker: Sticker }>(response);
  },

  /**
   * シール更新
   */
  updateSticker: async (
    kitId: string,
    stickerId: string,
    request: UpdateStickerRequest
  ): Promise<{ sticker: Sticker }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ sticker: Sticker }>(response);
  },

  /**
   * シール削除
   */
  deleteSticker: async (kitId: string, stickerId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  // ================================
  // File Upload APIs
  // ================================

  /**
   * シール画像アップロード
   */
  uploadStickerImage: async (
    kitId: string,
    stickerId: string,
    file: File
  ): Promise<{ sticker: Sticker; imagePath: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ sticker: Sticker; imagePath: string }>(response);
  },

  /**
   * シール音声アップロード
   */
  uploadStickerAudio: async (
    kitId: string,
    stickerId: string,
    file: File
  ): Promise<{ sticker: Sticker; audioPath: string }> => {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/audio`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ sticker: Sticker; audioPath: string }>(response);
  },

  // ================================
  // Layout APIs
  // ================================

  /**
   * シールレイアウト一覧取得
   */
  getLayouts: async (kitId: string, stickerId: string): Promise<{ layouts: StickerLayout[] }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/layouts`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ layouts: StickerLayout[] }>(response);
  },

  /**
   * シールレイアウト追加（複製）
   */
  createLayout: async (
    kitId: string,
    stickerId: string,
    request: CreateLayoutRequest
  ): Promise<{ layout: StickerLayout }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/layouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ layout: StickerLayout }>(response);
  },

  /**
   * シールレイアウト更新
   */
  updateLayout: async (
    kitId: string,
    stickerId: string,
    layoutId: string,
    request: UpdateLayoutRequest
  ): Promise<{ layout: StickerLayout }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/layouts/${layoutId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ layout: StickerLayout }>(response);
  },

  /**
   * シールレイアウト削除
   */
  deleteLayout: async (
    kitId: string,
    stickerId: string,
    layoutId: string
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/layouts/${layoutId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },
};

export { KitsApiError };
