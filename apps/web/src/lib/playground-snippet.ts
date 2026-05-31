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
 *    accepts `src`, `controls`, `nativecontrols`, `autoplay`, `muted`, and
 *    `poster` attributes.
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
}

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
  const attrs: string[] = [`src="${escapeAttr(config.src)}"`];

  if (config.poster) attrs.push(`poster="${escapeAttr(config.poster)}"`);
  if (config.controls) attrs.push("controls");
  // `nativecontrols` only has meaning alongside `controls`.
  if (config.controls && config.nativeControls) attrs.push("nativecontrols");
  if (config.autoPlay) attrs.push("autoplay");
  if (config.muted) attrs.push("muted");

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
