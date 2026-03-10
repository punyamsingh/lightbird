# Plan 04 — Performance Optimization

## Problem

Several performance issues exist in the current codebase:

1. **No memoization**: `PlayerControls` and `PlaylistPanel` receive props but have no `React.memo` wrapping, so they re-render on every parent state change (e.g. every `timeupdate` firing 4 times/sec).
2. **`localStorage` written on every `timeupdate`**: `timeupdate` fires up to 4 times per second. Writing to `localStorage` synchronously that often blocks the main thread.
3. **No virtualization for playlists**: A playlist with 500+ items renders all DOM nodes at once.
4. **Heavy imports not code-split**: `FFmpeg.wasm` is imported at the module level in `mkv-player.ts`, meaning the WASM binary starts loading even for users who only play MP4 files.
5. **Filter CSS applied via inline style on every change**: The `style.filter` string is recomputed and applied synchronously via `useEffect`, which can cause layout thrashing if rapid slider input occurs.

## Goal

Eliminate unnecessary re-renders, defer expensive work, and reduce main-thread blocking.

---

## Step-by-Step Implementation

### Step 1 — Memoize Child Components

Wrap `PlayerControls` and `PlaylistPanel` with `React.memo`:

```tsx
// player-controls.tsx
export const PlayerControls = React.memo(function PlayerControls(props: PlayerControlsProps) {
  // ...
});

// playlist-panel.tsx
export const PlaylistPanel = React.memo(function PlaylistPanel(props: PlaylistPanelProps) {
  // ...
});
```

**Why this matters**: `LightBirdPlayer` state (e.g. `currentTime`) changes ~4x/second during playback. Without `memo`, both child components re-render ~4x/second even though their props didn't change. With `memo`, they only re-render when their actual props change.

Ensure callback props are stable by wrapping them in `useCallback` in the parent:

```tsx
const handlePlayPause = useCallback(() => { /* ... */ }, []);
const handleSeek = useCallback((t: number) => { /* ... */ }, []);
```

### Step 2 — Debounce `localStorage` Writes

In `use-progress-persistence.ts` (or wherever progress is saved), debounce writes to once every 5 seconds instead of on every `timeupdate`:

```ts
const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const saveProgress = useCallback((time: number) => {
  if (saveRef.current) clearTimeout(saveRef.current);
  saveRef.current = setTimeout(() => {
    localStorage.setItem(`lightbirdplayer-${videoName}`, String(time));
  }, 5000);
}, [videoName]);
```

This reduces `localStorage` writes from ~240/minute to ~12/minute during playback.

### Step 3 — Virtualize the Playlist

If the playlist can grow large (users drag in entire folders), render only visible items.

Install `@tanstack/react-virtual`:

```bash
npm install @tanstack/react-virtual
```

In `PlaylistPanel`, replace the flat map with a virtualized list:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: playlist.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,        // estimated item height in px
});

return (
  <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
    <div style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(vItem => (
        <div key={vItem.key} style={{ transform: `translateY(${vItem.start}px)` }}>
          <PlaylistItem item={playlist[vItem.index]} ... />
        </div>
      ))}
    </div>
  </div>
);
```

This renders only ~10-15 DOM nodes regardless of playlist size.

### Step 4 — Lazy-Load FFmpeg

Change the import in `mkv-player.ts` from a static import to a dynamic import inside the method that needs it:

```ts
// Before (loads WASM immediately on module parse):
import { FFmpeg } from '@ffmpeg/ffmpeg';

// After (loads only when an MKV file is actually opened):
async load(file: File) {
  const { getFFmpeg } = await import('../ffmpeg-singleton');
  const ffmpeg = await getFFmpeg();
  // ...
}
```

This prevents the ~31 MB WASM binary from being fetched for users who never open MKV files.

### Step 5 — Throttle Video Filter CSS Updates

When the user drags a filter slider rapidly, apply the CSS at most once per animation frame using `requestAnimationFrame`:

```ts
const rafRef = useRef<number | null>(null);

function applyFilter(newFilters: VideoFilters) {
  setFilters(newFilters); // update React state normally
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  rafRef.current = requestAnimationFrame(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = buildFilterString(newFilters);
    }
  });
}
```

This caps filter DOM updates at 60fps and avoids layout thrashing during fast slider drags.

### Step 6 — Memoize Derived Values

In `PlayerControls`, memoize values that are computed from props:

```tsx
const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
const formattedDuration = useMemo(() => formatTime(duration), [duration]);
const progressPercent = useMemo(() => duration > 0 ? (currentTime / duration) * 100 : 0, [currentTime, duration]);
```

### Step 7 — Code-Split Non-Critical UI

Move popover contents (video filter panel, subtitle panel) to dynamically imported components so they don't bloat the initial bundle:

```tsx
const VideoFilterPanel = dynamic(() => import('./video-filter-panel'), { ssr: false });
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Modify | `src/components/player-controls.tsx` (add `React.memo`, `useMemo`) |
| Modify | `src/components/playlist-panel.tsx` (add `React.memo`, virtualization) |
| Modify | `src/hooks/use-progress-persistence.ts` (debounce writes) |
| Modify | `src/lib/players/mkv-player.ts` (lazy FFmpeg import) |
| Modify | `src/hooks/use-video-filters.ts` (rAF throttle) |
| Install | `@tanstack/react-virtual` |

---

## Success Criteria

- React DevTools Profiler shows `PlayerControls` does not re-render during seek bar drag (only `currentTime` display updates).
- `localStorage` write calls visible in DevTools Performance tab drop from ~4/sec to ~0.2/sec.
- Playlist with 1000 items renders in under 50ms (virtualizer confirmed in DOM).
- Network tab shows no `ffmpeg-core.wasm` request when only MP4 files are opened.
