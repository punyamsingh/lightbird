"use client";

import type { AudioTrack, Subtitle } from "@/types";

export interface MKVPlayerFile {
  name: string;
  file: File;
  videoUrl?: string;
  audioTracks: AudioTrack[];
  subtitleTracks: Subtitle[];
  activeAudioTrack: string;
  activeSubtitleTrack: string;
}

export class MKVPlayer {
  private file: MKVPlayerFile;
  private isInitialized: boolean = false;
  private videoElement: HTMLVideoElement | null = null;

  constructor(file: File) {
    this.file = {
      name: file.name,
      file,
      audioTracks: [],
      subtitleTracks: [],
      activeAudioTrack: '0',
      activeSubtitleTrack: '-1'
    };
  }

  async initialize(): Promise<MKVPlayerFile> {
    if (this.isInitialized) return this.file;

    // Create a simple URL for the MKV file - browser will handle what it can
    this.file.videoUrl = URL.createObjectURL(this.file.file);
    
    // MKV files may have embedded tracks, but we can't access them without FFmpeg
    // So we'll rely on the browser's native handling and external subtitles
    this.file.audioTracks = [
      { id: '0', name: 'Default Audio', lang: 'unknown' }
    ];

    // No embedded subtitles for now - will rely on external subtitle uploads
    this.file.subtitleTracks = [];
    
    this.isInitialized = true;
    return this.file;
  }

  async setVideoElement(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    if (this.file.videoUrl) {
      const currentTime = videoElement.currentTime;
      const wasPlaying = !videoElement.paused;
      
      videoElement.src = this.file.videoUrl;
      
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.currentTime = currentTime;
        if (wasPlaying) {
          videoElement.play().catch(console.error);
        }
      }, { once: true });
    }
  }

  getAudioTracks(): AudioTrack[] {
    return this.file.audioTracks;
  }

  getSubtitles(): Subtitle[] {
    return this.file.subtitleTracks;
  }

  async switchAudioTrack(trackId: string): Promise<void> {
    // For now, audio track switching relies on browser's native handling
    // This is a no-op as we can't control embedded tracks without FFmpeg
    this.file.activeAudioTrack = trackId;
  }

  async switchSubtitle(trackId: string): Promise<void> {
    // For now, subtitle switching relies on browser's native handling
    // External subtitles are handled by the UniversalSubtitleManager
    this.file.activeSubtitleTrack = trackId;
  }

  getActiveAudioTrack(): string {
    return this.file.activeAudioTrack;
  }

  getActiveSubtitleTrack(): string {
    return this.file.activeSubtitleTrack;
  }

  destroy(): void {
    // Clean up the video URL
    if (this.file.videoUrl && this.file.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.file.videoUrl);
    }
  }

  static isCompatible(file: File): boolean {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.mkv');
  }
}
