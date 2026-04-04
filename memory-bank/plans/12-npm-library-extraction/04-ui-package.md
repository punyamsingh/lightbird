# Phase 4 — UI Package (`@lightbird/ui`)

## Goal

Extract all styled React components into `packages/ui/`, published as `@lightbird/ui`. Drop-in player for React developers.

## What Moves

### Player components

| Source | Destination |
|--------|-------------|
| `src/components/lightbird-player.tsx` | `packages/ui/src/lightbird-player.tsx` |
| `src/components/player-controls.tsx` | `packages/ui/src/player-controls.tsx` |
| `src/components/playlist-panel.tsx` | `packages/ui/src/playlist-panel.tsx` |
| `src/components/video-overlay.tsx` | `packages/ui/src/video-overlay.tsx` |
| `src/components/subtitle-overlay.tsx` | `packages/ui/src/subtitle-overlay.tsx` |
| `src/components/player-error-display.tsx` | `packages/ui/src/player-error-display.tsx` |
| `src/components/player-error-boundary.tsx` | `packages/ui/src/player-error-boundary.tsx` |
| `src/components/video-info-panel.tsx` | `packages/ui/src/video-info-panel.tsx` |
| `src/components/shortcut-settings-dialog.tsx` | `packages/ui/src/shortcut-settings-dialog.tsx` |

### ShadCN UI primitives — DEFINITIVE LIST of what's used

Audited by grepping every player component. Only these 12 are imported:

| Component file | Used by | Move to |
|---------------|---------|---------|
| `ui/button.tsx` | player-controls, playlist-panel, player-error-display, shortcut-settings-dialog | `packages/ui/src/primitives/button.tsx` |
| `ui/slider.tsx` | player-controls | `packages/ui/src/primitives/slider.tsx` |
| `ui/popover.tsx` | player-controls | `packages/ui/src/primitives/popover.tsx` |
| `ui/tooltip.tsx` | player-controls, playlist-panel | `packages/ui/src/primitives/tooltip.tsx` |
| `ui/label.tsx` | player-controls | `packages/ui/src/primitives/label.tsx` |
| `ui/radio-group.tsx` | player-controls | `packages/ui/src/primitives/radio-group.tsx` |
| `ui/scroll-area.tsx` | playlist-panel | `packages/ui/src/primitives/scroll-area.tsx` |
| `ui/input.tsx` | playlist-panel | `packages/ui/src/primitives/input.tsx` |
| `ui/select.tsx` | playlist-panel | `packages/ui/src/primitives/select.tsx` |
| `ui/dialog.tsx` | shortcut-settings-dialog | `packages/ui/src/primitives/dialog.tsx` |
| `ui/toaster.tsx` | layout.tsx (app root) | `packages/ui/src/primitives/toaster.tsx` |
| `ui/toast.tsx` | imported by toaster.tsx and use-toast.ts | `packages/ui/src/primitives/toast.tsx` |

### ShadCN UI primitives — DELETE (unused by any player component)

These 14 files are NOT imported by any player component and should be deleted:
- `ui/alert.tsx`
- `ui/badge.tsx`
- `ui/card.tsx`
- `ui/checkbox.tsx`
- `ui/collapsible.tsx`
- `ui/form.tsx`
- `ui/progress.tsx`
- `ui/separator.tsx`
- `ui/sheet.tsx`
- `ui/sidebar.tsx`
- `ui/skeleton.tsx`
- `ui/switch.tsx`
- `ui/table.tsx`
- `ui/textarea.tsx`

### UI-specific hooks and utils

| Source | Destination |
|--------|-------------|
| `src/hooks/use-toast.ts` | `packages/ui/src/hooks/use-toast.ts` |
| `src/lib/utils.ts` | `packages/ui/src/utils/cn.ts` |

## Code Changes Required

### 4.1 Exact Import Remapping — Every Component File

