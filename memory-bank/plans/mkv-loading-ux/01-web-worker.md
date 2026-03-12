# Issue MKV-01 — FFmpeg Web Worker

**Plan:** mkv-loading-ux
**Labels:** `performance`, `mkv`
**Depends on:** —
**Blocks:** MKV-02, MKV-03, MKV-04

---

## Problem

`MKVPlayer.initialize()` and `_remux()` run FFmpeg on the main thread. During a remux the browser's JS event loop is saturated, causing the UI to freeze entirely.

## Goal

Move all FFmpeg operations into a dedicated Web Worker. The main thread communicates with it via a typed message protocol and receives progress updates without blocking.

## Acceptance Criteria

- [ ] `src/lib/workers/ffmpeg.worker.ts` is created. It:
  - Imports `getFFmpeg` and `fetchFile` from their respective packages.
  - Handles inbound messages: `{ type: 'probe', file: File }` and `{ type: 'remux', file: File, audioTrackIndex: number }`.
  - Posts outbound messages: `{ type: 'progress', progress: number }`, `{ type: 'probe-result', … }`, `{ type: 'remux-result', blob: Blob }`, `{ type: 'error', message: string }`.
- [ ] `src/lib/mkv-worker-client.ts` is created as the main-thread interface:
  - `class MkvWorkerClient` wraps `new Worker(…)`.
  - `probe(file: File): Promise<ProbeResult>` posts a probe message and resolves when `probe-result` is received.
  - `remux(file: File, audioTrackIndex: number, onProgress: (p: number) => void): Promise<Blob>` posts a remux message, pipes progress callbacks, resolves with the blob.
  - `terminate()` kills the worker and rejects any pending promises.
- [ ] `MKVPlayer` is updated to use `MkvWorkerClient` instead of calling FFmpeg directly.
- [ ] Tests in `src/lib/__tests__/mkv-worker-client.test.ts`:
  - Mock `Worker` global; verify `probe` resolves correctly.
  - Verify `remux` posts progress correctly.
  - Verify `terminate()` rejects pending promises.
- [ ] All existing tests still pass.

## Implementation Notes

Next.js supports Web Workers via the standard constructor when the URL uses `import.meta.url`:
```ts
const worker = new Worker(
  new URL('../workers/ffmpeg.worker.ts', import.meta.url)
);
```
This requires `"use client"` to be present in any component that instantiates it, and the worker file itself should NOT have `"use client"`.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/workers/ffmpeg.worker.ts` |
| Create | `src/lib/mkv-worker-client.ts` |
| Create | `src/lib/__tests__/mkv-worker-client.test.ts` |
| Modify | `src/lib/players/mkv-player.ts` (use MkvWorkerClient) |
