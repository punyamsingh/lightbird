# LightBird — Project Overview

> **Last updated:** 2026-04-04
> **Branch context:** Plans 01–12 implemented. Project is now a pnpm monorepo publishing two npm packages: `lightbird` (core) and `@lightbird/ui` (React components).

---

## What is LightBird?

LightBird is a modern, lightweight, browser-based video player built as a **pnpm + Turborepo monorepo**. It publishes two npm packages while keeping the web app at lightbird.vercel.app functional. Its core value proposition is playing a wide range of video formats directly in the browser without server-side transcoding, including MKV files via FFmpeg.wasm.

**npm packages:**
- `lightbird` — Framework-agnostic core engine (players, parsers, subtitle pipeline, utilities, types)
- `lightbird/react` — React hooks (subpath export, same npm install)
- `@lightbird/ui` — Drop-in styled React components (Tailwind + Radix + Lucide)

---

## Architecture

### Monorepo Structure

```text
apps/web/          — Next.js app (lightbird.vercel.app)
packages/lightbird/ — Core library (npm: lightbird)
packages/ui/        — UI components (npm: @lightbird/ui)
```

### Dual-Player System

| Player | Handles | Implementation |
|---|---|---|
| `SimplePlayer` | MP4, WebM, AVI, MOV, WMV, FLV, OGV | Native HTML5 `<video>` element |
| `MKVPlayer` | MKV | FFmpeg.wasm in Web Worker — probes, remuxes to MP4, extracts subtitles |

The factory function `createVideoPlayer(file)` in `packages/lightbird/src/video-processor.ts` selects the right player.

### Component Hierarchy

```text
apps/web/src/app/page.tsx
└── @lightbird/ui: PlayerErrorBoundary
    └── @lightbird/ui: LightBirdPlayer (coordinator)
        ├── PlayerControls
        ├── PlaylistPanel
        ├── VideoOverlay
        ├── SubtitleOverlay
        └── PlayerErrorDisplay
```

### React Hooks (lightbird/react)

| Hook | Responsibility |
|---|---|
| `use-video-playback.ts` | Play/pause/seek/volume/rate/loop + video events |
| `use-video-filters.ts` | Brightness/contrast/saturation/hue/zoom + rAF-batched CSS |
| `use-subtitles.ts` | Subtitle management with onError/onSuccess callbacks |
| `use-playlist.ts` | Playlist state, file parsing, reorder, localStorage persistence |
| `use-keyboard-shortcuts.ts` | Keyboard event binding |
| `use-fullscreen.ts` | Fullscreen enter/exit/detect |
| `use-progress-persistence.ts` | localStorage save (debounced 5s) and restore |
| `use-media-session.ts` | MediaSession API: metadata, hardware key handlers |
| `use-picture-in-picture.ts` | PiP enter/exit/toggle/detect |
| `use-video-info.ts` | Video metadata extraction |
| `use-chapters.ts` | Chapter navigation from MKV metadata |

---

## Test Suite

Tests are per-package using ts-jest. Run with:

```bash
pnpm turbo test         # all tests
pnpm test --filter lightbird  # core only
pnpm test --filter @lightbird/ui  # UI only
```

Test locations:
- `packages/lightbird/__tests__/` — library tests (14 files)
- `packages/lightbird/__tests__/react/` — hook tests (10 files)
- `packages/ui/__tests__/` — component tests (4 files)

Shared setup: `jest.setup.ts` (root)

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
| 07 | Advanced Subtitle Support | Pending |
| 08 | Keyboard Customisation | **DONE** |
| 09 | Video Info Panel | **DONE** |
| 10 | Codebase Cleanup | **DONE** |
| 11 | MKV Loading UX Improvements | **DONE** |
| 12 | npm Library Extraction | **DONE** |
| MS | Media Session API | **DONE** |
| PIP | Picture-in-Picture | **DONE** |
| CH | Chapters & Cue Points | **DONE** |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9, turbo 2 |
| Bundler (packages) | tsup | 8.x |
| Framework (app) | Next.js (App Router) | 15.5.9 |
| UI library | React | 18.3.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + ShadCN UI | 3.4.1 |
| Component primitives | Radix UI | various |
| Video processing | FFmpeg.wasm | 0.12.10 |
| Icons | Lucide React | 0.475.0 |
| Drag-and-drop | @dnd-kit | 6.x/10.x |
| List virtualisation | @tanstack/react-virtual | 3.x |
| Testing | Jest + ts-jest + RTL | Jest 30, RTL 16 |

---

## Key Architectural Decisions

1. **Monorepo with pnpm + Turborepo** — strict dependency isolation, task caching, correct build ordering
2. **tsup for packages** — ESM + CJS dual output with TypeScript declarations
3. **No Redux/Zustand** — custom hooks for domain-specific state
4. **Client-side only** — all video processing in the browser
5. **Blob URLs** — files loaded via `URL.createObjectURL`, cleaned up on `destroy()`
6. **`"use client"` via tsup banner** — UI package adds directive automatically
7. **useSubtitles onError callback** — decouples hook from toast UI (lightbird-player passes toast callback)
8. **FFmpeg as optional dep** — not required if only HTML5 playback needed
9. **React as optional peer dep** — only needed for `lightbird/react` subpath
