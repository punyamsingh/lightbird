/**
 * Shifts a single VTT/SRT timestamp string (HH:MM:SS.mmm) by `delta` seconds.
 * The result is clamped to zero so negative timestamps are never produced.
 */
export function shiftTimestamp(ts: string, delta: number): string {
  // ts format: HH:MM:SS.mmm  (VTT uses dots)
  const [hourMin, secMs] = ts.split(':').length === 3
    ? [ts.slice(0, 5), ts.slice(6)]
    : ['00:00', ts.slice(3)];

  const parts = ts.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = Number(parts[2]); // may include milliseconds as decimal

  const total = Math.max(0, h * 3600 + m * 60 + s + delta);

  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  // Preserve 3 decimal places for milliseconds
  const ssStr = ss.toFixed(3).padStart(6, '0');
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${ssStr}`;
}

/**
 * Applies a time offset (in seconds) to all cue timestamps in a VTT string.
 * Returns the modified VTT text.
 */
export function applyOffsetToVtt(vttText: string, offsetSeconds: number): string {
  if (offsetSeconds === 0) return vttText;

  return vttText.replace(
    /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/g,
    (_, start: string, end: string) => {
      const shiftedStart = shiftTimestamp(start, offsetSeconds);
      const shiftedEnd = shiftTimestamp(end, offsetSeconds);
      return `${shiftedStart} --> ${shiftedEnd}`;
    }
  );
}

/** Re-encodes a VTT blob URL with an applied time offset. Returns a new blob URL. */
export async function createOffsetVttUrl(originalUrl: string, offsetSeconds: number): Promise<string> {
  const response = await fetch(originalUrl);
  const text = await response.text();
  const shifted = applyOffsetToVtt(text, offsetSeconds);
  const blob = new Blob([shifted], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}