**`lightbird-player.tsx`** (destination: `packages/ui/src/lightbird-player.tsx`)
```
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";  (unchanged)

OLD: import type { PlaylistItem, AudioTrack } from "@/types";
NEW: import type { PlaylistItem, AudioTrack } from "lightbird";

OLD: import { cn } from "@/lib/utils";
NEW: import { cn } from "./utils/cn";

OLD: import PlayerControls from "@/components/player-controls";
NEW: import PlayerControls from "./player-controls";

OLD: import PlaylistPanel, { type PlaylistSize } from "@/components/playlist-panel";
NEW: import PlaylistPanel, { type PlaylistSize } from "./playlist-panel";

OLD: import { VideoOverlay } from "@/components/video-overlay";
NEW: import { VideoOverlay } from "./video-overlay";

OLD: import { PlayerErrorDisplay } from "@/components/player-error-display";
NEW: import { PlayerErrorDisplay } from "./player-error-display";

OLD: import { VideoInfoPanel } from "@/components/video-info-panel";
NEW: import { VideoInfoPanel } from "./video-info-panel";

OLD: import { ShortcutSettingsDialog } from "@/components/shortcut-settings-dialog";
NEW: import { ShortcutSettingsDialog } from "./shortcut-settings-dialog";

OLD: import { useToast } from "@/hooks/use-toast";
NEW: import { useToast } from "./hooks/use-toast";

OLD: import { createVideoPlayer, type VideoPlayer } from "@/lib/video-processor";
NEW: import { createVideoPlayer, type VideoPlayer } from "lightbird";

OLD: import { CancellationError } from "@/lib/players/mkv-player";
NEW: import { CancellationError } from "lightbird";

OLD: import { useVideoPlayback } from "@/hooks/use-video-playback";
NEW: import { useVideoPlayback } from "lightbird/react";

OLD: import { useVideoFilters } from "@/hooks/use-video-filters";
NEW: import { useVideoFilters } from "lightbird/react";

OLD: import { useSubtitles } from "@/hooks/use-subtitles";
NEW: import { useSubtitles } from "lightbird/react";

OLD: import { usePlaylist } from "@/hooks/use-playlist";
NEW: import { usePlaylist } from "lightbird/react";

OLD: import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
NEW: import { useKeyboardShortcuts } from "lightbird/react";

OLD: import { useFullscreen } from "@/hooks/use-fullscreen";
NEW: import { useFullscreen } from "lightbird/react";

OLD: import { usePictureInPicture } from "@/hooks/use-picture-in-picture";
NEW: import { usePictureInPicture } from "lightbird/react";

OLD: import { useProgressPersistence } from "@/hooks/use-progress-persistence";
NEW: import { useProgressPersistence } from "lightbird/react";

OLD: import { useVideoInfo } from "@/hooks/use-video-info";
NEW: import { useVideoInfo } from "lightbird/react";

OLD: import { useMediaSession } from "@/hooks/use-media-session";
NEW: import { useMediaSession } from "lightbird/react";

OLD: import { useChapters } from "@/hooks/use-chapters";
NEW: import { useChapters } from "lightbird/react";

OLD: import { captureVideoThumbnail } from "@/lib/video-thumbnail";
NEW: import { captureVideoThumbnail } from "lightbird";

OLD: import { parseMediaError, validateFile, type ParsedMediaError } from "@/lib/media-error";
NEW: import { parseMediaError, validateFile, type ParsedMediaError } from "lightbird";

OLD: import { loadShortcuts } from "@/lib/keyboard-shortcuts";
NEW: import { loadShortcuts } from "lightbird";

OLD: import type { ShortcutBinding } from "@/lib/keyboard-shortcuts";
NEW: import type { ShortcutBinding } from "lightbird";

OLD: import { ProgressEstimator } from "@/lib/progress-estimator";
NEW: import { ProgressEstimator } from "lightbird";

OLD: import { SubtitleOverlay } from "@/components/subtitle-overlay";
NEW: import { SubtitleOverlay } from "./subtitle-overlay";
```

Also update the `useSubtitles` call to pass `onError` callback (see Phase 3):
```ts
const { toast } = useToast();
const subtitles = useSubtitles({
  onError: (msg) => toast({ title: msg, variant: "destructive" }),
});
```

**`player-controls.tsx`** (destination: `packages/ui/src/player-controls.tsx`)
```
import React, { useMemo, useState } from "react";  (unchanged)

OLD: import type { Subtitle, VideoFilters, AudioTrack, Chapter } from "@/types";
NEW: import type { Subtitle, VideoFilters, AudioTrack, Chapter } from "lightbird";

OLD: import { Slider } from "@/components/ui/slider";
NEW: import { Slider } from "./primitives/slider";

OLD: import { Button } from "@/components/ui/button";
NEW: import { Button } from "./primitives/button";

OLD: import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
NEW: import { Popover, PopoverContent, PopoverTrigger } from "./primitives/popover";

OLD: import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
NEW: import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./primitives/tooltip";

OLD: import { Label } from "@/components/ui/label";
NEW: import { Label } from "./primitives/label";

import { ... } from "lucide-react";  (unchanged — external dep)

OLD: import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
NEW: import { RadioGroup, RadioGroupItem } from "./primitives/radio-group";

OLD: import { cn } from "@/lib/utils";
NEW: import { cn } from "./utils/cn";
```

**`playlist-panel.tsx`** (destination: `packages/ui/src/playlist-panel.tsx`)
```
import React, { useRef, useState } from "react";  (unchanged)

OLD: import type { PlaylistItem } from "@/types";
NEW: import type { PlaylistItem } from "lightbird";

import { DndContext, ... } from "@dnd-kit/core";  (unchanged)
import { SortableContext, ... } from "@dnd-kit/sortable";  (unchanged)
import { CSS } from "@dnd-kit/utilities";  (unchanged)

OLD: import { ScrollArea } from "@/components/ui/scroll-area";
NEW: import { ScrollArea } from "./primitives/scroll-area";

OLD: import { Button } from "@/components/ui/button";
NEW: import { Button } from "./primitives/button";

OLD: import { Input } from "@/components/ui/input";
NEW: import { Input } from "./primitives/input";

OLD: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
NEW: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./primitives/select";

OLD: import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
NEW: import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./primitives/tooltip";

OLD: import { cn } from "@/lib/utils";
NEW: import { cn } from "./utils/cn";

import { ... } from "lucide-react";  (unchanged)

OLD: import { exportPlaylist, parseM3U8 } from "@/lib/m3u-parser";
NEW: import { exportPlaylist, parseM3U8 } from "lightbird";
```

