"use client";

import type { Subtitle } from "@/types";
import { SubtitleConverter } from "./subtitle-converter";

export class UniversalSubtitleManager {
  private subtitles: Subtitle[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private nextId = 0;

  constructor(videoElement?: HTMLVideoElement) {
    this.videoElement = videoElement || null;
  }

  setVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async addSubtitleFiles(files: File[]): Promise<Subtitle[]> {
    const newSubtitles: Subtitle[] = [];
    
    for (const file of files) {
      // Convert file to VTT format if needed
      const convertedFile = await SubtitleConverter.convertFileToVtt(file);
      const url = URL.createObjectURL(convertedFile);
      
      // Detect language from original filename (e.g., "movie.en.srt" -> "en")
      const langMatch = file.name.match(/\.([a-z]{2,3})\.(?:srt|vtt|ass|ssa)$/i);
      const lang = langMatch ? langMatch[1] : 'unknown';
      
      const subtitle: Subtitle = {
        id: String(this.nextId++),
        name: `${lang.toUpperCase()} (${file.name})`,
        lang,
        type: 'external',
        url
      };
      
      newSubtitles.push(subtitle);
      this.subtitles.push(subtitle);
      
      // Add track element to video if available
      if (this.videoElement) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = subtitle.name;
        track.srclang = subtitle.lang;
        track.src = subtitle.url!;
        track.setAttribute('data-id', subtitle.id);
        track.default = false;
        
        // Add event listeners to handle track loading
        track.addEventListener('load', () => {
          console.log(`Subtitle track loaded: ${subtitle.name}`);
        });
        
        track.addEventListener('error', (e) => {
          console.error(`Failed to load subtitle track: ${subtitle.name}`, e);
        });
        
        this.videoElement.appendChild(track);
        
        // Force the track to load by setting mode temporarily
        const textTrack = track.track;
        textTrack.mode = 'hidden';
        setTimeout(() => {
          textTrack.mode = 'disabled';
        }, 100);
      }
    }
    
    return newSubtitles;
  }

  removeSubtitle(id: string): boolean {
    const index = this.subtitles.findIndex(sub => sub.id === id);
    if (index === -1) return false;
    
    const subtitle = this.subtitles[index];
    
    // Remove track element from video
    if (this.videoElement) {
      const tracks = this.videoElement.querySelectorAll('track');
      for (const track of tracks) {
        if (track.getAttribute('data-id') === id) {
          track.remove();
          break;
        }
      }
    }
    
    // Clean up URL
    if (subtitle.url && subtitle.url.startsWith('blob:')) {
      URL.revokeObjectURL(subtitle.url);
    }
    
    // Remove from list
    this.subtitles.splice(index, 1);
    return true;
  }

  switchSubtitle(id: string): void {
    if (!this.videoElement) return;

    // Disable all current subtitles first
    const tracks = this.videoElement.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'disabled';
    }

    if (id === '-1') {
      // Turn off subtitles
      return;
    }

    // Find and enable the requested track by looking through track elements
    const trackElements = this.videoElement.querySelectorAll('track');
    for (let i = 0; i < trackElements.length; i++) {
      const trackElement = trackElements[i] as HTMLTrackElement;
      
      if (trackElement.getAttribute('data-id') === id) {
        const textTrack = tracks[i];
        if (textTrack) {
          // Check if track element is loaded
          if (trackElement.readyState === 2) { // LOADED
            textTrack.mode = 'showing';
          } else {
            // Wait for track to load
            const onLoad = () => {
              textTrack.mode = 'showing';
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
  }

  getSubtitles(): Subtitle[] {
    return [...this.subtitles];
  }

  clearSubtitles(): void {
    // Clean up all URLs and track elements
    for (const subtitle of this.subtitles) {
      if (subtitle.url && subtitle.url.startsWith('blob:')) {
        URL.revokeObjectURL(subtitle.url);
      }
    }
    
    // Remove all track elements
    if (this.videoElement) {
      const tracks = this.videoElement.querySelectorAll('track');
      tracks.forEach(track => track.remove());
    }
    
    this.subtitles = [];
  }

  destroy(): void {
    this.clearSubtitles();
    this.videoElement = null;
  }

  // Import existing subtitles (from embedded tracks or other sources)
  importSubtitles(subtitles: Subtitle[]): void {
    this.subtitles = [...subtitles];
    this.nextId = Math.max(...subtitles.map(s => parseInt(s.id)), 0) + 1;
  }
}
