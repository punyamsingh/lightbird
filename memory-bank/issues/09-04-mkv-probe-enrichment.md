# Issue 09-04 — FFmpeg Probe Data Enrichment for MKV

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-09`
**Depends on:** 09-01, 09-02
**Blocks:** 09-05

---

## Problem

For MKV files, the HTML5 API only sees the remuxed MP4. The original codec, frame rate, bitrate, and audio track details are available only from the FFmpeg probe log output (which runs during MKV loading in Plan 02).

## Goal

Parse the FFmpeg probe log output for MKV files and feed the results into the `useVideoInfo` hook via `enrichMetadata`.

## Acceptance Criteria

- [ ] `src/lib/video-info.ts` gains a `parseFFmpegProbeLog(log: string, file: File): Partial<VideoMetadata>` function that extracts:
  - Video codec (map FFmpeg codec name to human-readable: `h264` → `H.264 (AVC)`, `hevc` → `H.265 (HEVC)`, etc.)
  - Width × height from video stream line
  - Frame rate (fps)
  - Overall bitrate (kb/s)
  - Audio tracks: codec, Hz, channels
- [ ] `parseFFmpegProbeLog` is unit tested in `src/lib/__tests__/video-info.test.ts` with a realistic FFmpeg log string fixture.
- [ ] `src/lib/players/mkv-player.ts` is modified: after probe completes, it calls the `onProbeComplete(metadata: Partial<VideoMetadata>)` callback passed via `initialize()` options.
- [ ] `lightbird-player.tsx` passes `onProbeComplete: videoInfo.enrichMetadata` to `MKVPlayer.initialize()`.
- [ ] All existing tests still pass.

## Implementation Notes

Sample FFmpeg log lines to parse:
```
Stream #0:0: Video: h264, yuv420p, 1920x1080, 4000 kb/s, 23.98 fps
Stream #0:1: Audio: aac, 48000 Hz, stereo, fltp, 192 kb/s
bitrate: 4192 kb/s
```

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/video-info.ts` (add parseFFmpegProbeLog) |
| Modify | `src/lib/__tests__/video-info.test.ts` (add probe parsing tests) |
| Modify | `src/lib/players/mkv-player.ts` (add onProbeComplete callback) |
| Modify | `src/components/lightbird-player.tsx` (wire enrichMetadata to MKV probe) |
