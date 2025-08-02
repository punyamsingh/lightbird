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
