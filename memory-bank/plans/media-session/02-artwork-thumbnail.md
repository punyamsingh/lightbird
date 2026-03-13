# Issue MS-02 — Auto-Generate Artwork Thumbnail [DONE]

**Plan:** media-session
**Labels:** `enhancement`
**Depends on:** MS-01

## Implementation Summary

Created `src/lib/video-thumbnail.ts` with `captureVideoThumbnail(videoEl, atSeconds?)`. Saves `currentTime`, adds a one-time `seeked` listener, seeks to `min(atSeconds, duration)`, draws to an offscreen 320×180 canvas, returns `canvas.toDataURL('image/jpeg', 0.7)`, restores `currentTime`. Returns `null` on any error. `lightbird-player.tsx` listens for `loadeddata` to trigger capture and stores result in `mediaThumbnail` state, passed to `useMediaSession`. Clears on empty playlist. Tests in `src/lib/__tests__/video-thumbnail.test.ts`.
**Blocks:** —

---

## Problem

The `MediaSession` metadata supports an `artwork` field, but there is no automated way to generate a thumbnail for arbitrary video files.

## Goal

Automatically capture a thumbnail frame from the video at the 5-second mark (or first available frame) and use it as the `MediaSession` artwork.

## Acceptance Criteria

- [ ] `src/lib/video-thumbnail.ts` is created with:
  - `captureVideoThumbnail(videoEl: HTMLVideoElement, atSeconds?: number): Promise<string | null>` — seeks to `atSeconds` (default 5), draws a frame to an offscreen canvas, returns `canvas.toDataURL('image/jpeg', 0.7)`. Returns `null` on error.
  - Does not affect `videoEl.currentTime` permanently: saves current time, seeks to target, captures, restores time.
- [ ] Tests in `src/lib/__tests__/video-thumbnail.test.ts`:
  - Returns a data URL string when `toDataURL` is available on the mock canvas.
  - Returns `null` when the video throws on `seeked`.
  - Restores `currentTime` after capture.
- [ ] `lightbird-player.tsx` calls `captureVideoThumbnail` after `loadeddata` fires for a new video, then passes the result as `artwork` to `useMediaSession`.
- [ ] Artwork is cleared (set to `null`) when the playlist is empty or no video is loaded.
- [ ] All existing tests still pass.

## Implementation Notes

The seek-and-capture approach:
```ts
export async function captureVideoThumbnail(
  videoEl: HTMLVideoElement,
  atSeconds = 5
): Promise<string | null> {
  return new Promise(resolve => {
    const savedTime = videoEl.currentTime;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(null); return; }

    const onSeeked = () => {
      try {
        ctx.drawImage(videoEl, 0, 0, 320, 180);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve(null);
      } finally {
        videoEl.currentTime = savedTime;
        videoEl.removeEventListener('seeked', onSeeked);
      }
    };

    videoEl.addEventListener('seeked', onSeeked, { once: true });
    videoEl.currentTime = Math.min(atSeconds, videoEl.duration || 0);
  });
}
```

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/video-thumbnail.ts` |
| Create | `src/lib/__tests__/video-thumbnail.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (capture thumbnail on load, pass to useMediaSession) |
