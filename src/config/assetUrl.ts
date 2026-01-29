/**
 * assetUrl.ts - アセットURL生成の一元管理
 *
 * 環境変数 VITE_ASSET_BASE_URL でCDN URLを指定可能
 * 未設定の場合はローカルパス（/assets, /backgrounds）を使用
 *
 * 例:
 * - ローカル: /assets/stickers/kit-001/001-001.png
 * - CDN: https://d123.cloudfront.net/assets/stickers/kit-001/001-001.png
 */

/**
 * アセットのベースURLを取得
 * 環境変数が設定されていればCDN URL、なければ空文字（相対パス）
 */
export function getAssetBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_ASSET_BASE_URL || '';
  // 末尾のスラッシュを除去
  return baseUrl.replace(/\/$/, '');
}

/**
 * アセットの完全URLを生成
 * @param path - /assets/... または /backgrounds/... 形式のパス
 * @returns 完全なURL（CDN設定時）または相対パス
 */
export function getAssetUrl(path: string): string {
  const baseUrl = getAssetBaseUrl();
  if (!baseUrl) {
    return path;
  }
  // パスが/で始まる場合はそのまま結合、そうでなければ/を追加
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 画像フォーマットを取得（WebP優先、フォールバック用にPNG）
 * モダンブラウザはほぼWebP対応（97%+）のため、WebPをデフォルトで使用
 */
export function getImageFormat(): 'webp' | 'png' {
  // SSR環境やテスト環境ではpngにフォールバック
  if (typeof document === 'undefined') return 'png';

  // WebPサポートチェック（キャッシュ）
  if (_webpSupported === null) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataUrl = canvas.toDataURL('image/webp');
      _webpSupported = dataUrl?.startsWith('data:image/webp') ?? false;
    } catch {
      _webpSupported = false;
    }
  }

  return _webpSupported ? 'webp' : 'png';
}

let _webpSupported: boolean | null = null;

/**
 * WebPサポートキャッシュをリセット（テスト用）
 */
export function _resetWebpCache(): void {
  _webpSupported = null;
}

/**
 * シール画像のURLを生成
 * @param kitId - キット番号（例: '001'）
 * @param stickerId - シールID（例: '001-001'）
 * @param cacheBuster - キャッシュバスティング用のタイムスタンプ（オプション）
 */
export function getStickerImageUrl(kitId: string, stickerId: string, cacheBuster?: string | number): string {
  const format = getImageFormat();
  const path = `/assets/stickers/kit-${kitId}/${stickerId}.${format}`;
  const url = getAssetUrl(path);
  return cacheBuster ? `${url}?t=${cacheBuster}` : url;
}

/**
 * シール音声のURLを生成
 * @param kitId - キット番号（例: '001'）
 * @param stickerId - シールID（例: '001-001'）
 * @param cacheBuster - キャッシュバスティング用のタイムスタンプ（オプション）
 */
export function getStickerAudioUrl(kitId: string, stickerId: string, cacheBuster?: string | number): string {
  const path = `/assets/audio/kit-${kitId}/${stickerId}.mp3`;
  const url = getAssetUrl(path);
  return cacheBuster ? `${url}?t=${cacheBuster}` : url;
}

/**
 * キットサムネイルのURLを生成
 * @param kitNumber - キット番号（例: '001'）
 */
export function getKitThumbnailUrl(kitNumber: string): string {
  const format = getImageFormat();
  return getAssetUrl(`/assets/thumbnails/kit-${kitNumber}.${format}`);
}

/**
 * デフォルトサムネイルのURLを取得
 */
export function getDefaultThumbnailUrl(): string {
  const format = getImageFormat();
  return getAssetUrl(`/assets/thumbnails/default.${format}`);
}

/**
 * 背景画像のURLを生成
 * @param filename - 背景ファイル名
 */
export function getBackgroundUrl(filename: string): string {
  return getAssetUrl(`/backgrounds/${filename}`);
}
