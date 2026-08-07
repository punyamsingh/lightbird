/**
 * `@lightbird/core/search` — online subtitle search.
 *
 * A separate entry point on purpose. The base `@lightbird/core` bundle carries
 * a gzipped size budget (issue #54) that exists to keep the "lightweight"
 * promise honest, and this feature is only useful to consumers who deploy the
 * companion proxy routes. Anyone who does not import this subpath pays nothing
 * for it.
 *
 * The corresponding React hook lives at `@lightbird/core/react`.
 */

export {
  computeOpenSubtitlesHash,
  isHashable,
  fileNameToSearchQuery,
  HASH_CHUNK_SIZE,
  MIN_HASHABLE_SIZE,
} from './subtitles/opensubtitles-hash'
export type { HashableSource } from './subtitles/opensubtitles-hash'

export {
  searchSubtitles,
  downloadSubtitle,
  normalizeSearchResults,
  buildSearchParams,
  SubtitleSearchError,
  DEFAULT_SEARCH_ENDPOINT,
} from './subtitles/subtitle-search'
export type {
  SubtitleSearchOptions,
  SubtitleSearchErrorKind,
  DownloadedSubtitle,
} from './subtitles/subtitle-search'

export type { SubtitleSearchResult, SubtitleSearchQuery } from './types'
