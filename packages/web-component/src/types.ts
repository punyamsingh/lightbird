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
