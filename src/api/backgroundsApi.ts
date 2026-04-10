import { API_BASE_URL } from '@/config/apiUrl';

export interface Background {
  id: string;
  name: string;
  name_ja: string | null;
  filename: string;
  is_special: number;
  special_kit_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UploadBackgroundRequest {
  name: string;
  nameJa?: string;
  isSpecial?: boolean;
  specialKitId?: string;
}

class BackgroundsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'BackgroundsApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new BackgroundsApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const backgroundsApi = {
  /**
   * 全背景を取得（公開）
   */
  getBackgrounds: async (): Promise<{ backgrounds: Background[] }> => {
    const response = await fetch(`${API_BASE_URL}/backgrounds`);
    return handleResponse<{ backgrounds: Background[] }>(response);
  },

  /**
   * 背景アップロード（admin専用）
   */
  uploadBackground: async (
    file: File,
    request: UploadBackgroundRequest
  ): Promise<{ background: Background }> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', request.name);
    if (request.nameJa) formData.append('nameJa', request.nameJa);
    if (request.isSpecial !== undefined) formData.append('isSpecial', String(request.isSpecial));
    if (request.specialKitId) formData.append('specialKitId', request.specialKitId);

    const response = await fetch(`${API_BASE_URL}/backgrounds`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ background: Background }>(response);
  },

  /**
   * 背景削除（admin専用）
   */
  deleteBackground: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/backgrounds/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },
};

export { BackgroundsApiError };
