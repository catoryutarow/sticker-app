// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface AdminTag {
  id: string;
  name: string;
  sort_order: number;
  usage_count: number;
  kit_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagStats {
  fixedTagCount: number;
  customTagCount: number;
  totalCustomUses: number;
}

export interface CreateTagRequest {
  name: string;
}

export interface UpdateTagRequest {
  name?: string;
  sortOrder?: number;
}

/**
 * 管理用タグ一覧取得
 */
export async function getAdminTags(): Promise<{ tags: AdminTag[]; stats: TagStats }> {
  const response = await fetch(`${API_BASE_URL}/tags/admin/list`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch admin tags');
  }
  return response.json();
}

/**
 * 固定タグ作成
 */
export async function createTag(data: CreateTagRequest): Promise<AdminTag> {
  const response = await fetch(`${API_BASE_URL}/tags/admin`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tag');
  }
  const result = await response.json();
  return result.tag;
}

/**
 * 固定タグ更新
 */
export async function updateTag(tagId: string, data: UpdateTagRequest): Promise<AdminTag> {
  const response = await fetch(`${API_BASE_URL}/tags/admin/${tagId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update tag');
  }
  const result = await response.json();
  return result.tag;
}

/**
 * 固定タグ削除
 */
export async function deleteTag(tagId: string): Promise<{ affectedKits: number }> {
  const response = await fetch(`${API_BASE_URL}/tags/admin/${tagId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete tag');
  }
  return response.json();
}

/**
 * 固定タグ並び順更新
 */
export async function reorderTags(tagIds: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tags/admin/reorder`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagIds }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reorder tags');
  }
}
