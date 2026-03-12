"use client";

import type { AudioTrack, Subtitle } from "@/types";
import { SubtitleConverter } from "@/lib/subtitle-converter";
import type { WorkerInbound, WorkerOutbound } from "@/lib/workers/ffmpeg-worker";

// Dedicated sentinel — use instanceof check, not string matching
export class CancellationError extends Error {
  constructor() {
    super('MKVPlayer: operation cancelled');
    this.name = 'CancellationError';
  }
}

export interface MKVPlayerFile {
  name: string;
  file: File;
  videoUrl?: string;
  audioTracks: AudioTrack[];
  subtitleTracks: Subtitle[];
  activeAudioTrack: string;
  activeSubtitleTrack: string;
}

interface TrackInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  lang?: string;
  title?: string;
}

export function parseStreamInfo(logs: string): {
  videoTracks: TrackInfo[];
  audioTracks: TrackInfo[];
  subtitleTracks: TrackInfo[];
} {
  const videoTracks: TrackInfo[] = [];
  const audioTracks: TrackInfo[] = [];
  const subtitleTracks: TrackInfo[] = [];

  const lines = logs.split('\n');
  for (const line of lines) {
    const streamMatch = line.match(/Stream #\d+:\d+(?:\((\w+)\))?: (Video|Audio|Subtitle): (\S+)/i);
    if (!streamMatch) continue;

    const [, lang, type, codec] = streamMatch;
    const titleMatch = line.match(/\btitle\s*:\s*([^,\n]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    if (type.toLowerCase() === 'video') {
      videoTracks.push({ index: videoTracks.length, type: 'video', codec, lang, title });
    } else if (type.toLowerCase() === 'audio') {
      audioTracks.push({ index: audioTracks.length, type: 'audio', codec, lang, title });
    } else if (type.toLowerCase() === 'subtitle') {
      subtitleTracks.push({ index: subtitleTracks.length, type: 'subtitle', codec, lang, title });
    }
  }

  return { videoTracks, audioTracks, subtitleTracks };
}

export class MKVPlayer {
  private file: File;
  private playerFile: MKVPlayerFile;
  private videoElement: HTMLVideoElement | null = null;
  private objectUrl: string | null = null;
  // Maps subtitle track ID → ffmpeg subtitle stream index
  private subtitleTrackMap: Map<string, number> = new Map();
  // Maps subtitle track ID → blob URL for cleanup
  private subtitleBlobUrls: Map<string, string> = new Map();
  private onProgress?: (progress: number) => void;

  // Worker management
  private worker: Worker | null = null;
  private pendingOperations: Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = new Map();

  constructor(file: File, onProgress?: (progress: number) => void) {
    this.file = file;
    this.onProgress = onProgress;
    this.playerFile = {
      name: file.name,
      file,
      audioTracks: [],
      subtitleTracks: [],
      activeAudioTrack: '0',
      activeSubtitleTrack: '-1',
    };
  }

  private getWorker(): Worker {
    if (!this.worker) {
      // Next.js requires this exact syntax for Worker bundling
      this.worker = new Worker(
        new URL('../workers/ffmpeg-worker.ts', import.meta.url),
      );
      this.worker.onmessage = (event: MessageEvent) => {
        this._handleWorkerMessage(event.data);
      };
      this.worker.onerror = (error) => {
        console.error('FFmpeg worker error:', error);
      };
    }
    return this.worker;
  }

  private _handleWorkerMessage(msg: WorkerOutbound): void {
    const { id, type } = msg;

    if (type === 'PROGRESS') {
      this.onProgress?.(msg.progress);
      return; // progress messages don't resolve a pending operation
    }

    const pending = this.pendingOperations.get(id);
    if (!pending) return;

    this.pendingOperations.delete(id);

    if (type === 'ERROR') {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg);
    }
  }

  private sendToWorker<T>(message: WorkerInbound): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pendingOperations.set(message.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.getWorker().postMessage(message);
    });
  }

  async initialize(videoElement: HTMLVideoElement): Promise<MKVPlayerFile> {
    this.videoElement = videoElement;

    try {
      const opId = crypto.randomUUID();
      const result = await this.sendToWorker<{ type: 'REMUX_DONE'; data: Uint8Array; logs: string }>({
        id: opId,
        type: 'REMUX',
        payload: {
          file: this.file,
          fileName: this.file.name,
          audioTrackIndex: 0,
        },
      });

      const { audioTracks, subtitleTracks } = parseStreamInfo(result.logs);

      // Build audio track metadata
      this.playerFile.audioTracks =
        audioTracks.length > 0
          ? audioTracks.map((t, i) => ({
              id: String(i),
              name: t.title ?? (t.lang ? `Audio ${i + 1} (${t.lang})` : `Audio ${i + 1}`),
              lang: t.lang ?? 'unknown',
            }))
          : [{ id: '0', name: 'Default Audio', lang: 'unknown' }];

      // Build subtitle track metadata and populate the ID→index map
      this.subtitleTrackMap.clear();
      this.playerFile.subtitleTracks = subtitleTracks.map((t, i) => {
        const id = String(i);
        this.subtitleTrackMap.set(id, i);
        return {
          id,
          name: t.title ?? (t.lang ? `Subtitle ${i + 1} (${t.lang})` : `Subtitle ${i + 1}`),
          lang: t.lang ?? 'unknown',
          type: 'embedded' as const,
        };
      });

      const blob = new Blob([result.data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = url;
      this.playerFile.videoUrl = url;
      videoElement.src = url;

      this.onProgress?.(1);
    } catch (error) {
      if (error instanceof CancellationError) throw error; // intentional cancel — don't fall back
      console.error('MKVPlayer: Worker failed, falling back to native playback', error);
      // Fallback: hand the raw file to the browser and hope for the best
      const url = URL.createObjectURL(this.file);
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = url;
      this.playerFile.videoUrl = url;
      this.playerFile.audioTracks = [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
      videoElement.src = url;
    }

    return this.playerFile;
  }

  private async _remux(audioTrackIndex: number): Promise<string> {
    const opId = crypto.randomUUID();
    const result = await this.sendToWorker<{ type: 'REMUX_DONE'; data: Uint8Array; logs: string }>({
      id: opId,
      type: 'REMUX',
      payload: {
        file: this.file,
        fileName: this.file.name,
        audioTrackIndex,
      },
    });

    const blob = new Blob([result.data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = url;
    return url;
  }

  private async _extractSubtitle(trackIndex: number): Promise<string> {
    const opId = crypto.randomUUID();
    const result = await this.sendToWorker<{ type: 'EXTRACT_SUBTITLE_DONE'; srtText: string }>({
      id: opId,
      type: 'EXTRACT_SUBTITLE',
      payload: {
        file: this.file,
        fileName: this.file.name,
        trackIndex,
      },
    });
    return result.srtText;
  }

  getAudioTracks(): AudioTrack[] {
    return this.playerFile.audioTracks;
  }

  getSubtitles(): Subtitle[] {
    return this.playerFile.subtitleTracks;
  }

  async switchAudioTrack(trackId: string): Promise<void> {
    if (!this.videoElement) return;

    const trackIndex = parseInt(trackId, 10);
    if (isNaN(trackIndex)) return;

    this.playerFile.activeAudioTrack = trackId;

    const currentTime = this.videoElement.currentTime;
    const wasPlaying = !this.videoElement.paused;

    const url = await this._remux(trackIndex);
    this.playerFile.videoUrl = url;
    this.videoElement.src = url;

    this.videoElement.addEventListener(
      'loadedmetadata',
      () => {
        this.videoElement!.currentTime = currentTime;
        if (wasPlaying) {
          this.videoElement!.play().catch(console.error);
        }
      },
      { once: true },
    );
  }

  async switchSubtitle(trackId: string): Promise<void> {
    this.playerFile.activeSubtitleTrack = trackId;

    if (trackId === '-1' || !this.videoElement) return;

    const trackIndex = this.subtitleTrackMap.get(trackId);
    if (trackIndex === undefined) return; // Not an embedded track – handled elsewhere

    try {
      // Reuse a previously added track element if it exists
      const existing = this.videoElement.querySelector(
        `track[data-mkv-id="${trackId}"]`,
      ) as HTMLTrackElement | null;

      if (existing) {
        existing.track.mode = 'showing';
        return;
      }

      // Extract subtitle from the container and convert to VTT
      const srtContent = await this._extractSubtitle(trackIndex);
      const vttContent = await SubtitleConverter.convertSrtToVtt(srtContent);
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      this.subtitleBlobUrls.set(trackId, url);

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = url;
      track.setAttribute('data-id', trackId);
      track.setAttribute('data-mkv-id', trackId);
      this.videoElement.appendChild(track);

      // Enable only this track
      track.track.mode = 'showing';
    } catch (error) {
      console.error('MKVPlayer: Failed to extract subtitle', error);
    }
  }

  getActiveAudioTrack(): string {
    return this.playerFile.activeAudioTrack;
  }

  getActiveSubtitleTrack(): string {
    return this.playerFile.activeSubtitleTrack;
  }

  cancel(): void {
    if (!this.worker) return;

    // Terminate the worker immediately
    this.worker.terminate();
    this.worker = null;

    // Reject all pending operations with the CancellationError sentinel
    for (const { reject } of this.pendingOperations.values()) {
      reject(new CancellationError());
    }
    this.pendingOperations.clear();
  }

  destroy(): void {
    // Terminate the worker so the FFmpeg WASM thread is killed
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingOperations.clear();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    for (const url of this.subtitleBlobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.subtitleBlobUrls.clear();
  }

  static isCompatible(file: File): boolean {
    return file.name.toLowerCase().endsWith('.mkv');
  }
}
