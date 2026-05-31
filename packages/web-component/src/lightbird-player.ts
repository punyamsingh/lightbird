import type { VideoPlayer } from '@lightbird/core';
import type { LightBirdEventDetail, SubtitleSource } from './types';

/** Native media events re-dispatched on the host as `CustomEvent`s. */
const FORWARDED_EVENTS = [
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'play',
  'playing',
  'pause',
  'timeupdate',
  'seeking',
  'seeked',
  'waiting',
  'ended',
  'ratechange',
  'volumechange',
  'durationchange',
  'error',
] as const;

const SHADOW_STYLES = `
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    background: #000;
  }
  :host([hidden]) { display: none; }
  video {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

/** Strips query string and hash, lower-cased, for extension matching. */
function stripUrl(url: string): string {
  return url.split(/[?#]/)[0].toLowerCase();
}

function isHlsSource(src: string): boolean {
  return stripUrl(src).endsWith('.m3u8');
}

function isMkvSource(src: string): boolean {
  return stripUrl(src).endsWith('.mkv');
}

function isSrtSource(src: string): boolean {
  return stripUrl(src).endsWith('.srt');
}

/** Parses the JSON `subtitles` attribute into a validated list. */
function parseSubtitlesAttribute(value: string | null): SubtitleSource[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SubtitleSource =>
        !!entry && typeof entry === 'object' && typeof (entry as SubtitleSource).src === 'string',
    );
  } catch {
    return [];
  }
}

// SSR-safe base: in Node/SSR `HTMLElement` is undefined, so extending it at
// module load would crash bare imports. The empty fallback lets the module
// evaluate; construction still requires a real DOM (guarded by the
// `customElements`-undefined check in `register()`).
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

/**
 * `<lightbird-player>` — a framework-agnostic custom element wrapping
 * `@lightbird/core`. Plays MP4/WebM natively; HLS and MKV sources lazy-load
 * the core engine (and FFmpeg.wasm, for MKV) only when first encountered.
 */
export class LightBirdPlayerElement extends HTMLElementBase {
  static readonly tagName = 'lightbird-player';

  static get observedAttributes(): string[] {
    return ['src', 'controls', 'autoplay', 'muted', 'poster', 'subtitles'];
  }

  private readonly video: HTMLVideoElement;
  private readonly forwardEvent: (event: Event) => void;

  private corePlayer: VideoPlayer | null = null;
  private subtitleSources: SubtitleSource[] = [];
  private subtitleObjectUrls: string[] = [];
  /** Bumped on every (re)load so stale async work can detect it was superseded. */
  private loadToken = 0;
  private isSetUp = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SHADOW_STYLES;

    this.video = document.createElement('video');
    this.video.setAttribute('part', 'video');
    this.video.playsInline = true;

    root.append(style, this.video);

    this.forwardEvent = (event: Event): void => {
      const detail: LightBirdEventDetail = this.snapshot();
      this.dispatchEvent(new CustomEvent(event.type, { detail, composed: true }));
    };
  }

  /* ----------------------------- lifecycle ----------------------------- */

  connectedCallback(): void {
    if (this.isSetUp) return;
    this.isSetUp = true;

    for (const type of FORWARDED_EVENTS) {
      this.video.addEventListener(type, this.forwardEvent);
    }

    if (this.subtitleSources.length === 0 && this.hasAttribute('subtitles')) {
      this.subtitleSources = parseSubtitlesAttribute(this.getAttribute('subtitles'));
    }

    this.syncMediaAttributes();
    this.renderSubtitleTracks();
    this.loadSource();
  }

  disconnectedCallback(): void {
    this.isSetUp = false;
    // Invalidate any in-flight load so it cannot re-attach a player.
    this.loadToken++;

    for (const type of FORWARDED_EVENTS) {
      this.video.removeEventListener(type, this.forwardEvent);
    }

    this.teardownCorePlayer();
    this.revokeSubtitleUrls();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isSetUp) return;

    switch (name) {
      case 'src':
        this.loadSource();
        break;
      case 'subtitles':
        this.subtitleSources = parseSubtitlesAttribute(newValue);
        this.renderSubtitleTracks();
        break;
      default:
        this.syncMediaAttributes();
    }
  }

  /* ----------------------------- properties ---------------------------- */

  get src(): string {
    return this.getAttribute('src') ?? '';
  }
  set src(value: string) {
    if (value) this.setAttribute('src', value);
    else this.removeAttribute('src');
  }

  get controls(): boolean {
    return this.hasAttribute('controls');
  }
  set controls(value: boolean) {
    this.toggleAttribute('controls', !!value);
  }

  get autoplay(): boolean {
    return this.hasAttribute('autoplay');
  }
  set autoplay(value: boolean) {
    this.toggleAttribute('autoplay', !!value);
  }

  get muted(): boolean {
    return this.video.muted;
  }
  set muted(value: boolean) {
    this.video.muted = !!value;
    this.toggleAttribute('muted', !!value);
  }

  get poster(): string {
    return this.getAttribute('poster') ?? '';
  }
  set poster(value: string) {
    if (value) this.setAttribute('poster', value);
    else this.removeAttribute('poster');
  }

  get subtitles(): SubtitleSource[] {
    return this.subtitleSources.map((entry) => ({ ...entry }));
  }
  set subtitles(value: SubtitleSource[]) {
    this.subtitleSources = Array.isArray(value) ? value.map((entry) => ({ ...entry })) : [];
    if (this.isSetUp) this.renderSubtitleTracks();
  }

  get currentTime(): number {
    return this.video.currentTime;
  }
  set currentTime(value: number) {
    this.video.currentTime = value;
  }

  get duration(): number {
    return this.video.duration;
  }

  get paused(): boolean {
    return this.video.paused;
  }

  get ended(): boolean {
    return this.video.ended;
  }

  get volume(): number {
    return this.video.volume;
  }
  set volume(value: number) {
    this.video.volume = value;
  }

  get playbackRate(): number {
    return this.video.playbackRate;
  }
  set playbackRate(value: number) {
    this.video.playbackRate = value;
  }

  /** The underlying `<video>` element living inside the shadow root. */
  get mediaElement(): HTMLVideoElement {
    return this.video;
  }

  /* ------------------------------ methods ------------------------------ */

  play(): Promise<void> {
    return Promise.resolve(this.video.play());
  }

  pause(): void {
    this.video.pause();
  }

  /* ------------------------------ internals ---------------------------- */

  private snapshot(): LightBirdEventDetail {
    const v = this.video;
    return {
      currentTime: v.currentTime,
      duration: Number.isFinite(v.duration) ? v.duration : 0,
      paused: v.paused,
      volume: v.volume,
      muted: v.muted,
      playbackRate: v.playbackRate,
    };
  }

  private syncMediaAttributes(): void {
    this.video.controls = this.hasAttribute('controls');
    this.video.autoplay = this.hasAttribute('autoplay');
    this.video.muted = this.hasAttribute('muted');

    const poster = this.getAttribute('poster');
    if (poster) this.video.poster = poster;
    else this.video.removeAttribute('poster');
  }

  private loadSource(): void {
    const src = this.getAttribute('src');
    const token = ++this.loadToken;

    this.teardownCorePlayer();

    if (!src) {
      this.video.removeAttribute('src');
      this.video.load();
      return;
    }

    if (isHlsSource(src) || isMkvSource(src)) {
      void this.loadViaCore(src, token);
    } else {
      this.video.src = src;
    }
  }

  /** Lazy-loads `@lightbird/core` to handle HLS streams and MKV files. */
  private async loadViaCore(src: string, token: number): Promise<void> {
    try {
      const core = await import('@lightbird/core');
      if (token !== this.loadToken) return;

      let player: VideoPlayer;
      if (isMkvSource(src)) {
        const file = await this.fetchAsFile(src);
        if (token !== this.loadToken) return;
        player = core.createVideoPlayer(file);
      } else {
        player = core.createVideoPlayer(src);
      }

      await player.initialize(this.video);

      if (token !== this.loadToken) {
        player.destroy();
        return;
      }
      this.corePlayer = player;
    } catch (error) {
      if (token === this.loadToken) this.emitError(error);
    }
  }

  /** Downloads an MKV URL into a `File` so the core MKV player can probe it. */
  private async fetchAsFile(src: string): Promise<File> {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`lightbird-player: failed to fetch "${src}" (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const name = stripUrl(src).split('/').pop() || 'video.mkv';
    return new File([blob], name, { type: blob.type || 'video/x-matroska' });
  }

  private renderSubtitleTracks(): void {
    this.video.querySelectorAll('track[data-lightbird]').forEach((track) => track.remove());
    this.revokeSubtitleUrls();

    for (const subtitle of this.subtitleSources) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.setAttribute('data-lightbird', '');
      if (subtitle.label) track.label = subtitle.label;
      if (subtitle.srclang) track.srclang = subtitle.srclang;
      if (subtitle.default) track.default = true;

      if (isSrtSource(subtitle.src)) {
        void this.attachConvertedSubtitle(track, subtitle.src);
      } else {
        track.src = subtitle.src;
      }

      this.video.appendChild(track);
    }
  }

  /** Fetches an SRT file, converts it to VTT via core, attaches a blob URL. */
  private async attachConvertedSubtitle(track: HTMLTrackElement, src: string): Promise<void> {
    try {
      const [core, response] = await Promise.all([
        import('@lightbird/core'),
        fetch(src),
      ]);
      if (!response.ok) {
        throw new Error(
          `lightbird-player: failed to fetch subtitle "${src}" (HTTP ${response.status})`,
        );
      }
      // The track may have been removed (subtitles changed) while we waited.
      if (!track.isConnected) return;
      const srt = await response.text();
      if (!track.isConnected) return;
      const vtt = await core.SubtitleConverter.convertSrtToVtt(srt);
      if (!track.isConnected) return;
      const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
      this.subtitleObjectUrls.push(url);
      track.src = url;
    } catch (error) {
      this.emitError(error);
    }
  }

  private emitError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.dispatchEvent(
      new CustomEvent('error', {
        detail: { ...this.snapshot(), error: message },
        composed: true,
      }),
    );
  }

  private teardownCorePlayer(): void {
    if (!this.corePlayer) return;
    try {
      this.corePlayer.destroy();
    } catch {
      // A failed teardown must not block reloading.
    }
    this.corePlayer = null;
  }

  private revokeSubtitleUrls(): void {
    for (const url of this.subtitleObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.subtitleObjectUrls = [];
  }
}
