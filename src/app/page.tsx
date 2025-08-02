import LightBirdPlayer from "@/components/lightbird-player";

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="px-6 py-3 border-b border-border flex items-center shrink-0">
        <h1 className="text-xl font-headline font-bold" style={{color: 'hsl(var(--accent))'}}>LightBird</h1>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <LightBirdPlayer />
      </div>
    </main>
  );
}
