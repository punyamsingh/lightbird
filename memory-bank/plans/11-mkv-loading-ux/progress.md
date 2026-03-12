# Plan 11 — MKV Loading UX — Progress

| Sub-plan | Title | Status | Branch | Notes |
|---|---|---|---|---|
| 01 | Move FFmpeg to a Web Worker | **DONE** | `claude/mkv-loading-ux-subplan-NLzJQ` | Worker owns FFmpeg instance; main thread never calls `getFFmpeg()` or `exec()` directly. `destroy()` calls `worker.terminate()`. `next.config.ts` gets `output.globalObject = 'self'`. All 238 tests pass. |
| 02 | Progress UI (speed + ETA) | **DONE** | `claude/mkv-loading-ux-subplan-2-FgRnm` | `ProgressEstimator` class in `src/lib/progress-estimator.ts`; `VideoOverlay` gets `eta` and `throughputMBs` props; `lightbird-player.tsx` creates estimator per file load and passes stats to overlay. All 243 tests pass. |
| 03 | Cancellation | Pending | — | Depends on sub-plan 1 |
| 04 | Audio track remux cache | Pending | — | Independent |
| 05 | Native fallback first | Pending | — | Independent |
