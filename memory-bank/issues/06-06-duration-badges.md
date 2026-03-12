# Issue 06-06 — Duration Badges on Playlist Items

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-06`
**Depends on:** 06-01 (PlaylistItem type)
**Blocks:** —

---

## Problem

Playlist items show only filenames. There is no way to see how long a video is without loading it.

## Goal

Show a formatted duration badge (e.g. "1:23:45") next to each playlist item name.

## Acceptance Criteria

- [ ] `PlaylistItem` type gains an optional `duration?: number` field (in seconds).
- [ ] When a local file is added to the playlist, its duration is read asynchronously using a hidden `<video>` element (`preload="metadata"`).
- [ ] The `duration` field is updated on the playlist item once loaded.
- [ ] A helper function `getFileDuration(file: File): Promise<number>` exists in `src/lib/playlist-utils.ts` (or similar).
  - Resolves `0` if the video element fires `onerror`.
  - Revokes the object URL after reading.
- [ ] `PlaylistPanel` renders the duration as a small badge after the filename when `item.duration` is defined and > 0.
  - Format: `formatTime` utility (already exists in the codebase).
  - Style: `text-xs text-muted-foreground ml-auto shrink-0`.
- [ ] Stream items show no duration badge (duration is not pre-known).
- [ ] Tests in `src/lib/__tests__/playlist-utils.test.ts`:
  - `getFileDuration` resolves to `duration` when `loadedmetadata` fires.
  - `getFileDuration` resolves to `0` on error.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/types/index.ts` (add `duration?: number` to PlaylistItem) |
| Create | `src/lib/playlist-utils.ts` (getFileDuration) |
| Create | `src/lib/__tests__/playlist-utils.test.ts` |
| Modify | `src/hooks/use-playlist.ts` (call getFileDuration when adding files) |
| Modify | `src/components/playlist-panel.tsx` (render duration badge) |
