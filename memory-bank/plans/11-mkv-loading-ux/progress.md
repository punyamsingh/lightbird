# Plan 11 — MKV Loading UX — Progress

| Sub-plan | Title | Status | Branch | Notes |
|---|---|---|---|---|
| 01 | Move FFmpeg to a Web Worker | **DONE** | `claude/mkv-loading-ux-subplan-NLzJQ` | Worker owns FFmpeg instance; main thread never calls `getFFmpeg()` or `exec()` directly. `destroy()` calls `worker.terminate()`. `next.config.ts` gets `output.globalObject = 'self'`. All 238 tests pass. |
| 02 | Progress UI (speed + ETA) | Pending | — | Depends on sub-plan 1 |
| 03 | Cancellation | Pending | — | Depends on sub-plan 1 |
| 04 | Audio track remux cache | Pending | — | Independent |
| 05 | Native fallback first | Pending | — | Independent |
