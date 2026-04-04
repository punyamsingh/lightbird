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

## What Does NOT Move Here

- `src/lib/utils.ts` (the `cn()` helper) — Tailwind utility, goes to `@lightbird/ui` (Phase 4)
- No hooks — those move in Phase 3
- No components — those move in Phase 4

## Code Changes Required

### 2.1 Remove `"use client"` directives

Remove from these files (they currently have it):
- `video-processor.ts`
- `players/simple-player.ts`
- `players/mkv-player.ts`
- `ffmpeg-singleton.ts`
- `subtitle-converter.ts`
- `subtitle-manager.ts`
- `subtitle-offset.ts`
- `ass-renderer.ts`
- `chapter-parser.ts`
- `m3u-parser.ts`

These files do NOT have `"use client"` (no change needed):
- `workers/ffmpeg-worker.ts`
- `media-error.ts`
- `video-info.ts`
- `video-thumbnail.ts`
- `keyboard-shortcuts.ts`
- `progress-estimator.ts`
- `types/index.ts`

### 2.2 Exact Import Remapping — Every File

Each file's current imports and what they become:

**`video-processor.ts`** (destination: `src/video-processor.ts`)
```
OLD: import { SimplePlayer, type SimplePlayerFile } from './players/simple-player';
NEW: import { SimplePlayer, type SimplePlayerFile } from './players/simple-player';  (unchanged — same relative path)

OLD: import { MKVPlayer, type MKVPlayerFile } from './players/mkv-player';
NEW: import { MKVPlayer, type MKVPlayerFile } from './players/mkv-player';  (unchanged)

OLD: import type { AudioTrack, Subtitle, Chapter } from "@/types";
NEW: import type { AudioTrack, Subtitle, Chapter } from "./types";
```

**`players/simple-player.ts`** (destination: `src/players/simple-player.ts`)
```
OLD: import type { AudioTrack, Subtitle } from "@/types";
NEW: import type { AudioTrack, Subtitle } from "../types";
```

**`players/mkv-player.ts`** (destination: `src/players/mkv-player.ts`)
```
OLD: import type { AudioTrack, Subtitle, Chapter } from "@/types";
NEW: import type { AudioTrack, Subtitle, Chapter } from "../types";

OLD: import { SubtitleConverter } from "@/lib/subtitle-converter";
NEW: import { SubtitleConverter } from "../subtitles/subtitle-converter";

OLD: import { parseChaptersFromFFmpegLog } from "@/lib/chapter-parser";
NEW: import { parseChaptersFromFFmpegLog } from "../parsers/chapter-parser";

OLD: import type { WorkerInbound, WorkerOutbound } from "@/lib/workers/ffmpeg-worker";
NEW: import type { WorkerInbound, WorkerOutbound } from "../workers/ffmpeg-worker";
```

