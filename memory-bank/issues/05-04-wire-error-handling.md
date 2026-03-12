# Issue 05-04 — Wire Error Handling into Player + Auto-Retry

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `enhancement`, `plan-05`
**Depends on:** 05-01, 05-02, 05-03
**Blocks:** 05-05

---

## Problem

The `error` event on the `<video>` element fires but is not wired to any error state. There is no retry logic.

## Goal

Connect the `<video>` `error` event to the error display component, with automatic retry for network errors (up to 3 times, exponential backoff).

## Acceptance Criteria

- [ ] `useVideoPlayback` hook (or `lightbird-player.tsx`) handles the `error` event on the video element.
- [ ] On error, `parseMediaError` is called and the result stored in state.
- [ ] `PlayerErrorDisplay` is rendered in the player when error state is non-null.
- [ ] For `retryable` errors, auto-retry fires after 1s, 2s, 4s (exponential backoff) up to 3 attempts.
- [ ] After 3 failed retries, the error is shown as non-retryable.
- [ ] For non-recoverable errors (`recoverable: false`), auto-skip to the next playlist item with a toast notification.
- [ ] "Retry" button in `PlayerErrorDisplay` resets retry count and triggers an immediate reload.
- [ ] "Skip to Next" button advances the playlist.
- [ ] "Dismiss" button clears the error state (stays on current item).
- [ ] Error state is cleared when a new file is loaded.
- [ ] All existing tests still pass.

## Implementation Notes

Retry logic sketch:
```ts
const retryCountRef = useRef(0);
const MAX_RETRIES = 3;

function handleVideoError() {
  const parsed = parseMediaError(videoRef.current?.error ?? null);
  setPlayerError(parsed);
  if (parsed.retryable && retryCountRef.current < MAX_RETRIES) {
    const delay = Math.pow(2, retryCountRef.current) * 1000;
    setTimeout(() => {
      retryCountRef.current += 1;
      videoRef.current?.load();
    }, delay);
  } else if (!parsed.recoverable) {
    // toast + playlist.nextItem()
  }
}
```

## Files

| Action | Path |
|--------|------|
| Modify | `src/hooks/use-video-playback.ts` or `src/components/lightbird-player.tsx` |
| Modify | `src/components/lightbird-player.tsx` (render PlayerErrorDisplay conditionally) |
