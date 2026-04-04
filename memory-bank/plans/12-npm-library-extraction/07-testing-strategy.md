# Phase 7 — Testing Strategy

## Goal

Migrate all 28 test suites to their respective packages. Each package gets its own jest config. Turborepo runs them all with `turbo test`.

## Critical Decision: `next/jest` vs `ts-jest`

Current setup uses `next/jest` (SWC transform). The packages are NOT Next.js apps, so they can't use `next/jest`.

**Decision: Use `ts-jest` for packages, keep `next/jest` for `apps/web/`.**

This means:
- `packages/lightbird/` and `packages/ui/` use `ts-jest`
- `apps/web/` continues using `next/jest` (if it has app-level tests)
- Both produce identical results — they just use different TypeScript transpilers

Install per package:
```bash
cd packages/lightbird && pnpm add -D jest ts-jest @types/jest jest-environment-jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event
cd packages/ui && pnpm add -D jest ts-jest @types/jest jest-environment-jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event identity-obj-proxy
```

## The `jest.setup.ts` Problem

The current `jest.setup.ts` (110 lines) contains critical polyfills for jsdom:
- `TextEncoder` / `TextDecoder` polyfills
- `URL.createObjectURL` / `revokeObjectURL` mocks
- `ResizeObserver` mock (needed by Radix UI)
- `IntersectionObserver` mock
- `Blob.text()` / `Blob.arrayBuffer()` polyfills
- `HTMLTrackElement.track` mock (needed by subtitle tests)
- `MediaMetadata` mock (Media Session API)
- `window.matchMedia` mock
- `@testing-library/jest-dom` import

**Solution:** Create a shared setup file at the workspace root:

**`jest.setup.ts`** (workspace root — shared by all packages):
```ts
import '@testing-library/jest-dom';

// TextEncoder/TextDecoder polyfills
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

// URL methods
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => `blob:mock-${Math.random()}`),
  writable: true,
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// ResizeObserver (used by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Blob.text() polyfill
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

// Blob.arrayBuffer() polyfill
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

// HTMLTrackElement.prototype.track (needed by subtitle tests)
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

// MediaMetadata (Media Session API)
if (typeof global.MediaMetadata === 'undefined') {
  (global as any).MediaMetadata = class MediaMetadata {
    title: string;
    artist: string;
    album: string;
    artwork: MediaImage[];
    constructor(init: MediaMetadataInit = {}) {
      this.title = init.title ?? '';
      this.artist = init.artist ?? '';
      this.album = init.album ?? '';
      this.artwork = init.artwork ? [...init.artwork] : [];
    }
  };
}

// window.matchMedia
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
```

Each package references this shared file.

## Test Migration Map

### `packages/lightbird/__tests__/` (library tests)

| Source | Destination |
|--------|-------------|
| `src/lib/__tests__/subtitle-converter.test.ts` | `packages/lightbird/__tests__/subtitle-converter.test.ts` |
| `src/lib/__tests__/video-processor.test.ts` | `packages/lightbird/__tests__/video-processor.test.ts` |
| `src/lib/__tests__/subtitle-manager.test.ts` | `packages/lightbird/__tests__/subtitle-manager.test.ts` |
| `src/lib/__tests__/subtitle-manager-advanced.test.ts` | `packages/lightbird/__tests__/subtitle-manager-advanced.test.ts` |
| `src/lib/__tests__/ffmpeg-singleton.test.ts` | `packages/lightbird/__tests__/ffmpeg-singleton.test.ts` |
| `src/lib/__tests__/mkv-player.test.ts` | `packages/lightbird/__tests__/mkv-player.test.ts` |
| `src/lib/__tests__/media-error.test.ts` | `packages/lightbird/__tests__/media-error.test.ts` |
| `src/lib/__tests__/m3u-parser.test.ts` | `packages/lightbird/__tests__/m3u-parser.test.ts` |
| `src/lib/__tests__/subtitle-offset.test.ts` | `packages/lightbird/__tests__/subtitle-offset.test.ts` |
| `src/lib/__tests__/chapter-parser.test.ts` | `packages/lightbird/__tests__/chapter-parser.test.ts` |
| `src/lib/__tests__/keyboard-shortcuts.test.ts` | `packages/lightbird/__tests__/keyboard-shortcuts.test.ts` |
| `src/lib/__tests__/video-thumbnail.test.ts` | `packages/lightbird/__tests__/video-thumbnail.test.ts` |
| `src/lib/__tests__/video-info.test.ts` | `packages/lightbird/__tests__/video-info.test.ts` |
| `src/lib/__tests__/progress-estimator.test.ts` | `packages/lightbird/__tests__/progress-estimator.test.ts` |

### `packages/lightbird/__tests__/react/` (hook tests)

