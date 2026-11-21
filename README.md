# LightBird — online video player and JavaScript video toolkit

**[Use the player](https://lightbird.vercel.app)** · **[Documentation](https://lightbird.vercel.app/docs)** · **[Integration playground](https://lightbird.vercel.app/playground)** · **[Contributing](CONTRIBUTING.md)**

LightBird is a free, open-source browser video player with local file playback,
subtitles, playlists, MKV processing, and HLS streaming. It also provides a
JavaScript engine, a ready-made React player, and a framework-independent
`<lightbird-player>` Web Component for embedding video in your own application.

## Watch videos in your browser

Open **[LightBird](https://lightbird.vercel.app)** and choose **Open video** for a
local file, or **Open URL** for an accessible remote video or stream. No account
is required. Local files are read in the browser rather than uploaded to a video
server. Remote streams, app assets, and optional online subtitle search use the
network separately.

- **[MKV player](https://lightbird.vercel.app/mkv-player)** — browser-side media
  processing with FFmpeg.wasm, embedded track selection, and chapters when available.
- **MP4 and WebM** — native playback when the browser supports the file's codecs.
- **[HLS / M3U8 player](https://lightbird.vercel.app/hls-player)** — accessible
  streams, with quality selection when multiple renditions are available.
- **Subtitles and controls** — SRT, VTT, ASS/SSA, playback speed, keyboard shortcuts,
  fullscreen, video adjustments, and screenshots, subject to browser support.
- **Responsive playlist** — local files, stream URLs, playlist import/export, and
  controls that adapt to phones, tablets, and desktop screens.

MKV is a container, not a codec. Remuxing does not make every codec playable;
large files can exceed a device's memory. Remote sources need appropriate access
and CORS headers. See the [browser requirements](https://lightbird.vercel.app/docs#browser-support).

## Add a video player to your app

| Package | Use it for | Start here |
| --- | --- | --- |
| [`@lightbird/core`](packages/lightbird) | Framework-independent engine and React hooks | [API documentation](https://lightbird.vercel.app/docs#api) |
| [`@lightbird/player-react`](packages/ui) | Ready-made React controls and playlist | [React video player guide](https://lightbird.vercel.app/react-video-player) |
| [`@lightbird/player`](packages/web-component) | Vue, Svelte, Angular, Solid, or plain HTML | [Web Component guide](https://lightbird.vercel.app/web-component-video-player) |

### React

```bash
npm install @lightbird/core @lightbird/player-react
```

```tsx
"use client";
import { FeatureFlagsProvider, LightBirdPlayer } from '@lightbird/player-react';
import '@lightbird/player-react/styles.css';

export default function VideoPage() {
  return (
    <FeatureFlagsProvider>
      <div style={{ height: '80dvh', minHeight: 320 }}><LightBirdPlayer /></div>
    </FeatureFlagsProvider>
  );
}
```

### Feature flags and browser builds

`FeatureFlagsProvider` calls `initFeatureFlags()` on the client. That function
reads `process.env.NEXT_PUBLIC_UNLEASH_URL` and
`process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY`. It therefore requires a `process`
global or build-time replacements for those expressions. The example above is
not directly browser-safe in a Vite app without the wiring below; omitting the
settings does not avoid the `process` lookup. Next.js replaces these public
variables as part of its normal build.

For Vite, explicitly replace both expressions in `vite.config.ts`, including
empty strings when you do not use remote flags:

```ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    define: {
      'process.env.NEXT_PUBLIC_UNLEASH_URL': JSON.stringify(env.VITE_UNLEASH_URL ?? ''),
      'process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY': JSON.stringify(env.VITE_UNLEASH_CLIENT_KEY ?? ''),
    },
  };
});
```

Set `VITE_UNLEASH_URL` and `VITE_UNLEASH_CLIENT_KEY` in the Vite app's local
build environment when using Unleash. Only use a public frontend client token;
these values are included in the browser bundle. Do not expose an admin/server
token or replace the entire `process.env` object. With empty settings,
initialization warns and skips remote-provider registration, so no remote flag
fetch is configured.

LightBird registers its Unleash provider in the `lightbird` OpenFeature domain,
and `FeatureFlagsProvider` binds its child flag reads to that same domain. It
does not replace the host app's default provider. Direct SDK consumers should
read flags with `OpenFeature.getClient('lightbird')`; the domain name is also
exported as `LIGHTBIRD_FEATURE_DOMAIN` from `@lightbird/core`. Wrap only the LightBird subtree,
as in the example, to keep the host's React flag context outside that wrapper.
Older package releases that register Unleash without a domain can replace the
host's default provider: upgrade to a release containing this domain-scoping fix
before using the wrapper in an app that already uses OpenFeature.

### Web Component

```bash
npm install @lightbird/player
```

Import the package in a browser entry point processed by your bundler:

```js
import '@lightbird/player';
```

Then use the custom element in your HTML or framework template:

```html
<lightbird-player src="/videos/example.mp4" controls></lightbird-player>
```

The element lazy-loads the HLS or MKV engine when needed. See the
[package README](packages/web-component/README.md) for attributes, events,
control selection, and Vue/Svelte examples. Self-hosted MKV processing also
requires the headers and assets described in the documentation.

## Develop LightBird

The monorepo uses pnpm 9.15.9, Turborepo, TypeScript, and Next.js for the website.

```bash
pnpm install --frozen-lockfile
pnpm turbo build --filter=@lightbird/core --filter=@lightbird/player-react --filter=@lightbird/player
pnpm dev
```

The web app runs on port 9002. See [CONTRIBUTING.md](CONTRIBUTING.md) for the
repository structure, tests, and release conventions. For site publication and
Search Console follow-up, see the [discoverability checklist](docs/discoverability.md).

## License

[MIT](LICENSE). Review dependency licenses when distributing an application.

## Responsive UI checks

The home player adapts to its container width: under 640px the playlist is a
bottom sheet, from 640px to 1023px it is an overlay, and wider players retain the
pinnable sidebar. Playback options move into **More controls** when the video
area is narrow. Touch controls wake on a tap; playback uses the explicit play
button so taps and double-tap seek gestures do not conflict.

Run the existing package builds and unit tests first, then check the production UI:

```bash
pnpm turbo build --filter=@lightbird/core --filter=@lightbird/player-react --filter=@lightbird/player
pnpm --filter web build
pnpm exec playwright install chromium
pnpm --filter web exec next start -p 9002
# In another terminal:
pnpm test:responsive
```

For an existing system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable instead of installing a browser. `LIGHTBIRD_TEST_URL` selects another
running server. The suite checks seven viewport sizes, actual local-video
playback, orientation changes without replacing the video, menus, source entry,
long playlists, focus restoration, and narrow desktop embeds.

The tiny WebM fixture in `apps/web/__tests__/fixtures/responsive.webm` is an
8-second synthetic blue frame, generated with FFmpeg's `color` filter; it
contains no third-party media. Real iPhone Safari and Android device testing
remains necessary for native fullscreen, software keyboards, and OS file pickers.
