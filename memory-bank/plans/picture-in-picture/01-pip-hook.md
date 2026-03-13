# Issue PIP-01 — usePictureInPicture Hook

**Plan:** picture-in-picture
**Labels:** `enhancement`
**Depends on:** —
**Blocks:** PIP-02

---

## Problem

There is no encapsulation of PiP state or the PiP API. Logic would have to live directly in `lightbird-player.tsx`.

## Goal

Create a `usePictureInPicture` hook that abstracts the browser PiP API.

## Acceptance Criteria

- [x] `src/hooks/use-picture-in-picture.ts` is created.
- [ ] Signature:
  ```ts
  function usePictureInPicture(videoRef: RefObject<HTMLVideoElement>): {
    isPiP: boolean;
    isSupported: boolean;
    enter: () => Promise<void>;
    exit: () => Promise<void>;
    toggle: () => Promise<void>;
  }
  ```
- [ ] `isSupported` is `true` only when `'pictureInPictureEnabled' in document && document.pictureInPictureEnabled`.
- [ ] `enter()` calls `videoRef.current.requestPictureInPicture()` and handles the promise rejection (e.g. if already in PiP).
- [ ] `exit()` calls `document.exitPictureInPicture()` and handles rejection.
- [ ] `toggle()` calls `enter()` if not in PiP, else `exit()`.
- [ ] `isPiP` is kept in sync by listening to `enterpictureinpicture` and `leavepictureinpicture` on the video element.
- [ ] Event listeners are cleaned up on unmount.
- [ ] Hook has `"use client"` directive.
- [ ] Tests in `src/hooks/__tests__/use-picture-in-picture.test.ts`:
  - `isSupported` reflects the mocked document property.
  - `isPiP` toggles when the mocked events fire.
  - `enter()` calls `requestPictureInPicture` on the video element mock.
  - `exit()` calls `document.exitPictureInPicture`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-picture-in-picture.ts` |
| Create | `src/hooks/__tests__/use-picture-in-picture.test.ts` |
