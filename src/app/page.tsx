import LightBirdPlayer from "@/components/lightbird-player";
import { PlayerErrorBoundary } from "@/components/player-error-boundary";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="px-6 py-3 border-b border-border flex items-center shrink-0">
        <Logo className="h-10 w-auto" />
      </header>
      <div className="flex-1 flex overflow-hidden">
        <PlayerErrorBoundary>
          <LightBirdPlayer />
        </PlayerErrorBoundary>
      </div>
    </main>
  );
}
