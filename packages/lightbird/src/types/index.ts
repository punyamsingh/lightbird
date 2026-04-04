
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
  file?: File;
  duration?: number;
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
