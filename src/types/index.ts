

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
