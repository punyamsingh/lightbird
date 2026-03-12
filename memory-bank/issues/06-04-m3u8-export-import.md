# Issue 06-04 — M3U8 Playlist Export and Import

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-06`
**Depends on:** 06-01 (stable PlaylistItem type)
**Blocks:** —

---

## Problem

There is no way to save a playlist for later or load a playlist from another source. Stream URL playlists are especially valuable to persist.

## Goal

Allow exporting the current playlist to a `.m3u8` file, and importing `.m3u8` / `.m3u` files via drag-drop or file picker.

## Acceptance Criteria

- [ ] `src/lib/m3u-parser.ts` is created with two functions:
  - `exportPlaylist(items: PlaylistItem[]): void` — generates `#EXTM3U` format, creates blob, triggers download as `lightbird-playlist.m3u8`.
  - `parseM3U(text: string): Omit<PlaylistItem, 'id'>[]` — parses `#EXTINF:` lines, returns items. Stream URLs (starting with `http`) are `type: 'stream'`; others are `type: 'video'` with empty `url` (local files cannot be restored).
- [ ] Export button appears in the playlist panel header when the playlist is non-empty.
- [ ] When a `.m3u` or `.m3u8` file is dropped onto the player or selected via file picker, it is parsed and stream items are added to the playlist (local file entries are skipped with a toast: "Local file entries were skipped — only stream URLs can be imported.").
- [ ] Unit tests in `src/lib/__tests__/m3u-parser.test.ts`:
  - Export produces valid `#EXTM3U` format with `#EXTINF` entries.
  - Parse correctly reads `#EXTINF` name and URL.
  - Parse handles missing `#EXTINF` (bare URLs only).
  - Parse correctly identifies stream vs. video type.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/m3u-parser.ts` |
| Create | `src/lib/__tests__/m3u-parser.test.ts` |
| Modify | `src/components/playlist-panel.tsx` (add Export button) |
| Modify | `src/components/lightbird-player.tsx` (detect .m3u/.m3u8 on file drop, route to parser) |
