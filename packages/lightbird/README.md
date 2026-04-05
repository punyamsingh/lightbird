# lightbird

Client-side video player engine for the browser. Plays MKV, MP4, WebM, AVI, and more — with full subtitle, audio track, and chapter support. No server required.

**[Documentation](https://lightbird.vercel.app/docs)** | **[Live Demo](https://lightbird.vercel.app)** | **[GitHub](https://github.com/punyamsingh/lightbird)**

## Install

```bash
npm install lightbird
```

## Quick Start

```ts
import { createVideoPlayer } from 'lightbird'

const player = createVideoPlayer(file)
await player.initialize(videoElement)
```

### React Hooks

```tsx
import { useVideoPlayback, useSubtitles } from 'lightbird/react'

const { isPlaying, togglePlay, seek } = useVideoPlayback(videoRef)
```

### Full UI Component

```bash
npm install lightbird @lightbird/ui
```

```tsx
import { LightBirdPlayer } from '@lightbird/ui'

<LightBirdPlayer />
```

## Features

- **MKV playback** — FFmpeg.wasm client-side remuxing
- **Subtitles** — SRT, VTT, ASS/SSA with encoding detection and sync offset
- **Audio tracks** — Multi-track switching for MKV
- **Chapters** — Auto-extraction, seek bar markers, navigation
- **Playlist** — Drag-and-drop, M3U8 import/export
- **More** — PiP, Media Session, keyboard shortcuts, video filters, screenshots

## Documentation

Full API reference, examples, and integration guides at **[lightbird.vercel.app/docs](https://lightbird.vercel.app/docs)**

## License

MIT
