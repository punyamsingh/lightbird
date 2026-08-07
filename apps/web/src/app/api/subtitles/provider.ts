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

export function providerHeaders(): Record<string, string> {
  return {
    'Api-Key': process.env.OPENSUBTITLES_API_KEY as string,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
}
