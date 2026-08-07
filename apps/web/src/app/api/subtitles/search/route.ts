import { NextResponse } from 'next/server';
import {
  OPENSUBTITLES_API_BASE,
  providerHeaders,
  isConfigured,
  fetchWithTimeout,
  isTimeout,
} from '../provider';

/** Search params forwarded verbatim to the provider. Anything else is dropped. */
const ALLOWED_PARAMS = ['moviehash', 'moviebytesize', 'query', 'languages'] as const;

export const runtime = 'nodejs';

/**
 * Thin authenticated pass-through to the OpenSubtitles search API.
 *
 * The browser cannot call the provider directly: the request needs an API key
 * that must stay server-side, and the app's `Cross-Origin-Embedder-Policy:
 * require-corp` header (set for FFmpeg.wasm) blocks the cross-origin fetch.
 */
export async function GET(request: Request) {
  if (!isConfigured()) {
    // 404 is meaningful here — the client maps it to "not available on this
    // deployment" rather than showing an error.
    return NextResponse.json({ error: 'Subtitle search is not configured' }, { status: 404 });
  }

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const value = incoming.get(key);
    if (value) forwarded.set(key, value);
  }

  if (!forwarded.has('moviehash') && !forwarded.has('query')) {
    return NextResponse.json({ error: 'A hash or a search term is required' }, { status: 400 });
  }

  // Subtitles are immutable per release, so results are safe to cache hard.
  forwarded.set('order_by', 'download_count');
  forwarded.set('order_direction', 'desc');

  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(
      `${OPENSUBTITLES_API_BASE}/subtitles?${forwarded.toString()}`,
      { headers: providerHeaders(), next: { revalidate: 3600 } } as RequestInit
    );
  } catch (error) {
    if (isTimeout(error)) {
      return NextResponse.json({ error: 'Subtitle provider timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Subtitle provider unreachable' }, { status: 502 });
  }

  if (!upstream.ok) {
    // Pass through the statuses the client classifies (401/403/429); collapse
    // the rest to 502 so a provider 404 is never mistaken for "not configured".
    const status = [401, 403, 429].includes(upstream.status) ? upstream.status : 502;
    return NextResponse.json({ error: 'Subtitle search failed' }, { status });
  }

  const payload = await upstream.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: 'Malformed provider response' }, { status: 502 });
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
