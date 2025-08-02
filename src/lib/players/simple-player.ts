"use client";

import type { AudioTrack, Subtitle } from "@/types";

export interface SimplePlayerFile {
  name: string;
  file: File;
  url: string;
  externalSubtitles?: Subtitle[];
}

export class SimplePlayer {
  private file: SimplePlayerFile;
  private videoElement: HTMLVideoElement | null = null;
  private currentSubtitleTrackIndex: number = -1;

  constructor(file: File, externalSubtitles: File[] = []) {
    this.file = {
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      externalSubtitles: []
    };

    // Process external subtitle files
    this.processExternalSubtitles(externalSubtitles);
  }

  private async processExternalSubtitles(subtitleFiles: File[]) {
    const subtitles: Subtitle[] = [];
    
    for (let i = 0; i < subtitleFiles.length; i++) {
      const file = subtitleFiles[i];
      const url = URL.createObjectURL(file);
      
      // Detect language from filename (e.g., "movie.en.srt" -> "en")
      const langMatch = file.name.match(/\.([a-z]{2,3})\.(?:srt|vtt)$/i);
      const lang = langMatch ? langMatch[1] : 'unknown';
      
      subtitles.push({
        id: String(i),
        name: `${lang.toUpperCase()} (${file.name})`,
        lang,
        type: 'external',
        url
      });
    }
    
    this.file.externalSubtitles = subtitles;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<SimplePlayerFile> {
    this.videoElement = videoElement;
    
    // Set video source
    videoElement.src = this.file.url;
    
    // Add external subtitles as tracks
    if (this.file.externalSubtitles) {
      for (const subtitle of this.file.externalSubtitles) {
        if (subtitle.url) {
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = subtitle.name;
          track.srclang = subtitle.lang;
          track.src = subtitle.url;
          track.setAttribute('data-id', subtitle.id);
          videoElement.appendChild(track);
        }
      }
    }
    
    return this.file;
  }

  getAudioTracks(): AudioTrack[] {
    // Simple player relies on browser's native audio track handling
    // Return empty array as we can't access embedded tracks without complex parsing
    return [];
  }

  getSubtitles(): Subtitle[] {
    return this.file.externalSubtitles || [];
  }

  switchAudioTrack(trackId: string): Promise<void> {
    // For simple player, audio track switching is handled by the browser natively
    // This is a no-op as we rely on native track selection UI
    return Promise.resolve();
  }

  switchSubtitle(trackId: string): Promise<void> {
    if (!this.videoElement) return Promise.resolve();

    // Disable all current subtitles first
    const tracks = this.videoElement.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'disabled';
    }

    if (trackId === '-1') {
      // Turn off subtitles
      this.currentSubtitleTrackIndex = -1;
      return Promise.resolve();
    }

    // Find and enable the requested track by looking through track elements
    const trackElements = this.videoElement.querySelectorAll('track');
    for (let i = 0; i < trackElements.length; i++) {
      const trackElement = trackElements[i] as HTMLTrackElement;
      
      if (trackElement.getAttribute('data-id') === trackId) {
        const textTrack = tracks[i];
        if (textTrack) {
          // Check if track element is loaded
          if (trackElement.readyState === 2) { // LOADED
            textTrack.mode = 'showing';
            this.currentSubtitleTrackIndex = i;
          } else {
            // Wait for track to load
            const onLoad = () => {
              textTrack.mode = 'showing';
              this.currentSubtitleTrackIndex = i;
              trackElement.removeEventListener('load', onLoad);
            };
            trackElement.addEventListener('load', onLoad);
            
            // Force load by setting mode to hidden first, then showing
            textTrack.mode = 'hidden';
            setTimeout(() => {
              textTrack.mode = 'showing';
            }, 100);
          }
        }
        break;
      }
    }

    return Promise.resolve();
  }

  destroy(): void {
    // Clean up object URLs
    if (this.file.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.file.url);
    }
    
    if (this.file.externalSubtitles) {
      for (const subtitle of this.file.externalSubtitles) {
        if (subtitle.url?.startsWith('blob:')) {
          URL.revokeObjectURL(subtitle.url);
        }
      }
    }
  }

  static isCompatible(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const supportedExtensions = ['.mp4', '.webm', '.ogv', '.avi', '.mov', '.wmv', '.flv'];
    
    // Check if browser can play this format natively
    return supportedExtensions.some(ext => fileName.endsWith(ext)) || 
           file.type.startsWith('video/');
  }
}
