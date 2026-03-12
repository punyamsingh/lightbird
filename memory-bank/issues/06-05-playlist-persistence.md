# Issue 06-05 — Persist Playlist to localStorage

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-06`
**Depends on:** 06-01 (stable PlaylistItem type)
**Blocks:** —

---

## Problem

When the page is refreshed, the entire playlist is lost. Stream URLs in particular are tedious to re-enter.

## Goal

Persist stream URL playlist items to `localStorage` and restore them on page load.

## Acceptance Criteria

- [ ] `usePlaylist` saves the playlist to `localStorage` under key `lightbird-playlist` on every change.
- [ ] Only `type: 'stream'` items are persisted (local file object URLs are ephemeral and invalid after refresh).
- [ ] On mount, `usePlaylist` reads from `localStorage` and restores stream items.
- [ ] Restored items have new stable IDs generated at restore time (not stored IDs, to avoid collisions).
- [ ] If `localStorage` data is malformed (corrupt JSON), it is silently discarded and the key is cleared.
- [ ] Tests in `src/hooks/__tests__/use-playlist.test.ts`:
  - Adding a stream URL → it appears in localStorage mock.
  - Adding a local file → it does NOT appear in localStorage.
  - On init with saved stream items → playlist is pre-populated.
  - On init with corrupt data → playlist is empty, no crash.
- [ ] All existing tests still pass.

## Implementation Notes

Use `JSON.parse` inside a `try/catch`. Use `localStorage` mock in tests (`jest.spyOn(Storage.prototype, 'getItem')`).

## Files

| Action | Path |
|--------|------|
| Modify | `src/hooks/use-playlist.ts` (add localStorage save/restore effects) |
