# Issue CH-01 — Chapter Extraction

**Plan:** chapters
**Labels:** `enhancement`, `mkv`
**Depends on:** —
**Blocks:** CH-02

---

## Problem

Chapter data in MKV files is available in FFmpeg probe output but is not currently parsed. There is also no parser for WebVTT chapter tracks.

## Goal

Create two pure functions that extract `Chapter[]` from FFmpeg log output and from VTT chapter files respectively.

## Acceptance Criteria

- [ ] `src/lib/chapter-parser.ts` is created with:
  - `parseChaptersFromFFmpegLog(log: string, totalDuration: number): Chapter[]` — parses the `Chapter #N:M` blocks in FFmpeg output:
    ```
    Chapter #0:0: start 0.000000, end 142.500000
      Metadata:
        title           : Introduction
    ```
    Returns `[]` if no chapters found.
  - `parseChaptersFromVtt(vttText: string): Chapter[]` — parses a WebVTT chapters file (cue identifiers as titles, timestamps as start/end).
  - Both functions return `[]` (not throw) on malformed input.
- [ ] `Chapter` type is added to `src/types/index.ts`.
- [ ] Unit tests in `src/lib/__tests__/chapter-parser.test.ts`:
  - Parses a 3-chapter FFmpeg log block correctly.
  - Returns `[]` for log with no chapters.
  - Parses a 3-cue VTT chapters file correctly.
  - Returns `[]` for empty VTT string.
  - Last chapter's `endTime` equals `totalDuration`.
- [ ] `MKVPlayer.initialize()` calls `parseChaptersFromFFmpegLog` after probe and stores chapters.
- [ ] `MKVPlayer` exposes `getChapters(): Chapter[]`.
- [ ] `VideoPlayer` interface in `video-processor.ts` gains optional `getChapters?(): Chapter[]`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/chapter-parser.ts` |
| Create | `src/lib/__tests__/chapter-parser.test.ts` |
| Modify | `src/types/index.ts` (add Chapter interface) |
| Modify | `src/lib/players/mkv-player.ts` (parse + expose chapters) |
| Modify | `src/lib/video-processor.ts` (add optional getChapters to interface) |
