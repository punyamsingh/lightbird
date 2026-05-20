import type { Metadata } from "next";
import { CodeBlock } from "./code-block";
import { DocsNav } from "./docs-nav";
import { FadeSection } from "./fade-section";
import { InstallTabs } from "./install-tabs";

export const metadata: Metadata = {
  title: "LightBird Docs",
  description:
    "Documentation for LightBird — a client-side video player engine.",
};

/* ------------------------------------------------------------------ */
/*  Static UI pieces                                                   */
/* ------------------------------------------------------------------ */

function SectionHeading({
  id,
  children,
  sub = false,
}: {
  id: string;
  children: React.ReactNode;
  sub?: boolean;
}) {
  const Tag = sub ? "h3" : "h2";
  return (
    <Tag
      id={id}
      className={`scroll-mt-24 font-headline tracking-wide ${
        sub
          ? "text-lg font-bold mt-10 mb-4 text-foreground"
          : "text-2xl font-bold mt-20 mb-8 text-foreground"
      }`}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature cards                                                      */
/* ------------------------------------------------------------------ */

function FilmIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}

function SubtitleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="7" y1="9" x2="15" y2="9" />
      <line x1="7" y1="13" x2="12" y2="13" />
    </svg>
  );
}

function HeadphoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <FilmIcon />,
    title: "MKV in the Browser",
    description:
      "Play MKV files directly — no server transcoding. FFmpeg.wasm handles remuxing client-side.",
  },
  {
    icon: <SubtitleIcon />,
    title: "Full Subtitle Pipeline",
    description:
      "SRT, VTT, ASS/SSA with encoding detection, sync offset, and styled rendering.",
  },
  {
    icon: <HeadphoneIcon />,
    title: "Audio Track Switching",
    description:
      "Multiple audio tracks in MKV containers. Switch between them without reloading.",
  },
  {
    icon: <ShieldIcon />,
    title: "Zero Server Needed",
    description:
      "Everything runs in the browser. Your videos never leave the device.",
  },
];

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-[hsl(0,0%,10%)] border border-white/[0.06] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_hsl(207,100%,50%,0.08)] hover:border-white/[0.1]">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(207,100%,50%)] to-transparent rounded-t-xl" />
      <div className="text-[hsl(207,100%,60%)] mb-4">{icon}</div>
      <h3 className="text-base font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature table                                                      */
/* ------------------------------------------------------------------ */

const ALL_FEATURES = [
  ["Formats", "MP4, WebM, AVI, MOV, WMV, FLV, OGV, MKV"],
  ["Subtitles", "SRT, VTT, ASS/SSA, encoding detection, sync offset"],
  ["Audio", "Multi-track switching (MKV), volume control"],
  ["Chapters", "Auto-extraction from MKV, seek bar markers, navigation"],
  ["Playlist", "Drag-and-drop reorder, M3U8 import/export, folder import"],
  ["Playback", "Speed control, frame stepping, loop, progress persistence"],
  ["Visuals", "Video filters (brightness/contrast/saturation/hue), zoom"],
  ["Integration", "Picture-in-Picture, Media Session API, keyboard shortcuts"],
  ["Errors", "Auto-retry with backoff, error recovery UI, stall detection"],
];

function FeatureTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[hsl(0,0%,10%)]">
            <th className="text-left p-4 font-semibold text-foreground w-36">Category</th>
            <th className="text-left p-4 font-semibold text-foreground">Features</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {ALL_FEATURES.map(([cat, features], i) => (
            <tr
              key={cat}
              className={i < ALL_FEATURES.length - 1 ? "border-b border-white/[0.04]" : ""}
            >
              <td className="p-4 font-medium text-foreground">{cat}</td>
              <td className="p-4">{features}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  API Reference                                                      */
/* ------------------------------------------------------------------ */

const CORE_API = `// Player factory
createVideoPlayer(
  file: File,
  subtitleFiles?: File[],
  onProgress?: (n: number) => void
): VideoPlayer

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
configureLightBird({ ffmpegCDN: string }): void`;

const HOOKS_DATA = [
  ["useVideoPlayback(videoRef)", "Play/pause, seek, volume, rate, loop"],
  ["useSubtitles(options?)", "Subtitle management with onError callback"],
  ["usePlaylist()", "Playlist state, file parsing, reorder"],
  ["useVideoFilters(videoRef)", "CSS video filters (brightness, contrast, etc.)"],
  ["useFullscreen(containerRef)", "Fullscreen API wrapper"],
  ["usePictureInPicture(videoRef)", "PiP API wrapper"],
  ["useChapters(videoRef, playerRef)", "Chapter navigation"],
  ["useKeyboardShortcuts(shortcuts, handlers)", "Keyboard event binding"],
  ["useMediaSession(options)", "OS media controls"],
  ["useProgressPersistence(videoRef, name)", "localStorage resume"],
  ["useVideoInfo(videoRef, file)", "Video metadata extraction"],
];

const UI_DATA = [
  ["<LightBirdPlayer />", "Full player — drop in and done"],
  ["<PlayerControls />", "Standalone control bar"],
  ["<PlaylistPanel />", "Standalone playlist sidebar"],
  ["<Toaster />", "Toast notification provider"],
];

function ApiTable({
  headers,
  rows,
}: {
  headers: [string, string];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[hsl(0,0%,10%)]">
            <th className="text-left p-4 font-semibold text-foreground">{headers[0]}</th>
            <th className="text-left p-4 font-semibold text-foreground">{headers[1]}</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {rows.map(([col1, col2], i) => (
            <tr
              key={col1}
              className={i < rows.length - 1 ? "border-b border-white/[0.04]" : ""}
            >
              <td className="p-4 font-mono text-xs text-foreground whitespace-nowrap">
                {col1}
              </td>
              <td className="p-4">{col2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Browser support                                                    */
/* ------------------------------------------------------------------ */

const BROWSERS = [
  ["Chrome", "90+", "Full support"],
  ["Firefox", "90+", "Full support"],
  ["Safari", "15+", "No MKV (no SharedArrayBuffer)"],
  ["Edge", "90+", "Full support"],
];

/* ------------------------------------------------------------------ */
/*  Page (server component)                                            */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <>
      <DocsNav />

      <main className="lg:ml-64 px-6 sm:px-10 lg:px-16 py-16 pt-20 lg:pt-16 max-w-4xl">
        {/* ---- Hero ---- */}
        <section id="overview" className="relative mb-24 scroll-mt-24">
          <div className="docs-hero-glow" />
          <div className="relative">
            <h1 className="text-5xl sm:text-6xl font-headline font-black tracking-[0.2em] mb-5 text-[hsl(207,100%,60%)]">
              LIGHTBIRD
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
              Play everything. Entirely client-side.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {[
                "8+ formats",
                "11 React hooks",
                "Zero server",
                "MKV native",
              ].map((stat) => (
                <span
                  key={stat}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground"
                >
                  {stat}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <CodeBlock className="flex-1 max-w-sm">npm install lightbird</CodeBlock>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(207,100%,45%)] text-white rounded-xl font-medium text-sm hover:bg-[hsl(207,100%,50%)] transition-colors"
              >
                Try the demo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* ---- Features ---- */}
        <FadeSection>
          <section id="features" className="mb-20 scroll-mt-24">
            <SectionHeading id="features-heading">Why LightBird?</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </section>
        </FadeSection>

        {/* ---- Installation ---- */}
        <FadeSection>
          <section id="install" className="mb-20 scroll-mt-24">
            <SectionHeading id="install-heading">Installation</SectionHeading>
            <InstallTabs />
          </section>
        </FadeSection>

        {/* ---- All Features ---- */}
        <FadeSection>
          <section id="all-features" className="mb-20 scroll-mt-24">
            <SectionHeading id="all-features-heading">All Features</SectionHeading>
            <FeatureTable />
          </section>
        </FadeSection>

        {/* ---- API Reference ---- */}
        <FadeSection>
          <section id="api" className="mb-20 scroll-mt-24">
            <SectionHeading id="api-heading">API Reference</SectionHeading>

            <div id="api-core" className="scroll-mt-24 mb-12">
              <SectionHeading id="api-core-heading" sub>
                Core &mdash; <code className="text-sm font-normal font-code text-muted-foreground">lightbird</code>
              </SectionHeading>
              <CodeBlock>{CORE_API}</CodeBlock>
            </div>

            <div id="api-hooks" className="scroll-mt-24 mb-12">
              <SectionHeading id="api-hooks-heading" sub>
                React Hooks &mdash; <code className="text-sm font-normal font-code text-muted-foreground">lightbird/react</code>
              </SectionHeading>
              <ApiTable headers={["Hook", "Purpose"]} rows={HOOKS_DATA} />
            </div>

            <div id="api-ui" className="scroll-mt-24">
              <SectionHeading id="api-ui-heading" sub>
                UI Components &mdash; <code className="text-sm font-normal font-code text-muted-foreground">@lightbird/ui</code>
              </SectionHeading>
              <ApiTable headers={["Component", "Description"]} rows={UI_DATA} />
            </div>
          </section>
        </FadeSection>

        {/* ---- Browser Support ---- */}
        <FadeSection>
          <section id="browser-support" className="mb-20 scroll-mt-24">
            <SectionHeading id="browser-support-heading">Browser Support</SectionHeading>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[hsl(0,0%,10%)]">
                    <th className="text-left p-4 font-semibold text-foreground">Browser</th>
                    <th className="text-left p-4 font-semibold text-foreground">Version</th>
                    <th className="text-left p-4 font-semibold text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {BROWSERS.map(([browser, version, notes], i) => (
                    <tr
                      key={browser}
                      className={i < BROWSERS.length - 1 ? "border-b border-white/[0.04]" : ""}
                    >
                      <td className="p-4 text-foreground">{browser}</td>
                      <td className="p-4">{version}</td>
                      <td className="p-4">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              MKV playback requires{" "}
              <code className="text-foreground text-xs bg-white/5 px-1.5 py-0.5 rounded">
                Cross-Origin-Opener-Policy: same-origin
              </code>{" "}
              and{" "}
              <code className="text-foreground text-xs bg-white/5 px-1.5 py-0.5 rounded">
                Cross-Origin-Embedder-Policy: require-corp
              </code>{" "}
              headers.
            </p>
          </section>
        </FadeSection>

        {/* ---- Footer ---- */}
        <footer className="mt-16 pt-8 border-t border-white/[0.06] text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6 mb-4">
            <a
              href="https://github.com/punyamsingh/lightbird"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/lightbird"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              npm
            </a>
            <span>MIT License</span>
          </div>
          <p className="mb-6">Built by Punyam Singh</p>
        </footer>
      </main>
    </>
  );
}
