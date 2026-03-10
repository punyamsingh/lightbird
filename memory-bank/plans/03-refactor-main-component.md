# Plan 03 — Refactor `lightbird-player.tsx` (Component Split)

## Problem

`lightbird-player.tsx` is 612 lines long and manages too many responsibilities in one place:

- 13+ `useState` hooks in a single component
- Video event listeners
- File handling and format detection
- Keyboard shortcut system
- Screenshot logic
- Video filter application
- Playlist management
- Subtitle orchestration
- Fullscreen management
- Progress persistence

This makes it hard to read, test, and extend. A change to the subtitle system risks breaking the keyboard shortcuts.

## Goal

Split `LightBirdPlayer` into focused, single-responsibility units:
- Custom hooks for each domain of logic.
- Sub-components for distinct UI regions.
- The root component becomes a thin coordinator.

---

## Proposed Structure

```
src/
  components/
    lightbird-player.tsx          ← thin root (~100 lines)
    player-controls.tsx           ← (existing, keep as-is)
    playlist-panel.tsx            ← (existing, keep as-is)
    video-overlay.tsx             ← NEW: processing overlay, filters div
  hooks/
    use-video-playback.ts         ← NEW: play/pause/seek/volume/rate state
    use-video-filters.ts          ← NEW: brightness/contrast/saturation/hue state
    use-subtitles.ts              ← NEW: subtitle list, add/remove logic
    use-playlist.ts               ← NEW: playlist state, add file/URL, navigate
    use-keyboard-shortcuts.ts     ← NEW: keyboard event registration
    use-fullscreen.ts             ← NEW: fullscreen enter/exit/detect
    use-progress-persistence.ts   ← NEW: localStorage save/restore
    use-mobile.ts                 ← (existing)
    use-toast.ts                  ← (existing)
```

---

## Step-by-Step Implementation

### Step 1 — Extract `useVideoPlayback` hook

Path: `src/hooks/use-video-playback.ts`

Owns:
- `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `playbackRate`
- All `videoEl` event listeners: `timeupdate`, `durationchange`, `ended`, `volumechange`, `play`, `pause`
- Functions: `play()`, `pause()`, `togglePlay()`, `seek(t)`, `setVolume(v)`, `toggleMute()`, `setRate(r)`

```ts
export function useVideoPlayback(videoRef: RefObject<HTMLVideoElement>) {
  const [isPlaying, setIsPlaying] = useState(false);
  // ... all related state

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    // ...
    return () => { el.removeEventListener(...); };
  }, [videoRef]);

  return { isPlaying, currentTime, duration, volume, isMuted, playbackRate, togglePlay, seek, ... };
}
```

### Step 2 — Extract `useVideoFilters` hook

Path: `src/hooks/use-video-filters.ts`

Owns:
- `filters: VideoFilters` state
- `zoom` state
- `cssFilterString` computed value
- `updateFilter(key, value)` function
- `resetFilters()` function
- A `useEffect` that applies `cssFilterString` to `videoRef.current.style.filter`

```ts
export function useVideoFilters(videoRef: RefObject<HTMLVideoElement>) {
  const [filters, setFilters] = useState<VideoFilters>({ brightness: 100, contrast: 100, saturate: 100, hue: 0 });
  const [zoom, setZoom] = useState(100);

  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) hue-rotate(${filters.hue}deg)`;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = cssFilter;
      videoRef.current.style.transform = `scale(${zoom / 100})`;
    }
  }, [filters, zoom, videoRef]);

  return { filters, zoom, updateFilter, setZoom, resetFilters };
}
```

### Step 3 — Extract `useSubtitles` hook

Path: `src/hooks/use-subtitles.ts`

Owns:
- `subtitles: Subtitle[]` state
- Reference to `UniversalSubtitleManager` instance
- `addSubtitleFile(file)` function
- `removeSubtitle(id)` function
- `selectSubtitle(id)` function
- Active subtitle ID state

### Step 4 — Extract `usePlaylist` hook

Path: `src/hooks/use-playlist.ts`

