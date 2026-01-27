import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tone.jsをモック
vi.mock('tone', () => ({
  start: vi.fn(),
  getTransport: vi.fn(() => ({
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    seconds: 0,
  })),
  getDestination: vi.fn(() => ({})),
  getContext: vi.fn(() => ({
    state: 'running',
    resume: vi.fn(),
    rawContext: {
      suspend: vi.fn(),
      close: vi.fn(),
    },
  })),
  now: vi.fn(() => 0),
  Gain: vi.fn(() => ({
    gain: { value: 1, rampTo: vi.fn() },
    connect: vi.fn(),
    chain: vi.fn(),
    dispose: vi.fn(),
  })),
  Distortion: vi.fn(() => ({
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  Compressor: vi.fn(() => ({
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  Limiter: vi.fn(() => ({
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  Analyser: vi.fn(() => ({
    connect: vi.fn(),
    dispose: vi.fn(),
    getValue: vi.fn(() => new Float32Array(128)),
  })),
  Player: vi.fn(() => ({
    state: 'stopped',
    connect: vi.fn(),
    chain: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
  Panner: vi.fn(() => ({
    pan: { value: 0, rampTo: vi.fn() },
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  Phaser: vi.fn(() => ({
    set: vi.fn(),
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  PitchShift: vi.fn(() => ({
    pitch: 0,
    connect: vi.fn(),
    dispose: vi.fn(),
  })),
  ToneAudioBuffer: vi.fn(() => ({
    load: vi.fn(),
    get: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// AudioEngineをインポート（モック後）
import AudioEngine, { LOOP_DURATION, SECONDS_PER_MEASURE, BPM } from './AudioEngine';

describe('AudioEngine', () => {
  beforeEach(() => {
    // シングルトンをリセット
    const instance = AudioEngine.getInstance();
    instance.dispose();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AudioEngine.getInstance();
      const instance2 = AudioEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('constants', () => {
    it('should export correct BPM', () => {
      expect(BPM).toBe(120);
    });

    it('should export correct SECONDS_PER_MEASURE', () => {
      // 60/120 * 4 = 2 seconds
      expect(SECONDS_PER_MEASURE).toBe(2);
    });

    it('should export correct LOOP_DURATION', () => {
      // 2 * 8 = 16 seconds
      expect(LOOP_DURATION).toBe(16);
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const engine = AudioEngine.getInstance();
      const state = engine.getState();

      expect(state.isPlaying).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.masterVolume).toBe(1.0);
      expect(state.totalVolume).toBe(0);
      expect(state.saturationAmount).toBe(0);
      expect(state.activeTracks.size).toBe(0);
    });
  });

  describe('setMasterVolume', () => {
    it('should clamp volume to 0-1 range', () => {
      const engine = AudioEngine.getInstance();

      engine.setMasterVolume(1.5);
      expect(engine.getState().masterVolume).toBe(1);

      engine.setMasterVolume(-0.5);
      expect(engine.getState().masterVolume).toBe(0);

      engine.setMasterVolume(0.5);
      expect(engine.getState().masterVolume).toBe(0.5);
    });
  });

  describe('onStateChange', () => {
    it('should call callback when state changes', () => {
      const engine = AudioEngine.getInstance();
      const callback = vi.fn();

      const unsubscribe = engine.onStateChange(callback);
      engine.setMasterVolume(0.8);

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        masterVolume: 0.8,
      }));

      unsubscribe();
    });

    it('should not call callback after unsubscribe', () => {
      const engine = AudioEngine.getInstance();
      const callback = vi.fn();

      const unsubscribe = engine.onStateChange(callback);
      unsubscribe();
      engine.setMasterVolume(0.5);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should clear sticker states and counts', () => {
      const engine = AudioEngine.getInstance();

      // Reset should clear everything
      engine.reset();
      const state = engine.getState();

      expect(state.activeTracks.size).toBe(0);
      expect(state.totalVolume).toBe(0);
    });
  });

  describe('getSaturationAmount', () => {
    it('should always return 0 (disabled)', () => {
      const engine = AudioEngine.getInstance();
      expect(engine.getSaturationAmount()).toBe(0);
    });
  });

  describe('getFrequencyData', () => {
    it('should return empty array when not playing', () => {
      const engine = AudioEngine.getInstance();
      const data = engine.getFrequencyData();
      expect(data.length).toBe(128);
      expect(data.every(v => v === 0)).toBe(true);
    });
  });

  describe('forceStop', () => {
    it('should not throw when called', () => {
      expect(() => AudioEngine.forceStop()).not.toThrow();
    });
  });
});
