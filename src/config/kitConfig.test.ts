import { describe, it, expect, beforeEach } from 'vitest';
import {
  KITS,
  getKitById,
  getStickerPrefix,
  getKitBaseSemitone,
  registerDynamicKit,
  clearDynamicKits,
} from './kitConfig';

describe('kitConfig', () => {
  beforeEach(() => {
    clearDynamicKits();
  });

  describe('KITS', () => {
    it('should have at least 3 static kits', () => {
      expect(KITS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have required fields for each kit', () => {
      KITS.forEach(kit => {
        expect(kit.id).toBeDefined();
        expect(kit.name).toBeDefined();
        expect(kit.nameJa).toBeDefined();
        expect(kit.color).toBeDefined();
      });
    });
  });

  describe('getKitById', () => {
    it('should return kit definition for valid ID', () => {
      const kit = getKitById('001');
      expect(kit).toBeDefined();
      expect(kit?.name).toBe('Basic Shapes');
      expect(kit?.nameJa).toBe('ベーシック');
    });

    it('should return undefined for invalid ID', () => {
      const kit = getKitById('999');
      expect(kit).toBeUndefined();
    });

    it('should return dynamic kit when registered', () => {
      registerDynamicKit({
        id: '010',
        name: 'Dynamic Kit',
        nameJa: 'ダイナミックキット',
        color: '#FF0000',
      });
      const kit = getKitById('010');
      expect(kit).toBeDefined();
      expect(kit?.name).toBe('Dynamic Kit');
    });

    it('should prioritize dynamic kit over static', () => {
      registerDynamicKit({
        id: '001',
        name: 'Override Kit',
        nameJa: 'オーバーライド',
        color: '#00FF00',
      });
      const kit = getKitById('001');
      expect(kit?.name).toBe('Override Kit');
    });
  });

  describe('getStickerPrefix', () => {
    it('should generate correct prefix', () => {
      expect(getStickerPrefix('001')).toBe('001-');
      expect(getStickerPrefix('010')).toBe('010-');
    });
  });

  describe('getKitBaseSemitone', () => {
    it('should return 0 for C/Am key (kit 001)', () => {
      expect(getKitBaseSemitone('001')).toBe(0);
    });

    it('should return 2 for D/Bm key (kit 002)', () => {
      expect(getKitBaseSemitone('002')).toBe(2);
    });

    it('should return -2 for Bb/Gm key (kit 003)', () => {
      expect(getKitBaseSemitone('003')).toBe(-2);
    });

    it('should return 0 for invalid kit', () => {
      expect(getKitBaseSemitone('999')).toBe(0);
    });

    it('should return 0 for kit without musicalKey', () => {
      registerDynamicKit({
        id: '011',
        name: 'No Key Kit',
        nameJa: 'キーなし',
        color: '#FFFF00',
      });
      expect(getKitBaseSemitone('011')).toBe(0);
    });
  });

  describe('clearDynamicKits', () => {
    it('should clear all dynamic kits', () => {
      registerDynamicKit({
        id: '012',
        name: 'Test',
        nameJa: 'テスト',
        color: '#0000FF',
      });
      expect(getKitById('012')).toBeDefined();

      clearDynamicKits();
      expect(getKitById('012')).toBeUndefined();
    });
  });
});
