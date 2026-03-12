# Issue 06-03 — Bulk Folder Import

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-06`
**Depends on:** —
**Blocks:** —

---

## Problem

Users can only add videos one at a time or by dragging individual files. There is no way to open a whole folder.

## Goal

Add an "Open Folder" button that uses `webkitdirectory` to add all video files from a selected folder at once, sorted naturally by filename.

## Acceptance Criteria

- [ ] A hidden `<input type="file" webkitdirectory multiple accept="video/*">` element is added to the player.
- [ ] An "Open Folder" button triggers the folder picker.
- [ ] Only files with supported video extensions are added (same list as file-validator: `mp4, webm, mkv, mov, avi, wmv, flv, m4v`).
- [ ] Files are sorted by filename with natural sort (`localeCompare` with `{ numeric: true }`).
- [ ] The added files are appended to the existing playlist (not replace it).
- [ ] `@ts-expect-error` comment is used above `webkitdirectory` attribute (not in official TS types).
- [ ] Test in `src/components/__tests__/lightbird-player.test.tsx` or `playlist-panel.test.tsx`:
  - Simulating folder selection adds only video-extension files.
  - Files are added in natural sort order.
- [ ] All existing tests still pass.

## Implementation Notes

The folder picker button should live near the existing file picker buttons, clearly labeled "Open Folder" (or a folder icon with tooltip).

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/lightbird-player.tsx` (add folder input ref + handler) |
| Modify | `src/components/player-controls.tsx` or `src/components/lightbird-player.tsx` (add folder button to UI) |
