# Issue 09-03 — VideoInfoPanel Component

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-09`
**Depends on:** 09-01
**Blocks:** 09-05

---

## Problem

There is no UI to display video technical metadata.

## Goal

Build the `VideoInfoPanel` overlay component that presents metadata in a clean, readable table.

## Acceptance Criteria

- [ ] `src/components/video-info-panel.tsx` is created with `"use client"` directive.
- [ ] Props: `{ metadata: VideoMetadata | null; onClose: () => void }`.
- [ ] Returns `null` when `metadata` is null.
- [ ] Displays a table with rows for: File, Size, Duration, Container, Resolution, Frame Rate, Video Codec, Video Bitrate.
- [ ] Each audio track is shown as a row: "Audio 1", "Audio 2", etc. with codec, channels, and sample rate.
- [ ] Fields that are `null` display `—` (em dash).
- [ ] File size formatted: GB / MB / KB depending on magnitude.
- [ ] Bitrate formatted: Mbps / Kbps.
- [ ] Panel positioned `absolute top-4 right-4 z-40` with a semi-transparent black background.
- [ ] Close button (X icon) at the top-right calls `onClose`.
- [ ] Panel is scrollable if content overflows (`overflow-y-auto max-h-[80vh]`).
- [ ] Tests in `src/components/__tests__/video-info-panel.test.tsx`:
  - Renders null when metadata is null.
  - Renders all expected fields from a mock VideoMetadata object.
  - Close button calls `onClose`.
  - Null fields show `—`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/components/video-info-panel.tsx` |
| Create | `src/components/__tests__/video-info-panel.test.tsx` |
