# Web Component — `<lightbird-player>` `[DONE]`

> **Implemented (issue #53).** LightBird now ships a framework-agnostic
> `<lightbird-player>` custom element as the new `@lightbird/player` package
> (`packages/web-component/`). It wraps `@lightbird/core` with no React
> dependency, making the player usable in Vue, Svelte, Angular, Solid, or
> plain HTML.

## Why

`@lightbird/core` is framework-agnostic, but `@lightbird/player-react` shipped React
components only — locking out every non-React ecosystem. A custom element
built on the core converts the framework-agnostic *core* into a
framework-agnostic *product*.

## What was built

- **New package `packages/web-component/`** published as `@lightbird/player`
  (`type: module`, ESM + CJS dual output via tsup, declaration files).
- **`<lightbird-player>` custom element** (`src/lightbird-player.ts`):
  - Shadow DOM (open) wrapping a single `<video>`, exposed via the `video`
    CSS part for external styling.
  - Observed attributes: `src`, `controls`, `autoplay`, `muted`, `poster`,
    `subtitles`. Matching JS properties, plus live media properties
    (`currentTime`, `duration`, `paused`, `ended`, `volume`, `playbackRate`),
    a `mediaElement` accessor, and `play()` / `pause()` methods.
  - Re-dispatches the standard media events (`play`, `pause`, `timeupdate`,
    `error`, …) as DOM `CustomEvent`s, each carrying a `detail` snapshot.
  - Subtitles: `subtitles` as a JSON attribute or a property array. `.vtt`
    files attach directly as `<track>`s; `.srt` files are converted to VTT
    via the core `SubtitleConverter`.
- **Lazy core loading**: MP4/WebM play natively (zero core/FFmpeg bytes).
  `.m3u8` (HLS) and `.mkv` sources dynamically `import('@lightbird/core')` —
  and MKV reaches FFmpeg.wasm only through the core's existing lazy path.
  The built ESM bundle is ~3 KB gzipped with core kept as an external chunk.
- **Auto-registration**: importing the package registers the element; an
  idempotent `register(tagName?)` export allows explicit / custom-name use.
- **Tests** (`__tests__/lightbird-player.test.ts`, 19 tests) covering
  registration, shadow DOM, attribute reflection, native playback, event
  forwarding, playback control, subtitles, and the core-routed HLS/MKV paths
  (core mocked via `__mocks__/lightbird-core.ts`).
- **Examples** (`examples/`): plain HTML, Vue 3, and Svelte.
- **Docs**: a "Web Component" section on the docs page (`apps/web`), a README
  snippet in the root README, and a package README.
- **Release wiring**: `@lightbird/player` added to `scripts/update-versions.sh`,
  `scripts/publish-packages.sh`, the `.releaserc.json` git assets, and the CI
  build filter in `.github/workflows/test.yml`.

## Notes

- Native HTML5 controls are used (`controls` attribute) rather than a custom
  control UI — re-implementing the React control bar in vanilla JS was out of
  scope and the issue only required common playback attributes.
- `createVideoPlayer` only accepts a `File` or HLS URL; MKV URLs are fetched
  into a `File` before being handed to the core MKV player.
