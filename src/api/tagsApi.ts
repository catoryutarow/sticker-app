// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface Tag {
  id: string | null;
  name: string;
  sort_order: number;
  usage_count: number;
  isRegistered?: boolean;
}

export interface PopularCustomTag {
  name: string;
  count: number;
}

export interface KitTag {
  name: string;
  isCustom: boolean;
  createdAt?: string;
}

// ================================
// Public API（認証不要）
// ================================

/**
 * タグ一覧取得（固定タグ + 人気カスタムタグ）
 */
export async function fetchTags(): Promise<{
  tags: Tag[];
  popularCustomTags: PopularCustomTag[];
}> {
  const response = await fetch(`${API_BASE_URL}/tags`);
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  return response.json();
}

// ================================
// Creator API（認証必要）
// ================================

/**
 * キットのタグ一覧取得
 */
export async function fetchKitTags(kitId: string): Promise<KitTag[]> {
  const response = await fetch(`${API_BASE_URL}/kits/${kitId}/tags`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch kit tags');
  }
  const data = await response.json();
  return data.tags;
}

/**
 * キットのタグを一括更新
 */
export async function updateKitTags(
  kitId: string,
  tags: string[]
): Promise<KitTag[]> {
  const response = await fetch(`${API_BASE_URL}/kits/${kitId}/tags`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update kit tags');
  }
  const data = await response.json();
  return data.tags;
}

/**
 * キットにタグを追加
 */
export async function addKitTag(
  kitId: string,
  tagName: string
): Promise<KitTag> {
  const response = await fetch(`${API_BASE_URL}/kits/${kitId}/tags`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add tag');
  }
  const data = await response.json();
  return data.tag;
}

/**
 * キットからタグを削除
 */
export async function removeKitTag(
  kitId: string,
  tagName: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/kits/${kitId}/tags/${encodeURIComponent(tagName)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove tag');
  }
}

// ================================
// Search API（認証不要）
// ================================

export interface SearchKitsParams {
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface PublicKitWithTags {
  id: string;
  kit_number: string;
  name: string;
  description: string | null;
  color: string;
  musical_key: string;
  status: string;
  created_at: string;
  sticker_count: number;
  tags: KitTag[];
}

export interface SearchKitsResult {
  kits: PublicKitWithTags[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * キット検索（タグフィルタ対応）
 */
export async function searchKits(
  params: SearchKitsParams
): Promise<SearchKitsResult> {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.tags && params.tags.length > 0) {
    searchParams.set('tags', params.tags.join(','));
  }
  if (params.page) {
    searchParams.set('page', String(params.page));
  }
  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const url = `${API_BASE_URL}/kits/public?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to search kits');
  }

  return response.json();
}
