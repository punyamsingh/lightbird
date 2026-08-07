/**
 * Shared OpenSubtitles provider configuration for the subtitle-search proxy.
 *
 * The API key lives only here, server-side. Set `OPENSUBTITLES_API_KEY` in the
 * deployment environment; without it the routes return 404 and the player
 * hides the search UI instead of failing at request time.
 */

export const OPENSUBTITLES_API_BASE = 'https://api.opensubtitles.com/api/v1';

/** OpenSubtitles requires a descriptive, versioned User-Agent on every call. */
const USER_AGENT = process.env.OPENSUBTITLES_USER_AGENT || 'LightBird v1.0';

export function isConfigured(): boolean {
  return Boolean(process.env.OPENSUBTITLES_API_KEY);
}

/** Deadline for any single outbound provider request. */
export const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Fetch with a hard deadline. Without one, a stalled provider or CDN holds the
 * serverless invocation open until the platform kills it, burning execution
 * time and leaving the client waiting on a request that will never answer.
 *
 * Throws a `TimeoutError`-named error on expiry so callers can map it to 504
 * rather than lumping it in with "provider unreachable".
 */
export async function fetchWithTimeout<T>(
  url: string,
  init: RequestInit,
  /**
   * Reads the response body. Called only for an ok response, and inside the
   * deadline — `fetch` resolves as soon as headers arrive, so returning the
   * Response and letting the caller read it would leave the body unbounded.
   */
  consume: (response: Response) => Promise<T>,
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<{ response: Response; body?: T }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // A non-ok response never has its body read, so callers can map the status
    // without paying for a payload they are going to discard. Cancel it rather
    // than abandoning it: an unread body holds its connection until the runtime
    // collects it, and a provider that returns 429 with a long error page would
    // pin a socket per rejected request. The deadline is still armed here, so a
    // stalled cancel cannot outlive the timeout.
    if (!response.ok) {
      await response.body?.cancel().catch(() => {
        // Already errored or closed — the body is gone either way.
      });
      return { response };
    }
    return { response, body: await consume(response) };
  } catch (error) {
    if (timedOut) {
      throw Object.assign(new Error('Provider request timed out'), { name: 'TimeoutError' });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function isTimeout(error: unknown): boolean {
  return (error as Error)?.name === 'TimeoutError';
}

/** Raised when a provider link, or a redirect from it, is not plain https. */
export class UnsafeDownloadLinkError extends Error {}

/** Provider CDN links redirect once or twice in practice. */
export const MAX_DOWNLOAD_REDIRECTS = 5;

/**
 * Parses a provider-supplied URL, rejecting anything that is not https.
 *
 * The link is not client-controlled, so this is not a direct SSRF. It guards
 * against a provider response that points somewhere internal: the download
 * route returns the fetched bytes to the caller, so an unchecked hop would make
 * it a read primitive against whatever the deployment can reach.
 */
export function parseHttpsUrl(raw: string, base?: URL): URL | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  return url.protocol === 'https:' ? url : null;
}

/**
 * Fetches a URL, following redirects by hand so every hop is scheme-checked.
 * Validating only the starting URL would not be enough — `fetch` follows
 * redirects on its own, so a valid https link can still land on an internal
 * target, and the caller would never see the hop.
 */
export async function fetchFollowingHttpsRedirects<T>(
  start: URL,
  consume: (response: Response) => Promise<T>,
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<{ response: Response; body?: T }> {
  let url = start;
  for (let hop = 0; hop < MAX_DOWNLOAD_REDIRECTS; hop++) {
    // A 3xx is not ok, so fetchWithTimeout returns before reading (and cancels)
    // the body, leaving the headers available for the Location lookup.
    const result = await fetchWithTimeout(
      url.toString(),
      { cache: 'no-store', redirect: 'manual' },
      consume,
      timeoutMs
    );

    const { status, headers } = result.response;
    if (status < 300 || status >= 400) return result;

    const location = headers.get('location');
    // A redirect with no Location is malformed; hand it back so the caller maps
    // the status rather than inventing a different failure.
    if (!location) return result;

    const next = parseHttpsUrl(location, url);
    if (!next) throw new UnsafeDownloadLinkError('Redirect left https');
    url = next;
  }
  throw new UnsafeDownloadLinkError('Too many redirects');
}

export function providerHeaders(): Record<string, string> {
  return {
    'Api-Key': process.env.OPENSUBTITLES_API_KEY as string,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
}
