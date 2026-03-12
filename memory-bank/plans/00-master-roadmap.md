# LightBird — Master Development Roadmap

> **Last updated:** 2026-03-12
> **Status of plans 01–04:** ✅ DONE
> **Status of plans 05–10:** 🔲 PENDING (tracked as GitHub issues in `memory-bank/issues/`)

---

## Vision

LightBird aims to be the best browser-based video player for power users — capable of playing any file format, managing large playlists, displaying rich technical metadata, and being fully keyboard-driven. It should feel polished enough to replace VLC for everyday use in the browser.

---

## Architecture Summary

```
src/
├── app/                    Next.js App Router (page, layout)
├── components/             UI components (lightbird-player, controls, playlist, overlays)
├── hooks/                  Custom React hooks (one concern per hook)
├── lib/                    Pure logic (players, subtitle handling, utilities)
│   └── players/            SimplePlayer (HTML5) + MKVPlayer (FFmpeg.wasm)
└── types/                  Shared TypeScript interfaces
```

**Key invariant:** All heavy computation (FFmpeg, subtitle parsing) lives in `src/lib/`. Components are thin; hooks mediate state. This separation must be preserved throughout all future work.

---

## Completed Work (Plans 01–04)

| Plan | Title | Status |
|------|-------|--------|
| 01 | Test Suite (Jest + RTL, CI) | ✅ DONE |
| 02 | MKV / FFmpeg.wasm Integration | ✅ DONE |
| 03 | Main Component Refactor (7 hooks) | ✅ DONE |
| 04 | Performance Optimizations | ✅ DONE |

68 tests pass. Architecture is clean and hook-based.

---

## Remaining Work (Plans 05–10)

Each plan is broken into granular GitHub issues in `memory-bank/issues/`. The recommended order below balances impact vs. risk.

### Recommended Implementation Order

```
Phase 1 — Stability (do first, no new dependencies)
  Plan 10: Codebase Cleanup & Dependency Audit   → issues/10-*.md
  Plan 05: Robust Error Handling & Recovery      → issues/05-*.md

Phase 2 — Core UX (most user-visible improvements)
  Plan 06: Playlist Management Improvements      → issues/06-*.md
  Plan 09: Video Information Panel               → issues/09-*.md

Phase 3 — Power Features (heavier, optional deps)
  Plan 07: Advanced Subtitle Support             → issues/07-*.md
  Plan 08: Keyboard Shortcut Customization       → issues/08-*.md
```

**Rationale for this order:**
- Clean up build errors and dead code first so all subsequent work compiles cleanly.
- Error handling prevents user-facing crashes and is pure TypeScript — no new deps.
- Playlist + Info panel are high-visibility, self-contained, and well-scoped.
- Subtitles and keyboard customization touch more files and have optional npm deps.

---

## Plan Summaries

### Plan 05 — Robust Error Handling
**Problem:** Videos that fail to load leave the player in a silent broken state. No retry, no actionable message, no format validation.
**Deliverables:** `media-error.ts`, `PlayerErrorDisplay` component, `PlayerErrorBoundary`, stream stall detector, file validation.
**New deps:** None.
**Issues:** 6 (see `issues/05-*.md`)

### Plan 06 — Playlist Management
**Problem:** No per-item remove, no reorder, no folder import, no persistence, no M3U8 support.
**Deliverables:** Per-item remove, drag-and-drop reorder, folder import, M3U8 export/import, localStorage persistence, duration badges, sort controls.
**New deps:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
**Issues:** 8 (see `issues/06-*.md`)

### Plan 07 — Advanced Subtitle Support
**Problem:** ASS/SSA styling stripped; no sync offset; Windows-1252 files garble; no subtitle search.
**Deliverables:** Encoding detection (`chardet`), VTT timestamp offset, ASS canvas renderer (`ass-compiler`), subtitle search UI.
**New deps:** `chardet`, `ass-compiler`.
**Issues:** 5 (see `issues/07-*.md`)

### Plan 08 — Keyboard Shortcut Customization
**Problem:** Shortcuts hardcoded, not discoverable, no remap UI.
**Deliverables:** `keyboard-shortcuts.ts` registry, refactored `useKeyboardShortcuts`, `ShortcutSettingsDialog`, help overlay (`?` key).
**New deps:** None.
**Issues:** 5 (see `issues/08-*.md`)

### Plan 09 — Video Information Panel
**Problem:** No way to see codec, resolution, bitrate, audio track details.
**Deliverables:** `VideoMetadata` type, `video-info.ts`, `useVideoInfo` hook, `VideoInfoPanel` component, FFmpeg probe enrichment for MKV.
**New deps:** None.
**Issues:** 6 (see `issues/09-*.md`)

### Plan 10 — Codebase Cleanup
**Problem:** Deprecated dead code, suppressed TS/ESLint errors, unused Firebase/Genkit/ReCharts deps, missing `"use client"`, no `.env.example`.
**Deliverables:** Strict build passing, dead code removed, unused deps uninstalled, `.env.example` created.
**New deps:** None (removes deps).
**Issues:** 8 (see `issues/10-*.md`)

---

## Testing Contract

Every issue MUST:
1. Have tests written alongside the implementation (new lib code → `src/lib/__tests__/`, new hooks → `src/hooks/__tests__/`, new components → `src/components/__tests__/`).
2. Pass the full suite (`npm test`) before the issue is closed.
3. Not skip or comment-out existing tests.

Coverage target: >70% on `src/lib/`.

---

## Definition of Done (per issue)

- [ ] Code implemented and reviewed
- [ ] Tests written and all tests pass (`npm test`)
- [ ] Memory bank updated (`memory-bank/project-overview.md`)
- [ ] Plan doc updated (mark step complete or mark plan `[DONE]`)
- [ ] Committed with descriptive message
- [ ] Pushed to feature branch

---

## Cross-Cutting Concerns

| Concern | Guideline |
|---------|-----------|
| New components | Always add `"use client"` if using hooks or browser APIs |
| New npm deps | Justify in the issue; prefer zero-dep or tiny libs |
| LocalStorage keys | Use `lightbird-` prefix. Current keys: `lightbird-progress-*`, `lightbird-volume`, `lightbird-playlist`, `lightbird-shortcuts` |
| Error toasts | Use existing `useToast` hook; keep messages ≤ 80 chars |
| Accessibility | All new interactive elements need `aria-label` and keyboard operability |
| Bundle size | Check `.next/` output after adding deps; flag if JS > 500 kB gzipped |
