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
    // without paying for a payload they are going to discard.
    if (!response.ok) return { response };
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

export function providerHeaders(): Record<string, string> {
  return {
    'Api-Key': process.env.OPENSUBTITLES_API_KEY as string,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
}
