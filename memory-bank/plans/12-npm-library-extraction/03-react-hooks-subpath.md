# Phase 3 — React Hooks Subpath (`lightbird/react`)

## Goal

Move all 11 custom React hooks into `packages/lightbird/src/react/`, exposed as a subpath export (`lightbird/react`). Same npm package as the core — no extra install needed. Just requires React as a peer dep.

## What Moves

| Source | Destination |
|--------|-------------|
| `src/hooks/use-video-playback.ts` | `packages/lightbird/src/react/use-video-playback.ts` |
| `src/hooks/use-video-filters.ts` | `packages/lightbird/src/react/use-video-filters.ts` |
| `src/hooks/use-subtitles.ts` | `packages/lightbird/src/react/use-subtitles.ts` |
| `src/hooks/use-playlist.ts` | `packages/lightbird/src/react/use-playlist.ts` |
| `src/hooks/use-keyboard-shortcuts.ts` | `packages/lightbird/src/react/use-keyboard-shortcuts.ts` |
| `src/hooks/use-fullscreen.ts` | `packages/lightbird/src/react/use-fullscreen.ts` |
| `src/hooks/use-picture-in-picture.ts` | `packages/lightbird/src/react/use-picture-in-picture.ts` |
| `src/hooks/use-progress-persistence.ts` | `packages/lightbird/src/react/use-progress-persistence.ts` |
| `src/hooks/use-video-info.ts` | `packages/lightbird/src/react/use-video-info.ts` |
| `src/hooks/use-media-session.ts` | `packages/lightbird/src/react/use-media-session.ts` |
| `src/hooks/use-chapters.ts` | `packages/lightbird/src/react/use-chapters.ts` |

### What does NOT move here

| Hook | Goes where | Why |
|------|-----------|-----|
| `src/hooks/use-toast.ts` | `packages/ui/` | Depends on Radix Toast — UI-specific |
| `src/hooks/use-mobile.tsx` | `packages/ui/` (if used) | UI concern |

## Code Changes Required

### 3.1 Remove `"use client"` directives

All hooks currently have `"use client"`. Remove it — the consuming app adds this at the boundary.

### 3.2 Update imports

Hooks import from the core package using relative paths (they're in the same npm package):

| Old import | New import |
|-----------|------------|
| `from '@/lib/subtitle-manager'` | `from '../subtitles/subtitle-manager'` |
| `from '@/lib/keyboard-shortcuts'` | `from '../utils/keyboard-shortcuts'` |
| `from '@/lib/video-info'` | `from '../utils/video-info'` |
| `from '@/lib/video-thumbnail'` | `from '../utils/video-thumbnail'` |
| `from '@/types'` | `from '../types'` |
| `from '@/lib/video-processor'` | `from '../video-processor'` |

React imports (`useState`, `useEffect`, `useCallback`, `useRef`, `RefObject`) stay as-is — they come from the `react` peer dep.

### 3.3 Entry point

**`packages/lightbird/src/react/index.ts`:**

```ts
export { useVideoPlayback } from './use-video-playback'
export { useVideoFilters } from './use-video-filters'
export { useSubtitles } from './use-subtitles'
export { usePlaylist } from './use-playlist'
export { useKeyboardShortcuts } from './use-keyboard-shortcuts'
export { useFullscreen } from './use-fullscreen'
export { usePictureInPicture } from './use-picture-in-picture'
export { useProgressPersistence } from './use-progress-persistence'
export { useVideoInfo } from './use-video-info'
export { useMediaSession } from './use-media-session'
export { useChapters } from './use-chapters'
```

### 3.4 Subpath export in package.json

In `packages/lightbird/package.json`, the `exports` field includes:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react/index.js",
      "require": "./dist/react/index.cjs",
      "types": "./dist/react/index.d.ts"
    }
  }
}
```

### 3.5 React as optional peer dep

In `packages/lightbird/package.json`:

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  }
}
```

This means:
- If you `import { createVideoPlayer } from 'lightbird'` — no React needed
- If you `import { useVideoPlayback } from 'lightbird/react'` — React must be installed
- pnpm/npm won't warn about missing React if you never use the `/react` subpath

## Verification

After this phase:
- All 11 hooks live in `packages/lightbird/src/react/`
- `packages/lightbird/src/react/index.ts` exports them all
- Hooks import core utilities via relative paths
- No `"use client"` in any hook file
- `tsc --noEmit` passes

## Usage After This Phase

```tsx
// Consumer code
import { useVideoPlayback, useSubtitles } from 'lightbird/react'
import { createVideoPlayer } from 'lightbird'
import type { VideoPlayer, Subtitle } from 'lightbird'

function MyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, togglePlay, seek, volume } = useVideoPlayback(videoRef)
  const { subtitles, switchSubtitle } = useSubtitles()

  // User builds their own UI
  return (
    <div>
      <video ref={videoRef} />
      <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  )
}
```
