# Issue MS-01 — useMediaSession Hook

**Plan:** media-session
**Labels:** `enhancement`
**Depends on:** —
**Blocks:** MS-02

---

## Problem

There is no `MediaSession` integration. Hardware media keys and OS media panels are unaware of LightBird.

## Goal

Create a `useMediaSession` hook that registers the `MediaSession`, sets metadata, and wires action handlers.

## Acceptance Criteria

- [ ] `src/hooks/use-media-session.ts` is created with `"use client"` directive.
- [ ] Signature:
  ```ts
  function useMediaSession(options: {
    title: string | null;
    artwork?: string | null;   // data URL or object URL of a thumbnail image
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeekForward: () => void;
    onSeekBackward: () => void;
  }): void
  ```
- [ ] When `'mediaSession' in navigator` is false, the hook is a no-op.
- [ ] On every render where `title` changes, updates `navigator.mediaSession.metadata` with a new `MediaMetadata`.
- [ ] Registers all six action handlers with `navigator.mediaSession.setActionHandler`.
- [ ] On unmount, all action handlers are cleared (pass `null` as the handler).
- [ ] Uses `useEffect` with correct dependency arrays so handlers are always fresh closures.
- [ ] Tests in `src/hooks/__tests__/use-media-session.test.ts`:
  - `navigator.mediaSession.metadata` is set when title changes.
  - All six action handlers are registered.
  - `play` action calls `onPlay`.
  - On unmount, handlers are cleared.
  - No-op when `navigator.mediaSession` is absent (mock removal).
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-media-session.ts` |
| Create | `src/hooks/__tests__/use-media-session.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (use the hook, pass title + handlers) |
