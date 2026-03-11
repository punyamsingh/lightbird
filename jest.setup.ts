import '@testing-library/jest-dom';

// Make Node's TextEncoder/TextDecoder available in the jsdom test environment
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

// Mock URL methods unavailable in jsdom
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => `blob:mock-${Math.random()}`),
  writable: true,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock ResizeObserver (used by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

// Polyfill File.text() — jsdom 26 does not implement Blob/File.text()
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

// Polyfill Blob.arrayBuffer() — jsdom 26 does not implement it
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock HTMLTrackElement.prototype.track — jsdom does not implement TextTrack
if (typeof HTMLTrackElement !== 'undefined') {
  Object.defineProperty(HTMLTrackElement.prototype, 'track', {
    get() {
      if (!this._mockTextTrack) {
        this._mockTextTrack = { mode: 'disabled' };
      }
      return this._mockTextTrack;
    },
    configurable: true,
  });
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
