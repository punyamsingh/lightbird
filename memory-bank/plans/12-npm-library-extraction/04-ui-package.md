# Phase 4 — UI Package (`@lightbird/ui`)

## Goal

Extract all styled React components into `packages/ui/`, published as `@lightbird/ui`. This is the "drop it in and it works" package for React developers who want the full LightBird experience.

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

### ShadCN UI primitives (only the ones actually used)

| Source | Destination | Used by |
|--------|-------------|---------|
| `src/components/ui/button.tsx` | `packages/ui/src/primitives/button.tsx` | PlayerControls, PlaylistPanel |
| `src/components/ui/slider.tsx` | `packages/ui/src/primitives/slider.tsx` | PlayerControls (volume, seek) |
| `src/components/ui/popover.tsx` | `packages/ui/src/primitives/popover.tsx` | PlayerControls (chapters, audio) |
| `src/components/ui/dialog.tsx` | `packages/ui/src/primitives/dialog.tsx` | ShortcutSettingsDialog |
| `src/components/ui/tooltip.tsx` | `packages/ui/src/primitives/tooltip.tsx` | PlayerControls |
| `src/components/ui/scroll-area.tsx` | `packages/ui/src/primitives/scroll-area.tsx` | PlaylistPanel |
| `src/components/ui/select.tsx` | `packages/ui/src/primitives/select.tsx` | PlayerControls (speed, audio track) |
| `src/components/ui/badge.tsx` | `packages/ui/src/primitives/badge.tsx` | PlaylistPanel (duration) |
| `src/components/ui/toast.tsx` | `packages/ui/src/primitives/toast.tsx` | Toaster |
| `src/components/ui/toaster.tsx` | `packages/ui/src/primitives/toaster.tsx` | LightBirdPlayer |
| `src/components/ui/progress.tsx` | `packages/ui/src/primitives/progress.tsx` | VideoOverlay |
| `src/components/ui/separator.tsx` | `packages/ui/src/primitives/separator.tsx` | If used |

### UI-specific hooks and utils

| Source | Destination |
|--------|-------------|
| `src/hooks/use-toast.ts` | `packages/ui/src/hooks/use-toast.ts` |
| `src/lib/utils.ts` (the `cn()` function) | `packages/ui/src/utils/cn.ts` |

## Code Changes Required

### 4.1 Update imports to use `lightbird` and `lightbird/react`

This is the biggest change. All component files currently import from `@/lib/*` and `@/hooks/*`. These become external package imports:

**Core imports:**

| Old | New |
|-----|-----|
| `from '@/lib/video-processor'` | `from 'lightbird'` |
| `from '@/lib/players/mkv-player'` | `from 'lightbird'` |
| `from '@/lib/media-error'` | `from 'lightbird'` |
| `from '@/lib/keyboard-shortcuts'` | `from 'lightbird'` |
| `from '@/lib/video-thumbnail'` | `from 'lightbird'` |
| `from '@/lib/progress-estimator'` | `from 'lightbird'` |
| `from '@/types'` | `from 'lightbird'` |

**Hook imports:**

| Old | New |
|-----|-----|
| `from '@/hooks/use-video-playback'` | `from 'lightbird/react'` |
| `from '@/hooks/use-subtitles'` | `from 'lightbird/react'` |
| `from '@/hooks/use-playlist'` | `from 'lightbird/react'` |
| `from '@/hooks/use-video-filters'` | `from 'lightbird/react'` |
| `from '@/hooks/use-fullscreen'` | `from 'lightbird/react'` |
| `from '@/hooks/use-picture-in-picture'` | `from 'lightbird/react'` |
| `from '@/hooks/use-keyboard-shortcuts'` | `from 'lightbird/react'` |
| `from '@/hooks/use-progress-persistence'` | `from 'lightbird/react'` |
| `from '@/hooks/use-video-info'` | `from 'lightbird/react'` |
| `from '@/hooks/use-media-session'` | `from 'lightbird/react'` |
| `from '@/hooks/use-chapters'` | `from 'lightbird/react'` |

