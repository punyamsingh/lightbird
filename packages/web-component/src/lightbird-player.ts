import type { VideoPlayer } from '@lightbird/core';
import type { LightBirdEventDetail, SubtitleSource, PlaylistItem } from './types';
import {
  createControlBar,
  parseControlFeatures,
  CONTROL_STYLES,
  type ControlBar,
} from './controls';

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
${CONTROL_STYLES}`;

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

/** Parse the JSON `sources` attribute into a validated playlist. */
function parseSourcesAttribute(value: string | null): PlaylistItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PlaylistItem =>
        !!entry && typeof entry === 'object' && typeof (entry as PlaylistItem).src === 'string',
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
    return [
      'src',
      'sources',
      'controls',
      'nativecontrols',
      'autoplay',
      'muted',
      'poster',
      'subtitles',
    ];
  }

  private readonly shadow: ShadowRoot;
  private readonly video: HTMLVideoElement;
  private readonly forwardEvent: (event: Event) => void;

  /** Our styled control bar; null when controls are off or native. */
  private controlBar: ControlBar | null = null;
  /** The `controls` attribute value the current bar was built from. */
  private controlsValue: string | null = null;
  /** Parsed `sources` playlist and the index currently playing. */
  private playlist: PlaylistItem[] = [];
  private playlistIndex = 0;

  private corePlayer: VideoPlayer | null = null;
  private subtitleSources: SubtitleSource[] = [];
  private subtitleObjectUrls: string[] = [];
  /** Bumped on every (re)load so stale async work can detect it was superseded. */
  private loadToken = 0;
  private isSetUp = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this.shadow = root;

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

    this.onEnded = (): void => {
      if (this.playlist.length > 1 && this.playlistIndex < this.playlist.length - 1) {
        this.selectPlaylistItem(this.playlistIndex + 1);
      }
    };
  }

  private readonly onEnded: () => void;

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

    this.playlist = parseSourcesAttribute(this.getAttribute('sources'));

    this.syncMediaAttributes();
    this.syncControlBar();
    this.syncPlaylist(false);
    this.renderSubtitleTracks();
    this.loadSource();

    // Auto-advance to the next playlist entry when the current one ends.
    this.video.addEventListener('ended', this.onEnded);
  }

  disconnectedCallback(): void {
    this.isSetUp = false;
    // Invalidate any in-flight load so it cannot re-attach a player.
    this.loadToken++;

    for (const type of FORWARDED_EVENTS) {
      this.video.removeEventListener(type, this.forwardEvent);
    }
    this.video.removeEventListener('ended', this.onEnded);

    this.teardownControlBar();
    this.teardownCorePlayer();
    this.revokeSubtitleUrls();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isSetUp) return;

    switch (name) {
      case 'src':
        // The playlist, when present, owns playback — ignore bare src changes.
        if (this.playlist.length === 0) this.loadSource();
        break;
      case 'sources':
        this.syncPlaylist(true);
        break;
      case 'subtitles':
        this.subtitleSources = parseSubtitlesAttribute(newValue);
        this.renderSubtitleTracks();
        break;
      case 'controls':
      case 'nativecontrols':
        this.syncMediaAttributes();
        this.syncControlBar();
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

  /**
   * When set alongside `controls`, the browser's built-in `<video>` controls
   * are used instead of LightBird's styled bar.
   */
  get nativeControls(): boolean {
    return this.hasAttribute('nativecontrols');
  }
  set nativeControls(value: boolean) {
    this.toggleAttribute('nativecontrols', !!value);
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
    // Native `<video>` controls appear only when the caller opts in via
    // `nativecontrols`; otherwise LightBird renders its own styled bar.
    this.video.controls = this.hasAttribute('controls') && this.hasAttribute('nativecontrols');
    this.video.autoplay = this.hasAttribute('autoplay');
    this.video.muted = this.hasAttribute('muted');

    // The active playlist entry's poster takes precedence over the host poster
    // so unrelated attribute syncs (muted/autoplay/…) don't clobber it.
    const playlistPoster =
      this.playlist.length > 0 ? this.playlist[this.playlistIndex]?.poster : undefined;
    const poster = playlistPoster ?? this.getAttribute('poster');
    if (poster) this.video.poster = poster;
    else this.video.removeAttribute('poster');
  }

  /** Mount or unmount the styled control bar to match the current attributes. */
  private syncControlBar(): void {
    const wantBar = this.hasAttribute('controls') && !this.hasAttribute('nativecontrols');
    const featureValue = this.getAttribute('controls');

    if (wantBar) {
      // The feature allow-list is baked in at creation, so rebuild the bar when
      // the `controls` value changes (or when first showing it).
      if (!this.controlBar || this.controlsValue !== featureValue) {
        this.teardownControlBar();
        this.controlsValue = featureValue;
        this.controlBar = createControlBar(this.video, this, parseControlFeatures(featureValue));
        this.shadow.appendChild(this.controlBar.element);
        // A core player may already be loaded — backfill its audio tracks.
        if (this.corePlayer) void this.syncAudioTracks(this.loadToken);
        // Backfill the playlist into the freshly-created bar.
        if (this.playlist.length > 0) this.syncPlaylist(false);
      } else {
        this.controlBar.update();
      }
    } else if (this.controlBar) {
      this.teardownControlBar();
      this.controlsValue = null;
    }
  }

  private teardownControlBar(): void {
    this.controlBar?.destroy();
    this.controlBar = null;
  }

  /** The source to play now: the active playlist entry, or the `src` attribute. */
  private effectiveSource(): { src: string | null; poster?: string } {
    if (this.playlist.length > 0) {
      const item = this.playlist[this.playlistIndex];
      return { src: item?.src ?? null, poster: item?.poster };
    }
    return { src: this.getAttribute('src') };
  }

  private loadSource(): void {
    const { src, poster } = this.effectiveSource();
    const token = ++this.loadToken;

    this.teardownCorePlayer();

    // A per-entry poster overrides the attribute poster while it's playing.
    if (poster) this.video.poster = poster;
    else if (this.getAttribute('poster')) this.video.poster = this.getAttribute('poster') as string;
    else this.video.removeAttribute('poster');

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

  /** Re-parse the `sources` attribute and refresh the playlist UI/playback. */
  private syncPlaylist(reload: boolean): void {
    const next = parseSourcesAttribute(this.getAttribute('sources'));
    const changed =
      next.length !== this.playlist.length ||
      next.some((item, i) => item.src !== this.playlist[i]?.src);
    this.playlist = next;
    if (changed) this.playlistIndex = 0;

    this.controlBar?.setPlaylist(
      this.playlist.map((item, i) => ({ title: item.title || `Track ${i + 1}` })),
      this.playlistIndex,
      (index) => this.selectPlaylistItem(index),
    );

    if (reload && changed) this.loadSource();
  }

  /** Jump to a playlist entry and start it. */
  private selectPlaylistItem(index: number): void {
    if (index < 0 || index >= this.playlist.length || index === this.playlistIndex) {
      if (index === this.playlistIndex) return;
    }
    if (index < 0 || index >= this.playlist.length) return;
    this.playlistIndex = index;
    this.loadSource();
    // Refresh the menu's checked state + prev/next disabled state.
    this.controlBar?.setPlaylist(
      this.playlist.map((item, i) => ({ title: item.title || `Track ${i + 1}` })),
      this.playlistIndex,
      (i) => this.selectPlaylistItem(i),
    );
    void this.video.play().catch(() => {
      /* autoplay may be blocked — leave it paused */
    });
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
      void this.syncAudioTracks(token);
    } catch (error) {
      if (token === this.loadToken) this.emitError(error);
    }
  }

  /**
   * Surface the core player's audio tracks in the control bar. Tracks may
   * populate asynchronously (MKV native path), so we await `tracksReady` and
   * re-check the load token before touching the UI.
   */
  private async syncAudioTracks(token: number): Promise<void> {
    const player = this.corePlayer;
    if (!player) return;

    try {
      await player.tracksReady;
    } catch {
      // tracksReady may reject if the player was torn down — fall through and
      // bail on the token check below.
    }
    if (token !== this.loadToken || this.corePlayer !== player) return;

    const tracks = player.getAudioTracks().map((t) => ({ id: t.id, name: t.name }));
    const active = tracks[0]?.id ?? '0';
    this.controlBar?.setAudioTracks(tracks, active, (id) => {
      void player.switchAudioTrack(id);
    });
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

    // Let the styled bar show/hide its CC toggle for the new track set.
    this.controlBar?.update();
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
