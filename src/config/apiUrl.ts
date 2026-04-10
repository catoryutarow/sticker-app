/**
 * 開発環境で localhost を現在のホスト名に動的置換する
 * PC: localhost → localhost（そのまま）
 * スマホ: localhost → 192.168.x.x（ブラウザのホスト名）
 */
function resolveUrl(envUrl: string): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return envUrl.replace('localhost', window.location.hostname);
  }
  return envUrl;
}

export const API_BASE_URL = resolveUrl(import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
export const ASSET_BASE_URL = resolveUrl(import.meta.env.VITE_ASSET_BASE_URL || '');