| Source | Destination |
|--------|-------------|
| `src/hooks/__tests__/use-video-playback.test.ts` | `packages/lightbird/__tests__/react/use-video-playback.test.ts` |
| `src/hooks/__tests__/use-subtitles.test.ts` | `packages/lightbird/__tests__/react/use-subtitles.test.ts` |
| `src/hooks/__tests__/use-playlist.test.ts` | `packages/lightbird/__tests__/react/use-playlist.test.ts` |
| `src/hooks/__tests__/use-video-filters.test.ts` | `packages/lightbird/__tests__/react/use-video-filters.test.ts` |
| `src/hooks/__tests__/use-keyboard-shortcuts.test.ts` | `packages/lightbird/__tests__/react/use-keyboard-shortcuts.test.ts` |
| `src/hooks/__tests__/use-fullscreen.test.ts` | `packages/lightbird/__tests__/react/use-fullscreen.test.ts` |
| `src/hooks/__tests__/use-progress-persistence.test.ts` | `packages/lightbird/__tests__/react/use-progress-persistence.test.ts` |
| `src/hooks/__tests__/use-picture-in-picture.test.ts` | `packages/lightbird/__tests__/react/use-picture-in-picture.test.ts` |
| `src/hooks/__tests__/use-media-session.test.ts` | `packages/lightbird/__tests__/react/use-media-session.test.ts` |
| `src/hooks/__tests__/use-chapters.test.ts` | `packages/lightbird/__tests__/react/use-chapters.test.ts` |

### `packages/ui/__tests__/` (component tests)

| Source | Destination |
|--------|-------------|
| `src/components/__tests__/player-controls.test.tsx` | `packages/ui/__tests__/player-controls.test.tsx` |
| `src/components/__tests__/playlist-panel.test.tsx` | `packages/ui/__tests__/playlist-panel.test.tsx` |
| `src/components/__tests__/player-error-display.test.tsx` | `packages/ui/__tests__/player-error-display.test.tsx` |
| `src/components/__tests__/player-error-boundary.test.tsx` | `packages/ui/__tests__/player-error-boundary.test.tsx` |

## Jest Configs

### `packages/lightbird/jest.config.ts`

```ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // No @/ aliases in packages — all imports are relative
  },
  setupFilesAfterSetup: ['../../jest.setup.ts'],
};

export default config;
```

### `packages/ui/jest.config.ts`

```ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // Resolve workspace packages to source for tests
    '^lightbird$': '<rootDir>/../lightbird/src/index.ts',
    '^lightbird/react$': '<rootDir>/../lightbird/src/react/index.ts',
    '\\.css$': 'identity-obj-proxy',
  },
  setupFilesAfterSetup: ['../../jest.setup.ts'],
};

export default config;
```

## Test Import Updates

Each test file needs its source imports updated to match the new directory structure.

### Library test pattern (packages/lightbird/__tests__/)

```
OLD: import { SubtitleConverter } from '../../lib/subtitle-converter';
NEW: import { SubtitleConverter } from '../src/subtitles/subtitle-converter';

OLD: import { createVideoPlayer } from '../../lib/video-processor';
NEW: import { createVideoPlayer } from '../src/video-processor';

OLD: import { MKVPlayer, parseStreamInfo } from '../../lib/players/mkv-player';
NEW: import { MKVPlayer, parseStreamInfo } from '../src/players/mkv-player';

OLD: import type { ... } from '../../types';
NEW: import type { ... } from '../src/types';
```

### Hook test pattern (packages/lightbird/__tests__/react/)

```
OLD: import { useVideoPlayback } from '../../hooks/use-video-playback';
NEW: import { useVideoPlayback } from '../../src/react/use-video-playback';

OLD: import { UniversalSubtitleManager } from '../../lib/subtitle-manager';
NEW: import { UniversalSubtitleManager } from '../../src/subtitles/subtitle-manager';
```

### Component test pattern (packages/ui/__tests__/)

```
OLD: import PlayerControls from '../../components/player-controls';
NEW: import PlayerControls from '../src/player-controls';

OLD: import { PlayerErrorDisplay } from '../../components/player-error-display';
NEW: import { PlayerErrorDisplay } from '../src/player-error-display';
```

**Note on `use-subtitles.test.ts`:** This test may mock `useToast`. After Phase 3's refactor (replacing toast with `onError` callback), update the test to pass an `onError` mock instead.

## Running Tests

```bash
pnpm turbo test                          # all packages
pnpm test --filter lightbird             # core only
pnpm test --filter @lightbird/ui         # UI only
cd packages/lightbird && pnpm jest --watch  # dev mode
```

## Verification

- `pnpm turbo test` runs all 28 suites and they all pass
- Each package runs tests independently
- No `@/` aliases in any test file
- Coverage target maintained (>70% on core library code)
- `use-subtitles.test.ts` updated for `onError` callback pattern
