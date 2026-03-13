# Picture-in-Picture — Master Plan

**Status:** ✅ DONE

## Implementation Summary

- Created `src/hooks/use-picture-in-picture.ts` — `usePictureInPicture(videoRef)` hook that wraps the browser PiP API (`requestPictureInPicture` / `document.exitPictureInPicture`). Exposes `{ isPiP, isSupported, enter, exit, toggle }`. State is kept in sync via `enterpictureinpicture` / `leavepictureinpicture` event listeners, cleaned up on unmount.
- Created `src/hooks/__tests__/use-picture-in-picture.test.ts` — 10 tests covering support detection, event-driven state sync, enter/exit/toggle calls, null-ref safety, and listener cleanup.
- Modified `src/components/player-controls.tsx` — added optional `onTogglePiP`, `isPiP`, `pipSupported` props; added `PictureInPicture2` button (lucide-react) before the fullscreen button, hidden when `pipSupported=false`, aria-label and `text-primary` class reflect `isPiP` state.
- Modified `src/components/lightbird-player.tsx` — calls `usePictureInPicture(videoRef)` and passes `onTogglePiP`, `isPiP`, `pipSupported` to `PlayerControls`.
- Added 5 PiP tests to `src/components/__tests__/player-controls.test.tsx`.
- All 296 tests pass.
**Priority:** MEDIUM
**New dependencies:** None (browser API)

---

## Problem

Users watching long videos frequently need to multi-task — read a document, write an email, browse. There is currently no way to keep the video visible while doing other things. The browser's native Picture-in-Picture API solves this, but it is not wired up in LightBird.

---

## Goals

1. Add a PiP button to the player controls.
2. Reflect the correct button state (in-PiP / not-in-PiP).
3. Keep PiP available even when the browser is in fullscreen mode (they are independent).
4. Gracefully degrade on browsers that do not support the PiP API.
5. Restore playback controls when returning from PiP.

---

## Browser API Surface

```ts
// Enter PiP
await videoEl.requestPictureInPicture();

// Exit PiP
await document.exitPictureInPicture();

// Events
videoEl.addEventListener('enterpictureinpicture', handler);
videoEl.addEventListener('leavepictureinpicture', handler);

// Feature detect
const supported = 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
```

---

## Issues

| # | File | What it delivers |
|---|------|-----------------|
| 01 | `01-pip-hook.md` | `usePictureInPicture` hook |
| 02 | `02-pip-button.md` | PiP button in PlayerControls |

---

## Success Criteria

- Clicking the PiP button opens a floating mini-player window.
- Clicking it again (or pressing Escape / closing the PiP window) returns to normal.
- Button icon and aria-label reflect current PiP state.
- On browsers without PiP support the button is hidden.
- Entering/leaving fullscreen does not break PiP state.
