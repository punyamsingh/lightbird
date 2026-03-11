# Plan 02 — Complete MKV Player with FFmpeg.wasm [DONE]

## Implementation Summary (2026-03-11)

- Created `src/lib/ffmpeg-singleton.ts`: lazy-loaded shared FFmpeg.wasm instance loaded from unpkg CDN on first MKV file open.
- Rewrote `src/lib/players/mkv-player.ts`: probes stream info via FFmpeg log output (`parseStreamInfo`), remuxes to fragmented MP4 for browser playback (`_remux`), extracts embedded subtitle tracks on demand (`_extractSubtitle`), and falls back to native `<video>` playback when FFmpeg is unavailable.
- Updated `src/lib/video-processor.ts`: `createVideoPlayer` accepts optional `onProgress` callback forwarded to `MKVPlayerAdapter → MKVPlayer`.
- Updated `src/components/lightbird-player.tsx`: added `processingProgress` state; passes progress callback to `createVideoPlayer`; loading overlay shows a 0–100% progress bar during FFmpeg remux.
- Added tests: `ffmpeg-singleton.test.ts` (singleton lifecycle) and `mkv-player.test.ts` (`parseStreamInfo`, fallback, progress callback, embedded subtitle metadata).
- All 68 tests pass.

---

## Problem

`mkv-player.ts` is a placeholder. It loads MKV files using the browser's native `<video>` element, which cannot demux MKV containers and fails to expose embedded audio tracks or subtitles. The `FFmpeg.wasm` package is already installed but unused.

## Goal

Implement real MKV container support:
- Demux MKV to extract video, audio tracks, and embedded subtitle tracks.
- Play the demuxed stream natively.
- Expose audio track metadata to the UI for track switching.
- Extract embedded subtitle tracks (SRT/ASS/SSA) and hand them to `UniversalSubtitleManager`.

---

## Architecture Overview

```
MkvPlayer
  ├── Initialise FFmpeg.wasm worker (lazy, on first MKV load)
  ├── probe(file) → TrackMetadata[]
  ├── remux(file, audioTrackId?) → Blob (mp4/webm container)
  ├── extractSubtitle(file, trackId) → string (SRT or VTT text)
  └── VideoPlayer interface adapter
```

FFmpeg.wasm runs in a Web Worker via SharedArrayBuffer (already enabled in `next.config.ts` via COOP/COEP headers).

---

## Step-by-Step Implementation

### Step 1 — Audit Current FFmpeg Setup

Read `next.config.ts` to confirm COOP/COEP headers are correctly set. Verify `@ffmpeg/ffmpeg` and `@ffmpeg/util` versions in `package.json`. Confirm `asyncWebAssembly: true` is in webpack config.

### Step 2 — Create `ffmpeg-singleton.ts`

Path: `src/lib/ffmpeg-singleton.ts`

Single shared FFmpeg instance to avoid loading the WASM binary multiple times:

```ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    instance = ffmpeg;
    return ffmpeg;
  })();

  return loading;
}

export function resetFFmpeg() {
  instance = null;
  loading = null;
}
```

> Note: for production, copy the FFmpeg core assets into `/public/ffmpeg/` and reference them locally to avoid external CDN dependency.

### Step 3 — Implement `probeFile()` in MkvPlayer

Use `ffprobe` equivalent: run FFmpeg with `-f null` output and parse stderr for stream info.

```ts
async probe(file: File): Promise<{ videoTracks: TrackInfo[], audioTracks: TrackInfo[], subtitleTracks: TrackInfo[] }> {
  const ffmpeg = await getFFmpeg();
  await ffmpeg.writeFile(file.name, await fetchFile(file));
  // Run ffmpeg with -f null to get stream info logged to stderr
  await ffmpeg.exec(['-i', file.name, '-f', 'null', '-']);
  // Parse ffmpeg.logs() for "Stream #0:X" entries
  const logs = /* capture ffmpeg log output */;
  return parseStreamInfo(logs);
}
```

Parse output lines like:
- `Stream #0:0: Video: h264` → video track
- `Stream #0:1: Audio: aac, stereo` → audio track
- `Stream #0:2: Subtitle: subrip` → subtitle track

