# Issue 06-07 — Playlist Sort Controls

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-06`
**Depends on:** 06-06 (duration field needed for duration sort)
**Blocks:** —

---

## Problem

Playlist items appear in the order they were added. There is no way to sort them without manual drag-and-drop.

## Goal

Add a sort dropdown to the playlist panel header with Name A–Z, Name Z–A, Shortest First, Longest First options.

## Acceptance Criteria

- [ ] Sort dropdown (`Select` from ShadCN) is added to the playlist panel header.
- [ ] Sort options: `name-asc` (A–Z), `name-desc` (Z–A), `duration-asc` (Shortest first), `duration-desc` (Longest first).
- [ ] Sorting creates a new sorted copy of the playlist via `usePlaylist.reorderItems` (from 06-02) — does not mutate in place.
- [ ] `currentIndex` follows the currently-playing item after sort (the playing item stays playing).
- [ ] Duration sort treats `undefined` durations as `0`.
- [ ] All existing tests still pass.

## Implementation Notes

The sort is a one-time action, not a persistent sort mode. After sorting, users can still drag-and-drop to adjust.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/playlist-panel.tsx` (add sort Select dropdown) |
| Modify | `src/hooks/use-playlist.ts` (ensure reorderItems handles sort correctly) |
