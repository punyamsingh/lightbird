# Issue 09-02 — useVideoInfo Hook

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-09`
**Depends on:** 09-01
**Blocks:** 09-03

---

## Problem

Metadata needs to be collected reactively as videos load and potentially enriched later with FFmpeg probe data (for MKV files).

## Goal

Create a hook that automatically collects native metadata when a video loads and supports external enrichment.

## Acceptance Criteria

- [ ] `src/hooks/use-video-info.ts` is created.
- [ ] Hook signature: `useVideoInfo(videoRef: RefObject<HTMLVideoElement>, currentFile: File | null): { metadata: VideoMetadata | null; enrichMetadata: (extra: Partial<VideoMetadata>) => void }`.
- [ ] On `loadedmetadata` event: calls `extractNativeMetadata` and sets state.
- [ ] `enrichMetadata(extra)`: merges `extra` into existing metadata (used to inject FFmpeg probe data for MKV).
- [ ] Metadata resets to `null` when `currentFile` changes to a new file.
- [ ] Tests in `src/hooks/__tests__/use-video-info.test.ts`:
  - Metadata is null initially.
  - After `loadedmetadata` fires, metadata contains extracted fields.
  - `enrichMetadata` merges additional fields.
  - Metadata resets when a new file prop is passed.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-video-info.ts` |
| Create | `src/hooks/__tests__/use-video-info.test.ts` |
