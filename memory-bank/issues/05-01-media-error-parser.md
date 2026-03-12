# Issue 05-01 — Media Error Parser

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `bug`, `enhancement`, `plan-05`
**Depends on:** —
**Blocks:** 05-02, 05-03

---

## Problem

When a video fails to load, `videoRef.current.error` contains a `MediaError` object with a numeric `code` (1–4). These codes are never parsed; the player shows nothing or a generic toast.

## Goal

Create a pure utility module that converts a `MediaError` into a structured, human-readable object the UI can act on.

## Acceptance Criteria

- [ ] `src/lib/media-error.ts` is created.
- [ ] `parseMediaError(error: MediaError | null): ParsedMediaError` handles codes 1–4 and the `null` case.
- [ ] `ParsedMediaError` includes `type`, `message`, `recoverable`, `retryable` fields.
- [ ] Unit tests cover all 5 cases (4 error codes + null input) in `src/lib/__tests__/media-error.test.ts`.
- [ ] All existing tests still pass.

## Implementation Notes

```ts
// src/lib/media-error.ts
export type MediaErrorType = 'aborted' | 'network' | 'decode' | 'unsupported' | 'unknown';

export interface ParsedMediaError {
  type: MediaErrorType;
  message: string;
  recoverable: boolean;  // can the user do something about it?
  retryable: boolean;    // should we auto-retry?
}

export function parseMediaError(error: MediaError | null): ParsedMediaError { ... }
```

Error code → message mapping:
- `1` (MEDIA_ERR_ABORTED): "Playback was aborted." — recoverable, not retryable
- `2` (MEDIA_ERR_NETWORK): "A network error interrupted loading. Check your connection." — recoverable, retryable
- `3` (MEDIA_ERR_DECODE): "The video could not be decoded. It may be corrupted." — not recoverable, not retryable
- `4` (MEDIA_ERR_SRC_NOT_SUPPORTED): "This format is not supported by your browser." — not recoverable, not retryable
- `null`: "An unknown error occurred." — recoverable, retryable

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/media-error.ts` |
| Create | `src/lib/__tests__/media-error.test.ts` |
