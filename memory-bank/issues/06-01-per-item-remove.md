# Issue 06-01 — Per-Item Remove Button in Playlist

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-06`
**Depends on:** —
**Blocks:** —

---

## Problem

The only way to remove a video from the playlist is to clear the entire list. There is no per-item remove button.

## Goal

Add a hover-revealed remove (X) button to each playlist item that removes that item without affecting playback of others.

## Acceptance Criteria

- [ ] `PlaylistItem` type gains a stable `id: string` field (generated with `crypto.randomUUID()` when items are created in `usePlaylist`).
- [ ] `usePlaylist` exposes a `removeItem(index: number)` function:
  - If `index === currentIndex`: advance to next item (or clear selection if last).
  - If `index < currentIndex`: decrement `currentIndex` by 1.
  - Otherwise: just filter the item out.
- [ ] `PlaylistPanel` accepts an `onRemoveItem: (index: number) => void` prop.
- [ ] Each playlist item row renders an `X` icon button that is `opacity-0 group-hover:opacity-100` (visible on hover).
- [ ] The remove button has `aria-label="Remove from playlist"`.
- [ ] Clicking the remove button calls `e.stopPropagation()` so it doesn't also select the item.
- [ ] Tests in `src/hooks/__tests__/use-playlist.test.ts` cover `removeItem`:
  - Removing a non-current item keeps currentIndex correct.
  - Removing the current item auto-advances.
  - Removing the last item clears the selection.
- [ ] Tests in `src/components/__tests__/playlist-panel.test.tsx` cover:
  - Remove button renders for each item.
  - Clicking remove calls `onRemoveItem` with the correct index.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/types/index.ts` (add `id: string` to `PlaylistItem`) |
| Modify | `src/hooks/use-playlist.ts` (add `removeItem`, generate IDs) |
| Modify | `src/components/playlist-panel.tsx` (render remove button) |
| Modify | `src/components/lightbird-player.tsx` (pass `onRemoveItem` prop) |
