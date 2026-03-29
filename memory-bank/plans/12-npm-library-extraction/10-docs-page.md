# Phase 10 — Documentation Page (`/docs`)

## Goal

Build a single-page documentation route at `lightbird.vercel.app/docs` that serves as the landing page for the npm packages. Contains installation instructions, API reference, code examples, and a "Try it out" link to the main app.

## Route Structure

```
apps/web/src/app/docs/
├── layout.tsx        ← docs-specific layout (minimal chrome, no player UI)
└── page.tsx          ← single scrollable docs page
```

## Page Sections (top to bottom)

### Section 1: Hero

```
LightBird
A video player that plays everything. Entirely client-side.

[npm install lightbird]     [Try it out →]
                             (link to /)
```

- Dark background, clean typography
- The npm install command in a copyable code block
- "Try it out" button links to `lightbird.vercel.app` (root)
- Badges: npm version, license (MIT), bundle size

### Section 2: Why LightBird?

Four feature cards in a grid:

| Card | Title | Description |
|------|-------|-------------|
| 1 | MKV in the browser | Play MKV files directly — no server transcoding. FFmpeg.wasm handles remuxing client-side. |
| 2 | Full subtitle pipeline | SRT, VTT, ASS/SSA with encoding detection, sync offset, and styled rendering. |
| 3 | Audio track switching | Multiple audio tracks in MKV containers. Switch between them without reloading. |
| 4 | Zero server needed | Everything runs in the browser. Your videos never leave the device. |

### Section 3: Installation

Tabbed interface with three tabs:

**Tab 1: Full UI (React)**
```bash
npm install lightbird @lightbird/ui
```
```tsx
"use client"
import { LightBirdPlayer } from '@lightbird/ui'

export default function VideoPage() {
  return <LightBirdPlayer />
}
```
Optional: Add Tailwind content path or import pre-compiled CSS:
```tsx
// Option A: Add to tailwind.config.ts content array:
// './node_modules/@lightbird/ui/dist/**/*.js'

// Option B: Import pre-compiled styles:
import '@lightbird/ui/styles.css'
```

**Tab 2: Headless React**
```bash
npm install lightbird
```
```tsx
"use client"
import { useRef } from 'react'
import { useVideoPlayback, useSubtitles } from 'lightbird/react'
import { createVideoPlayer } from 'lightbird'

export default function MyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, togglePlay, seek, volume, setVolume } = useVideoPlayback(videoRef)
  const { subtitles, activeSubtitle, switchSubtitle } = useSubtitles()

  const handleFile = async (file: File) => {
    const player = createVideoPlayer(file)
    await player.initialize(videoRef.current!)
  }

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      {/* Build your own UI */}
    </div>
  )
}
```

**Tab 3: Any Framework (Vanilla JS)**
```bash
npm install lightbird
```
```ts
import { createVideoPlayer } from 'lightbird'

const input = document.querySelector('input[type="file"]')
const video = document.querySelector('video')

input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const player = createVideoPlayer(file)
  await player.initialize(video)

  console.log('Subtitles:', player.getSubtitles())
  console.log('Audio tracks:', player.getAudioTracks())
  console.log('Chapters:', player.getChapters?.())
})
```

### Section 4: Features

Clean table or grid listing all features:

| Category | Features |
|----------|----------|
| **Formats** | MP4, WebM, AVI, MOV, WMV, FLV, OGV, MKV |
| **Subtitles** | SRT, VTT, ASS/SSA, encoding detection, sync offset adjustment, styled ASS rendering |
| **Audio** | Multi-track switching (MKV), volume control |
| **Chapters** | Auto-extraction from MKV, seek bar markers, chapter navigation, keyboard shortcuts |
| **Playlist** | Drag-and-drop reorder, M3U8 import/export, folder import, virtualized list |
| **Playback** | Speed control, frame stepping, loop, progress persistence |
| **Visuals** | Video filters (brightness/contrast/saturation/hue), zoom |
| **Integration** | Picture-in-Picture, Media Session API (hardware controls), keyboard shortcuts (customizable) |
| **Errors** | Auto-retry with backoff, error recovery UI, file validation, stall detection |

### Section 5: API Reference

#### Core (`lightbird`)

