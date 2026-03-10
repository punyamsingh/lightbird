# Plan 01 — Add a Test Suite

## Problem

The project has zero tests. No unit tests, no integration tests, no end-to-end tests. This means:
- Regressions go undetected until a user notices them.
- Refactoring is risky with no safety net.
- The subtitle converter, player factory logic, and state transitions are completely untested.

## Goal

Establish a solid test foundation covering the most critical business logic and UI interactions, using the standard React ecosystem toolchain.

---

## Tech Choices

| Layer | Tool |
|---|---|
| Test runner | **Jest** (via `jest-environment-jsdom`) |
| Component testing | **React Testing Library** |
| Coverage | Built-in Jest coverage (`--coverage`) |
| Mocking | Jest built-ins (`jest.fn`, `jest.spyOn`, module mocking) |

---

## Step-by-Step Implementation

### Step 1 — Install Dependencies

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom ts-jest
```

### Step 2 — Configure Jest

Create `jest.config.ts` at the project root:

```ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig(config);
```

Create `jest.setup.ts`:

```ts
import '@testing-library/jest-dom';
```

Add to `package.json` scripts:

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

### Step 3 — Write Unit Tests for `subtitle-converter.ts`

File: `src/lib/__tests__/subtitle-converter.test.ts`

Test cases:
- Valid SRT input produces valid VTT output with `WEBVTT` header.
- Timestamp format is converted from `,` to `.` (SRT → VTT).
- Multi-line subtitle text is preserved correctly.
- Empty string input returns just the `WEBVTT` header.
- Malformed SRT (missing timestamps) does not throw — returns best-effort VTT.

### Step 4 — Write Unit Tests for `video-processor.ts`

File: `src/lib/__tests__/video-processor.test.ts`

Test cases:
- `createVideoPlayer('video.mp4', el)` returns a `SimplePlayer` instance.
- `createVideoPlayer('video.mkv', el)` returns an `MkvPlayer` instance.
- Unknown extensions fall back to `SimplePlayer`.
- The returned player exposes the `VideoPlayer` interface (`play`, `pause`, `seek`, `dispose`, etc.).

### Step 5 — Write Unit Tests for `subtitle-manager.ts`

File: `src/lib/__tests__/subtitle-manager.test.ts`

Test cases:
- Adding an external SRT subtitle creates a `<track>` element in the DOM.
- Adding a duplicate subtitle ID is a no-op (idempotent).
- Removing a subtitle removes the `<track>` element.
- `clearSubtitles()` removes all managed tracks.
- Blob URLs are revoked on `dispose()`.

### Step 6 — Write Component Tests for `PlayerControls`

File: `src/components/__tests__/player-controls.test.tsx`

Test cases:
- Play/pause button toggles and calls the `onPlayPause` prop.
- Mute button calls `onMute` prop.
- Volume slider changes call `onVolumeChange` with the correct value.
- Speed selector renders all 8 speed options.
- Fullscreen button is present and calls `onFullscreen`.
- Screenshot button is present.

### Step 7 — Write Component Tests for `PlaylistPanel`

File: `src/components/__tests__/playlist-panel.test.tsx`

Test cases:
- Renders an empty state when playlist is empty.
- Renders each playlist item name.
- Currently playing item has visual distinction (aria-current or CSS class).
- Clicking an item calls `onSelectItem` with the correct index.
- URL input and "Add Stream" flow calls `onAddStream` with the entered URL.

### Step 8 — Add CI Integration

Add `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test -- --ci --coverage
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Create | `jest.config.ts` |
| Create | `jest.setup.ts` |
| Modify | `package.json` (add test scripts) |
| Create | `src/lib/__tests__/subtitle-converter.test.ts` |
| Create | `src/lib/__tests__/video-processor.test.ts` |
| Create | `src/lib/__tests__/subtitle-manager.test.ts` |
| Create | `src/components/__tests__/player-controls.test.tsx` |
| Create | `src/components/__tests__/playlist-panel.test.tsx` |
| Create | `.github/workflows/test.yml` |

---

## Success Criteria

- `npm test` runs with zero failures.
- Coverage report shows >70% line coverage on `src/lib/`.
- CI workflow passes on every push.
