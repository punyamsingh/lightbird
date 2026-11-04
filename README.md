# LightBird Video Player

LightBird is a modern, lightweight, and feature-rich video player built with Next.js. It uses a smart two-player architecture: a simple native HTML5 player for common formats and an advanced FFmpeg.wasm-powered player specifically for complex containers like MKV with embedded tracks.

## Features

- **Dual Player Architecture**: Smart format detection for optimal performance
- **MKV Master**: Advanced MKV support with instant embedded track switching
- **Universal Playback**: Native HTML5 support for MP4, WebM, AVI, and more
- **External Subtitle Support**: Drag & drop .srt, .vtt subtitle files
- **Instant Track Switching**: Zero-delay audio and subtitle track changes for MKV
- **Advanced Player Controls**: Speed control, volume, fullscreen, frame stepping, looping
- **Video Adjustments**: Brightness, contrast, saturation, hue, and zoom controls
- **Playlist Management**: Local files and online streaming support
- **Screenshot Capture**: One-click frame capture
- **Keyboard Shortcuts**: Full keyboard control support

## Use It Anywhere — Web Component

LightBird ships a framework-agnostic `<lightbird-player>` custom element
([`@lightbird/player`](packages/web-component)). It works in Vue, Svelte, Angular,
Solid, or plain HTML — no React required.

```bash
npm install @lightbird/player
```

```html
<script type="module">
  import '@lightbird/player';
</script>

<lightbird-player src="video.mp4" controls poster="cover.jpg"></lightbird-player>
```

MP4/WebM play natively; `.m3u8` (HLS) and `.mkv` sources lazy-load the core
engine — and FFmpeg.wasm, for MKV — only when first encountered. See
[`packages/web-component`](packages/web-component) for attributes, events, and
Vue/Svelte examples.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with React)
- **Video Processing**:
  - **Simple Player**: Native HTML5 `<video>` element for maximum compatibility
  - **MKV Player**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) for advanced container parsing
- **UI**: [ShadCN UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## Getting Started

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Run the development server**:
    ```bash
    pnpm dev
    ```

3.  Open [http://localhost:9002](http://localhost:9002) in your browser to see the result.

## How It Works

LightBird uses intelligent format detection to choose the optimal playback method:

### Simple Player (MP4, WebM, AVI, etc.)
- Uses native HTML5 `<video>` element for instant playback
- Supports external subtitle files via drag & drop
- Zero processing overhead, maximum compatibility

### MKV Player (Advanced)
- FFmpeg.wasm extracts all embedded track metadata (2-3 second initial load)
- Pre-caches subtitle tracks for instant switching
- Creates audio switching points for near-instant audio track changes
- User Experience: Initial load ~2-3 seconds, then all track switching is instant

The system automatically detects file format and routes to the appropriate player, giving you the best of both worlds: instant playback for common formats and advanced features for complex containers.

## Responsive UI checks

The home player adapts to its container width: under 640px the playlist is a
bottom sheet, from 640px to 1023px it is an overlay, and wider players retain the
pinnable sidebar. Playback options move into **More controls** when the video
area is narrow. Touch controls wake on a tap; playback uses the explicit play
button so taps and double-tap seek gestures do not conflict.

Run the existing package builds and unit tests first, then check the production UI:

```bash
pnpm turbo build --filter=@lightbird/core --filter=@lightbird/player-react --filter=@lightbird/player
pnpm --filter web build
pnpm exec playwright install chromium
pnpm --filter web exec next start -p 9002
# In another terminal:
pnpm test:responsive
```

For an existing system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable instead of installing a browser. `LIGHTBIRD_TEST_URL` selects another
running server. The suite checks seven viewport sizes, actual local-video
playback, orientation changes without replacing the video, menus, source entry,
long playlists, focus restoration, and narrow desktop embeds.

The tiny WebM fixture in `apps/web/__tests__/fixtures/responsive.webm` is an
8-second synthetic blue frame, generated with FFmpeg's `color` filter; it
contains no third-party media. Real iPhone Safari and Android device testing
remains necessary for native fullscreen, software keyboards, and OS file pickers.
