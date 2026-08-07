/**
 * Online subtitle search, modelled on VLC's VLSub extension.
 *
 * Requests go to a same-origin proxy (default `/api/subtitles`) rather than
 * straight to OpenSubtitles. That is not optional: their API requires an
 * `Api-Key` header that must never ship in a client bundle, and the app sets
 * `Cross-Origin-Embedder-Policy: require-corp` for FFmpeg.wasm, which blocks
 * un-CORP'd cross-origin fetches anyway.
 *
 * This module owns the OpenSubtitles response mapping so the proxy stays a
 * thin authenticated pass-through.
 */

import type { SubtitleSearchResult, SubtitleSearchQuery } from '../types';

/** Default same-origin proxy prefix. */
export const DEFAULT_SEARCH_ENDPOINT = '/api/subtitles';

export type SubtitleSearchErrorKind =
  /** No proxy route deployed — the feature is not configured for this host. */
  | 'unavailable'
  /** Proxy is present but its API credentials were rejected. */
  | 'unauthorized'
  /** Provider rate limit or download quota exhausted. */
  | 'rate-limited'
  /** Network failure, malformed response, or an unclassified server error. */
  | 'failed';

export class SubtitleSearchError extends Error {
  readonly kind: SubtitleSearchErrorKind;

  constructor(kind: SubtitleSearchErrorKind, message: string) {
    super(message);
    this.name = 'SubtitleSearchError';
    this.kind = kind;
  }
}

/** Requests that outlive this are treated as a stalled proxy or provider. */
export const DEFAULT_TIMEOUT_MS = 20_000;

export interface SubtitleSearchOptions {
  /** Proxy prefix. Defaults to {@link DEFAULT_SEARCH_ENDPOINT}. */
  endpoint?: string;
  /** Aborts the in-flight request. */
  signal?: AbortSignal;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Abort after this many ms. Defaults to {@link DEFAULT_TIMEOUT_MS}; 0 disables. */
  timeoutMs?: number;
}

/** Maps an HTTP status from the proxy onto an error kind. */
function kindForStatus(status: number): SubtitleSearchErrorKind {
  if (status === 404) return 'unavailable';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate-limited';
  return 'failed';
}

const ERROR_MESSAGES: Record<SubtitleSearchErrorKind, string> = {
  unavailable: 'Subtitle search is not available on this deployment',
  unauthorized: 'Subtitle search rejected the request — check the server API key',
  'rate-limited': 'Subtitle search rate limit reached — try again later',
  failed: 'Subtitle search failed',
};

/** Shape of a single `data[]` entry in an OpenSubtitles v1 search response. */
interface RawSearchItem {
  id?: string;
  attributes?: {
    language?: string;
    release?: string;
    download_count?: number;
    ratings?: number;
    hearing_impaired?: boolean;
    moviehash_match?: boolean;
    upload_date?: string;
    files?: Array<{ file_id?: number; file_name?: string }>;
  };
}

/**
 * Normalises the provider payload, dropping entries with no downloadable file.
 * Hash matches sort first — they are the ones that will actually be in sync.
 */
export function normalizeSearchResults(payload: unknown): SubtitleSearchResult[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  const results: SubtitleSearchResult[] = [];

  for (const raw of data as RawSearchItem[]) {
    const attrs = raw?.attributes;
    const file = attrs?.files?.[0];
    // Without a file_id there is nothing to download, so the entry is useless.
    if (!file?.file_id) continue;

    results.push({
      fileId: String(file.file_id),
      fileName: file.file_name || attrs?.release || 'subtitle.srt',
      language: (attrs?.language || 'unknown').toLowerCase(),
      release: attrs?.release || '',
      downloadCount: attrs?.download_count ?? 0,
      rating: attrs?.ratings ?? 0,
      hearingImpaired: attrs?.hearing_impaired === true,
      hashMatch: attrs?.moviehash_match === true,
      uploadDate: attrs?.upload_date,
    });
  }

  return results.sort((a, b) => {
    if (a.hashMatch !== b.hashMatch) return a.hashMatch ? -1 : 1;
    return b.downloadCount - a.downloadCount;
  });
}

/** Builds the query string sent to the proxy's `/search` route. */
export function buildSearchParams(query: SubtitleSearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.hash) params.set('moviehash', query.hash);
  if (query.fileSize !== undefined) params.set('moviebytesize', String(query.fileSize));
  if (query.text) params.set('query', query.text);
  if (query.languages?.length) params.set('languages', query.languages.join(','));
  return params;
}

