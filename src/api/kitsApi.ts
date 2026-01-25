// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://16.176.17.115/api';

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
  updateKit: async (kitId: string, request: UpdateKitRequest): Promise<{ kit: Kit }> => {
    const response = await fetch(`${API_BASE_URL}/kits/${kitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<{ kit: Kit }>(response);
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
};

export { KitsApiError };
