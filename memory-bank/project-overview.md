# LightBird — Project Overview

> **Last updated:** 2026-03-13
> **Branch context:** Plans 01–06 implemented; Plans 08 (Keyboard Shortcut Customisation), 09 (Video Info Panel), and 10 (Codebase Cleanup) now also implemented. Media Session API plan (MS-01, MS-02) implemented.

---

## What is LightBird?

LightBird is a modern, lightweight, browser-based video player built with Next.js 15 and React 18. Its core value proposition is playing a wide range of video formats directly in the browser without server-side transcoding, including MKV files (planned via FFmpeg.wasm).

---

## Architecture

### Dual-Player System

| Player | Handles | Implementation |
|---|---|---|
| `SimplePlayer` | MP4, WebM, AVI, MOV, WMV, FLV, OGV | Native HTML5 `<video>` element |
| `MKVPlayer` | MKV | FFmpeg.wasm running in a **Web Worker** — probes streams, remuxes to fragmented MP4, extracts embedded subtitles; `destroy()` calls `worker.terminate()`; falls back to native on failure |

The factory function `createVideoPlayer(file)` in `src/lib/video-processor.ts` selects the right player based on file extension.

### Component Hierarchy

```
src/app/page.tsx
└── src/components/player-error-boundary.tsx  (React error boundary, Plan 05)
    └── src/components/lightbird-player.tsx   (thin coordinator)
        ├── src/components/player-controls.tsx
        ├── src/components/playlist-panel.tsx
        ├── src/components/video-overlay.tsx  (loading spinner overlay)
        └── src/components/player-error-display.tsx  (error overlay, Plan 05)
```

### Custom Hooks (added in Plan 03)

| Hook | Responsibility |
|---|---|
| `src/hooks/use-video-playback.ts` | Play/pause/seek/volume/rate state + video event listeners |
| `src/hooks/use-video-filters.ts` | Brightness/contrast/saturation/hue/zoom state + CSS application |
| `src/hooks/use-subtitles.ts` | Subtitle list, UniversalSubtitleManager lifecycle, add/remove/switch |
| `src/hooks/use-playlist.ts` | Playlist array, current index, file parsing, removeItem, reorderItems, addFiles, localStorage persistence |
| `src/hooks/use-keyboard-shortcuts.ts` | Keyboard event registration (Space/Arrows/M/F) |
| `src/hooks/use-fullscreen.ts` | Fullscreen enter/exit/detect |
| `src/hooks/use-progress-persistence.ts` | localStorage save (debounced 5s) and restore |
| `src/hooks/use-media-session.ts` | MediaSession API: metadata (title + artwork), hardware key handlers (play/pause/next/prev/seek) |

### Supporting Libraries

| File | Purpose |
|---|---|
| `src/lib/subtitle-converter.ts` | Converts SRT → VTT for browser playback |
| `src/lib/subtitle-manager.ts` | Manages `<track>` elements on the video element |
| `src/lib/players/simple-player.ts` | HTML5 player wrapper with subtitle support |
| `src/lib/players/mkv-player.ts` | MKV player — probes with FFmpeg, remuxes to MP4, extracts embedded subtitles |
| `src/lib/ffmpeg-singleton.ts` | Lazy-loaded shared FFmpeg.wasm instance (CDN fetch on first MKV load) |
| `src/types/index.ts` | Shared TypeScript interfaces (`id`, `duration` added to `PlaylistItem`) |
| `src/components/video-overlay.tsx` | Loading/processing overlay component |
| `src/lib/media-error.ts` | `parseMediaError` + `validateFile` (Plan 05) |
| `src/components/player-error-display.tsx` | Error overlay with Retry/Skip/Dismiss (Plan 05) |
| `src/components/player-error-boundary.tsx` | React class Error Boundary (Plan 05) |
| `src/lib/m3u-parser.ts` | M3U8 export and import parsing (Plan 06) |
| `src/lib/video-thumbnail.ts` | Captures a JPEG thumbnail frame from a video element (seek-and-draw) for MediaSession artwork |

---

## Current State

### What works
- MP4, WebM, and other HTML5-native formats play correctly.
- SRT subtitles are converted to VTT and loaded as `<track>` elements.
- External subtitle uploads (SRT/VTT) work via `UniversalSubtitleManager`.
- Playlist management (local files + stream URLs).
- Playback controls: play/pause, seek, volume, speed, fullscreen, screenshot, loop.
- Video filters: brightness, contrast, saturation, hue, zoom.
- Progress persistence via `localStorage`.
- Keyboard shortcuts for common actions.

### Known limitations / not yet implemented
- **MKV FFmpeg.wasm** — implemented (Plan 02); FFmpeg core loaded from unpkg CDN (~31 MB); for production, copy assets to `/public/ffmpeg/` to avoid CDN dependency.
- **Error handling implemented** — Plan 05 done; see `src/lib/media-error.ts`, `PlayerErrorDisplay`, `PlayerErrorBoundary`.
- **Playlist management implemented** — Plan 06 done; drag-and-drop reordering, M3U8 import/export, folder opening, and sorting.
- **No playlist persistence** — playlist is not persisted after page refresh (persist to localStorage if needed).
- **No advanced subtitle formats** — ASS/SSA not supported; no sync offset (Plan 07).
- **Keyboard shortcuts customisable** — registry in `src/lib/keyboard-shortcuts.ts`, persisted to localStorage, configurable via ShortcutSettingsDialog.
- **Video info panel added** — shows filename, size, duration, resolution, codec from native API (Plan 09 DONE).
- **Unused dependencies removed** — Firebase, Genkit, ReCharts uninstalled; `src/ai/` deleted (Plan 10 DONE).
- **Build errors re-enabled** — `next.config.ts` no longer suppresses TypeScript/ESLint errors (Plan 10 DONE).

