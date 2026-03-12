# Issue HLS-01 — HLSPlayer Class + Factory Routing

**Plan:** hls-dash
**Labels:** `enhancement`, `streaming`
**Depends on:** —
**Blocks:** HLS-02, HLS-03

---

## Problem

HLS `.m3u8` streams do not play in Chrome/Firefox when set directly as `video.src`. There is no `HLSPlayer` class and no factory routing for HLS URLs.

## Goal

Create an `HLSPlayer` class using `hls.js` and wire it into `createVideoPlayer`.

## Acceptance Criteria

- [ ] `npm install hls.js` and `npm install --save-dev @types/hls.js`.
- [ ] `src/lib/players/hls-player.ts` is created. It implements the `VideoPlayer` interface from `video-processor.ts`:
  - `initialize(videoEl)`: detects Safari via `Hls.isSupported()`.
    - If NOT supported (Safari native HLS): set `videoEl.src = url` directly.
    - If supported: `new Hls()`, `hls.loadSource(url)`, `hls.attachMedia(videoEl)`.
    - `hls.js` is imported dynamically: `const Hls = (await import('hls.js')).default`.
  - `getAudioTracks()`: returns `hls.audioTracks` mapped to `AudioTrack[]`.
  - `getSubtitles()`: returns `[]` initially (subtitles are a stretch goal).
  - `switchAudioTrack(id)`: sets `hls.audioTrack`.
  - `destroy()`: calls `hls.destroy()` and revokes any object URLs.
  - `getQualityLevels(): QualityLevel[]` (new method, not in `VideoPlayer` interface — accessed directly by the quality selector hook).
  - `setQualityLevel(levelIndex: number): void` — set `hls.currentLevel` (-1 = auto).
- [ ] `HLSPlayerFile` type is added to `src/types/index.ts`: `{ url: string, qualityLevels: QualityLevel[] }`.
- [ ] `QualityLevel` type: `{ index: number; height: number; bitrate: number; name: string }`.
- [ ] `src/lib/video-processor.ts` `createVideoPlayer` is updated:
  - URLs ending in `.m3u8` or containing `application/x-mpegurl` hint → `HLSPlayer`.
  - Helper: `isHlsUrl(url: string): boolean`.
- [ ] Tests in `src/lib/__tests__/hls-player.test.ts`:
  - `isHlsUrl` correctly identifies `.m3u8` URLs.
  - `HLSPlayer.initialize` calls `Hls.loadSource` when `Hls.isSupported()` is true.
  - `HLSPlayer.initialize` sets `videoEl.src` directly when `Hls.isSupported()` is false.
  - `destroy` calls `hls.destroy`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Install | `hls.js @types/hls.js` |
| Create | `src/lib/players/hls-player.ts` |
| Create | `src/lib/__tests__/hls-player.test.ts` |
| Modify | `src/types/index.ts` (add HLSPlayerFile, QualityLevel) |
| Modify | `src/lib/video-processor.ts` (route HLS URLs to HLSPlayer) |
