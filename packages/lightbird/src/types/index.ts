
export interface Chapter {
  index: number;
  title: string;
  startTime: number;   // seconds
  endTime: number;     // seconds (= next chapter's startTime, or video duration)
}

export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'stream';
  /** Set only on items added via magnet link. */
  source?: 'torrent';
  file?: File;
  duration?: number;
}

export interface TorrentStatus {
  status: 'idle' | 'loading-metadata' | 'ready' | 'error';
  torrentName: string;
  numPeers: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  error: string | null;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface Subtitle {
  id: string;
  name: string;
  lang: string;
  url?: string; // For external subtitles
  type: 'embedded' | 'external';
  /** Detected source format (vtt, srt, ass, ssa). Defaults to 'vtt'. */
  format?: 'vtt' | 'srt' | 'ass' | 'ssa';
}

/** A single subtitle offered by the online search provider. */
export interface SubtitleSearchResult {
  /** Provider-side file identifier used to request the download. */
  fileId: string;
  fileName: string;
  /** ISO 639 language code, lowercased. */
  language: string;
  /** Release name the subtitle was timed against, e.g. "Movie.2019.1080p.BluRay". */
  release: string;
  downloadCount: number;
  rating: number;
  hearingImpaired: boolean;
  /** True when matched by video hash — these are the ones that will be in sync. */
  hashMatch: boolean;
  uploadDate?: string;
}

/** Search criteria. At least one of `hash` or `text` must be present. */
export interface SubtitleSearchQuery {
  /** OpenSubtitles video hash, 16 hex characters. */
  hash?: string;
  /** File size in bytes; the provider requires it alongside a hash. */
  fileSize?: number;
  /** Free-text fallback, usually derived from the filename. */
  text?: string;
  /** ISO 639-1 codes to filter by. Empty means all languages. */
  languages?: string[];
}

export interface AudioTrack {
  id: string;
  name: string;
  lang: string;
}

export interface VideoFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
}

export interface VideoMetadata {
  filename: string;
  fileSize: number | null;
  duration: number;
  container: string;
  width: number;
  height: number;
  frameRate: number | null;
  videoBitrate: number | null;
  videoCodec: string | null;
  colorSpace: string | null;
  audioTracks: AudioTrackMeta[];
  subtitleTracks: SubtitleTrackMeta[];
  /** Number of HLS/adaptive renditions, when playing an adaptive stream. */
  streamRenditions?: number | null;
}

export interface AudioTrackMeta {
  index: number;
  codec: string | null;
  channels: number | null;
  sampleRate: number | null;
  language: string | null;
  bitrate: number | null;
}

export interface SubtitleTrackMeta {
  index: number;
  format: string | null;
  language: string | null;
}

/** A single HLS quality rendition (e.g. 1080p, 720p). */
export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  name: string;
}

/** Result of initialising an HLS stream via `HLSPlayer`. */
export interface HLSPlayerFile {
  url: string;
  qualityLevels: QualityLevel[];
}
