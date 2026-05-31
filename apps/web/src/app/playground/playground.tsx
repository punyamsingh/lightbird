"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LightBirdPlayer, PlayerErrorBoundary } from "@lightbird/player-react";
import { cn } from "@/lib/utils";
import {
  defaultPlaygroundConfig,
  generateSnippet,
  type PlaygroundConfig,
  type PlaygroundTarget,
} from "@/lib/playground-snippet";

const TARGETS: { id: PlaygroundTarget; label: string }[] = [
  { id: "react", label: "React" },
  { id: "web-component", label: "Web Component" },
];

/** A few hosted clips so visitors can try the Web Component without a file. */
const SAMPLES: { name: string; url: string }[] = [
  {
    name: "Big Buck Bunny",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    name: "Sintel (HLS)",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
];

/** Small accessible on/off switch built on the design tokens (no extra deps). */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the user can select the text manually */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

/**
 * Live `<lightbird-player>` preview. The custom element auto-registers on import
 * and reflects its attributes immediately, so we drive it imperatively and keep
 * the attributes in sync with the playground config.
 */
function WebComponentPreview({ config }: { config: PlaygroundConfig }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Registering the element is a one-time side effect of importing the package.
    void import("@lightbird/player")
      .then(() => {
        if (cancelled || !hostRef.current || elRef.current) return;
        const el = document.createElement("lightbird-player");
        el.style.display = "block";
        el.style.width = "100%";
        el.style.aspectRatio = "16 / 9";
        el.style.background = "#000";
        el.style.borderRadius = "0.75rem";
        el.style.overflow = "hidden";
        hostRef.current.appendChild(el);
        elRef.current = el;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      elRef.current?.remove();
      elRef.current = null;
    };
  }, []);

  if (loadError) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Couldn&apos;t load the preview. Check your connection and refresh.
      </div>
    );
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (config.src) el.setAttribute("src", config.src);
    else el.removeAttribute("src");
    el.toggleAttribute("controls", config.controls);
    el.toggleAttribute("autoplay", config.autoPlay);
    el.toggleAttribute("muted", config.muted);
    if (config.poster) el.setAttribute("poster", config.poster);
    else el.removeAttribute("poster");
  }, [ready, config]);

  return <div ref={hostRef} />;
}

export function Playground() {
  const [target, setTarget] = useState<PlaygroundTarget>("react");

  // Web Component source: a dropped file (object URL) or a sample URL.
  const [src, setSrc] = useState<string>(SAMPLES[0].url);
  const [snippetSrc, setSnippetSrc] = useState<string>(SAMPLES[0].url);
  const objectUrlRef = useRef<string | null>(null);

  const [controls, setControls] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [muted, setMuted] = useState(false);
  const [poster, setPoster] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const loadFile = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSrc(url);
    // A blob URL only works locally — show a CDN placeholder in the snippet.
    setSnippetSrc(`https://your-cdn.example.com/${encodeURIComponent(file.name)}`);
  }, []);

  const loadSample = useCallback((url: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSrc(url);
    setSnippetSrc(url);
  }, []);

  const config: PlaygroundConfig = useMemo(
    () => ({
      src: snippetSrc,
      poster: poster.trim() || undefined,
      controls,
      autoPlay,
      muted,
    }),
    [snippetSrc, poster, controls, autoPlay, muted],
  );

  // The live preview needs the real (possibly blob) src, not the snippet placeholder.
  const previewConfig: PlaygroundConfig = useMemo(
    () => ({ ...config, src }),
    [config, src],
  );

  const snippet = useMemo(() => generateSnippet(config, target), [config, target]);
  const isWebComponent = target === "web-component";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Preview column ─────────────────────────────────────────── */}
      <section className="space-y-4">
        {isWebComponent ? (
          <>
            <div
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) loadFile(file);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={cn(
                "rounded-xl border-2 border-dashed p-2 transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-transparent",
              )}
            >
              <WebComponentPreview config={previewConfig} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="pg-file"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                }}
              />
              <label
                htmlFor="pg-file"
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Drop or browse a video
              </label>
              <span className="text-xs text-muted-foreground">or try:</span>
              {SAMPLES.map((s) => (
                <button
                  key={s.url}
                  onClick={() => loadSample(s.url)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Everything runs in your browser — files never leave your machine. MP4/WebM play
              natively; HLS (.m3u8) and MKV lazy-load the core engine on demand.
            </p>
          </>
        ) : (
          <>
            <div className="h-[60vh] min-h-[420px] overflow-hidden rounded-xl border border-border">
              <PlayerErrorBoundary>
                <LightBirdPlayer />
              </PlayerErrorBoundary>
            </div>
            <p className="text-xs text-muted-foreground">
              The React drop-in is self-configuring — it ships its own upload UI, controls,
              subtitles, and playlist. Try it here, then copy the snippet.
            </p>
          </>
        )}
      </section>

      {/* ── Config + code column ───────────────────────────────────── */}
      <aside className="space-y-5">
        <div
          role="tablist"
          aria-label="Integration target"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
        >
          {TARGETS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={target === t.id}
              onClick={() => setTarget(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                target === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Options — only meaningful for the configurable Web Component */}
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-1 text-sm font-semibold">Options</h3>
          {isWebComponent ? (
            <>
              <div className="divide-y divide-border/60">
                <Toggle label="Native controls" hint="Browser playback controls" checked={controls} onChange={setControls} />
                <Toggle label="Autoplay" hint="Start on load (pair with muted)" checked={autoPlay} onChange={setAutoPlay} />
                <Toggle label="Muted" hint="Start without sound" checked={muted} onChange={setMuted} />
              </div>
              <label className="mt-3 block border-t border-border/60 pt-3">
                <span className="text-sm font-medium">Poster URL</span>
                <input
                  type="text"
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  placeholder="https://…/poster.jpg"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              The React <code className="font-mono">&lt;LightBirdPlayer /&gt;</code> is a zero-config
              drop-in — it manages its own controls and options internally. Switch to the{" "}
              <button onClick={() => setTarget("web-component")} className="underline hover:text-foreground">
                Web Component
              </button>{" "}
              tab to tweak attributes live.
            </p>
          )}
        </div>

        {/* Generated code */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Install
            </span>
            <CopyButton text={snippet.install} label="Copy install command" />
          </div>
          <pre className="overflow-x-auto px-4 py-3 text-xs">
            <code className="font-mono">{snippet.install}</code>
          </pre>

          <div className="flex items-center justify-between border-y border-border px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {snippet.language === "tsx" ? "App.tsx" : "index.html"}
            </span>
            <CopyButton text={snippet.code} label="Copy code snippet" />
          </div>
          <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
            <code className="whitespace-pre font-mono">{snippet.code}</code>
          </pre>
        </div>
      </aside>
    </div>
  );
}
