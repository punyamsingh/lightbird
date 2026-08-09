/**
 * OpenSubtitles video fingerprinting.
 *
 * VLC's VLSub extension identifies a video by a cheap hash rather than by
 * filename, which is what makes its downloaded subtitles land in sync: the
 * hash pins the exact release (cut, framerate, edition), not just the title.
 *
 * The algorithm is deliberately I/O-light — it never reads the middle of the
 * file:
 *
 *   hash = filesize
 *        + sum of every little-endian uint64 in the first 64 KiB
 *        + sum of every little-endian uint64 in the last 64 KiB
 *
 * summed modulo 2^64 and rendered as 16 lowercase hex digits. Only 128 KiB is
 * ever read, so hashing a 20 GB remux is as fast as hashing a 200 MB one.
 */

/** Bytes read from each end of the file. Fixed by the OpenSubtitles spec. */
export const HASH_CHUNK_SIZE = 65536;

/** Files below this size cannot be hashed — the two chunks would overlap. */
export const MIN_HASHABLE_SIZE = HASH_CHUNK_SIZE * 2;

const UINT64_MASK = (1n << 64n) - 1n;

/** The subset of `Blob` this module needs, so callers can pass any slice-able source. */
export interface HashableSource {
  size: number;
  slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> };
}

/** Sums every whole little-endian uint64 in a buffer, wrapping at 2^64. */
function sumUint64LE(buffer: ArrayBuffer, seed: bigint): bigint {
  const view = new DataView(buffer);
  let total = seed;
  // A trailing partial word (buffer not a multiple of 8) is ignored, matching
  // the reference implementation, which reads whole uint64s only.
  for (let offset = 0; offset + 8 <= view.byteLength; offset += 8) {
    total = (total + view.getBigUint64(offset, true)) & UINT64_MASK;
  }
  return total;
}

/**
 * Computes the OpenSubtitles hash for a video file.
 *
 * @returns 16-character lowercase hex string.
 * @throws If the source is smaller than {@link MIN_HASHABLE_SIZE}.
 */
export async function computeOpenSubtitlesHash(source: HashableSource): Promise<string> {
  const { size } = source;

  if (size < MIN_HASHABLE_SIZE) {
    throw new Error(
      `File is too small to hash (${size} bytes; minimum is ${MIN_HASHABLE_SIZE})`
    );
  }

  const [head, tail] = await Promise.all([
    source.slice(0, HASH_CHUNK_SIZE).arrayBuffer(),
    source.slice(size - HASH_CHUNK_SIZE, size).arrayBuffer(),
  ]);

  let hash = BigInt(size) & UINT64_MASK;
  hash = sumUint64LE(head, hash);
  hash = sumUint64LE(tail, hash);

  return hash.toString(16).padStart(16, '0');
}

/** True when the source is large enough for {@link computeOpenSubtitlesHash}. */
export function isHashable(source: { size: number }): boolean {
  return source.size >= MIN_HASHABLE_SIZE;
}

/**
 * Strips container extension and common release noise from a filename so it can
 * be used as a text search query when no hash match is found.
 */
export function fileNameToSearchQuery(fileName: string): string {
  return fileName
    .trim()
    // Requires a leading letter so a title ending in a year ("Blade.Runner.2049")
    // does not lose its last segment to the extension strip.
    .replace(/\.[a-z][a-z0-9]{1,3}$/i, '')
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
