# @lightbird/player

A framework-agnostic **`<lightbird-player>` Web Component** — the LightBird
video player as a standard custom element. Use it in Vue, Svelte, Angular,
Solid, or plain HTML with no framework wrapper.

It is built on [`@lightbird/core`](https://www.npmjs.com/package/@lightbird/core):
MP4/WebM play natively, while HLS streams and MKV files lazy-load the core
engine (and FFmpeg.wasm, for MKV) only the first time they are needed.

## Install

```bash
npm install @lightbird/player
```

## Usage

Importing the package once registers the `<lightbird-player>` element:

```js
import '@lightbird/player';
```

```html
<lightbird-player
  src="https://example.com/video.mp4"
  controls
  poster="cover.jpg"
></lightbird-player>
```

That is the whole API surface for a basic player. For HLS or MKV, just point
`src` at a `.m3u8` or `.mkv` URL — the element loads the right engine itself.

## Attributes & properties

| Attribute / property | Type | Description |
|---|---|---|
| `src` | `string` | Video URL. `.m3u8` → HLS, `.mkv` → MKV (via core), anything else → native. |
| `controls` | `boolean` | Show LightBird's styled control bar — play/pause, scrubber, volume, time, an audio-track picker (multi-track MKV/HLS), a subtitle (CC) track picker, picture-in-picture, a settings menu (playback-speed presets + brightness/contrast/saturation/hue), and fullscreen. |
| `nativecontrols` | `boolean` | With `controls`, use the browser's built-in `<video>` controls instead of the styled bar. |
| `autoplay` | `boolean` | Autoplay once ready (pair with `muted`). |
| `muted` | `boolean` | Start muted. |
| `poster` | `string` | Poster image shown before playback. |
| `subtitles` | `SubtitleSource[]` | Subtitle tracks. As an attribute, pass a JSON array. |

`SubtitleSource` is `{ src, label?, srclang?, default? }`. `.vtt` files are
used directly; `.srt` files are converted to VTT automatically.

The styled control bar is themeable via the `--lb-accent` CSS custom property
and exposes a `controls` CSS part, e.g.:

```css
lightbird-player { --lb-accent: #e91e63; }
lightbird-player::part(controls) { padding-bottom: 16px; }
```

Read-only / live properties: `duration`, `paused`, `ended`. Read-write:
`currentTime`, `volume`, `playbackRate`. `mediaElement` exposes the underlying
`<video>`. Methods: `play()`, `pause()`.

## Events

The element re-dispatches the standard media events as `CustomEvent`s:
`loadedmetadata`, `canplay`, `play`, `playing`, `pause`, `timeupdate`,
`seeking`, `seeked`, `waiting`, `ended`, `ratechange`, `volumechange`,
`durationchange`, and `error`.

Each event's `detail` carries a snapshot: `{ currentTime, duration, paused,
volume, muted, playbackRate }`. The `error` event additionally includes an
`error` message string.

```js
const player = document.querySelector('lightbird-player');
player.addEventListener('timeupdate', (e) => {
  console.log(e.detail.currentTime, '/', e.detail.duration);
});
```

## Styling

The player uses Shadow DOM for style encapsulation. Style the inner video via
the `video` part:

```css
lightbird-player::part(video) {
  border-radius: 12px;
}
```

## Framework examples

Working examples live in [`examples/`](./examples): plain HTML, Vue, and
Svelte. Custom elements are first-class in every modern framework — bind
attributes and listen for events exactly as you would for a `<video>`.

## License

MIT
