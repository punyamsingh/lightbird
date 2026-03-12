# Plan 09 — Video Information Panel [DONE]

## Implementation Summary (2026-03-12)

- **`src/types/index.ts`** — Added `VideoMetadata`, `AudioTrackMeta`, `SubtitleTrackMeta` types.
- **`src/lib/video-info.ts`** — `extractNativeMetadata()` extracts filename, size, duration, resolution, and container from `HTMLVideoElement` + `File`.
- **`src/hooks/use-video-info.ts`** — `useVideoInfo(videoRef, currentFile)` hook: listens to `loadedmetadata`, updates `metadata` state, exposes `enrichMetadata()` for future FFmpeg-derived data.
- **`src/components/video-info-panel.tsx`** — Overlay panel showing video info table with formatted values; gracefully shows `—` for missing data.
- **`src/components/lightbird-player.tsx`** — Wires `useVideoInfo`; `showInfo` toggle renders `VideoInfoPanel`; Info button in `PlayerControls`.

---


## Problem

Users have no way to see technical metadata about the video they are playing:
- Resolution, codec, frame rate, bitrate, container format.
- File size and duration.
- Audio track details (codec, channels, sample rate).
- Subtitle track details.

This information is particularly valuable when debugging playback issues or deciding whether to transcode a file.

The `blueprint.md` lists "Display video information (codec, resolution, bitrate)" as a planned feature that has not been implemented.

## Goal

Add an "Info" panel (accessible from the player controls) that displays all available technical metadata for the currently playing file, populated with data from two sources:
1. The native `HTMLVideoElement` API (`videoWidth`, `videoHeight`, `duration`, etc.).
2. FFmpeg probe data for MKV files (codec, bitrate, audio channels — see Plan 02).

---

## Step-by-Step Implementation

### Step 1 — Define the `VideoMetadata` Type

Add to `src/types/index.ts`:

```ts
export interface VideoMetadata {
  // Container
  filename: string;
  fileSize: number | null;         // bytes, null for streams
  duration: number;                // seconds
  container: string;               // e.g. 'MP4', 'MKV', 'WebM'

  // Video stream
  width: number;
  height: number;
  frameRate: number | null;        // fps, if detectable
  videoBitrate: number | null;     // bits/sec
  videoCodec: string | null;       // e.g. 'H.264', 'H.265', 'VP9'
  colorSpace: string | null;       // e.g. 'BT.709'

  // Audio stream(s)
  audioTracks: AudioTrackMeta[];

  // Subtitles
  subtitleTracks: SubtitleTrackMeta[];
}

export interface AudioTrackMeta {
  index: number;
  codec: string | null;
  channels: number | null;
  sampleRate: number | null;
  language: string | null;
  bitrate: number | null;
}

export interface SubtitleTrackMeta {
  index: number;
  format: string | null;
  language: string | null;
}
```

### Step 2 — Collect Metadata from Native HTML5 API

Create `src/lib/video-info.ts`:

```ts
export function extractNativeMetadata(
  videoEl: HTMLVideoElement,
  file?: File
): Partial<VideoMetadata> {
  const container = file
    ? file.name.split('.').pop()?.toUpperCase() ?? 'Unknown'
    : detectContainerFromUrl(videoEl.currentSrc);

  return {
    filename: file?.name ?? videoEl.currentSrc,
    fileSize: file?.size ?? null,
    duration: videoEl.duration || 0,
    container,
    width: videoEl.videoWidth,
    height: videoEl.videoHeight,
    // frameRate, bitrate, codec not available via HTMLVideoElement API
    frameRate: null,
    videoBitrate: null,
    videoCodec: null,
    colorSpace: null,
    audioTracks: [],
    subtitleTracks: [],
  };
}

function detectContainerFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toUpperCase();
  return ext ?? 'Unknown';
}
```

For local MP4/WebM/etc. files, this gives us: filename, size, duration, resolution, and container format.

### Step 3 — Extend FFmpeg Probe for Rich Metadata (MKV)

When `MkvPlayer.probe()` runs (Plan 02), parse the FFmpeg log output for additional details and populate a full `VideoMetadata` object:

```ts
// In mkv-player.ts, extend probe() to return VideoMetadata
function parseFFmpegLog(log: string, file: File): VideoMetadata {
  const videoStream = log.match(/Stream #0:\d+.*Video: (\w+).*, (\d+)x(\d+).*, ([\d.]+) fps/);
  const audioStream = log.match(/Stream #0:\d+.*Audio: (\w+).*, (\d+) Hz, (\w+)/g);
  const bitrateMatch = log.match(/bitrate: (\d+) kb\/s/);

  return {
    filename: file.name,
    fileSize: file.size,
    duration: /* parse from log or videoEl.duration */,
    container: 'MKV',
    width: videoStream ? parseInt(videoStream[2]) : 0,
    height: videoStream ? parseInt(videoStream[3]) : 0,
    frameRate: videoStream ? parseFloat(videoStream[4]) : null,
    videoBitrate: bitrateMatch ? parseInt(bitrateMatch[1]) * 1000 : null,
    videoCodec: videoStream ? mapCodecName(videoStream[1]) : null,
    colorSpace: null,
    audioTracks: parseAudioTracks(audioStream ?? []),
    subtitleTracks: [],
  };
}

function mapCodecName(ffmpegCodec: string): string {
  const map: Record<string, string> = {
    h264: 'H.264 (AVC)', hevc: 'H.265 (HEVC)', vp9: 'VP9',
    av1: 'AV1', mpeg4: 'MPEG-4', vp8: 'VP8',
  };
  return map[ffmpegCodec.toLowerCase()] ?? ffmpegCodec;
}
```

