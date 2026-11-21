import Link from "next/link";
import { DiscoveryLinks } from "./discovery-links";

export function HomeIntroduction() {
  return (
    <section aria-labelledby="about-lightbird" className="border-t border-border bg-background px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-primary">Free and open source · MIT licensed</p>
        <h1 id="about-lightbird" className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">An online video player for your browser. A video toolkit for your app.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">LightBird plays local videos in your browser and provides reusable JavaScript, React, and Web Component packages. Open a file above, or explore the documentation to add video playback to your own project.</p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="text-xl font-semibold">Watch local videos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">Select MP4 or WebM files, manage a playlist, and load subtitles. Local files are read in your browser rather than uploaded to a video server.</p>
            <Link href="/mkv-player" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Learn about MKV playback</Link>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Open a video stream</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">Use Open URL for a remote video or an accessible HLS stream. Playback depends on the source's access rules, codec support, and browser requirements.</p>
            <Link href="/hls-player" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Play an M3U8 stream</Link>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Build with LightBird</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">Use a ready-made React player, a framework-independent custom element, or the core playback engine and hooks to create your own interface.</p>
            <Link href="/react-video-player" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Add a React video player</Link>
          </section>
        </div>
        <section className="mt-12 rounded-xl border border-border bg-card p-5 sm:p-8" aria-labelledby="getting-started">
          <h2 id="getting-started" className="text-2xl font-semibold">Start watching or start building</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">For local playback, choose Open video in the player above. No account is required. Use the playlist to queue more files and the subtitles menu to add captions. MKV support depends on the file's codecs and the device's resources.</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">For an app integration, follow the <Link href="/docs#install" className="text-foreground underline underline-offset-4">installation guide</Link>, test options in the <Link href="/playground" className="text-foreground underline underline-offset-4">playground</Link>, or use a <Link href="/web-component-video-player" className="text-foreground underline underline-offset-4">Web Component in Vue, Svelte, Angular, or HTML</Link>.</p>
        </section>
        <div className="mt-10"><DiscoveryLinks /></div>
      </div>
    </section>
  );
}