**`workers/ffmpeg-worker.ts`** (destination: `src/workers/ffmpeg-worker.ts`)
```
import { FFmpeg } from '@ffmpeg/ffmpeg';         (unchanged — external dep)
import { toBlobURL, fetchFile } from '@ffmpeg/util';  (unchanged — external dep)
```
No `@/` imports. No changes needed beyond removing `"use client"` if present (it's not).

**`ffmpeg-singleton.ts`** (destination: `src/utils/ffmpeg-singleton.ts`)
```
import { FFmpeg } from '@ffmpeg/ffmpeg';     (unchanged — external dep)
import { toBlobURL } from '@ffmpeg/util';    (unchanged — external dep)
```
No `@/` imports. Add config import (see 2.3).

**`subtitle-converter.ts`** (destination: `src/subtitles/subtitle-converter.ts`)
```
No imports at all. Only remove "use client".
```

**`subtitle-manager.ts`** (destination: `src/subtitles/subtitle-manager.ts`)
```
OLD: import type { Subtitle, SubtitleCue } from "@/types";
NEW: import type { Subtitle, SubtitleCue } from "../types";

OLD: import { SubtitleConverter } from "./subtitle-converter";
NEW: import { SubtitleConverter } from "./subtitle-converter";  (unchanged — same directory)

OLD: import { applyOffsetToVtt, createOffsetVttUrl } from "./subtitle-offset";
NEW: import { applyOffsetToVtt, createOffsetVttUrl } from "./subtitle-offset";  (unchanged)

KEEP AS-IS: const chardet = require("chardet") as typeof import("chardet");
```
**Note:** `chardet` uses CommonJS `require()`. This works in Node and in bundlers but needs `esModuleInterop: true` in tsconfig (already set in our base config). tsup handles this correctly.

**`subtitle-offset.ts`** (destination: `src/subtitles/subtitle-offset.ts`)
```
No imports at all. Only remove "use client".
```

**`ass-renderer.ts`** (destination: `src/subtitles/ass-renderer.ts`)
```
import { compile, type CompiledASS, type Dialogue, type CompiledASSStyle } from 'ass-compiler';
(unchanged — external dep)
```
No `@/` imports.

**`chapter-parser.ts`** (destination: `src/parsers/chapter-parser.ts`)
```
OLD: import type { Chapter } from "@/types";
NEW: import type { Chapter } from "../types";
```

**`m3u-parser.ts`** (destination: `src/parsers/m3u-parser.ts`)
```
OLD: import type { PlaylistItem } from "@/types";
NEW: import type { PlaylistItem } from "../types";
```

**`media-error.ts`** (destination: `src/utils/media-error.ts`)
```
No imports at all. No changes needed.
```

**`video-info.ts`** (destination: `src/utils/video-info.ts`)
```
OLD: import type { VideoMetadata } from "@/types";
NEW: import type { VideoMetadata } from "../types";
```

**`video-thumbnail.ts`** (destination: `src/utils/video-thumbnail.ts`)
```
No imports at all. No changes needed.
```

**`keyboard-shortcuts.ts`** (destination: `src/utils/keyboard-shortcuts.ts`)
```
No imports at all. No changes needed.
```

**`progress-estimator.ts`** (destination: `src/utils/progress-estimator.ts`)
```
No imports at all. No changes needed.
```

**`types/index.ts`** (destination: `src/types/index.ts`)
```
No imports at all. No changes needed.
```

### 2.3 Make FFmpeg CDN configurable

Create new file `packages/lightbird/src/config.ts`:

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

Update `utils/ffmpeg-singleton.ts` to read from config:

```ts
import { getConfig } from '../config'

const defaultCDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

// Inside getFFmpeg(), use:
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
export { SubtitleConverter } from './subtitles/subtitle-converter'
export { applyOffsetToVtt, createOffsetVttUrl } from './subtitles/subtitle-offset'
export { ASSRenderer } from './subtitles/ass-renderer'

// Parsers
export { parseChaptersFromFFmpegLog, parseChaptersFromVtt } from './parsers/chapter-parser'
export { exportPlaylist, parseM3U8 } from './parsers/m3u-parser'

// Utilities
export { parseMediaError, validateFile } from './utils/media-error'
export type { ParsedMediaError, MediaErrorType } from './utils/media-error'
export { extractNativeMetadata } from './utils/video-info'
export { captureVideoThumbnail } from './utils/video-thumbnail'
export {
  loadShortcuts, saveShortcuts, matchesShortcut, isInteractiveElement,
  formatShortcutKey, DEFAULT_SHORTCUTS
} from './utils/keyboard-shortcuts'
export type { ShortcutBinding, ShortcutAction } from './utils/keyboard-shortcuts'
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

**IMPORTANT:** The export names above match the ACTUAL function/class names in the source files:
- `SubtitleConverter` (class with static methods), NOT `convertSrtToVtt`
- `applyOffsetToVtt` and `createOffsetVttUrl`, NOT `applySubtitleOffset`
- `extractNativeMetadata`, NOT `extractVideoMetadata`
- `matchesShortcut` and `isInteractiveElement`, NOT `matchShortcut`
- `exportPlaylist` and `parseM3U8`, NOT `parseM3U` and `exportM3U`
- `parseChaptersFromVtt`, NOT `parseVttChapters`

### 2.5 Package.json

See `06-build-config.md` for the full `package.json`. Key points:
- `name: "lightbird"`
- `version: "0.1.0"`
- FFmpeg in `optionalDependencies`
- React in `peerDependencies` with `"optional": true`
- `homepage` points to `https://lightbird.vercel.app/docs`

## Verification

After this phase:
- `packages/lightbird/src/` contains all 17 library files + types + config
- All `"use client"` directives removed from the 10 files that have them
- All `@/` imports replaced with exact relative paths as listed above
- `packages/lightbird/src/index.ts` exports the public API with correct names
- `tsc --noEmit` passes
- `chardet` require() works correctly with esModuleInterop
