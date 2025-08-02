# LightBird Video Player

LightBird is a modern, powerful, and feature-rich video player built with Next.js and WebCodecs. It's designed for high-performance playback of local video files directly in your browser, offering a seamless experience without relying on heavy libraries like FFmpeg.

## Features

- **Local File Playback**: Play a wide variety of video formats like `.mkv`, `.mp4`, `.avi`, and more.
- **In-Browser Processing**: Uses modern browser APIs like WebCodecs and WebAssembly for efficient video demuxing and remuxing.
- **Audio Track Selection**: Easily switch between different audio tracks embedded in your video files.
- **Subtitle Support**: Select and display embedded subtitle tracks.
- **Advanced Player Controls**: Includes controls for playback speed, volume, fullscreen, frame-by-frame stepping, and looping.
- **Video Adjustments**: Fine-tune brightness, contrast, saturation, hue, and zoom.
- **Playlist Management**: Add local files or online streams to a playlist.
- **Screenshot Capture**: Instantly capture a frame from the video.
- **Keyboard Shortcuts**: Control playback with familiar keyboard shortcuts.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with React)
- **Video Processing**:
  - [web-demuxer](https://github.com/bilibili/web-demuxer): For demuxing media containers.
  - [mp4-muxer](https://github.com/Vanilagy/mp4-muxer): For muxing video and audio streams into a playable format.
  - [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API): For high-performance, browser-native video decoding.
- **UI**: [ShadCN UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## Getting Started

To get started with LightBird, follow these steps:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:9002](http://localhost:9002) in your browser to see the result.

## How It Works

LightBird leverages modern web technologies to process video files entirely within the browser.

1.  When a user uploads a video file (e.g., an `.mkv`), `web-demuxer` is used to demultiplex the container into its constituent video, audio, and subtitle streams.
2.  The user is presented with UI options to select their desired audio and subtitle tracks.
3.  Based on the selection, `mp4-muxer` remuxes the chosen streams into a standard MP4 format.
4.  The resulting MP4 is converted into a Blob URL, which is then passed to a standard HTML `<video>` element for playback, with all processing handled efficiently on the client side.
