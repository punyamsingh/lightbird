# Issue MKV-05 — Try Native Playback Before Remuxing

**Plan:** mkv-loading-ux
**Labels:** `performance`, `mkv`
**Depends on:** —
**Blocks:** —

---

## Problem

Modern Chromium (and Edge) can natively play many MKV files containing H.264+AAC or H.265+AAC without any remuxing. The current code unconditionally runs the full FFmpeg remux pipeline even for files the browser can already handle.

## Goal

Attempt native playback first (fast path). Only fall back to FFmpeg remux if the browser signals it cannot play the file.

## Acceptance Criteria

- [ ] `MKVPlayer.initialize()` is updated to follow this sequence:
  1. Create an object URL from the raw MKV file and set it as `videoElement.src`.
  2. Listen for `canplay` (success) or `error` (failure) on the video element.
  3. If `canplay` fires within 3 seconds → native playback works; skip FFmpeg entirely. Store the URL, call `onProgress(1)`, return.
  4. If `error` fires or the 3-second timeout expires → fall through to the existing FFmpeg probe + remux path.
- [ ] A `canPlayMkv(videoEl: HTMLVideoElement): Promise<boolean>` utility is added to `src/lib/video-info.ts` (or a new `src/lib/compat.ts`).
- [ ] When native playback succeeds, `audioTracks` is populated from the HTML5 `videoElement.audioTracks` API (if available), with a single "Default Audio" entry as fallback.
- [ ] The loading overlay is still shown during the 3-second probe window (with a "Checking compatibility…" message).
- [ ] Tests in `src/lib/__tests__/mkv-player.test.ts`:
  - Mock video element fires `canplay` → `initialize` resolves without calling `getFFmpeg`.
  - Mock video element fires `error` → `initialize` calls `getFFmpeg` and proceeds with remux.
  - 3-second timeout expires → falls through to remux.
- [ ] All existing tests still pass.

## Implementation Notes

```ts
function canPlayMkv(videoEl: HTMLVideoElement, file: File): Promise<boolean> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    videoEl.src = url;
    const timeout = setTimeout(() => { cleanup(); resolve(false); }, 3000);
    const cleanup = () => {
      clearTimeout(timeout);
      videoEl.removeEventListener('canplay', onSuccess);
      videoEl.removeEventListener('error', onFail);
    };
    const onSuccess = () => { cleanup(); resolve(true); };
    const onFail = () => { cleanup(); URL.revokeObjectURL(url); resolve(false); };
    videoEl.addEventListener('canplay', onSuccess, { once: true });
    videoEl.addEventListener('error', onFail, { once: true });
  });
}
```

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/players/mkv-player.ts` (fast-path native check in initialize) |
| Create or modify | `src/lib/compat.ts` (or `video-info.ts`) (canPlayMkv utility) |
| Modify | `src/lib/__tests__/mkv-player.test.ts` (native fast-path tests) |
| Modify | `src/components/video-overlay.tsx` (add "Checking compatibility…" message variant) |
