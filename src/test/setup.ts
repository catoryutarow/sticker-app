import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// JSDOM does not implement canvas export APIs; return a stable dummy data URL.
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,test');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
  }));
  createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  resume = vi.fn();
  suspend = vi.fn();
  close = vi.fn();
}

global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
(global as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;
