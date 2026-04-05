// Configuration
export { configureLightBird } from './config'
export type { LightBirdConfig } from './config'

// Player factory + interface
export { createVideoPlayer } from './video-processor'
export type { VideoPlayer, ProcessedFile } from './video-processor'

// Individual players
export { SimplePlayer } from './players/simple-player'
export type { SimplePlayerFile } from './players/simple-player'
export { MKVPlayer, CancellationError } from './players/mkv-player'
export type { MKVPlayerFile } from './players/mkv-player'

// Subtitle pipeline
export { UniversalSubtitleManager } from './subtitles/subtitle-manager'
export { SubtitleConverter } from './subtitles/subtitle-converter'
export { applyOffsetToVtt, createOffsetVttUrl } from './subtitles/subtitle-offset'
export { ASSRenderer } from './subtitles/ass-renderer'

// Parsers
export { parseChaptersFromFFmpegLog, parseChaptersFromVtt } from './parsers/chapter-parser'
export { exportPlaylist, parseM3U8 } from './parsers/m3u-parser'

// Utilities
export { parseMediaError, validateFile } from './utils/media-error'
export type { ParsedMediaError, MediaErrorType } from './utils/media-error'
export { extractNativeMetadata } from './utils/video-info'
export { captureVideoThumbnail } from './utils/video-thumbnail'
export {
  loadShortcuts, saveShortcuts, matchesShortcut, isInteractiveElement,
  formatShortcutKey, DEFAULT_SHORTCUTS
} from './utils/keyboard-shortcuts'
export type { ShortcutBinding, ShortcutAction } from './utils/keyboard-shortcuts'
export { ProgressEstimator } from './utils/progress-estimator'
export { getFFmpeg, resetFFmpeg } from './utils/ffmpeg-singleton'

// All types
export type {
  Chapter,
  PlaylistItem,
  Subtitle,
  SubtitleCue,
  AudioTrack,
  VideoFilters,
  VideoMetadata,
  AudioTrackMeta,
  SubtitleTrackMeta,
} from './types'
