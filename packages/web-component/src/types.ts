/** A subtitle track to attach to a `<lightbird-player>`. */
export interface SubtitleSource {
  /**
   * URL of the subtitle file. `.vtt` files are used directly; `.srt` files
   * are converted to VTT on the fly via `@lightbird/core`.
   */
  src: string;
  /** Human-readable label shown in the native track menu. */
  label?: string;
  /** BCP-47 language tag, e.g. `"en"`, `"es"`. */
  srclang?: string;
  /** Marks this track as the default. */
  default?: boolean;
}

/** A single entry in a `<lightbird-player>` playlist (the `sources` attribute). */
export interface PlaylistItem {
  /** Video URL. `.m3u8` → HLS, `.mkv` → MKV (via core), otherwise native. */
  src: string;
  /** Human-readable title shown in the playlist menu. */
  title?: string;
  /** Poster image for this entry. */
  poster?: string;
}

/** `detail` payload carried by every `<lightbird-player>` `CustomEvent`. */
export interface LightBirdEventDetail {
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  /** Present only on the `error` event. */
  error?: string;
}
