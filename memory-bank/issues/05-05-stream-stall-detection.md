# Issue 05-05 — Stream Stall Detection & Auto-Reconnect

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `enhancement`, `plan-05`
**Depends on:** 05-04
**Blocks:** —

---

## Problem

Network streams (added via "Add Stream URL") can stall silently. The `currentTime` stops advancing but the player shows no loading indicator and never recovers.

## Goal

Detect stalled streams and automatically reconnect, resuming from the stall point.

## Acceptance Criteria

- [ ] Stall detection activates only when a `type: 'stream'` playlist item is loaded.
- [ ] Detection polls every 5 seconds: if `currentTime === lastTime` and the video is not paused, it's stalled.
- [ ] On stall: call `videoEl.load()`, then on `canplay`, seek to `resumeAt` and call `play()`.
- [ ] Stall detection is stopped when:
  - A file (non-stream) is loaded
  - The component unmounts
  - The stream is paused by the user
- [ ] No stall detection fires during normal paused state.
- [ ] All existing tests still pass.

## Implementation Notes

Implement as part of `useVideoPlayback` or as a separate `useStreamReconnect(videoRef, isStream)` hook. The hook approach is cleaner since it's a separate concern.

```ts
// src/hooks/use-stream-reconnect.ts
export function useStreamReconnect(
  videoRef: RefObject<HTMLVideoElement>,
  isStream: boolean
) {
  useEffect(() => {
    if (!isStream) return;
    let lastTime = -1;
    const interval = setInterval(() => {
      const el = videoRef.current;
      if (!el || el.paused) { lastTime = el?.currentTime ?? -1; return; }
      if (el.currentTime === lastTime) {
        const resumeAt = el.currentTime;
        el.load();
        el.addEventListener('canplay', () => {
          el.currentTime = resumeAt;
          el.play();
        }, { once: true });
      }
      lastTime = el.currentTime;
    }, 5000);
    return () => clearInterval(interval);
  }, [videoRef, isStream]);
}
```

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-stream-reconnect.ts` |
| Create | `src/hooks/__tests__/use-stream-reconnect.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (wire hook, pass `isStream` flag) |
