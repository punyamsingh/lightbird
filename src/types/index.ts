export interface PlaylistItem {
  name: string;
  url: string;
  type: 'video' | 'stream';
}

export interface Subtitle {
  name: string;
  url: string;
  lang: string;
}

export interface VideoFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
}
