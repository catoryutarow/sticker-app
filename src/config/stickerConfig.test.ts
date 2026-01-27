import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStickerById,
  isValidStickerId,
  getAllStickerIds,
  getStickerImagePath,
  getStickerAudioPath,
  isStickerPercussion,
  semitoneToKey,
  registerDynamicSticker,
  clearDynamicStickers,
  STICKERS,
} from './stickerConfig';

describe('stickerConfig', () => {
  beforeEach(() => {
    clearDynamicStickers();
  });

  describe('getStickerById', () => {
    it('should return sticker definition for valid static ID', () => {
      const sticker = getStickerById('001-001');
      expect(sticker).toBeDefined();
      expect(sticker?.name).toBe('Star');
      expect(sticker?.nameJa).toBe('スター');
    });

    it('should return undefined for invalid ID', () => {
      const sticker = getStickerById('999-999');
      expect(sticker).toBeUndefined();
    });

    it('should return dynamic sticker when registered', () => {
      registerDynamicSticker({
        id: '010-001',
        name: 'Dynamic',
        nameJa: 'ダイナミック',
        color: '#FF0000',
      });
      const sticker = getStickerById('010-001');
      expect(sticker).toBeDefined();
      expect(sticker?.name).toBe('Dynamic');
    });
  });

  describe('isValidStickerId', () => {
    it('should return true for valid static sticker ID', () => {
      expect(isValidStickerId('001-001')).toBe(true);
      expect(isValidStickerId('002-001')).toBe(true);
    });

    it('should return false for invalid sticker ID', () => {
      expect(isValidStickerId('999-999')).toBe(false);
      expect(isValidStickerId('invalid')).toBe(false);
    });

    it('should return true for registered dynamic sticker', () => {
      registerDynamicSticker({
        id: '010-002',
        name: 'Test',
        nameJa: 'テスト',
        color: '#00FF00',
      });
      expect(isValidStickerId('010-002')).toBe(true);
    });
  });

  describe('getAllStickerIds', () => {
    it('should return all static sticker IDs', () => {
      const ids = getAllStickerIds();
      expect(ids).toContain('001-001');
      expect(ids).toContain('002-001');
      expect(ids.length).toBeGreaterThanOrEqual(STICKERS.length);
    });

    it('should include dynamic stickers', () => {
      registerDynamicSticker({
        id: '010-003',
        name: 'Dynamic',
        nameJa: 'ダイナミック',
        color: '#0000FF',
      });
      const ids = getAllStickerIds();
      expect(ids).toContain('010-003');
    });
  });

  describe('getStickerImagePath', () => {
    it('should generate correct image path', () => {
      expect(getStickerImagePath('001-001')).toBe('/assets/stickers/kit-001/001-001.png');
      expect(getStickerImagePath('002-003')).toBe('/assets/stickers/kit-002/002-003.png');
    });
  });

  describe('getStickerAudioPath', () => {
    it('should generate correct audio path', () => {
      expect(getStickerAudioPath('001-001')).toBe('/assets/audio/kit-001/001-001.mp3');
      expect(getStickerAudioPath('003-005')).toBe('/assets/audio/kit-003/003-005.mp3');
    });
  });

  describe('isStickerPercussion', () => {
    it('should return true for percussion stickers', () => {
      // 001-001 (Star) is percussion
      expect(isStickerPercussion('001-001')).toBe(true);
    });

    it('should return false for non-percussion stickers', () => {
      // 001-002 (Heart) is not percussion
      expect(isStickerPercussion('001-002')).toBe(false);
    });

    it('should return false for invalid sticker ID', () => {
      expect(isStickerPercussion('999-999')).toBe(false);
    });
  });

  describe('semitoneToKey', () => {
    it('should return correct key for semitone 0', () => {
      expect(semitoneToKey(0)).toBe('C / Am');
    });

    it('should return correct key for positive semitones', () => {
      expect(semitoneToKey(2)).toBe('D / Bm');
      expect(semitoneToKey(5)).toBe('F / Dm');
    });

    it('should return correct key for negative semitones', () => {
      expect(semitoneToKey(-5)).toBe('G / Em');
      expect(semitoneToKey(-3)).toBe('A / F#m');
    });

    it('should clamp values outside range', () => {
      expect(semitoneToKey(10)).toBe('F# / D#m'); // clamped to 6
      expect(semitoneToKey(-10)).toBe('F# / D#m'); // clamped to -6
    });
  });

  describe('clearDynamicStickers', () => {
    it('should clear all dynamic stickers', () => {
      registerDynamicSticker({
        id: '010-004',
        name: 'Test',
        nameJa: 'テスト',
        color: '#FFFF00',
      });
      expect(isValidStickerId('010-004')).toBe(true);

      clearDynamicStickers();
      expect(isValidStickerId('010-004')).toBe(false);
    });
  });
});
