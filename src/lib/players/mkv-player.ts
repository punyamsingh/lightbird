"use client";

import type { AudioTrack, Subtitle } from "@/types";
import { SubtitleConverter } from "@/lib/subtitle-converter";
import type { WorkerInbound, WorkerOutbound } from "@/lib/workers/ffmpeg-worker";

/**
 * Tests whether the browser can natively play a file given a pre-created objectURL.
 *
 * The CALLER owns the objectURL — this function never creates or revokes it.
 *
 * @param objectUrl  An objectURL already created by the caller (URL.createObjectURL).
 * @param timeoutMs  Maximum ms to wait for canplay before giving up (default 3000).
 * @returns          true if canplay fired, false if error or timeout.
 */
export async function canPlayNatively(
  objectUrl: string,
  timeoutMs = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');

    const cleanup = (result: boolean) => {
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load(); // stop any pending fetch on the probe element
      resolve(result);
      // NOTE: do NOT revoke objectUrl here — the caller owns it
    };

    const timer = setTimeout(() => cleanup(false), timeoutMs);

    video.oncanplay = () => cleanup(true);
    video.onerror  = () => cleanup(false);

    video.preload = 'metadata'; // only fetch the container header
    video.src = objectUrl;
    video.load();
  });
}

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
  /**
   * Overrideable in tests to avoid real browser playback probes.
   * @internal
   */
  static _canPlayNatively: (url: string, timeoutMs?: number) => Promise<boolean> = canPlayNatively;

  private file: File;
  private playerFile: MKVPlayerFile;
  private videoElement: HTMLVideoElement | null = null;
  private objectUrl: string | null = null;
  private _cancelled = false;
  // Maps subtitle track ID → ffmpeg subtitle stream index
  private subtitleTrackMap: Map<string, number> = new Map();
  // Maps subtitle track ID → blob URL for cleanup
  private subtitleBlobUrls: Map<string, string> = new Map();
  private onProgress?: (progress: number) => void;

  // Maps audioTrackIndex → blob URL of the remuxed video
  private remuxCache: Map<number, string> = new Map();

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
    this._cancelled = false;

    try {
      // ── Fast path: try native playback first ─────────────────────────────
      // initialize() owns this URL for the entire native path.
      const probeUrl = URL.createObjectURL(this.file);
      const nativeOk = await MKVPlayer._canPlayNatively(probeUrl);

      if (this._cancelled) {
        URL.revokeObjectURL(probeUrl);
        throw new CancellationError();
      }

      if (nativeOk) {
        // Keep the URL — store it for later cleanup in destroy()
        this.objectUrl = probeUrl;
        this.playerFile.videoUrl = probeUrl;
        // Native playback: browser exposes audio tracks via HTMLMediaElement.audioTracks
        // but that API has limited browser support. Use a safe default.
        this.playerFile.audioTracks = [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
        videoElement.src = probeUrl;
        this.onProgress?.(1);
        return this.playerFile;
      }

      // Probe URL is no longer needed — revoke it before FFmpeg creates its own.
      URL.revokeObjectURL(probeUrl);

      // ── Slow path: FFmpeg remux ───────────────────────────────────────────
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
      this.remuxCache.set(0, url);
      this.objectUrl = url;
      this.playerFile.videoUrl = url;
      videoElement.src = url;

      this.onProgress?.(1);
    } catch (error) {
      if (error instanceof CancellationError) {
        throw error;
      }
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
    // Cache hit: return the previously remuxed URL instantly (no FFmpeg)
    const cached = this.remuxCache.get(audioTrackIndex);
    if (cached) return cached;

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

    // Store in cache — revocation happens only in destroy()
    this.remuxCache.set(audioTrackIndex, url);
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
    this._cancelled = true;

    if (!this.worker) return;

    this.worker.terminate();
    this.worker = null;

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

    // Revoke all remux cache entries
    for (const url of this.remuxCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.remuxCache.clear();

    // Also revoke objectUrl explicitly (handles native fallback URL which is
    // stored in this.objectUrl but NOT in remuxCache)
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl); // safe to call twice — second call is a no-op
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
