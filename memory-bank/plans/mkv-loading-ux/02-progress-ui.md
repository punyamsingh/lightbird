# Issue MKV-02 — ETA + Throughput Progress UI

**Plan:** mkv-loading-ux
**Labels:** `ux`, `mkv`
**Depends on:** MKV-01 (worker provides timestamped progress events)
**Blocks:** —

---

## Problem

The current progress bar shows only a percentage (`37%`). For a 4 GB file remuxing at 60 MB/s, this gives no sense of how long is left. Users cannot tell if they should wait 10 seconds or 10 minutes.

## Goal

Enrich the loading overlay with:
- Percentage (existing)
- Estimated time remaining (e.g. "~1 min 23 sec remaining")
- Processing throughput (e.g. "82 MB/s")

## Acceptance Criteria

- [ ] `src/lib/progress-estimator.ts` is created with:
  - `class ProgressEstimator` that takes `fileSizeBytes: number` in constructor.
  - `update(progress: number): void` — records `(timestamp, progress)` sample. Keeps a rolling window of the last 5 samples.
  - `getEtaSeconds(): number | null` — null until at least 2 samples exist. Computes rate from rolling window, returns remaining time.
  - `getThroughputMBs(): number | null` — MB of source file processed per second, based on rolling window.
- [ ] Unit tests in `src/lib/__tests__/progress-estimator.test.ts`:
  - Returns `null` for ETA with < 2 samples.
  - Returns a reasonable ETA after several samples.
  - ETA approaches 0 as progress → 1.
- [ ] `VideoOverlay` (`src/components/video-overlay.tsx`) is updated to accept optional `eta?: number | null` and `throughputMBs?: number | null` props.
- [ ] When both are non-null, the overlay renders:
  - `~{formatEta(eta)} remaining`
  - `{throughputMBs.toFixed(0)} MB/s`
  - Both beneath the existing progress bar.
- [ ] `lightbird-player.tsx` instantiates a `ProgressEstimator` for the current file, feeds it progress updates from `useMkvLoader`, and passes the results to `VideoOverlay`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/progress-estimator.ts` |
| Create | `src/lib/__tests__/progress-estimator.test.ts` |
| Modify | `src/components/video-overlay.tsx` (add eta + throughput display) |
| Modify | `src/components/lightbird-player.tsx` (instantiate estimator, pass props) |
