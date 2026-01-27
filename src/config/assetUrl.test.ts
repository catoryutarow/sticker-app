import { describe, it, expect } from 'vitest';
import {
  getAssetBaseUrl,
  getAssetUrl,
  getStickerImageUrl,
  getStickerAudioUrl,
  getKitThumbnailUrl,
  getDefaultThumbnailUrl,
  getBackgroundUrl,
} from './assetUrl';

/**
 * assetUrl.ts のテスト
 *
 * 注意: import.meta.env のモックは複雑なため、
 * ここではローカルパス（環境変数未設定）のケースのみテスト
 * CDN URL生成は実際のデプロイ環境で検証
 */
describe('assetUrl (local paths)', () => {
  describe('getAssetBaseUrl', () => {
    it('should return empty string when VITE_ASSET_BASE_URL is not set', () => {
      // テスト環境では環境変数が未設定なので空文字が返る
      expect(getAssetBaseUrl()).toBe('');
    });
  });

  describe('getAssetUrl', () => {
    it('should return relative path when no CDN configured', () => {
      expect(getAssetUrl('/assets/test.png')).toBe('/assets/test.png');
    });

    it('should preserve path without leading slash', () => {
      expect(getAssetUrl('assets/test.png')).toBe('assets/test.png');
    });
  });

  describe('getStickerImageUrl', () => {
    it('should generate correct local path', () => {
      expect(getStickerImageUrl('001', '001-001')).toBe('/assets/stickers/kit-001/001-001.png');
    });

    it('should handle different kit numbers', () => {
      expect(getStickerImageUrl('005', '005-003')).toBe('/assets/stickers/kit-005/005-003.png');
    });

    it('should append cache buster string when provided', () => {
      expect(getStickerImageUrl('001', '001-001', '12345')).toBe('/assets/stickers/kit-001/001-001.png?t=12345');
    });

    it('should append cache buster number when provided', () => {
      expect(getStickerImageUrl('001', '001-001', 67890)).toBe('/assets/stickers/kit-001/001-001.png?t=67890');
    });

    it('should not append cache buster when undefined', () => {
      expect(getStickerImageUrl('001', '001-001', undefined)).toBe('/assets/stickers/kit-001/001-001.png');
    });
  });

  describe('getStickerAudioUrl', () => {
    it('should generate correct local path', () => {
      expect(getStickerAudioUrl('001', '001-001')).toBe('/assets/audio/kit-001/001-001.mp3');
    });

    it('should handle different kit numbers', () => {
      expect(getStickerAudioUrl('003', '003-002')).toBe('/assets/audio/kit-003/003-002.mp3');
    });

    it('should append cache buster when provided', () => {
      expect(getStickerAudioUrl('001', '001-001', 67890)).toBe('/assets/audio/kit-001/001-001.mp3?t=67890');
    });
  });

  describe('getKitThumbnailUrl', () => {
    it('should generate correct thumbnail path', () => {
      expect(getKitThumbnailUrl('001')).toBe('/assets/thumbnails/kit-001.png');
    });

    it('should handle different kit numbers', () => {
      expect(getKitThumbnailUrl('010')).toBe('/assets/thumbnails/kit-010.png');
    });
  });

  describe('getDefaultThumbnailUrl', () => {
    it('should return default thumbnail path', () => {
      expect(getDefaultThumbnailUrl()).toBe('/assets/thumbnails/default.png');
    });
  });

  describe('getBackgroundUrl', () => {
    it('should generate correct background path', () => {
      expect(getBackgroundUrl('background.jpg')).toBe('/backgrounds/background.jpg');
    });

    it('should handle various filenames', () => {
      expect(getBackgroundUrl('AdobeStock_584852960.jpeg')).toBe('/backgrounds/AdobeStock_584852960.jpeg');
    });
  });
});
