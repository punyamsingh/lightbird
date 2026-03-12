# Issue MKV-03 — Remux Cancellation

**Plan:** mkv-loading-ux
**Labels:** `ux`, `mkv`
**Depends on:** MKV-01 (worker can be terminated)
**Blocks:** —

---

## Problem

Once MKV loading starts there is no way to stop it. If the user picks the wrong file (e.g. a 10 GB file when they wanted a 100 MB one), they must either wait for the entire remux or reload the page.

## Goal

Add a "Cancel" button to the loading overlay that terminates the FFmpeg worker and returns the player to the idle state immediately.

## Acceptance Criteria

- [ ] `VideoOverlay` accepts an optional `onCancel?: () => void` prop.
- [ ] When `onCancel` is provided, a "Cancel" button is rendered below the progress bar.
- [ ] `lightbird-player.tsx` passes `onCancel` only during MKV processing (not during normal video loading).
- [ ] `onCancel` calls `MkvWorkerClient.terminate()`, revokes any partial object URLs, resets `isLoading` / `processingProgress` to defaults, and clears the current playlist item selection.
- [ ] After cancellation, the player returns to the empty/idle state (no video loaded).
- [ ] Tests in `src/components/__tests__/video-overlay.test.tsx`:
  - Cancel button renders when `onCancel` prop is provided.
  - Cancel button is absent when `onCancel` is not provided.
  - Clicking Cancel calls `onCancel`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/video-overlay.tsx` (add Cancel button) |
| Modify | `src/components/__tests__/video-overlay.test.tsx` (add Cancel tests) |
| Modify | `src/components/lightbird-player.tsx` (wire cancel handler) |