---

## Test Suite (Plan 01 — DONE)

Tests were added as part of Plan 01. Run them with:

```bash
npm test              # all tests
npm run test:coverage # with coverage report
```

### Test files

| File | What it covers |
|---|---|
| `src/lib/__tests__/subtitle-converter.test.ts` | SRT→VTT conversion, edge cases |
| `src/lib/__tests__/video-processor.test.ts` | Player factory routing, VideoPlayer interface |
| `src/lib/__tests__/subtitle-manager.test.ts` | Add/remove/clear subtitles, DOM track elements |
| `src/lib/__tests__/ffmpeg-singleton.test.ts` | Singleton lifecycle, lazy loading, reset |
| `src/lib/__tests__/mkv-player.test.ts` | parseStreamInfo, MKVPlayer fallback, progress, embedded subs |
| `src/lib/__tests__/media-error.test.ts` | parseMediaError all codes, validateFile extension/size checks |
| `src/components/__tests__/player-controls.test.tsx` | Control buttons, speed selector, callbacks |
| `src/components/__tests__/playlist-panel.test.tsx` | Empty state, item rendering, selection, stream URL |
| `src/components/__tests__/player-error-display.test.tsx` | Error display rendering, button callbacks |
| `src/components/__tests__/player-error-boundary.test.tsx` | Error boundary fallback UI, reset |

CI runs on every push and PR via `.github/workflows/test.yml`.

---

## Improvement Plans (Roadmap)

| # | Plan | Status |
|---|---|---|
| 01 | Test Suite (Jest + RTL) | **DONE** |
| 02 | MKV / FFmpeg.wasm Integration | **DONE** |
| 03 | Refactor `lightbird-player.tsx` | **DONE** |
| 04 | Performance Optimisation | **DONE** |
| 05 | Error Handling & Recovery | **DONE** |
| 06 | Playlist Management (DnD, M3U8) | **DONE** |
| 07 | Advanced Subtitle Support (ASS/SSA, offset) | Pending |
| 08 | Keyboard Customisation | **DONE** |
| 09 | Video Info Panel | **DONE** |
| 10 | Codebase Cleanup | **DONE** |
| 11 | MKV Loading UX Improvements | **DONE** |
| 12 | Magnet Link Player (WebTorrent) | **DONE** |
| MS | Media Session API | **DONE** |

Full plan details: `memory-bank/plans/01-test-suite.md` … `10-codebase-cleanup.md`, `memory-bank/plans/11-mkv-loading-ux/`, `memory-bank/plans/media-session/`, `memory-bank/plans/12-magnet-link-player.md`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.9 |
| List virtualisation | @tanstack/react-virtual | ^3.x |
| UI library | React | 18.3.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + ShadCN UI | 3.4.1 |
| Component primitives | Radix UI | various |
| Video processing | FFmpeg.wasm (`@ffmpeg/ffmpeg`) | 0.12.10 |
| Torrent streaming | WebTorrent (`webtorrent`) | 2.8.5 |
| Icons | Lucide React | 0.475.0 |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities | — |
| Testing | Jest + React Testing Library | Jest 30, RTL 16 |
| Forms | React Hook Form + Zod | — |
| Hosting | Firebase App Hosting | — |

---

## Key Architectural Decisions

1. **No Redux/Zustand** — state is managed via focused custom hooks (Plan 03). Each domain (playback, filters, subtitles, playlist, fullscreen) has its own hook; `lightbird-player.tsx` is a thin coordinator.

2. **Client-side only** — all video processing and playback happens in the browser. No server-side video handling.

3. **SWC transform** — tests use `next/jest` with Next.js's built-in SWC transform (not `ts-jest`).

4. **`"use client"` directives** — all components and lib files are client-side. Server components are not used in the player layer.

5. **Blob URLs** — video files are loaded via `URL.createObjectURL`. These are cleaned up on `destroy()`.

6. **Playlist virtualisation** (Plan 04) — `PlaylistPanel` uses `@tanstack/react-virtual` (`useVirtualizer`) so only the ~10 visible items are in the DOM regardless of playlist size. `ScrollArea` (Radix) replaced with a plain `<div>` as the scroll container. Item heights are measured at runtime via `virtualizer.measureElement`.

7. **Component memoisation** (Plan 04) — `PlayerControls` and `PlaylistPanel` are wrapped in `React.memo`. All callback props passed to them (`handleNext`, `handlePrevious`, `loadVideo`, `processFile`, `handleSelectVideo`, etc.) are memoised with `useCallback` so referential stability is preserved and `React.memo` is effective during the ~4 `timeupdate` ticks per second.

8. **rAF-batched filter writes** (Plan 04) — `use-video-filters.ts` schedules `style.filter` / `style.transform` DOM writes inside `requestAnimationFrame`, capping updates at 60 fps during rapid slider input and avoiding layout thrashing.