**Internal imports (within the ui package):**

| Old | New |
|-----|-----|
| `from '@/components/player-controls'` | `from './player-controls'` |
| `from '@/components/playlist-panel'` | `from './playlist-panel'` |
| `from '@/components/ui/button'` | `from './primitives/button'` |
| `from '@/lib/utils'` | `from './utils/cn'` |
| `from '@/hooks/use-toast'` | `from './hooks/use-toast'` |

### 4.2 Keep `"use client"` in entry point

The main `index.ts` needs a `"use client"` banner so Next.js consumers don't have to wrap every import. tsup supports this via the `banner` option:

```ts
// tsup.config.ts
banner: { js: '"use client";' }
```

### 4.3 Entry point

**`packages/ui/src/index.ts`:**

```ts
// Full drop-in player
export { default as LightBirdPlayer } from './lightbird-player'

// Individual components (for custom layouts)
export { default as PlayerControls } from './player-controls'
export type { PlayerControlsProps } from './player-controls'
export { default as PlaylistPanel } from './playlist-panel'
export type { PlaylistPanelProps } from './playlist-panel'
export { VideoOverlay } from './video-overlay'
export { SubtitleOverlay } from './subtitle-overlay'
export { PlayerErrorDisplay } from './player-error-display'
export { PlayerErrorBoundary } from './player-error-boundary'
export { VideoInfoPanel } from './video-info-panel'
export { ShortcutSettingsDialog } from './shortcut-settings-dialog'

// Toaster (needed at app root for toast notifications)
export { Toaster } from './primitives/toaster'
```

### 4.4 Audit which ShadCN components are actually used

Before moving, grep every `src/components/ui/*.tsx` to confirm which ones are imported by player components. Any that are only used in unused pages (if any) get left behind or deleted.

Likely unused (carried over from initial ShadCN setup):
- `alert.tsx` — check if used
- `card.tsx` — check if used
- `checkbox.tsx` — check if used
- `collapsible.tsx` — check if used
- `form.tsx` — check if used
- `input.tsx` — check if used (maybe in stream URL input?)
- `label.tsx` — check if used
- `radio-group.tsx` — check if used
- `sheet.tsx` — check if used
- `sidebar.tsx` — check if used
- `skeleton.tsx` — check if used
- `switch.tsx` — check if used
- `table.tsx` — check if used
- `textarea.tsx` — check if used

Only move what's actually imported.

## CSS Strategy

### Option A: Tailwind content path (recommended)

User adds to their `tailwind.config.ts`:

```ts
content: [
  './src/**/*.{ts,tsx}',
  './node_modules/@lightbird/ui/dist/**/*.js',  // add this
]
```

LightBird components pick up the user's Tailwind theme (colors, fonts, etc.). Looks native to their app.

### Option B: Pre-compiled CSS

We generate `packages/ui/dist/styles.css` during the build — a CSS file with all Tailwind classes used by our components pre-compiled with a default dark theme.

User imports it:
```tsx
import '@lightbird/ui/styles.css'
import { LightBirdPlayer } from '@lightbird/ui'
```

Zero config but fixed styling.

### Build both options

tsup + Tailwind CLI can generate the CSS file. Document both approaches in the README.

## Package Dependencies

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@tanstack/react-virtual": "^3.13.21",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "tailwind-merge": "^3.0.1"
  },
  "peerDependencies": {
    "lightbird": "^0.1.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

Note: Tailwind is NOT a runtime dependency. It's a build-time tool. Users configure it in their project. We provide the pre-compiled CSS as an alternative.

## Verification

After this phase:
- `packages/ui/src/` contains all player components + used ShadCN primitives
- All imports point to `lightbird`, `lightbird/react`, or relative paths
- `packages/ui/src/index.ts` exports the public API
- `tsc --noEmit` passes
- No unused ShadCN components remain