### Step 4 — Create `useVideoInfo` Hook

Path: `src/hooks/use-video-info.ts`

```ts
export function useVideoInfo(
  videoRef: RefObject<HTMLVideoElement>,
  currentFile: File | null
): VideoMetadata | null {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Update on video load (native data)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      const native = extractNativeMetadata(el, currentFile ?? undefined);
      setMetadata(prev => ({ ...prev, ...native } as VideoMetadata));
    };

    el.addEventListener('loadedmetadata', onLoaded);
    return () => el.removeEventListener('loadedmetadata', onLoaded);
  }, [videoRef, currentFile]);

  // Allow external enrichment (e.g. FFmpeg probe data)
  function enrichMetadata(extra: Partial<VideoMetadata>) {
    setMetadata(prev => prev ? { ...prev, ...extra } : null);
  }

  return metadata;
}
```

### Step 5 — Build `VideoInfoPanel` Component

Path: `src/components/video-info-panel.tsx`

```tsx
export function VideoInfoPanel({ metadata, onClose }: { metadata: VideoMetadata | null; onClose: () => void }) {
  if (!metadata) return null;

  function formatSize(bytes: number | null) {
    if (!bytes) return '—';
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  }

  function formatBitrate(bps: number | null) {
    if (!bps) return '—';
    return bps > 1e6 ? `${(bps / 1e6).toFixed(1)} Mbps` : `${(bps / 1e3).toFixed(0)} Kbps`;
  }

  const rows: [string, string][] = [
    ['File', metadata.filename],
    ['Size', formatSize(metadata.fileSize)],
    ['Duration', formatTime(metadata.duration)],
    ['Container', metadata.container],
    ['Resolution', `${metadata.width} × ${metadata.height}`],
    ['Frame Rate', metadata.frameRate ? `${metadata.frameRate} fps` : '—'],
    ['Video Codec', metadata.videoCodec ?? '—'],
    ['Video Bitrate', formatBitrate(metadata.videoBitrate)],
    ...(metadata.audioTracks.map((t, i) => [`Audio ${i + 1}`, `${t.codec ?? '?'} · ${t.channels}ch · ${t.sampleRate ? t.sampleRate / 1000 : '?'} kHz`] as [string, string])),
  ];

  return (
    <div className="absolute top-4 right-4 z-40 bg-black/85 text-white rounded-lg p-4 text-xs w-72">
      <div className="flex justify-between mb-3">
        <h3 className="font-semibold text-sm">Video Information</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-white/10 last:border-0">
              <td className="py-1 pr-3 text-muted-foreground">{label}</td>
              <td className="py-1 text-right font-mono break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Step 6 — Wire Up in `LightBirdPlayer`

```tsx
const videoInfo = useVideoInfo(videoRef, currentFile);
const [showInfo, setShowInfo] = useState(false);

// When FFmpeg probe completes (MKV), enrich:
// videoInfo.enrichMetadata(ffmpegProbeResult);

return (
  <div>
    <video ref={videoRef} />
    {showInfo && <VideoInfoPanel metadata={videoInfo} onClose={() => setShowInfo(false)} />}
    <PlayerControls onShowInfo={() => setShowInfo(v => !v)} ... />
  </div>
);
```

### Step 7 — Add Info Button to `PlayerControls`

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" onClick={onShowInfo}>
      <Info className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Video Information</TooltipContent>
</Tooltip>
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Modify | `src/types/index.ts` (add `VideoMetadata`, `AudioTrackMeta`, `SubtitleTrackMeta`) |
| Create | `src/lib/video-info.ts` |
| Create | `src/hooks/use-video-info.ts` |
| Create | `src/components/video-info-panel.tsx` |
| Modify | `src/components/lightbird-player.tsx` (wire hook + panel) |
| Modify | `src/components/player-controls.tsx` (info button) |
| Modify | `src/lib/players/mkv-player.ts` (return `VideoMetadata` from probe) |

---

## Success Criteria

- Pressing the Info button (or a keyboard shortcut) shows the info panel.
- For an MP4 file: filename, size, duration, resolution, and container are displayed.
- For an MKV file (with Plan 02 complete): codec, frame rate, bitrate, and audio track details are also shown.
- The panel closes with the same button, a close icon, or by pressing Escape.
- All values gracefully show `—` when the data is unavailable.
