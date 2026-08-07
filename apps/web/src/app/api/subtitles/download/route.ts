import { NextResponse } from 'next/server';
import { OPENSUBTITLES_API_BASE, providerHeaders, isConfigured } from '../provider';

export const runtime = 'nodejs';

/** Subtitle files are tiny; anything larger is not a subtitle. */
const MAX_SUBTITLE_BYTES = 4 * 1024 * 1024;

/**
 * Decodes subtitle bytes, falling back to Windows-1252 for the legacy
 * single-byte encodings common in older European SRT uploads. A strict UTF-8
 * pass is the discriminator: it throws on byte sequences that are not valid
 * UTF-8, which is exactly the case where 1252 is the better guess.
 */
function decodeSubtitle(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
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
  let linkResponse: Response;
  try {
    linkResponse = await fetch(`${OPENSUBTITLES_API_BASE}/download`, {
      method: 'POST',
      headers: { ...providerHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: Number(fileId) }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Subtitle provider unreachable' }, { status: 502 });
  }

  if (!linkResponse.ok) {
    // 406 is the provider's "download quota exhausted"; surface it as a rate
    // limit so the client shows the try-again-later message.
    const status = linkResponse.status === 406 ? 429 : linkResponse.status;
    const mapped = [401, 403, 429].includes(status) ? status : 502;
    return NextResponse.json({ error: 'Subtitle download failed' }, { status: mapped });
  }

  const linkPayload = (await linkResponse.json().catch(() => null)) as {
    link?: string;
    file_name?: string;
  } | null;

  if (!linkPayload?.link) {
    return NextResponse.json({ error: 'Provider returned no download link' }, { status: 502 });
  }

  // Hop 2 — fetch the subtitle itself. fetch transparently gunzips when the
  // CDN sets Content-Encoding: gzip.
  let fileResponse: Response;
  try {
    fileResponse = await fetch(linkPayload.link, { cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'Subtitle file unreachable' }, { status: 502 });
  }

  if (!fileResponse.ok) {
    return NextResponse.json({ error: 'Subtitle file could not be fetched' }, { status: 502 });
  }

  const buffer = await fileResponse.arrayBuffer();
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: 'Subtitle file was empty' }, { status: 502 });
  }
  if (buffer.byteLength > MAX_SUBTITLE_BYTES) {
    return NextResponse.json({ error: 'Subtitle file was unexpectedly large' }, { status: 502 });
  }

  return NextResponse.json({
    content: decodeSubtitle(buffer),
    fileName: linkPayload.file_name || `subtitle-${fileId}.srt`,
  });
}
