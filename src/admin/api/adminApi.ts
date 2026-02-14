// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface AdminStats {
  users: number;
  kits: number;
  publishedKits: number;
  stickers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  kit_count: number;
}

export interface AdminKit {
  id: string;
  kit_number: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  color: string;
  musical_key: string;
  creator_id: string;
  creator_email: string;
  creator_name: string | null;
  status: 'draft' | 'published';
  sticker_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  thumbnail: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new AdminApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const adminApi = {
  /**
   * 統計情報取得
   */
  getStats: async (): Promise<{ stats: AdminStats }> => {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ stats: AdminStats }>(response);
  },

  /**
   * ユーザー一覧取得
   */
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ users: AdminUser[]; pagination: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/admin/users?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ users: AdminUser[]; pagination: Pagination }>(response);
  },

  /**
   * ユーザー詳細取得
   */
  getUser: async (userId: string): Promise<{ user: AdminUser; kits: AdminKit[] }> => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ user: AdminUser; kits: AdminKit[] }>(response);
  },

  /**
   * ユーザー削除
   */
  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * キット一覧取得
   */
  getKits: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ kits: AdminKit[]; pagination: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const response = await fetch(`${API_BASE_URL}/admin/kits?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ kits: AdminKit[]; pagination: Pagination }>(response);
  },

  /**
   * キット削除
   */
  deleteKit: async (kitId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/admin/kits/${kitId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  // ================================
  // 記事管理
  // ================================

  /**
   * 記事一覧取得
   */
  getArticles: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ articles: AdminArticle[]; pagination: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const response = await fetch(`${API_BASE_URL}/articles/admin/list?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ articles: AdminArticle[]; pagination: Pagination }>(response);
  },

  /**
   * 記事詳細取得
   */
  getArticle: async (id: string): Promise<{ article: AdminArticle }> => {
    const response = await fetch(`${API_BASE_URL}/articles/admin/${id}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ article: AdminArticle }>(response);
  },

  /**
   * 記事作成
   */
  createArticle: async (data: {
    slug: string;
    title: string;
    description?: string;
    content: string;
    thumbnail?: string;
    status?: string;
  }): Promise<{ article: AdminArticle }> => {
    const response = await fetch(`${API_BASE_URL}/articles/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ article: AdminArticle }>(response);
  },

  /**
   * 記事更新
   */
  updateArticle: async (id: string, data: {
    slug?: string;
    title?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
    status?: string;
  }): Promise<{ article: AdminArticle }> => {
    const response = await fetch(`${API_BASE_URL}/articles/admin/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ article: AdminArticle }>(response);
  },

  /**
   * 記事削除
   */
  deleteArticle: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/articles/admin/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * 記事画像アップロード
   */
  uploadArticleImage: async (file: File): Promise<{ imagePath: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/articles/admin/upload-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ imagePath: string }>(response);
  },
};

export { AdminApiError };
