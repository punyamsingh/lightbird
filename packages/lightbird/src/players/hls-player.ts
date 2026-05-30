import type Hls from 'hls.js';
import type { VideoPlayer } from '../video-processor';
import type { AudioTrack, HLSPlayerFile, QualityLevel, Subtitle, VideoMetadata } from '../types';

const HLS_MIME_HINTS = ['application/x-mpegurl', 'application/vnd.apple.mpegurl'];

/** True for HLS playlist URLs — a `.m3u8` path or an HLS MIME hint. */
export function isHlsUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase();
  if (HLS_MIME_HINTS.some((hint) => lower.includes(hint))) return true;
  // Ignore query strings and hash fragments when matching the extension.
  return lower.split(/[?#]/)[0].endsWith('.m3u8');
}

/**
 * Map an hls.js MIME codec string (e.g. `avc1.640028`) to a human-friendly
 * label by inspecting the leading four-character codec family. Unknown
 * families fall back to the raw string; empty input yields `null`.
 */
export function parseHlsCodec(codec: string | null | undefined): string | null {
  if (!codec) return null;
  switch (codec.slice(0, 4).toLowerCase()) {
    case 'avc1':
      return 'H.264 (AVC)';
    case 'hvc1':
    case 'hev1':
      return 'H.265 (HEVC)';
    case 'vp09':
      return 'VP9';
    case 'av01':
      return 'AV1';
    default:
      return codec;
  }
}

/** Plays HLS (`.m3u8`) streams via hls.js, falling back to native HLS (Safari). */
export class HLSPlayer implements VideoPlayer {
  private readonly url: string;
  private readonly playerFile: HLSPlayerFile;
  private hls: Hls | null = null;
  private hlsCtor: typeof Hls | null = null;

  constructor(url: string) {
    this.url = url;
    this.playerFile = { url, qualityLevels: [] };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<HLSPlayerFile> {
    // Lazy import keeps hls.js out of the MP4/MKV bundle.
    const { default: HlsCtor } = await import('hls.js');
    this.hlsCtor = HlsCtor;

    if (!HlsCtor.isSupported()) {
      // Safari and other native-HLS browsers — hand the URL straight to the element.
      videoElement.src = this.url;
      return this.playerFile;
    }

    const hls = new HlsCtor();
    this.hls = hls;
    hls.loadSource(this.url);
    hls.attachMedia(videoElement);
    return this.playerFile;
  }

  getAudioTracks(): AudioTrack[] {
    if (!this.hls) return [];
    return this.hls.audioTracks.map((track) => ({
      id: String(track.id),
      name: track.name,
      lang: track.lang || 'unknown',
    }));
  }

  getSubtitles(): Subtitle[] {
    // In-manifest HLS subtitle tracks are a stretch goal — see the HLS plan.
    return [];
  }

  switchAudioTrack(trackId: string): Promise<void> {
    if (this.hls) {
      const id = Number(trackId);
      if (!Number.isNaN(id)) this.hls.audioTrack = id;
    }
    return Promise.resolve();
  }

  switchSubtitle(): Promise<void> {
    return Promise.resolve();
  }

  /** Quality renditions — not on `VideoPlayer`; read directly by the quality hook. */
  getQualityLevels(): QualityLevel[] {
    if (!this.hls) return [];
    return this.hls.levels.map((level, index) => ({
      index,
      height: level.height,
      bitrate: level.bitrate,
      name: level.name || (level.height > 0 ? `${level.height}p` : `Level ${index + 1}`),
    }));
  }

  /** Pins a quality level; `-1` restores automatic (ABR) selection. */
  setQualityLevel(levelIndex: number): void {
    if (this.hls) this.hls.currentLevel = levelIndex;
  }

  /**
   * HLS-specific metadata for the video info panel, derived from the active
   * rendition. Returns an empty object before the manifest loads or on the
   * native-HLS path (where hls.js is never instantiated).
   */
  getMetadata(): Partial<VideoMetadata> {
    const hls = this.hls;
    if (!hls) return {};

    const levels = hls.levels ?? [];
    // During ABR `currentLevel` is the live level (>= 0); guard the rare -1.
    const activeIndex =
      hls.currentLevel >= 0 && hls.currentLevel < levels.length ? hls.currentLevel : 0;
    const active = levels[activeIndex];

    return {
      container: 'HLS',
      videoCodec: parseHlsCodec(active?.videoCodec),
      videoBitrate: active?.bitrate ?? null,
      streamRenditions: levels.length,
      audioTracks: (hls.audioTracks ?? []).map((track, index) => ({
        index,
        codec: track.audioCodec ?? null,
        channels: null,
        sampleRate: null,
        language: track.lang ?? null,
        bitrate: null,
      })),
    };
  }

  /**
   * Subscribe to HLS events that change the info-panel metadata (manifest
   * parsed, quality level switched, audio tracks updated). Returns an
   * unsubscribe function. A no-op on the native-HLS path.
   */
  onMetadataChange(callback: () => void): () => void {
    const hls = this.hls;
    const HlsCtor = this.hlsCtor;
    if (!hls || !HlsCtor) return () => {};

    const events = [
      HlsCtor.Events.MANIFEST_PARSED,
      HlsCtor.Events.LEVEL_SWITCHED,
      HlsCtor.Events.AUDIO_TRACKS_UPDATED,
    ];
    events.forEach((event) => hls.on(event, callback));
    return () => events.forEach((event) => hls.off(event, callback));
  }

  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  static isCompatible(url: string): boolean {
    return isHlsUrl(url);
  }
}
