import { SimplePlayer, type SimplePlayerFile } from './players/simple-player';
import { MKVPlayer, type MKVPlayerFile } from './players/mkv-player';
import { HLSPlayer, isHlsUrl } from './players/hls-player';
import type { AudioTrack, Subtitle, Chapter, HLSPlayerFile } from "./types";

export type ProcessedFile = SimplePlayerFile | MKVPlayerFile | HLSPlayerFile;

export interface VideoPlayer {
  initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile>;
  getAudioTracks(): AudioTrack[];
  getSubtitles(): Subtitle[];
  getChapters?(): Chapter[];
  switchAudioTrack(trackId: string): Promise<void>;
  switchSubtitle(trackId: string): Promise<void>;
  destroy(): void;
  cancel?(): void;
  /**
   * Resolves when track metadata is fully populated. Only meaningful for
   * MKVPlayer on the native path (where the probe runs after initialize()).
   * For all other players/paths this is already resolved when initialize() returns.
   */
  tracksReady?: Promise<void>;
}

class SimplePlayerAdapter implements VideoPlayer {
  private player: SimplePlayer;

  constructor(file: File, externalSubtitles: File[] = []) {
    this.player = new SimplePlayer(file, externalSubtitles);
  }

  async initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile> {
    return await this.player.initialize(videoElement);
  }

  getAudioTracks(): AudioTrack[] {
    return this.player.getAudioTracks();
  }

  getSubtitles(): Subtitle[] {
    return this.player.getSubtitles();
  }

  async switchAudioTrack(trackId: string): Promise<void> {
    return await this.player.switchAudioTrack(trackId);
  }

  async switchSubtitle(trackId: string): Promise<void> {
    return await this.player.switchSubtitle(trackId);
  }

  destroy(): void {
    this.player.destroy();
  }
}

class MKVPlayerAdapter implements VideoPlayer {
  private player: MKVPlayer;

  constructor(file: File, onProgress?: (progress: number) => void) {
    this.player = new MKVPlayer(file, onProgress);
  }

  async initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile> {
    return await this.player.initialize(videoElement);
  }

  getAudioTracks(): AudioTrack[] {
    return this.player.getAudioTracks();
  }

  getSubtitles(): Subtitle[] {
    return this.player.getSubtitles();
  }

  getChapters(): Chapter[] {
    return this.player.getChapters();
  }

  async switchAudioTrack(trackId: string): Promise<void> {
    return await this.player.switchAudioTrack(trackId);
  }

  async switchSubtitle(trackId: string): Promise<void> {
    return await this.player.switchSubtitle(trackId);
  }

  destroy(): void {
    this.player.destroy();
  }

  cancel(): void {
    this.player.cancel();
  }

  get tracksReady(): Promise<void> {
    return this.player.tracksReady;
  }
}

export function createVideoPlayer(
  source: File | string,
  externalSubtitles: File[] = [],
  onProgress?: (progress: number) => void,
): VideoPlayer {
  // String sources are remote URLs; only HLS streams have a dedicated player.
  if (typeof source === 'string') {
    if (isHlsUrl(source)) {
      return new HLSPlayer(source);
    }
    throw new Error(
      `createVideoPlayer: unsupported URL "${source}" — only HLS (.m3u8) stream URLs are supported; pass a File for other formats.`,
    );
  }

  // Smart format detection for File sources
  if (MKVPlayer.isCompatible(source)) {
    return new MKVPlayerAdapter(source, onProgress);
  } else if (SimplePlayer.isCompatible(source)) {
    return new SimplePlayerAdapter(source, externalSubtitles);
  } else {
    // Fallback to simple player for unknown formats
    return new SimplePlayerAdapter(source, externalSubtitles);
  }
}