Owns:
- `playlist: PlaylistItem[]` state
- `currentIndex` state
- `addFiles(files)` function
- `addStreamUrl(url)` function
- `selectItem(index)` function
- `nextItem()` / `prevItem()` functions
- `removeItem(index)` function

### Step 5 — Extract `useKeyboardShortcuts` hook

Path: `src/hooks/use-keyboard-shortcuts.ts`

Owns:
- `useEffect` that registers `keydown` listener on `document`
- Dispatches to `playback.togglePlay()`, `playback.seek()`, `playback.setVolume()`, etc.
- Cleanup on unmount

```ts
export function useKeyboardShortcuts(
  playback: ReturnType<typeof useVideoPlayback>,
  fullscreen: ReturnType<typeof useFullscreen>
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      switch(e.key) {
        case ' ': e.preventDefault(); playback.togglePlay(); break;
        case 'ArrowRight': playback.seek(playback.currentTime + 5); break;
        case 'ArrowLeft': playback.seek(playback.currentTime - 5); break;
        case 'ArrowUp': playback.setVolume(Math.min(1, playback.volume + 0.1)); break;
        case 'ArrowDown': playback.setVolume(Math.max(0, playback.volume - 0.1)); break;
        case 'm': case 'M': playback.toggleMute(); break;
        case 'f': case 'F': fullscreen.toggle(); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [playback, fullscreen]);
}
```

### Step 6 — Extract `useFullscreen` hook

Path: `src/hooks/use-fullscreen.ts`

Owns:
- `isFullscreen` state
- `toggle()` function (requests/exits fullscreen on the player container)
- `useEffect` listening to `fullscreenchange` event

### Step 7 — Extract `useProgressPersistence` hook

Path: `src/hooks/use-progress-persistence.ts`

Owns:
- Reading saved position from localStorage on video load.
- Writing current time to localStorage on `timeupdate` (debounced — every 5s, not every frame).

```ts
export function useProgressPersistence(videoRef, currentVideoName: string | null) {
  // Restore
  useEffect(() => {
    if (!currentVideoName || !videoRef.current) return;
    const saved = localStorage.getItem(`lightbirdplayer-${currentVideoName}`);
    if (saved) videoRef.current.currentTime = parseFloat(saved);
  }, [currentVideoName]);

  // Save (debounced)
  // ...
}
```

### Step 8 — Create `VideoOverlay` component

Path: `src/components/video-overlay.tsx`

Renders:
- Processing progress bar (for FFmpeg operations).
- Volume change indicator (OSD-style, fades out).
- Screenshot flash animation.

### Step 9 — Slim Down Root Component

After extracting all hooks, `lightbird-player.tsx` should look like:

```tsx
export function LightBirdPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const playlist = usePlaylist();
  const playback = useVideoPlayback(videoRef);
  const filters = useVideoFilters(videoRef);
  const subtitles = useSubtitles(videoRef);
  const fullscreen = useFullscreen(containerRef);
  useKeyboardShortcuts(playback, fullscreen);
  useProgressPersistence(videoRef, playlist.currentItem?.name ?? null);

  // Load new video when playlist selection changes
  useEffect(() => { /* set videoRef.src */ }, [playlist.currentItem]);

  return (
    <div ref={containerRef}>
      <video ref={videoRef} />
      <VideoOverlay />
      <PlayerControls playback={playback} filters={filters} subtitles={subtitles} ... />
      <PlaylistPanel playlist={playlist} />
    </div>
  );
}
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Rewrite | `src/components/lightbird-player.tsx` |
| Create | `src/hooks/use-video-playback.ts` |
| Create | `src/hooks/use-video-filters.ts` |
| Create | `src/hooks/use-subtitles.ts` |
| Create | `src/hooks/use-playlist.ts` |
| Create | `src/hooks/use-keyboard-shortcuts.ts` |
| Create | `src/hooks/use-fullscreen.ts` |
| Create | `src/hooks/use-progress-persistence.ts` |
| Create | `src/components/video-overlay.tsx` |

---

## Success Criteria

- `lightbird-player.tsx` is under 120 lines.
- No individual hook file exceeds 100 lines.
- All existing features work identically after the refactor.
- Each hook can be unit-tested in isolation (pairs well with Plan 01).
