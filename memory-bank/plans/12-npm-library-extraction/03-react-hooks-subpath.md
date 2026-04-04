# Phase 3 — React Hooks Subpath (`lightbird/react`)

## Goal

Move 10 custom React hooks into `packages/lightbird/src/react/`, exposed as a subpath export (`lightbird/react`). Same npm package — no extra install. Just requires React as a peer dep.

## Critical Dependency: `useToast` Coupling

**Problem:** `use-subtitles.ts` currently imports `useToast` from `@/hooks/use-toast`. But `useToast` depends on Radix Toast types (`@/components/ui/toast`) — making it a UI concern. We cannot put `useToast` in `lightbird/react` without pulling in Radix deps, which defeats the purpose of a headless package.

**Solution:** Remove the `useToast` import from `use-subtitles.ts`. Instead, add an `onError` callback parameter that the consuming component can wire to any notification system. The `lightbird-player.tsx` component (in `@lightbird/ui`) will pass `toast(...)` as the callback.

**Change in `use-subtitles.ts`:**
```ts
// BEFORE:
import { useToast } from "@/hooks/use-toast";
// ... inside hook:
toast({ title: "...", variant: "destructive" });

// AFTER:
// Accept optional onError callback
export function useSubtitles(options?: { onError?: (message: string) => void }) {
  // ... where toast was called:
  options?.onError?.("Failed to load subtitle");
}
```

**Change in `lightbird-player.tsx` (in @lightbird/ui):**
```ts
const { toast } = useToast();
const subtitles = useSubtitles({
  onError: (msg) => toast({ title: msg, variant: "destructive" }),
});
```

This cleanly separates the hook from the UI notification system.

## What Moves (10 hooks)

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
| `src/hooks/use-toast.ts` | `packages/ui/src/hooks/use-toast.ts` | Depends on Radix Toast types |

## Code Changes Required

### 3.1 Remove `"use client"` directives

All 11 hooks have `"use client"`. Remove from all.

### 3.2 Exact Import Remapping — Every File

**`use-video-playback.ts`** (destination: `src/react/use-video-playback.ts`)
```
import { useState, useEffect, useCallback, RefObject } from "react";
```
No `@/` imports. No changes needed.

**`use-video-filters.ts`** (destination: `src/react/use-video-filters.ts`)
```
import { useState, useEffect, useRef, RefObject } from "react";  (unchanged)

OLD: import type { VideoFilters } from "@/types";
NEW: import type { VideoFilters } from "../types";
```

**`use-subtitles.ts`** (destination: `src/react/use-subtitles.ts`)
```
import { useState, useRef, useCallback, useEffect } from "react";  (unchanged)

OLD: import type { Subtitle } from "@/types";
NEW: import type { Subtitle } from "../types";

OLD: import { UniversalSubtitleManager } from "@/lib/subtitle-manager";
NEW: import { UniversalSubtitleManager } from "../subtitles/subtitle-manager";

REMOVE: import { useToast } from "@/hooks/use-toast";
(Replace toast calls with onError callback — see "Critical Dependency" section above)
```

**`use-playlist.ts`** (destination: `src/react/use-playlist.ts`)
```
import { useState, useCallback, useEffect, useRef } from "react";  (unchanged)

OLD: import type { PlaylistItem } from "@/types";
NEW: import type { PlaylistItem } from "../types";
```

**`use-keyboard-shortcuts.ts`** (destination: `src/react/use-keyboard-shortcuts.ts`)
```
import { useEffect } from "react";  (unchanged)

OLD: import { isInteractiveElement, matchesShortcut } from "@/lib/keyboard-shortcuts";
NEW: import { isInteractiveElement, matchesShortcut } from "../utils/keyboard-shortcuts";

OLD: import type { ShortcutBinding, ShortcutAction } from "@/lib/keyboard-shortcuts";
NEW: import type { ShortcutBinding, ShortcutAction } from "../utils/keyboard-shortcuts";
```

**`use-fullscreen.ts`** (destination: `src/react/use-fullscreen.ts`)
```
import { useState, useEffect, useCallback, RefObject } from "react";
```
No `@/` imports. No changes needed.

**`use-picture-in-picture.ts`** (destination: `src/react/use-picture-in-picture.ts`)
```
import { useState, useEffect, useCallback, RefObject } from "react";
```
No `@/` imports. No changes needed.

**`use-progress-persistence.ts`** (destination: `src/react/use-progress-persistence.ts`)
```
import { useEffect, RefObject } from "react";
```
No `@/` imports. No changes needed.

**`use-video-info.ts`** (destination: `src/react/use-video-info.ts`)
```
import { useState, useEffect, useCallback, type RefObject } from "react";  (unchanged)

OLD: import type { VideoMetadata } from "@/types";
NEW: import type { VideoMetadata } from "../types";

OLD: import { extractNativeMetadata } from "@/lib/video-info";
NEW: import { extractNativeMetadata } from "../utils/video-info";
```

**`use-media-session.ts`** (destination: `src/react/use-media-session.ts`)
```
import { useEffect } from "react";
```
No `@/` imports. No changes needed.

**`use-chapters.ts`** (destination: `src/react/use-chapters.ts`)
```
import { useState, useEffect, useCallback, type RefObject } from "react";  (unchanged)

OLD: import type { Chapter } from "@/types";
NEW: import type { Chapter } from "../types";

OLD: import type { VideoPlayer } from "@/lib/video-processor";
NEW: import type { VideoPlayer } from "../video-processor";
```

### 3.3 Entry point

**`packages/lightbird/src/react/index.ts`:**

```ts
export { useVideoPlayback } from './use-video-playback'
export { useVideoFilters } from './use-video-filters'
export { useSubtitles } from './use-subtitles'
export { usePlaylist } from './use-playlist'
export { useKeyboardShortcuts } from './use-keyboard-shortcuts'
export type { ShortcutHandlers } from './use-keyboard-shortcuts'
export { useFullscreen } from './use-fullscreen'
export { usePictureInPicture } from './use-picture-in-picture'
export { useProgressPersistence } from './use-progress-persistence'
export { useVideoInfo } from './use-video-info'
export { useMediaSession } from './use-media-session'
export type { UseMediaSessionOptions } from './use-media-session'
export { useChapters } from './use-chapters'
```

### 3.4 Subpath export in package.json

In `packages/lightbird/package.json`:
```json
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./react": {
      "import": { "types": "./dist/react/index.d.ts", "default": "./dist/react/index.js" },
      "require": { "types": "./dist/react/index.d.cts", "default": "./dist/react/index.cjs" }
    }
  }
}
```

### 3.5 React as optional peer dep

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  }
}
```

## Verification

After this phase:
- 11 hooks live in `packages/lightbird/src/react/`
- `use-subtitles.ts` no longer imports `useToast` — uses `onError` callback instead
- All `@/` imports replaced with exact relative paths as listed above
- All `"use client"` directives removed
- `tsc --noEmit` passes
- `use-toast.ts` is NOT in this package (goes to UI in Phase 4)
