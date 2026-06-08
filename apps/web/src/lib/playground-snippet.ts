/**
 * Pure, framework-agnostic snippet generation for the interactive playground.
 *
 * Kept free of React / DOM imports so it can be unit-tested in isolation and so
 * the playground UI and the generated code never drift apart — the same config
 * object drives both the live preview and the copy-pasteable snippet.
 *
 * The two targets mirror the real package APIs exactly:
 *  - `@lightbird/player-react` exports a zero-config `<LightBirdPlayer />`
 *    (its own upload UI, controls, playlist — no props).
 *  - `@lightbird/player` is the `<lightbird-player>` custom element, which
 *    accepts `src`, `controls`, `nativecontrols`, `autoplay`, `muted`,
 *    `poster`, and `subtitles` attributes.
 */

export type PlaygroundTarget = "react" | "web-component";

export interface PlaygroundConfig {
  /** Video source URL used in the Web Component snippet/preview. */
  src: string;
  /** Poster image URL. */
  poster?: string;
  /** Show the LightBird control bar (Web Component). */
  controls: boolean;
  /** Use the browser's native controls instead of the styled bar (Web Component). */
  nativeControls: boolean;
  /** Auto-play on load (Web Component). */
  autoPlay: boolean;
  /** Start muted (Web Component). */
  muted: boolean;
  /** Optional subtitle track URL (.vtt/.srt) for the Web Component. */
  subtitleUrl?: string;
  /**
   * Control-bar feature allow-list. `undefined` (or all features selected)
   * emits a bare `controls`; a subset emits `controls="..."`.
   */
  features?: WebComponentFeature[];
  /** Playlist entries; when 2+, emits a `sources` attribute. */
  sources?: { src: string; title?: string }[];
}

/** Features that can be allow-listed on the Web Component's `controls` attribute. */
export const WEB_COMPONENT_FEATURES = [
  "play",
  "seek",
  "volume",
  "time",
  "audio",
  "subtitles",
  "pip",
  "settings",
  "fullscreen",
  "playlist",
] as const;

export type WebComponentFeature = (typeof WEB_COMPONENT_FEATURES)[number];

export interface GeneratedSnippet {
  /** Install command for the relevant package. */
  install: string;
  /** Copy-pasteable code reflecting the current configuration. */
  code: string;
  /** Language hint for display. */
  language: "tsx" | "html";
}

export const REACT_PACKAGE = "@lightbird/player-react";
export const WEB_COMPONENT_PACKAGE = "@lightbird/player";

/** Sensible defaults matching the components' own defaults. */
export function defaultPlaygroundConfig(): PlaygroundConfig {
  return {
    src: "https://your-cdn.example.com/video.mp4",
    poster: undefined,
    controls: true,
    nativeControls: false,
    autoPlay: false,
    muted: false,
    subtitleUrl: undefined,
  };
}

/** Escape a string for safe use inside a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function generateReact(): GeneratedSnippet {
  // The React drop-in is self-contained and takes no props — it ships its own
  // upload UI, controls, subtitles, and playlist. The snippet reflects that.
  const code = `import { LightBirdPlayer, Toaster } from "${REACT_PACKAGE}";
import "${REACT_PACKAGE}/styles.css";

export default function App() {
  return (
    <>
      {/* Toaster surfaces player notifications (optional) */}
      <Toaster />
      <LightBirdPlayer />
    </>
  );
}
`;

  return {
    install: `npm install ${REACT_PACKAGE}`,
    code,
    language: "tsx",
  };
}

function generateWebComponent(config: PlaygroundConfig): GeneratedSnippet {
  const hasPlaylist = (config.sources?.length ?? 0) >= 2;
  const attrs: string[] = [];

  // With a playlist, `sources` drives playback; otherwise a single `src`.
  // JSON goes in a double-quoted attribute and is escaped — JSON.stringify does
  // not escape quotes for HTML, so single-quoting would allow attribute breakout.
  if (hasPlaylist) {
    attrs.push(`sources="${escapeAttr(JSON.stringify(config.sources))}"`);
  } else {
    attrs.push(`src="${escapeAttr(config.src)}"`);
  }

  if (config.poster) attrs.push(`poster="${escapeAttr(config.poster)}"`);

  if (config.controls) {
    // A full feature set emits a bare `controls`; a subset emits an allow-list.
    const all = WEB_COMPONENT_FEATURES;
    const selected = config.features;
    if (selected && selected.length > 0 && selected.length < all.length) {
      const ordered = all.filter((f) => selected.includes(f));
      attrs.push(`controls="${ordered.join(" ")}"`);
    } else {
      attrs.push("controls");
    }
  }
  // `nativecontrols` only has meaning alongside `controls`.
  if (config.controls && config.nativeControls) attrs.push("nativecontrols");
  if (config.autoPlay) attrs.push("autoplay");
  if (config.muted) attrs.push("muted");
  if (config.subtitleUrl) {
    // The `subtitles` attribute takes a JSON array of track descriptors.
    const tracks = JSON.stringify([{ src: config.subtitleUrl, label: "Subtitles", srclang: "en" }]);
    attrs.push(`subtitles="${escapeAttr(tracks)}"`);
  }

  const indented = attrs.map((a) => `  ${a}`).join("\n");

  const code = `<script type="module">
  // Importing the package once registers the <lightbird-player> element.
  import "${WEB_COMPONENT_PACKAGE}";
</script>

<lightbird-player
${indented}
></lightbird-player>
`;

  return {
    install: `npm install ${WEB_COMPONENT_PACKAGE}`,
    code,
    language: "html",
  };
}

/**
 * Generate the install command + code snippet for the chosen integration target
 * from the current playground configuration.
 */
export function generateSnippet(
  config: PlaygroundConfig,
  target: PlaygroundTarget,
): GeneratedSnippet {
  return target === "react" ? generateReact() : generateWebComponent(config);
}
