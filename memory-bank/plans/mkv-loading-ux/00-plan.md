# MKV Loading UX — Master Plan

**Status:** 🔲 PENDING
**Priority:** HIGH (named in the current branch)
**New dependencies:** None

---

## Problem

Loading a large MKV file is painful:

1. The entire file (can be 1–10 GB) is written to FFmpeg's in-memory virtual FS before anything happens.
2. The remux runs synchronously on the main thread, freezing the UI and making the browser appear unresponsive.
3. The progress bar shows a rough `0–100%` but provides no ETA and cannot be cancelled.
4. There is no way to abort mid-remux (e.g. the user picks the wrong file and wants to cancel).
5. Audio track switching reruns a full remux from scratch, causing another long wait.

---

## Goals

1. **Offload FFmpeg to a Web Worker** so the main thread (and UI) stays responsive during remux.
2. **Show a meaningful progress UI**: percentage, estimated time remaining, MB/s transfer rate.
3. **Allow cancellation** mid-remux with a "Cancel" button that cleans up resources.
4. **Cache remuxed tracks** so switching between already-remuxed audio tracks is instant.
5. **Fast-path: native playback first** — attempt to play the raw MKV natively before remuxing; most modern Chromium builds can play common MKV+H.264 files natively.

---

## Architecture

```
lightbird-player.tsx
  └── useMkvLoader (new hook)
        ├── spawns Web Worker (ffmpeg.worker.ts)
        │     └── runs FFmpeg.wasm (probe + remux)
        │     └── posts progress messages back
        ├── tracks cancellation via AbortController-like flag
        ├── caches completed remux blobs per audio track
        └── exposes { status, progress, eta, cancel, result }
```

The Web Worker lives at `src/lib/workers/ffmpeg.worker.ts`. It is loaded via Next.js's built-in Worker support (`new Worker(new URL('../lib/workers/ffmpeg.worker.ts', import.meta.url))`).

---

## Issues

| # | File | What it delivers |
|---|------|-----------------|
| 01 | `01-web-worker.md` | FFmpeg Web Worker wrapper |
| 02 | `02-progress-ui.md` | ETA + MB/s progress overlay |
| 03 | `03-cancellation.md` | Cancel button + resource cleanup |
| 04 | `04-audio-track-cache.md` | Cache remuxed blobs per audio track |
| 05 | `05-native-fallback-first.md` | Try native playback before remuxing |

---

## Success Criteria

- The browser UI (scrolling, clicking, typing) is fully responsive while a 4 GB MKV is remuxing.
- The progress overlay shows "~2 min remaining" and "45 MB/s" instead of just a percentage.
- A "Cancel" button appears during remux; pressing it stops FFmpeg and returns the player to the empty state within 1 second.
- Switching from audio track 1 → audio track 2 → back to audio track 1 shows the cached result instantly.
- A standard H.264+AAC MKV file plays back immediately via native fallback, with no remux delay at all.
