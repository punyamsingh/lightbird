# Phase 7 — Testing Strategy

## Goal

Migrate all 28 test suites to their respective packages. Each package gets its own jest config. Turborepo runs them all with `turbo test`.

## Test Migration Map

### `packages/lightbird/__tests__/` (library + hooks)

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

### `packages/ui/__tests__/` (components)

| Source | Destination |
|--------|-------------|
| `src/components/__tests__/player-controls.test.tsx` | `packages/ui/__tests__/player-controls.test.tsx` |
| `src/components/__tests__/playlist-panel.test.tsx` | `packages/ui/__tests__/playlist-panel.test.tsx` |
| `src/components/__tests__/player-error-display.test.tsx` | `packages/ui/__tests__/player-error-display.test.tsx` |
| `src/components/__tests__/player-error-boundary.test.tsx` | `packages/ui/__tests__/player-error-boundary.test.tsx` |

## Jest Configs

### `packages/lightbird/jest.config.ts`

```ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    // Map package self-references if any tests import from 'lightbird'
    '^lightbird$': '<rootDir>/src/index.ts',
    '^lightbird/react$': '<rootDir>/src/react/index.ts',
  },
  setupFilesAfterSetup: ['./jest.setup.ts'],
}

export default config
```

**Note:** We switch from `next/jest` (SWC) to `ts-jest` for the packages, since they're not Next.js apps. The app (`apps/web/`) can continue using `next/jest`.

### `packages/lightbird/jest.setup.ts`

```ts
import '@testing-library/jest-dom'
```

### `packages/ui/jest.config.ts`

```ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^lightbird$': '<rootDir>/../lightbird/src/index.ts',
    '^lightbird/react$': '<rootDir>/../lightbird/src/react/index.ts',
    '^@lightbird/ui$': '<rootDir>/src/index.ts',
    '\\.css$': 'identity-obj-proxy',
  },
  setupFilesAfterSetup: ['./jest.setup.ts'],
}

export default config
```

### `apps/web/jest.config.ts`

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  // App-level tests only (if any exist beyond package tests)
  roots: ['<rootDir>/src'],
  setupFilesAfterSetup: ['./jest.setup.ts'],
}

export default createJestConfig(config)
```

## Test Import Updates

All test files need their imports updated to match the new source locations.

### Library tests (`packages/lightbird/__tests__/`)

| Old import pattern | New import pattern |
|-------------------|-------------------|
| `from '../../lib/subtitle-converter'` | `from '../src/subtitles/subtitle-converter'` |
| `from '../../lib/video-processor'` | `from '../src/video-processor'` |
| `from '../../lib/players/mkv-player'` | `from '../src/players/mkv-player'` |
| `from '../../types'` | `from '../src/types'` |
| (etc. — match new directory structure) | |

### Hook tests (`packages/lightbird/__tests__/react/`)

| Old import pattern | New import pattern |
|-------------------|-------------------|
| `from '../../hooks/use-video-playback'` | `from '../../src/react/use-video-playback'` |
| `from '../../lib/subtitle-manager'` | `from '../../src/subtitles/subtitle-manager'` |
| (etc.) | |

### Component tests (`packages/ui/__tests__/`)

| Old import pattern | New import pattern |
|-------------------|-------------------|
| `from '../../components/player-controls'` | `from '../src/player-controls'` |
| `from '../../components/playlist-panel'` | `from '../src/playlist-panel'` |
| (etc.) | |

## Dev Dependencies per Package

Each package needs its own test deps:

```bash
# packages/lightbird
pnpm add -D jest @types/jest ts-jest jest-environment-jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event

# packages/ui
pnpm add -D jest @types/jest ts-jest jest-environment-jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event identity-obj-proxy
```

## Running Tests

```bash
# Run all tests across all packages
pnpm turbo test

# Run only core package tests
pnpm test --filter lightbird

# Run only UI package tests
pnpm test --filter @lightbird/ui

# Watch mode (for development)
cd packages/lightbird && pnpm jest --watch
```

## Verification

After this phase:
- `pnpm turbo test` runs all 28 test suites and they all pass
- Each package can run tests independently
- No test imports reference `@/` aliases
- Coverage target maintained (>70% on core library code)
