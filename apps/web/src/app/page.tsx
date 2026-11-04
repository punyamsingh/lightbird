import Link from "next/link";
import { LightBirdPlayer, PlayerErrorBoundary } from "@lightbird/player-react";

export default function Home() {
  return (
    <main className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <header style={{ paddingTop: "max(.375rem, env(safe-area-inset-top))", paddingLeft: "max(.75rem, env(safe-area-inset-left))", paddingRight: "max(.75rem, env(safe-area-inset-right))" }} className="relative z-30 px-3 sm:px-6 py-1.5 sm:py-3 border-b border-border flex items-center justify-between shrink-0">
        <h1 className="text-base sm:text-xl font-headline font-black tracking-widest" style={{color: 'hsl(var(--accent))'}}>LIGHTBIRD</h1>
        <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-5 [&_a]:min-h-11 [&_a]:inline-flex [&_a]:items-center">
          <Link
            href="/playground"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Playground
          </Link>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <a
            href="https://github.com/punyamsingh/lightbird"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.33-1.73-1.33-1.73-1.09-.72.08-.71.08-.71 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.67-.29-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.24-3.17-.12-.29-.54-1.48.12-3.09 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 3-.39c1.02 0 2.05.13 3 .39 2.29-1.53 3.3-1.21 3.3-1.21.66 1.61.24 2.8.12 3.09.77.83 1.24 1.88 1.24 3.17 0 4.54-2.81 5.55-5.49 5.84.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .31.22.68.83.56C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z" />
            </svg>
          </a>
        </nav>
        <details className="relative sm:hidden">
          <summary className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Menu</summary>
          <nav aria-label="Mobile navigation" className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card p-2 shadow-xl [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded [&_a]:px-3 [&_a:hover]:bg-muted">
            <Link href="/playground">Playground</Link>
            <Link href="/docs">Docs</Link>
            <a href="https://github.com/punyamsingh/lightbird" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </details>
      </header>
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        <PlayerErrorBoundary>
          <LightBirdPlayer />
        </PlayerErrorBoundary>
      </div>
    </main>
  );
}
