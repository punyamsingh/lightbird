# Issue 09-01 — VideoMetadata Type and Native Extraction

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-09`
**Depends on:** —
**Blocks:** 09-02, 09-03, 09-04

---

## Problem

There is no structured type for video technical metadata, and no code that collects it from the HTML5 video element.

## Goal

Define the `VideoMetadata` type and create a utility to extract the data available from the native `HTMLVideoElement` API.

## Acceptance Criteria

- [ ] `src/types/index.ts` is extended with:
  - `VideoMetadata` interface (filename, fileSize, duration, container, width, height, frameRate, videoBitrate, videoCodec, colorSpace, audioTracks, subtitleTracks).
  - `AudioTrackMeta` interface (index, codec, channels, sampleRate, language, bitrate).
  - `SubtitleTrackMeta` interface (index, format, language).
- [ ] `src/lib/video-info.ts` is created with:
  - `extractNativeMetadata(videoEl: HTMLVideoElement, file?: File): Partial<VideoMetadata>` — extracts filename, fileSize, duration, container, width, height. Sets codec/bitrate/frameRate to `null` (not available via HTML5 API).
  - `detectContainerFromUrl(url: string): string` — extracts extension from URL, uppercases it.
- [ ] Unit tests in `src/lib/__tests__/video-info.test.ts`:
  - `extractNativeMetadata` returns correct filename and container from a mock File.
  - `extractNativeMetadata` returns correct width/height/duration from a mock video element.
  - `detectContainerFromUrl` handles URLs with query strings (`video.mp4?token=abc` → `MP4`).
  - `detectContainerFromUrl` returns `'Unknown'` for URLs with no extension.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/types/index.ts` (add VideoMetadata, AudioTrackMeta, SubtitleTrackMeta) |
| Create | `src/lib/video-info.ts` |
| Create | `src/lib/__tests__/video-info.test.ts` |
