import { NextResponse } from 'next/server';
import {
  OPENSUBTITLES_API_BASE,
  providerHeaders,
  isConfigured,
  fetchWithTimeout,
  isTimeout,
} from '../provider';

export const runtime = 'nodejs';

/** Subtitle files are tiny; anything larger is not a subtitle. */
const MAX_SUBTITLE_BYTES = 4 * 1024 * 1024;

/**
 * Decodes subtitle bytes, falling back to Windows-1252 for the legacy
 * single-byte encodings common in older European SRT uploads. A strict UTF-8
 * pass is the discriminator: it throws on byte sequences that are not valid
 * UTF-8, which is exactly the case where 1252 is the better guess.
 */
function decodeSubtitle(buffer: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Raised when a response exceeds {@link MAX_SUBTITLE_BYTES} mid-read. */
class SubtitleTooLargeError extends Error {}

/**
 * Reads a response body, aborting as soon as it exceeds the size limit.
 *
 * Checking `arrayBuffer().byteLength` after the fact is too late — by then the
 * whole payload is already resident, so an oversized or zip-bombed CDN response
 * could exhaust the route's memory before the check ever runs.
 */
async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) throw new SubtitleTooLargeError();
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SubtitleTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Requests a download link from OpenSubtitles, then fetches it and returns the
 * subtitle text.
 *
 * Both hops happen server-side deliberately: the returned CDN link is
 * cross-origin and would be blocked by the app's `Cross-Origin-Embedder-Policy:
 * require-corp` header, and the link request itself needs the API key.
 */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Subtitle search is not configured' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const fileId = (body as { fileId?: unknown } | null)?.fileId;

  if (typeof fileId !== 'string' || !/^\d+$/.test(fileId)) {
    return NextResponse.json({ error: 'A numeric fileId is required' }, { status: 400 });
  }

  // Hop 1 — exchange the file id for a time-limited download link.
  let linkResult: { response: Response; body?: { link?: string; file_name?: string } };
  try {
    linkResult = await fetchWithTimeout(
      `${OPENSUBTITLES_API_BASE}/download`,
      {
        method: 'POST',
        headers: { ...providerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: Number(fileId) }),
        cache: 'no-store',
      },
      (response) => response.json() as Promise<{ link?: string; file_name?: string }>
    );
  } catch (error) {
    if (isTimeout(error)) {
      return NextResponse.json({ error: 'Subtitle provider timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Subtitle provider unreachable' }, { status: 502 });
  }

  if (!linkResult.response.ok) {
    // 406 is the provider's "download quota exhausted"; surface it as a rate
    // limit so the client shows the try-again-later message.
    const status = linkResult.response.status === 406 ? 429 : linkResult.response.status;
    const mapped = [401, 403, 429].includes(status) ? status : 502;
    return NextResponse.json({ error: 'Subtitle download failed' }, { status: mapped });
  }

  const linkPayload = linkResult.body;

  if (!linkPayload?.link) {
    return NextResponse.json({ error: 'Provider returned no download link' }, { status: 502 });
  }

  // Hop 2 — fetch the subtitle itself. fetch transparently gunzips when the
  // CDN sets Content-Encoding: gzip.
  // readBounded runs inside the deadline: a CDN that sends headers promptly and
  // then trickles the body is exactly the case a header-only timeout misses.
  let fileResult: { response: Response; body?: Uint8Array };
  try {
    fileResult = await fetchWithTimeout(linkPayload.link, { cache: 'no-store' }, (response) =>
      readBounded(response, MAX_SUBTITLE_BYTES)
    );
  } catch (error) {
    if (isTimeout(error)) {
      return NextResponse.json({ error: 'Subtitle file timed out' }, { status: 504 });
    }
    if (error instanceof SubtitleTooLargeError) {
      return NextResponse.json({ error: 'Subtitle file was unexpectedly large' }, { status: 502 });
    }
    return NextResponse.json({ error: 'Subtitle file unreachable' }, { status: 502 });
  }

  if (!fileResult.response.ok) {
    return NextResponse.json({ error: 'Subtitle file could not be fetched' }, { status: 502 });
  }

  const buffer = fileResult.body;
  if (!buffer || buffer.byteLength === 0) {
    return NextResponse.json({ error: 'Subtitle file was empty' }, { status: 502 });
  }

  return NextResponse.json({
    content: decodeSubtitle(buffer),
    fileName: linkPayload.file_name || `subtitle-${fileId}.srt`,
  });
}