**`createVideoPlayer(file, subtitleFiles?, onProgress?)`**
- `file: File` — the video file
- `subtitleFiles?: File[]` — external subtitle files
- `onProgress?: (progress: number) => void` — 0-1 progress callback (MKV remuxing)
- Returns: `VideoPlayer`

**`VideoPlayer` interface**
```ts
interface VideoPlayer {
  initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile>
  getAudioTracks(): AudioTrack[]
  getSubtitles(): Subtitle[]
  getChapters?(): Chapter[]
  switchAudioTrack(trackId: string): Promise<void>
  switchSubtitle(trackId: string): Promise<void>
  destroy(): void
  cancel?(): void
  tracksReady?: Promise<void>
}
```

**`SubtitleManager`**
- `initManager(videoElement)` — attach to video element
- `addSubtitleFiles(files)` — add external subtitle files
- `switchSubtitle(id)` — activate a subtitle track
- `removeSubtitle(id)` — remove a subtitle track
- `reset()` — clear all subtitles

**Utility functions**
- `validateFile(file)` — check extension and size
- `parseMediaError(error)` — human-readable error info
- `convertSrtToVtt(srtContent)` — format conversion
- `parseM3U(content)` / `exportM3U(items)` — playlist format
- `configureLightBird({ ffmpegCDN })` — set FFmpeg CDN URL

#### React Hooks (`lightbird/react`)

| Hook | Returns | Purpose |
|------|---------|---------|
| `useVideoPlayback(videoRef)` | `{ isPlaying, progress, duration, volume, isMuted, playbackRate, loop, togglePlay, seek, setVolume, toggleMute, setPlaybackRate, frameStep, toggleLoop }` | Core playback state |
| `useSubtitles()` | `{ subtitles, activeSubtitle, initManager, addSubtitleFiles, switchSubtitle, removeSubtitle, importSubtitles, reset }` | Subtitle management |
| `usePlaylist()` | `{ playlist, currentIndex, currentItem, addFiles, removeItem, selectItem, reorderItems, appendItem, parseFiles }` | Playlist state |
| `useVideoFilters(videoRef)` | `{ filters, zoom, setFilters, setZoom }` | CSS video filters |
| `useFullscreen(containerRef)` | `{ isFullscreen, toggle }` | Fullscreen API |
| `usePictureInPicture(videoRef)` | `{ isPiP, isSupported, toggle }` | PiP API |
| `useChapters(videoRef, playerRef)` | `{ chapters, currentChapter, goToChapter }` | Chapter navigation |
| `useKeyboardShortcuts(shortcuts, handlers)` | void | Keyboard event binding |
| `useMediaSession(options)` | void | OS media controls |
| `useProgressPersistence(videoRef, name)` | void | localStorage resume |
| `useVideoInfo(videoRef, file)` | `{ metadata }` | Video metadata |

#### UI Components (`@lightbird/ui`)

| Component | Props | Description |
|-----------|-------|-------------|
| `<LightBirdPlayer />` | none | Full player — drop in and done |
| `<PlayerControls {...} />` | See TypeScript types | Standalone control bar |
| `<PlaylistPanel {...} />` | See TypeScript types | Standalone playlist sidebar |
| `<Toaster />` | none | Add to app root for toast notifications |

### Section 6: Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 90+ | Full support |
| Safari | 15+ | Full support (no SharedArrayBuffer = no MKV) |
| Edge | 90+ | Full support |

**MKV playback requires** `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer (Web Worker + WASM).

### Section 7: Footer

```
GitHub    npm    MIT License
Built by Punyam Singh
```

## Implementation Notes

### Styling

The docs page should use Tailwind (already in the project). Dark theme to match the player aesthetic. No additional dependencies needed.

### Code blocks

Use simple `<pre><code>` with Tailwind styling. No syntax highlighting library needed for v1 — keep it lightweight. If desired later, add `prism-react-renderer` (~3 kB).

### Responsive

The page should work on mobile (single column) and desktop (max-width container, centered).

### No client-side JS needed

The docs page is entirely static content. It can be a React Server Component (no `"use client"`). This means instant load, no JS bundle for the docs page.

## Verification

After this phase:
- `lightbird.vercel.app/docs` loads and displays all sections
- "Try it out" link navigates to `lightbird.vercel.app`
- Code examples are accurate and match the actual API
- Page is responsive (mobile + desktop)
- No additional dependencies added (pure Tailwind + static content)
