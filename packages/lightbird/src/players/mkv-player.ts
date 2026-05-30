import type { AudioTrack, Subtitle, Chapter } from "../types";
import { SubtitleConverter } from "../subtitles/subtitle-converter";
import { parseChaptersFromFFmpegLog } from "../parsers/chapter-parser";
import { getLanguageName } from "../utils/language-names";
import type { WorkerInbound, WorkerOutbound } from "../workers/ffmpeg-worker";

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
  /** Matroska "forced" disposition — VLC marks these in the subtitle menu. */
  forced?: boolean;
  /** Matroska "default" disposition — the track FFmpeg auto-selects. */
  default?: boolean;
}

export function parseStreamInfo(logs: string): {
  videoTracks: TrackInfo[];
  audioTracks: TrackInfo[];
  subtitleTracks: TrackInfo[];
} {
  const videoTracks: TrackInfo[] = [];
  const audioTracks: TrackInfo[] = [];
  const subtitleTracks: TrackInfo[] = [];

  // FFmpeg prints a stream's title on an indented `title : …` line *below* the
  // `Stream #…` line (inside its `Metadata:` block), so we track the current
  // stream across lines and attach metadata to it as we go — mirroring how VLC
  // reads the Matroska track Name element.
  let current: TrackInfo | null = null;

  const lines = logs.split('\n');
  for (const line of lines) {
    // Any new stream header ends the previous stream's metadata block — including
    // non-media streams we don't track (e.g. Attachment/font streams), so their
    // `title :` lines can't leak onto the last untitled media track.
    if (/^\s*Stream #\d+:\d+/.test(line)) {
      current = null;
    }

    const streamMatch = line.match(
      /Stream #\d+:\d+(?:\((\w+)\))?: (Video|Audio|Subtitle): (.+)$/i,
    );

    if (streamMatch) {
      const [, lang, type, rest] = streamMatch;
      // Codec is the first token after the type; the remainder may carry
      // dispositions like "(default) (forced)".
      const codec = rest.trim().split(/[\s,]/)[0];
      const forced = /\(forced\)/i.test(rest);
      const isDefault = /\(default\)/i.test(rest);
      const t = type.toLowerCase();
      const bucket =
        t === 'video' ? videoTracks : t === 'audio' ? audioTracks : subtitleTracks;

      current = {
        index: bucket.length,
        type: t as TrackInfo['type'],
        codec,
        lang,
        forced,
        default: isDefault,
      };
      bucket.push(current);
      continue;
    }

    // Chapter/program metadata blocks follow the streams — stop attaching their
    // titles to the last stream we saw.
    if (/^\s*(Chapter #|Program )/i.test(line)) {
      current = null;
      continue;
    }

    // Attach the first `title : …` line of the current stream's metadata block.
    // Keep the full value (VLC shows the whole track name; commas are allowed).
    if (current && current.title === undefined) {
      const titleMatch = line.match(/^\s*title\s*:\s*(.+)$/i);
      if (titleMatch) {
        current.title = titleMatch[1].trim();
      }
    }
  }

  return { videoTracks, audioTracks, subtitleTracks };
}

/**
 * Build a VLC-style track label: the embedded track name (verbatim) or a
 * "Track N" fallback, suffixed with the full language name in brackets and a
 * "[Forced]" marker when set — e.g. "Commentary - [English]" or
 * "Track 2 - [Japanese] [Forced]".
 */
function formatTrackName(index: number, t: TrackInfo): string {
  let label = t.title?.trim() || `Track ${index + 1}`;
  const langName = getLanguageName(t.lang);
  if (langName) label += ` - [${langName}]`;
  if (t.forced) label += ' [Forced]';
  return label;
}

/** Map parsed audio streams to AudioTrack metadata (VLC-style names). */
function buildAudioTracks(tracks: TrackInfo[]): AudioTrack[] {
  if (tracks.length === 0) {
    return [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
  }
  return tracks.map((t, i) => ({
    id: String(i),
    name: formatTrackName(i, t),
    lang: t.lang ?? 'unknown',
  }));
}

/**
 * Map parsed subtitle streams to Subtitle metadata (VLC-style names) and
 * (re)populate the id→ffmpeg-stream-index map used for extraction.
 */
function buildSubtitleTracks(
  tracks: TrackInfo[],
  trackMap: Map<string, number>,
): Subtitle[] {
  trackMap.clear();
  return tracks.map((t, i) => {
    const id = String(i);
    trackMap.set(id, i);
    return {
      id,
      name: formatTrackName(i, t),
      lang: t.lang ?? 'unknown',
      type: 'embedded' as const,
    };
  });
}

export class MKVPlayer {
  /**
   * Overrideable in tests to avoid real browser playback probes.
   * @internal
   */
  static _canPlayNatively: (url: string, timeoutMs?: number) => Promise<boolean> = canPlayNatively;

  /**
   * Overrideable factory for creating the FFmpeg worker. Tests override this
   * to avoid `import.meta.url` (not available in CJS Jest).
   * @internal
   */
  static _workerFactory: (() => Worker) | null = null;

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

  // Parsed chapter data
  private chapters: Chapter[] = [];

  // Maps audioTrackIndex → blob URL of the remuxed video
  private remuxCache: Map<number, string> = new Map();

  // Worker management
  private worker: Worker | null = null;
  private pendingOperations: Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = new Map();

  /**
   * Resolves when track metadata (audio + subtitle) is fully populated.
   * On the FFmpeg path this resolves after initialize() itself. On the native
   * path the probe runs in the background so initialize() returns first —
   * callers that need the real track list should await this promise.
   */
  tracksReady: Promise<void> = Promise.resolve();

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
      let w: Worker;
      if (MKVPlayer._workerFactory) {
        w = MKVPlayer._workerFactory();
      } else {
        // Next.js/webpack requires this exact inline pattern for Worker bundling
        w = new Worker(new URL('../workers/ffmpeg-worker.ts', import.meta.url));
      }
      w.onmessage = (event: MessageEvent) => {
        this._handleWorkerMessage(event.data);
      };
      w.onerror = (error) => {
        console.error('FFmpeg worker error:', error);
        for (const { reject } of this.pendingOperations.values()) {
          reject(error);
        }
        this.pendingOperations.clear();
        if (this.worker === w) {
          this.worker = null;
        }
        w.terminate();
      };
      this.worker = w;
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
        // Set safe default so callers have something to render immediately
        this.playerFile.audioTracks = [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
        videoElement.src = probeUrl;
        this.onProgress?.(1); // playback starts immediately

        // Probe in the background so initialize() returns right away.
        // Callers that need real track metadata should await tracksReady.
        this.tracksReady = this._probeForTracks().catch(() => {
          // Probe failed — restore the safe single-track default
          this.playerFile.audioTracks = [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
        });

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

      // Parse chapter metadata from the FFmpeg probe logs
      this.chapters = parseChaptersFromFFmpegLog(result.logs, videoElement.duration || 0);

      // Build audio + subtitle track metadata (VLC-style names)
      this.playerFile.audioTracks = buildAudioTracks(audioTracks);
      this.playerFile.subtitleTracks = buildSubtitleTracks(
        subtitleTracks,
        this.subtitleTrackMap,
      );

      const blob = new Blob([result.data as BlobPart], { type: 'video/mp4' });
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

  private async _probeForTracks(): Promise<void> {
    const probeOpId = crypto.randomUUID();
    const probeResult = await this.sendToWorker<{ type: 'PROBE_DONE'; logs: string }>({
      id: probeOpId,
      type: 'PROBE',
      payload: { file: this.file, fileName: this.file.name },
    });

    if (this._cancelled) return;

    const { audioTracks, subtitleTracks } = parseStreamInfo(probeResult.logs);

    this.playerFile.audioTracks = buildAudioTracks(audioTracks);
    this.playerFile.subtitleTracks = buildSubtitleTracks(
      subtitleTracks,
      this.subtitleTrackMap,
    );
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

    const blob = new Blob([result.data as BlobPart], { type: 'video/mp4' });
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

  getChapters(): Chapter[] {
    return this.chapters;
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
        existing.track.mode = 'hidden';
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

      // Enable only this track (hidden so our custom overlay can render cues)
      track.track.mode = 'hidden';
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
    // Reject any in-flight operations so callers don't hang
    for (const { reject } of this.pendingOperations.values()) {
      reject(new Error('MKVPlayer destroyed'));
    }
    this.pendingOperations.clear();

    // Terminate the worker so the FFmpeg WASM thread is killed
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

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
