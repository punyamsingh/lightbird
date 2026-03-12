# Issue MKV-04 — Audio Track Remux Cache

**Plan:** mkv-loading-ux
**Labels:** `performance`, `mkv`
**Depends on:** MKV-01
**Blocks:** —

---

## Problem

Switching audio tracks calls `_remux(trackIndex)` which re-processes the entire file every time. Switching from track 1 → track 2 → back to track 1 triggers three full remuxes.

## Goal

Cache completed remux blobs keyed by audio track index. If a track has already been remuxed, return the cached result instantly.

## Acceptance Criteria

- [ ] `MKVPlayer` maintains a `private remuxCache = new Map<number, string>()` (map from audio track index → object URL).
- [ ] `_remux(audioTrackIndex)`:
  - Checks the cache first; if hit, returns the cached URL immediately without calling FFmpeg.
  - On cache miss: runs FFmpeg, stores the resulting object URL in the cache, then returns it.
- [ ] `destroy()` revokes ALL cached object URLs (not just `this.objectUrl`).
- [ ] `switchAudioTrack` path in `MKVPlayer` benefits automatically since it calls `_remux`.
- [ ] Tests in `src/lib/__tests__/mkv-player.test.ts`:
  - Second call to `_remux` with the same index returns the cached URL.
  - `destroy()` revokes all cached URLs (mock `URL.revokeObjectURL`).
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/players/mkv-player.ts` (add remuxCache, update _remux + destroy) |
| Modify | `src/lib/__tests__/mkv-player.test.ts` (add cache tests) |
