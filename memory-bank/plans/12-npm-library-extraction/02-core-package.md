# Phase 2 — Core Package (`lightbird`)

## Goal

Extract all framework-agnostic library code from `src/lib/` and `src/types/` into `packages/lightbird/`. This becomes the `lightbird` npm package.

## What Moves

### From `src/lib/` → `packages/lightbird/src/`

| Source | Destination | Notes |
|--------|-------------|-------|
| `src/lib/video-processor.ts` | `packages/lightbird/src/video-processor.ts` | Factory + `VideoPlayer` interface |
| `src/lib/players/simple-player.ts` | `packages/lightbird/src/players/simple-player.ts` | HTML5 wrapper |
| `src/lib/players/mkv-player.ts` | `packages/lightbird/src/players/mkv-player.ts` | FFmpeg MKV player |
| `src/lib/workers/ffmpeg-worker.ts` | `packages/lightbird/src/workers/ffmpeg-worker.ts` | Web Worker |
| `src/lib/ffmpeg-singleton.ts` | `packages/lightbird/src/utils/ffmpeg-singleton.ts` | Lazy FFmpeg loader |
| `src/lib/subtitle-converter.ts` | `packages/lightbird/src/subtitles/subtitle-converter.ts` | SRT → VTT |
| `src/lib/subtitle-manager.ts` | `packages/lightbird/src/subtitles/subtitle-manager.ts` | Track management |
| `src/lib/subtitle-offset.ts` | `packages/lightbird/src/subtitles/subtitle-offset.ts` | Timestamp shifting |
| `src/lib/ass-renderer.ts` | `packages/lightbird/src/subtitles/ass-renderer.ts` | Canvas ASS/SSA |
| `src/lib/chapter-parser.ts` | `packages/lightbird/src/parsers/chapter-parser.ts` | Chapter extraction |
| `src/lib/m3u-parser.ts` | `packages/lightbird/src/parsers/m3u-parser.ts` | M3U8 import/export |
| `src/lib/media-error.ts` | `packages/lightbird/src/utils/media-error.ts` | Error parsing |
| `src/lib/video-info.ts` | `packages/lightbird/src/utils/video-info.ts` | Metadata extraction |
| `src/lib/video-thumbnail.ts` | `packages/lightbird/src/utils/video-thumbnail.ts` | Frame capture |
| `src/lib/keyboard-shortcuts.ts` | `packages/lightbird/src/utils/keyboard-shortcuts.ts` | Shortcut registry |
| `src/lib/progress-estimator.ts` | `packages/lightbird/src/utils/progress-estimator.ts` | ETA calculation |

### From `src/types/` → `packages/lightbird/src/types/`

| Source | Destination |
|--------|-------------|
| `src/types/index.ts` | `packages/lightbird/src/types/index.ts` |

## Code Changes Required

### 2.1 Remove `"use client"` directives

Every file in `packages/lightbird/src/` must have `"use client"` removed. This is a Next.js-specific directive. A library doesn't dictate rendering strategy — the consuming app decides.

Files that currently have `"use client"`:
- `video-processor.ts`
- `subtitle-manager.ts`
- `ass-renderer.ts`
- `ffmpeg-singleton.ts`
- `media-error.ts`
- `keyboard-shortcuts.ts`
- `progress-estimator.ts`
- `subtitle-converter.ts`
- `video-thumbnail.ts`
- `video-info.ts`
- `players/simple-player.ts`
- `players/mkv-player.ts`

### 2.2 Replace `@/` import aliases with relative imports

Every `import ... from '@/types'` becomes `import ... from '../types'` (adjusted per file depth).
Every `import ... from '@/lib/...'` becomes a relative import within the package.

**Mapping:**

| In file | Old import | New import |
|---------|-----------|------------|
| `video-processor.ts` | `from '@/types'` | `from './types'` |
| `video-processor.ts` | `from './players/simple-player'` | `from './players/simple-player'` (unchanged) |
| `video-processor.ts` | `from './players/mkv-player'` | `from './players/mkv-player'` (unchanged) |
| `simple-player.ts` | `from '@/types'` | `from '../types'` |
| `mkv-player.ts` | `from '@/types'` | `from '../types'` |
| `subtitle-manager.ts` | `from '@/types'` | `from '../types'` |
| etc. | Pattern: `@/types` → relative | Adjust based on directory depth |

### 2.3 Make FFmpeg CDN configurable

Add to `packages/lightbird/src/config.ts`:

```ts
export interface LightBirdConfig {
  ffmpegCDN?: string
}

let config: LightBirdConfig = {}

export function configureLightBird(options: LightBirdConfig): void {
  config = { ...config, ...options }
}

export function getConfig(): LightBirdConfig {
  return config
}
```

Update `ffmpeg-singleton.ts` to read from config:

```ts
import { getConfig } from '../config'

const defaultCDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

// Use config.ffmpegCDN if set, otherwise default
const cdnBase = getConfig().ffmpegCDN || defaultCDN
```

### 2.4 Main entry point

**`packages/lightbird/src/index.ts`:**

```ts
// Configuration
export { configureLightBird } from './config'
export type { LightBirdConfig } from './config'

// Player factory + interface
export { createVideoPlayer } from './video-processor'
export type { VideoPlayer, ProcessedFile } from './video-processor'

// Individual players
export { SimplePlayer } from './players/simple-player'
export type { SimplePlayerFile } from './players/simple-player'
export { MKVPlayer, CancellationError } from './players/mkv-player'
export type { MKVPlayerFile } from './players/mkv-player'

// Subtitle pipeline
export { UniversalSubtitleManager } from './subtitles/subtitle-manager'
export { convertSrtToVtt } from './subtitles/subtitle-converter'
export { applySubtitleOffset } from './subtitles/subtitle-offset'
export { ASSRenderer } from './subtitles/ass-renderer'

// Parsers
export { parseChaptersFromFFmpegLog, parseVttChapters } from './parsers/chapter-parser'
export { parseM3U, exportM3U } from './parsers/m3u-parser'

// Utilities
export { parseMediaError, validateFile } from './utils/media-error'
export type { ParsedMediaError } from './utils/media-error'
export { extractVideoMetadata } from './utils/video-info'
export { captureVideoThumbnail } from './utils/video-thumbnail'
export { loadShortcuts, saveShortcuts, matchShortcut, DEFAULT_SHORTCUTS } from './utils/keyboard-shortcuts'
export type { ShortcutBinding } from './utils/keyboard-shortcuts'
export { ProgressEstimator } from './utils/progress-estimator'
export { getFFmpeg, resetFFmpeg } from './utils/ffmpeg-singleton'

// All types
export type {
  Chapter,
  PlaylistItem,
  Subtitle,
  SubtitleCue,
  AudioTrack,
  VideoFilters,
  VideoMetadata,
  AudioTrackMeta,
  SubtitleTrackMeta,
} from './types'
```

### 2.5 Package.json

See `06-build-config.md` for the full `package.json`. Key points:
- `name: "lightbird"`
- `version: "0.1.0"`
- FFmpeg in `optionalDependencies`
- React in `peerDependencies` with `"optional": true`
- `homepage` points to `https://lightbird.vercel.app/docs`

## Verification

After this phase:
- `packages/lightbird/src/` contains all library code
- All `"use client"` directives removed
- All imports use relative paths (no `@/`)
- `packages/lightbird/src/index.ts` exports the public API
- Files compile with `tsc --noEmit`

## What Does NOT Move

- `src/lib/utils.ts` (the `cn()` helper) — this is a Tailwind utility, goes to `@lightbird/ui`
- No hooks — those move in Phase 3
- No components — those move in Phase 4