/**
 * Composes a caller signal with a timeout into one signal.
 *
 * Deliberately not `AbortSignal.any` / `AbortSignal.timeout`: those need
 * Chrome 116+, Safari 17.4+ and Node 20+, which is a narrower floor than the
 * rest of this package requires. A plain controller works everywhere `fetch`
 * does. Returns a `cleanup` the caller must run to clear the timer.
 */
function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal | undefined; timedOut: () => boolean; cleanup: () => void } {
  if (timeoutMs <= 0) {
    return { signal, timedOut: () => false, cleanup: () => {} };
  }

  const controller = new AbortController();
  let didTimeOut = false;

  const timer = setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);

  const onCallerAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onCallerAbort);
  }

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

async function request(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const timeout = withTimeout(init.signal ?? undefined, timeoutMs);

  // The timer stays armed across the body read as well as the headers.
  // Clearing it after fetch() resolves would leave a stalled response stream
  // unbounded — headers can arrive promptly and the body never finish.
  try {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: timeout.signal });
    } catch (error) {
      // A timeout aborts our own controller, so it surfaces as an AbortError.
      // Report it as a real failure — the caller never asked to cancel.
      if (timeout.timedOut()) {
        throw new SubtitleSearchError('failed', 'Subtitle search timed out');
      }
      // Rethrow caller aborts untouched so they can distinguish cancellation.
      if ((error as Error)?.name === 'AbortError') throw error;
      throw new SubtitleSearchError('failed', ERROR_MESSAGES.failed);
    }

    if (!response.ok) {
      const kind = kindForStatus(response.status);
      throw new SubtitleSearchError(kind, ERROR_MESSAGES[kind]);
    }

    try {
      return await response.json();
    } catch (error) {
      if (timeout.timedOut()) {
        throw new SubtitleSearchError('failed', 'Subtitle search timed out');
      }
      if ((error as Error)?.name === 'AbortError') throw error;
      throw new SubtitleSearchError('failed', 'Subtitle search returned a malformed response');
    }
  } finally {
    timeout.cleanup();
  }
}

/**
 * Searches for subtitles by video hash and/or free text.
 *
 * A hash match pins the exact release and is almost always perfectly in sync;
 * a text match is a best guess and may need the offset slider.
 */
export async function searchSubtitles(
  query: SubtitleSearchQuery,
  options: SubtitleSearchOptions = {}
): Promise<SubtitleSearchResult[]> {
  const { endpoint = DEFAULT_SEARCH_ENDPOINT, signal, fetchImpl = fetch, timeoutMs } = options;

  if (!query.hash && !query.text) {
    throw new SubtitleSearchError('failed', 'A hash or a search term is required');
  }

  const params = buildSearchParams(query);
  const payload = await request(
    `${endpoint}/search?${params.toString()}`,
    { method: 'GET', signal },
    fetchImpl,
    timeoutMs
  );

  return normalizeSearchResults(payload);
}

export interface DownloadedSubtitle {
  /** Raw subtitle text, already decompressed and decoded by the proxy. */
  content: string;
  fileName: string;
  format: 'srt' | 'vtt' | 'ass' | 'ssa';
}

/** Infers the subtitle format from a filename, defaulting to SRT. */
function formatFromFileName(fileName: string): DownloadedSubtitle['format'] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'vtt' || ext === 'ass' || ext === 'ssa') return ext;
  return 'srt';
}

/**
 * Downloads a search result's subtitle text through the proxy.
 *
 * The proxy performs both provider hops (request a download link, then fetch
 * and decompress it) because the returned CDN link is cross-origin and would
 * be blocked in the browser.
 */
export async function downloadSubtitle(
  result: Pick<SubtitleSearchResult, 'fileId' | 'fileName'>,
  options: SubtitleSearchOptions = {}
): Promise<DownloadedSubtitle> {
  const { endpoint = DEFAULT_SEARCH_ENDPOINT, signal, fetchImpl = fetch, timeoutMs } = options;

  const payload = (await request(
    `${endpoint}/download`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: result.fileId }),
      signal,
    },
    fetchImpl,
    timeoutMs
  )) as { content?: unknown; fileName?: unknown };

  if (typeof payload?.content !== 'string' || payload.content.length === 0) {
    throw new SubtitleSearchError('failed', 'Subtitle download returned no content');
  }

  const fileName =
    typeof payload.fileName === 'string' && payload.fileName ? payload.fileName : result.fileName;

  return { content: payload.content, fileName, format: formatFromFileName(fileName) };
}
