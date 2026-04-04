import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LightBird Docs",
  description: "Documentation for LightBird — a client-side video player engine.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[hsl(0,0%,8%)] border border-border rounded-lg p-4 overflow-x-auto text-sm">
      <code>{children}</code>
    </pre>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-border rounded-lg p-6 bg-card">
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold mt-16 mb-6 text-foreground scroll-mt-8">
      {children}
    </h2>
  );
}

export default function DocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Hero */}
      <section className="text-center mb-20">
        <h1 className="text-5xl font-headline font-black tracking-widest mb-4" style={{ color: "hsl(var(--accent))" }}>
          LIGHTBIRD
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          A video player that plays everything. Entirely client-side.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <CodeBlock>npm install lightbird</CodeBlock>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try it out &rarr;
          </a>
        </div>
      </section>

      {/* Why LightBird */}
      <SectionTitle id="features">Why LightBird?</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <FeatureCard
          title="MKV in the browser"
          description="Play MKV files directly — no server transcoding. FFmpeg.wasm handles remuxing client-side."
        />
        <FeatureCard
          title="Full subtitle pipeline"
          description="SRT, VTT, ASS/SSA with encoding detection, sync offset, and styled rendering."
        />
        <FeatureCard
          title="Audio track switching"
          description="Multiple audio tracks in MKV containers. Switch between them without reloading."
        />
        <FeatureCard
          title="Zero server needed"
          description="Everything runs in the browser. Your videos never leave the device."
        />
      </div>

      {/* Installation */}
      <SectionTitle id="install">Installation</SectionTitle>

      <h3 className="text-lg font-semibold mt-8 mb-3">Full UI (React)</h3>
      <CodeBlock>{`npm install lightbird @lightbird/ui`}</CodeBlock>
      <div className="mt-4">
        <CodeBlock>{`"use client"
import { LightBirdPlayer } from '@lightbird/ui'

export default function VideoPage() {
  return <LightBirdPlayer />
}`}</CodeBlock>
      </div>
      <p className="text-sm text-muted-foreground mt-2 mb-8">
        Add <code className="text-foreground">./node_modules/@lightbird/ui/dist/**/*.js</code> to your Tailwind content config,
        or import <code className="text-foreground">@lightbird/ui/styles.css</code> for zero-config styling.
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-3">Headless React</h3>
      <CodeBlock>{`npm install lightbird`}</CodeBlock>
      <div className="mt-4">
        <CodeBlock>{`"use client"
import { useRef } from 'react'
import { useVideoPlayback, useSubtitles } from 'lightbird/react'
import { createVideoPlayer } from 'lightbird'

export default function MyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, togglePlay } = useVideoPlayback(videoRef)

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
    </div>
  )
}`}</CodeBlock>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-3">Any Framework (Vanilla JS)</h3>
      <CodeBlock>{`npm install lightbird`}</CodeBlock>
      <div className="mt-4">
        <CodeBlock>{`import { createVideoPlayer } from 'lightbird'

const input = document.querySelector('input[type="file"]')
const video = document.querySelector('video')

input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const player = createVideoPlayer(file)
  await player.initialize(video)

  console.log('Subtitles:', player.getSubtitles())
  console.log('Audio tracks:', player.getAudioTracks())
})`}</CodeBlock>
      </div>

      {/* Feature table */}
      <SectionTitle id="all-features">All Features</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left p-3 font-semibold">Category</th>
              <th className="text-left p-3 font-semibold">Features</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Formats</td><td className="p-3">MP4, WebM, AVI, MOV, WMV, FLV, OGV, MKV</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Subtitles</td><td className="p-3">SRT, VTT, ASS/SSA, encoding detection, sync offset</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Audio</td><td className="p-3">Multi-track switching (MKV), volume control</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Chapters</td><td className="p-3">Auto-extraction from MKV, seek bar markers, navigation</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Playlist</td><td className="p-3">Drag-and-drop reorder, M3U8 import/export, folder import</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Playback</td><td className="p-3">Speed control, frame stepping, loop, progress persistence</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Visuals</td><td className="p-3">Video filters (brightness/contrast/saturation/hue), zoom</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-medium text-foreground">Integration</td><td className="p-3">Picture-in-Picture, Media Session API, keyboard shortcuts</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Errors</td><td className="p-3">Auto-retry with backoff, error recovery UI, stall detection</td></tr>
          </tbody>
        </table>
      </div>

      {/* API Reference */}
      <SectionTitle id="api">API Reference</SectionTitle>

      <h3 className="text-lg font-semibold mt-8 mb-3">Core (<code>lightbird</code>)</h3>
      <CodeBlock>{`// Player factory
createVideoPlayer(file: File, subtitleFiles?: File[], onProgress?: (n: number) => void): VideoPlayer

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

// Utilities
validateFile(file: File): { valid: boolean; reason?: string }
parseMediaError(error: MediaError): ParsedMediaError
configureLightBird({ ffmpegCDN: string }): void`}</CodeBlock>

      <h3 className="text-lg font-semibold mt-8 mb-3">React Hooks (<code>lightbird/react</code>)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left p-3 font-semibold">Hook</th>
              <th className="text-left p-3 font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useVideoPlayback(videoRef)</td><td className="p-3">Play/pause, seek, volume, rate, loop</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useSubtitles(options?)</td><td className="p-3">Subtitle management with onError callback</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">usePlaylist()</td><td className="p-3">Playlist state, file parsing, reorder</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useVideoFilters(videoRef)</td><td className="p-3">CSS video filters (brightness, contrast, etc.)</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useFullscreen(containerRef)</td><td className="p-3">Fullscreen API wrapper</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">usePictureInPicture(videoRef)</td><td className="p-3">PiP API wrapper</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useChapters(videoRef, playerRef)</td><td className="p-3">Chapter navigation</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useKeyboardShortcuts(shortcuts, handlers)</td><td className="p-3">Keyboard event binding</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useMediaSession(options)</td><td className="p-3">OS media controls</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">useProgressPersistence(videoRef, name)</td><td className="p-3">localStorage resume</td></tr>
            <tr><td className="p-3 font-mono text-xs text-foreground">useVideoInfo(videoRef, file)</td><td className="p-3">Video metadata extraction</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-3">UI Components (<code>@lightbird/ui</code>)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left p-3 font-semibold">Component</th>
              <th className="text-left p-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">&lt;LightBirdPlayer /&gt;</td><td className="p-3">Full player — drop in and done</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">&lt;PlayerControls /&gt;</td><td className="p-3">Standalone control bar</td></tr>
            <tr className="border-b border-border"><td className="p-3 font-mono text-xs text-foreground">&lt;PlaylistPanel /&gt;</td><td className="p-3">Standalone playlist sidebar</td></tr>
            <tr><td className="p-3 font-mono text-xs text-foreground">&lt;Toaster /&gt;</td><td className="p-3">Toast notification provider</td></tr>
          </tbody>
        </table>
      </div>

      {/* Browser Support */}
      <SectionTitle id="browser-support">Browser Support</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left p-3 font-semibold">Browser</th>
              <th className="text-left p-3 font-semibold">Version</th>
              <th className="text-left p-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border"><td className="p-3">Chrome</td><td className="p-3">90+</td><td className="p-3">Full support</td></tr>
            <tr className="border-b border-border"><td className="p-3">Firefox</td><td className="p-3">90+</td><td className="p-3">Full support</td></tr>
            <tr className="border-b border-border"><td className="p-3">Safari</td><td className="p-3">15+</td><td className="p-3">No MKV (no SharedArrayBuffer)</td></tr>
            <tr><td className="p-3">Edge</td><td className="p-3">90+</td><td className="p-3">Full support</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        MKV playback requires <code className="text-foreground">Cross-Origin-Opener-Policy: same-origin</code> and <code className="text-foreground">Cross-Origin-Embedder-Policy: require-corp</code> headers.
      </p>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-6 mb-4">
          <a href="https://github.com/punyamsingh/lightbird" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="https://www.npmjs.com/package/lightbird" className="hover:text-foreground transition-colors">npm</a>
          <span>MIT License</span>
        </div>
        <p>Built by Punyam Singh</p>
      </footer>
    </main>
  );
}
