"use client";

import { SimplePlayer, type SimplePlayerFile } from './players/simple-player';
import { MKVPlayer, type MKVPlayerFile } from './players/mkv-player';
import type { AudioTrack, Subtitle } from "@/types";

export type ProcessedFile = SimplePlayerFile | MKVPlayerFile;

export interface VideoPlayer {
  initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile>;
  getAudioTracks(): AudioTrack[];
  getSubtitles(): Subtitle[];
  switchAudioTrack(trackId: string): Promise<void>;
  switchSubtitle(trackId: string): Promise<void>;
  destroy(): void;
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

  constructor(file: File) {
    this.player = new MKVPlayer(file);
  }

  async initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile> {
    const result = await this.player.initialize();
    await this.player.setVideoElement(videoElement);
    return result;
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

export function createVideoPlayer(file: File, externalSubtitles: File[] = []): VideoPlayer {
  // Smart format detection
  if (MKVPlayer.isCompatible(file)) {
    return new MKVPlayerAdapter(file);
  } else if (SimplePlayer.isCompatible(file)) {
    return new SimplePlayerAdapter(file, externalSubtitles);
  } else {
    // Fallback to simple player for unknown formats
    return new SimplePlayerAdapter(file, externalSubtitles);
  }
}

// Legacy functions for backward compatibility (will be removed)
export async function probeFile(file: File): Promise<any> {
  console.warn('probeFile is deprecated. Use createVideoPlayer instead.');
  const player = createVideoPlayer(file);
  return { name: file.name, audioTracks: [], subtitleTracks: [] };
}

export async function remuxFile(audioTrackIndex: number, subtitleTrackIndex: number): Promise<string> {
  console.warn('remuxFile is deprecated. Use createVideoPlayer instead.');
  throw new Error('remuxFile is no longer supported. Use the new player system.');
}
