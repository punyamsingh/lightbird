import type { Metadata } from "next";
import Link from "next/link";
import { Playground } from "./playground";

export const metadata: Metadata = {
  title: "Playground · LightBird",
  description:
    "Try LightBird in your browser — drop a video, tweak the options live, and copy a ready-to-paste snippet for React or the Web Component.",
};

export default function PlaygroundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <Link
          href="/"
          className="font-headline text-xl font-black tracking-widest"
          style={{ color: "hsl(var(--accent))" }}
        >
          LIGHTBIRD
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Player
          </Link>
          <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
        </nav>
      </header>

      <div className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Load a video, change the options, and copy a snippet that reproduces exactly what you
            see. Everything runs client-side — your files never leave the browser.
          </p>
        </div>
        <Playground />
      </div>
    </main>
  );
}