### Step 4 — Implement `remux()` for Playback

Extract and remux to a browser-compatible container (MP4 fragmented or WebM):

```ts
async remux(file: File, audioTrackIndex = 0): Promise<string> {
  const ffmpeg = await getFFmpeg();
  await ffmpeg.writeFile(file.name, await fetchFile(file));

  const outputName = 'output.mp4';
  await ffmpeg.exec([
    '-i', file.name,
    '-map', '0:v:0',          // first video stream
    '-map', `0:a:${audioTrackIndex}`,  // selected audio
    '-c:v', 'copy',           // no re-encode
    '-c:a', 'aac',            // transcode audio to AAC for browser compat
    '-movflags', 'frag_keyframe+empty_moov',  // fragmented MP4 for streaming
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });
  return URL.createObjectURL(blob);
}
```

### Step 5 — Implement `extractSubtitle()`

```ts
async extractSubtitle(file: File, trackIndex: number): Promise<string> {
  const ffmpeg = await getFFmpeg();
  await ffmpeg.writeFile(file.name, await fetchFile(file));

  const outputName = `subtitle_${trackIndex}.srt`;
  await ffmpeg.exec([
    '-i', file.name,
    '-map', `0:s:${trackIndex}`,
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  return new TextDecoder().decode(data as Uint8Array);
}
```

Hand the resulting SRT string to `SubtitleConverter.srtToVtt()` then to `UniversalSubtitleManager`.

### Step 6 — Rewrite `MkvPlayer` class

Implement the full `VideoPlayer` interface:

```ts
class MkvPlayer implements VideoPlayer {
  private videoEl: HTMLVideoElement;
  private objectUrl: string | null = null;
  private tracks: TrackInfo[] = [];

  async load(file: File) { /* probe → remux → set src */ }
  async switchAudioTrack(index: number) { /* remux with new audio map */ }
  async getSubtitles() { /* extract all subtitle tracks */ }
  dispose() { /* revoke objectUrl, cleanup */ }
  // ... play, pause, seek, etc.
}
```

### Step 7 — Add Loading UI

MKV remuxing takes time. Show a progress indicator in `LightBirdPlayer`:
- FFmpeg exposes a `progress` event: `ffmpeg.on('progress', ({ progress }) => ...)`
- Wire this to a new `processingProgress` state in `LightBirdPlayer`.
- Show a progress bar overlay when `processingProgress > 0 && < 1`.

### Step 8 — Update `video-processor.ts`

Ensure the factory creates a real `MkvPlayer` (not the placeholder) and passes it through:

```ts
if (ext === 'mkv') return new MkvPlayer(videoEl);
```

### Step 9 — Audio Track Switching in UI

Currently `handleAudioTrackChange` in `lightbird-player.tsx` is a no-op. Wire it:

```ts
async function handleAudioTrackChange(trackId: string) {
  if (currentPlayer instanceof MkvPlayer) {
    setIsProcessing(true);
    const newUrl = await currentPlayer.switchAudioTrack(parseInt(trackId));
    videoRef.current!.src = newUrl;
    setIsProcessing(false);
  }
}
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Create | `src/lib/ffmpeg-singleton.ts` |
| Rewrite | `src/lib/players/mkv-player.ts` |
| Modify | `src/lib/video-processor.ts` (wire real MkvPlayer) |
| Modify | `src/components/lightbird-player.tsx` (progress UI + audio switching) |
| Modify | `src/components/player-controls.tsx` (show processing state) |

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| FFmpeg WASM download is large (~31 MB) | Load lazily only on first MKV file; show progress |
| SharedArrayBuffer requires COOP/COEP headers | Already set in `next.config.ts` |
| Remux can be slow for large files | Off-load to Web Worker; show progress bar |
| Some MKV codecs (e.g. HEVC) may not play in browser | Detect and warn user; attempt transcode to H.264 |

---

## Success Criteria

- MKV files play correctly in Chrome and Firefox.
- Embedded audio tracks appear in the audio track selector and switching works.
- Embedded subtitles appear in the subtitle selector.
- A loading progress indicator is shown during FFmpeg processing.
