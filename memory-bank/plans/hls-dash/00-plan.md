# HLS / DASH Adaptive Streaming — Master Plan

**Status:** 🔲 PENDING
**Priority:** MEDIUM
**New dependencies:** `hls.js` (~200 kB gzip)

---

## Problem

When a user pastes an HLS stream URL (`.m3u8`) or a DASH manifest (`.mpd`) into the "Add Stream" dialog, the raw `<video src="…">` approach either:
- Works only in Safari (which has native HLS support) and fails silently in Chrome/Firefox.
- Fails entirely for DASH.

There is also no quality selector — users cannot choose between 1080p, 720p, and 360p renditions even when the stream offers them.

---

## Goals

1. Detect HLS and DASH URLs and route them through the appropriate library.
2. Use `hls.js` for HLS streams in non-Safari browsers (Safari uses native HLS).
3. Use the browser's native handling as a fallback for browsers that support HLS natively.
4. Show a quality selector dropdown when the stream offers multiple renditions.
5. Show stream-specific info (bitrate, resolution) in the video info panel.

---

## Architecture

```
createVideoPlayer(url) [video-processor.ts]
  ├── url ends in .mkv                 → MKVPlayer
  ├── url ends in .m3u8 / contains HLS → HLSPlayer (new)
  ├── url ends in .mpd                 → DASHPlayer (future stretch goal)
  └── else                             → SimplePlayer
```

`HLSPlayer` wraps `hls.js`:
- Detects Safari (native HLS) → set `video.src` directly.
- All other browsers → `new Hls()`, `hls.loadSource(url)`, `hls.attachMedia(videoEl)`.

---

## Issues

| # | File | What it delivers |
|---|------|-----------------|
| 01 | `01-hls-player.md` | `HLSPlayer` class + factory routing |
| 02 | `02-quality-selector.md` | Quality level selector UI |
| 03 | `03-stream-info-enrichment.md` | Expose HLS stream metadata to VideoInfoPanel |

---

## Success Criteria

- Pasting an HLS `.m3u8` URL in Chrome plays immediately without errors.
- Safari uses native HLS (no hls.js bundle loaded).
- A quality dropdown appears in the controls for multi-rendition streams.
- Selecting "Auto" lets hls.js choose the quality automatically (ABR).
- The video info panel shows the current stream bitrate and resolution.
- `hls.js` bundle is loaded lazily (dynamic import) — MP4/MKV users never download it.
