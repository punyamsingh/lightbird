# Media Session API — Master Plan

**Status:** 🔲 PENDING
**Priority:** MEDIUM
**New dependencies:** None (browser API)

---

## Problem

LightBird does not integrate with the operating system's media controls. This means:

1. The browser tab shows no metadata (title, artist) in the OS media panel or lock screen.
2. Hardware media keys (play/pause, next track, previous track) on keyboards and headphones do nothing when LightBird is the active tab.
3. The browser's native media notification (on mobile) shows no thumbnail or track title.

---

## Goals

1. Register a `MediaSession` with the browser for the currently-playing video.
2. Set `metadata`: title (filename), artwork (video thumbnail from screenshot).
3. Register action handlers for: `play`, `pause`, `seekbackward`, `seekforward`, `previoustrack`, `nexttrack`.
4. Keep the session metadata updated as the playlist advances.
5. Clear the session on unmount.

---

## Browser API Surface

```ts
navigator.mediaSession.metadata = new MediaMetadata({
  title: 'My Video',
  artist: 'LightBird',
  artwork: [{ src: thumbnailUrl, sizes: '512x512', type: 'image/png' }],
});

navigator.mediaSession.setActionHandler('play', () => videoEl.play());
navigator.mediaSession.setActionHandler('pause', () => videoEl.pause());
navigator.mediaSession.setActionHandler('nexttrack', () => playlist.nextItem());
navigator.mediaSession.setActionHandler('previoustrack', () => playlist.prevItem());
navigator.mediaSession.setActionHandler('seekforward', ({ seekOffset }) => {
  videoEl.currentTime += seekOffset ?? 10;
});
navigator.mediaSession.setActionHandler('seekbackward', ({ seekOffset }) => {
  videoEl.currentTime -= seekOffset ?? 10;
});

// Feature detect
const supported = 'mediaSession' in navigator;
```

---

## Issues

| # | File | What it delivers |
|---|------|-----------------|
| 01 | `01-media-session-hook.md` | `useMediaSession` hook |
| 02 | `02-artwork-thumbnail.md` | Auto-generate thumbnail artwork for the session |

---

## Success Criteria

- On macOS: the media info widget (Control Centre → Now Playing) shows the video title and playback controls.
- Hardware play/pause key toggles playback in LightBird.
- Hardware next/previous track keys advance/retreat the playlist.
- On mobile Chrome: the media notification card shows the video filename and artwork.
- When a new video is loaded, the metadata updates immediately.
