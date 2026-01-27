// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://16.176.17.115/api';

/**
 * Sticker as placed on the canvas (matches StickerAlbum.Sticker)
 */
export interface PlacedSticker {
  id: string;
  type: string;      // e.g., "001-012" (kit-sticker identifier)
  x: number;         // pixel position on canvas
  y: number;
  rotation: number;
  scale: number;     // relative to 80px base
  pitch: number;     // semitones for audio pitch (-6 to +6)
  paletteId?: string;
}

/**
 * Aspect ratio type: '3:4' for mobile, '1:1' for desktop
 */
export type AspectRatio = '3:4' | '1:1';

/**
 * A saved work (sticker arrangement)
 */
export interface Work {
  id: string;
  shareId: string;
  title: string;
  stickers: PlacedSticker[];
  backgroundId: string;
  aspectRatio: AspectRatio;
  videoUrl?: string;
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveWorkRequest {
  title?: string;
  stickers: PlacedSticker[];
  backgroundId?: string;
  aspectRatio?: AspectRatio;
  anonymousId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface UpdateWorkRequest {
  title?: string;
  thumbnailUrl?: string;
  anonymousId?: string;
}

class WorksApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'WorksApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new WorksApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const worksApi = {
  /**
   * Save a new work
   */
  saveWork: async (data: SaveWorkRequest): Promise<Work> => {
    const response = await fetch(`${API_BASE_URL}/works`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Work>(response);
  },

  /**
   * Get a work by share ID (public)
   */
  getWork: async (shareId: string): Promise<Work> => {
    const response = await fetch(`${API_BASE_URL}/works/${shareId}`, {
      method: 'GET',
    });
    return handleResponse<Work>(response);
  },

  /**
   * Update a work's video URL
   */
  updateWorkVideo: async (shareId: string, videoUrl: string, anonymousId?: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/works/${shareId}/video`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoUrl, anonymousId }),
    });
    await handleResponse<{ message: string }>(response);
  },

  /**
   * Update a work's metadata (title, thumbnail)
   */
  updateWork: async (shareId: string, data: UpdateWorkRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/works/${shareId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    await handleResponse<{ message: string }>(response);
  },

  /**
   * Delete a work
   */
  deleteWork: async (shareId: string, anonymousId?: string): Promise<void> => {
    const url = new URL(`${API_BASE_URL}/works/${shareId}`);
    if (anonymousId) {
      url.searchParams.set('anonymousId', anonymousId);
    }
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      credentials: 'include',
    });
    await handleResponse<{ message: string }>(response);
  },

  /**
   * Get my works (authenticated or anonymous)
   */
  getMyWorks: async (anonymousId?: string, limit = 20, offset = 0): Promise<{ works: Work[] }> => {
    const url = new URL(`${API_BASE_URL}/works/user/my`);
    if (anonymousId) {
      url.searchParams.set('anonymousId', anonymousId);
    }
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ works: Work[] }>(response);
  },
};

export { WorksApiError };
