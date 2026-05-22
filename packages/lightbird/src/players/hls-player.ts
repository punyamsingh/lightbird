import type Hls from 'hls.js';
import type { VideoPlayer } from '../video-processor';
import type { AudioTrack, HLSPlayerFile, QualityLevel, Subtitle } from '../types';

const HLS_MIME_HINTS = ['application/x-mpegurl', 'application/vnd.apple.mpegurl'];

/** True for HLS playlist URLs — a `.m3u8` path or an HLS MIME hint. */
export function isHlsUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase();
  if (HLS_MIME_HINTS.some((hint) => lower.includes(hint))) return true;
  // Ignore query strings and hash fragments when matching the extension.
  return lower.split(/[?#]/)[0].endsWith('.m3u8');
}

/** Plays HLS (`.m3u8`) streams via hls.js, falling back to native HLS (Safari). */
export class HLSPlayer implements VideoPlayer {
  private readonly url: string;
  private readonly playerFile: HLSPlayerFile;
  private hls: Hls | null = null;

  constructor(url: string) {
    this.url = url;
    this.playerFile = { url, qualityLevels: [] };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<HLSPlayerFile> {
    // Lazy import keeps hls.js out of the MP4/MKV bundle.
    const { default: HlsCtor } = await import('hls.js');

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
