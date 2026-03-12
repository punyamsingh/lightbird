# Plan 11 — MKV Loading UX Improvements

## Status: PENDING

## Problem

The current MKV loading experience has 5 distinct issues:

1. **FFmpeg blocks the main thread** — `FFmpeg.exec()` runs synchronously on the JS event loop, freezing the UI during remux (can be 10–60 seconds for large files).
2. **Progress bar is inaccurate** — shows percentage only; no speed (MB/s) or ETA.
3. **No cancellation** — once remux starts, the user cannot cancel it.
4. **Audio track switching re-remuxes** — switching from track 0 → 1 → 0 runs FFmpeg twice; the first result was already computed.
5. **Always remuxes, even when unnecessary** — some MKV files use H.264+AAC which browsers can play natively. FFmpeg is still invoked, adding 5–30s of unnecessary delay.

---

## 5 Sub-Plans (implement in this order)

| # | File | What it fixes | Effort |
|---|---|---|---|
| 1 | `01-web-worker.md` | Main thread freeze | High |
| 2 | `02-progress-ui.md` | Inaccurate progress | Medium |
| 3 | `03-cancellation.md` | No cancel button | Medium |
| 4 | `04-audio-track-cache.md` | Redundant re-remux | Low |
| 5 | `05-native-fallback-first.md` | Always remuxes | Low |

> **Critical dependency:** Sub-plans 2 and 3 depend on sub-plan 1. Do sub-plan 1 first.
> Sub-plans 4 and 5 are independent of each other and of 1–3 (they modify `_remux` and `initialize` respectively).

---

## Files That Will Change

| File | Changed by |
|---|---|
| `src/lib/players/mkv-player.ts` | All 5 sub-plans |
| `src/lib/workers/ffmpeg-worker.ts` | Sub-plan 1 (new file) |
| `src/lib/ffmpeg-singleton.ts` | Sub-plan 1 (no longer used by MKV player) |
| `src/components/lightbird-player.tsx` | Sub-plans 2, 3 |
| `src/lib/__tests__/mkv-player.test.ts` | All 5 sub-plans |
| `src/lib/__tests__/ffmpeg-worker.test.ts` | Sub-plan 1 (new test file) |

---

## Architecture After All 5 Plans

```
User drops MKV file
        │
        ▼
MKVPlayer.initialize()
        │
        ├─► canPlayNatively() [sub-plan 5]
        │      ├─ YES → set src directly, return (no FFmpeg)
        │      └─ NO  → continue to worker
        │
        ▼
FFmpegWorker.remux(file, audioTrack=0) [sub-plan 1]
        │
        ├─► worker posts PROGRESS messages → ProgressEstimator [sub-plan 2]
        │      └─ component shows "45% · 2.3 MB/s · ~12s remaining"
        │
        ├─► user clicks Cancel → worker.terminate() [sub-plan 3]
        │
        └─► DONE → Uint8Array → Blob → objectURL → video.src
                └─ result stored in remuxCache[0] [sub-plan 4]

User switches audio track → 1
        │
        └─► remuxCache.has(1)? NO → worker remux with audioTrack=1
                                    → store in remuxCache[1]

User switches audio track → 0
        │
        └─► remuxCache.has(0)? YES → return cached URL instantly
```

---

## Test Strategy

Each sub-plan includes its own test additions. The overall test suite after all 5 plans:

- `ffmpeg-worker.test.ts` — worker message protocol, progress forwarding, cancellation
- `mkv-player.test.ts` — add: cache hit/miss, native fallback path, worker integration
- `progress-estimator.test.ts` — speed and ETA calculations

Run `npm test` after each sub-plan to catch regressions early.