**`video-overlay.tsx`** (destination: `packages/ui/src/video-overlay.tsx`)
```
import React from "react";
```
No `@/` imports. No changes needed.

**`subtitle-overlay.tsx`** (destination: `packages/ui/src/subtitle-overlay.tsx`)
```
import { useState, useEffect, type RefObject } from "react";
```
No `@/` imports. No changes needed.

**`player-error-display.tsx`** (destination: `packages/ui/src/player-error-display.tsx`)
```
import { AlertCircle } from "lucide-react";  (unchanged)

OLD: import { Button } from "@/components/ui/button";
NEW: import { Button } from "./primitives/button";

OLD: import type { ParsedMediaError } from "@/lib/media-error";
NEW: import type { ParsedMediaError } from "lightbird";
```

**`player-error-boundary.tsx`** (destination: `packages/ui/src/player-error-boundary.tsx`)
```
import { Component, type ReactNode } from "react";
```
No `@/` imports. No changes needed. (Note: this is a React class component, not a function component. Works fine with tsup bundling.)

**`video-info-panel.tsx`** (destination: `packages/ui/src/video-info-panel.tsx`)
```
import React from "react";  (unchanged)

OLD: import type { VideoMetadata } from "@/types";
NEW: import type { VideoMetadata } from "lightbird";

import { X } from "lucide-react";  (unchanged)
```

**`shortcut-settings-dialog.tsx`** (destination: `packages/ui/src/shortcut-settings-dialog.tsx`)
```
import React, { useState, useEffect } from "react";  (unchanged)

OLD: import { DEFAULT_SHORTCUTS, saveShortcuts, formatShortcutKey, matchesShortcut } from "@/lib/keyboard-shortcuts";
NEW: import { DEFAULT_SHORTCUTS, saveShortcuts, formatShortcutKey, matchesShortcut } from "lightbird";

OLD: import type { ShortcutBinding, ShortcutAction } from "@/lib/keyboard-shortcuts";
NEW: import type { ShortcutBinding, ShortcutAction } from "lightbird";

OLD: import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
NEW: import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./primitives/dialog";

OLD: import { Button } from "@/components/ui/button";
NEW: import { Button } from "./primitives/button";

OLD: import { useToast } from "@/hooks/use-toast";
NEW: import { useToast } from "./hooks/use-toast";
```

### 4.2 ShadCN Primitive Import Updates

Each ShadCN primitive file (button.tsx, slider.tsx, etc.) imports from:
- `@radix-ui/*` — unchanged (external deps)
- `@/lib/utils` (the `cn` function) — change to `../utils/cn`
- `class-variance-authority` — unchanged (external dep)
- `lucide-react` — unchanged (external dep)

For every file in `packages/ui/src/primitives/`:
```
OLD: import { cn } from "@/lib/utils"
NEW: import { cn } from "../utils/cn"
```

### 4.3 `use-toast.ts` import update

```
OLD: import type { ToastActionElement, ToastProps } from "@/components/ui/toast"
NEW: import type { ToastActionElement, ToastProps } from "../primitives/toast"
```

### 4.4 `"use client"` handling

Remove `"use client"` from all source files. Instead, tsup adds it as a banner to all output chunks:

```ts
// tsup.config.ts
banner: { js: '"use client";' }
```

This way every chunk has the directive and Next.js consumers never need to wrap imports.

### 4.5 Entry point

**`packages/ui/src/index.ts`:**

```ts
// Full drop-in player
export { default as LightBirdPlayer } from './lightbird-player'

// Individual components (for custom layouts)
export { default as PlayerControls } from './player-controls'
export { default as PlaylistPanel } from './playlist-panel'
export { VideoOverlay } from './video-overlay'
export { SubtitleOverlay } from './subtitle-overlay'
export { PlayerErrorDisplay } from './player-error-display'
export { PlayerErrorBoundary } from './player-error-boundary'
export { VideoInfoPanel } from './video-info-panel'
export { ShortcutSettingsDialog } from './shortcut-settings-dialog'

// Toaster (user adds to app root for toast notifications)
export { Toaster } from './primitives/toaster'
```

## CSS Strategy

### Option A: Tailwind content path (recommended)

User adds to their `tailwind.config.ts`:
```ts
content: [
  './src/**/*.{ts,tsx}',
  './node_modules/@lightbird/ui/dist/**/*.js',
]
```

### Option B: Pre-compiled CSS

Import `@lightbird/ui/styles.css` for zero-config dark theme.

### Build both — see `06-build-config.md` for details.

## Verification

After this phase:
- `packages/ui/src/` contains 9 player components + 12 ShadCN primitives + use-toast + cn
- All imports point to `lightbird`, `lightbird/react`, or relative paths
- No `@/` aliases remain
- 14 unused ShadCN component files deleted
- `tsc --noEmit` passes
