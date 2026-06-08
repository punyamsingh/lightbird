import {
  generateSnippet,
  defaultPlaygroundConfig,
  REACT_PACKAGE,
  WEB_COMPONENT_PACKAGE,
  WEB_COMPONENT_FEATURES,
  type PlaygroundConfig,
} from "../src/lib/playground-snippet";

function makeConfig(overrides: Partial<PlaygroundConfig> = {}): PlaygroundConfig {
  return { ...defaultPlaygroundConfig(), src: "https://x.test/v.mp4", ...overrides };
}

describe("generateSnippet — React target", () => {
  it("emits install command and import for the React package", () => {
    const { install, code, language } = generateSnippet(makeConfig(), "react");
    expect(install).toBe(`npm install ${REACT_PACKAGE}`);
    expect(code).toContain(`import { LightBirdPlayer, Toaster } from "${REACT_PACKAGE}";`);
    expect(code).toContain(`import "${REACT_PACKAGE}/styles.css";`);
    expect(language).toBe("tsx");
  });

  it("renders the zero-config drop-in component", () => {
    const { code } = generateSnippet(makeConfig(), "react");
    expect(code).toContain("<LightBirdPlayer />");
  });

  it("does not invent props that the drop-in does not accept", () => {
    // The React component is self-configuring; toggles must not leak into JSX.
    const { code } = generateSnippet(
      makeConfig({ autoPlay: true, muted: true, controls: false, poster: "p.jpg" }),
      "react",
    );
    expect(code).not.toContain("autoPlay");
    expect(code).not.toContain("muted");
    expect(code).not.toContain("poster");
    expect(code).not.toContain("controls");
  });
});

describe("generateSnippet — Web Component target", () => {
  it("emits install command and module import for the web-component package", () => {
    const { install, code, language } = generateSnippet(makeConfig(), "web-component");
    expect(install).toBe(`npm install ${WEB_COMPONENT_PACKAGE}`);
    expect(code).toContain(`import "${WEB_COMPONENT_PACKAGE}";`);
    expect(code).toContain("<lightbird-player");
    expect(code).toContain("></lightbird-player>");
    expect(language).toBe("html");
  });

  it("always includes the src attribute", () => {
    const { code } = generateSnippet(makeConfig({ src: "https://x.test/clip.mp4" }), "web-component");
    expect(code).toContain('src="https://x.test/clip.mp4"');
  });

  it("includes only the enabled boolean attributes", () => {
    const enabled = generateSnippet(
      makeConfig({ controls: true, autoPlay: true, muted: true }),
      "web-component",
    ).code;
    expect(enabled).toContain("controls");
    expect(enabled).toContain("autoplay");
    expect(enabled).toContain("muted");

    const disabled = generateSnippet(
      makeConfig({ controls: false, autoPlay: false, muted: false }),
      "web-component",
    ).code;
    expect(disabled).not.toContain("autoplay");
    expect(disabled).not.toContain("muted");
    expect(disabled).not.toMatch(/\n\s*controls\n/);
  });

  it("includes the poster attribute when provided", () => {
    const { code } = generateSnippet(
      makeConfig({ poster: "https://x.test/p.jpg" }),
      "web-component",
    );
    expect(code).toContain('poster="https://x.test/p.jpg"');
  });

  it("adds nativecontrols only when controls is also enabled", () => {
    const both = generateSnippet(
      makeConfig({ controls: true, nativeControls: true }),
      "web-component",
    ).code;
    expect(both).toContain("nativecontrols");

    // nativecontrols is meaningless without controls — it must be dropped.
    const orphan = generateSnippet(
      makeConfig({ controls: false, nativeControls: true }),
      "web-component",
    ).code;
    expect(orphan).not.toContain("nativecontrols");

    const styled = generateSnippet(
      makeConfig({ controls: true, nativeControls: false }),
      "web-component",
    ).code;
    expect(styled).not.toContain("nativecontrols");
  });

  it("escapes double quotes in attribute values", () => {
    const { code } = generateSnippet(makeConfig({ src: 'a"b' }), "web-component");
    expect(code).toContain('src="a&quot;b"');
  });

  it("emits a subtitles JSON attribute when a subtitle URL is given", () => {
    const { code } = generateSnippet(
      makeConfig({ subtitleUrl: "https://x.test/en.vtt" }),
      "web-component",
    );
    expect(code).toContain('subtitles="');
    expect(code).toContain('&quot;src&quot;:&quot;https://x.test/en.vtt&quot;');
  });

  it("omits the subtitles attribute when no URL is given", () => {
    const { code } = generateSnippet(makeConfig(), "web-component");
    expect(code).not.toContain("subtitles");
  });

  it("emits a bare `controls` when all features are selected", () => {
    const { code } = generateSnippet(
      makeConfig({ controls: true, features: [...WEB_COMPONENT_FEATURES] }),
      "web-component",
    );
    expect(code).toMatch(/\n\s*controls\n/);
    expect(code).not.toContain('controls="');
  });

  it("emits a `controls` allow-list for a feature subset", () => {
    const { code } = generateSnippet(
      makeConfig({ controls: true, features: ["play", "seek", "fullscreen"] }),
      "web-component",
    );
    expect(code).toContain('controls="play seek fullscreen"');
  });

  it("emits a sources attribute and drops src for a playlist", () => {
    const { code } = generateSnippet(
      makeConfig({
        sources: [
          { src: "a.mp4", title: "First" },
          { src: "b.mp4", title: "Second" },
        ],
      }),
      "web-component",
    );
    expect(code).toContain('sources="');
    expect(code).toContain('&quot;src&quot;:&quot;a.mp4&quot;');
    expect(code).not.toContain('src="https://x.test');
  });

  it("uses a single src when fewer than two sources are given", () => {
    const { code } = generateSnippet(
      makeConfig({ src: "https://x.test/solo.mp4", sources: [{ src: "a.mp4" }] }),
      "web-component",
    );
    expect(code).toContain('src="https://x.test/solo.mp4"');
    expect(code).not.toContain("sources=");
  });

  it("escapes quotes in the sources JSON attribute (no attribute breakout)", () => {
    const { code } = generateSnippet(
      makeConfig({
        sources: [
          { src: "first.mp4", title: "It's a \"quote\"" },
          { src: "second.mp4" },
        ],
      }),
      "web-component",
    );
    // Double-quoted attribute with all JSON quotes escaped.
    expect(code).toContain('sources="');
    expect(code).not.toContain("sources='");
    expect(code).toContain("&quot;");
    // The raw double quotes from JSON must not appear unescaped and break out.
    expect(code).not.toContain('title":"It');
  });

  it("escapes quotes in the subtitles JSON attribute", () => {
    const { code } = generateSnippet(
      makeConfig({ subtitleUrl: "https://x.test/a'b\".vtt" }),
      "web-component",
    );
    expect(code).toContain('subtitles="');
    expect(code).not.toContain("subtitles='");
    expect(code).toContain("&quot;");
  });
});
