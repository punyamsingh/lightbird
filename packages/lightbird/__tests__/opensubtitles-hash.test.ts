import {
  computeOpenSubtitlesHash,
  isHashable,
  fileNameToSearchQuery,
  HASH_CHUNK_SIZE,
  MIN_HASHABLE_SIZE,
  type HashableSource,
} from '../src/subtitles/opensubtitles-hash';

/**
 * Builds an in-memory source that behaves like a Blob for slice/arrayBuffer,
 * avoiding jsdom's FileReader for these fixed-size buffers.
 */
function makeSource(bytes: Uint8Array): HashableSource {
  return {
    size: bytes.length,
    slice: (start: number, end: number) => ({
      arrayBuffer: async () => {
        const view = bytes.slice(start, end);
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
      },
    }),
  };
}

/** A source of `size` bytes whose every byte is `fill`. */
function filledSource(size: number, fill = 0): HashableSource {
  return makeSource(new Uint8Array(size).fill(fill));
}

describe('computeOpenSubtitlesHash', () => {
  it('returns a 16-character lowercase hex string', async () => {
    const hash = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hashes an all-zero file to its own size', async () => {
    // Every uint64 in both chunks is 0, so the sum reduces to the file size.
    const size = MIN_HASHABLE_SIZE;
    const hash = await computeOpenSubtitlesHash(filledSource(size));
    expect(hash).toBe(BigInt(size).toString(16).padStart(16, '0'));
  });

  it('reads the words as little-endian, not big-endian', async () => {
    // An independent fixed vector rather than a re-derivation of the
    // implementation's own rules: bytes 1..8 in the head chunk must sum as
    // 0x0807060504030201. Big-endian would read 0x0102030405060708 instead,
    // so this fails loudly on an endianness mistake.
    const size = MIN_HASHABLE_SIZE;
    const bytes = new Uint8Array(size);
    bytes.set([1, 2, 3, 4, 5, 6, 7, 8], 0);

    const hash = await computeOpenSubtitlesHash(makeSource(bytes));
    const expected = (BigInt(size) + 0x0807060504030201n) & ((1n << 64n) - 1n);
    expect(hash).toBe(expected.toString(16).padStart(16, '0'));
  });

  it('reads the tail chunk from the end of the file, not an arbitrary offset', async () => {
    // Distinct markers in head and tail: a wrong tail offset in a file larger
    // than two chunks would miss the marker entirely and change the hash.
    const size = MIN_HASHABLE_SIZE * 4;
    const bytes = new Uint8Array(size);
    bytes[0] = 0x11;
    bytes[size - HASH_CHUNK_SIZE] = 0x22;

    const hash = await computeOpenSubtitlesHash(makeSource(bytes));
    const expected = (BigInt(size) + 0x11n + 0x22n) & ((1n << 64n) - 1n);
    expect(hash).toBe(expected.toString(16).padStart(16, '0'));
  });

  it('adds every little-endian uint64 from both chunks', async () => {
    const size = MIN_HASHABLE_SIZE;
    const bytes = new Uint8Array(size);
    // Set the low byte of the first word in each chunk to 1.
    bytes[0] = 1;
    bytes[size - HASH_CHUNK_SIZE] = 1;

    const hash = await computeOpenSubtitlesHash(makeSource(bytes));
    expect(hash).toBe((BigInt(size) + 2n).toString(16).padStart(16, '0'));
  });

  it('reads only the first and last 64 KiB, never the middle', async () => {
    const slice = jest.fn((start: number, end: number) => ({
      arrayBuffer: async () => new ArrayBuffer(end - start),
    }));
    const size = 10 * 1024 * 1024;

    await computeOpenSubtitlesHash({ size, slice });

    expect(slice).toHaveBeenCalledTimes(2);
    expect(slice).toHaveBeenCalledWith(0, HASH_CHUNK_SIZE);
    expect(slice).toHaveBeenCalledWith(size - HASH_CHUNK_SIZE, size);
  });

  it('produces different hashes for files that differ only in size', async () => {
    const a = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE));
    const b = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE + 8));
    expect(a).not.toBe(b);
  });

  it('produces different hashes for same-size files with different content', async () => {
    const a = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE, 0));
    const b = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE, 0xff));
    expect(a).not.toBe(b);
  });

  it('wraps at 2^64 rather than overflowing', async () => {
    // Every byte 0xff makes each uint64 equal 2^64-1, so the sum wraps many times.
    const hash = await computeOpenSubtitlesHash(filledSource(MIN_HASHABLE_SIZE, 0xff));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(BigInt(`0x${hash}`)).toBeLessThan(1n << 64n);
  });

  it('rejects files smaller than two chunks', async () => {
    await expect(computeOpenSubtitlesHash(filledSource(HASH_CHUNK_SIZE))).rejects.toThrow(
      /too small/i
    );
  });
});

describe('isHashable', () => {
  it('accepts files at or above the minimum size', () => {
    expect(isHashable({ size: MIN_HASHABLE_SIZE })).toBe(true);
    expect(isHashable({ size: MIN_HASHABLE_SIZE + 1 })).toBe(true);
  });

  it('rejects files below the minimum size', () => {
    expect(isHashable({ size: MIN_HASHABLE_SIZE - 1 })).toBe(false);
    expect(isHashable({ size: 0 })).toBe(false);
  });
});

describe('fileNameToSearchQuery', () => {
  it('strips the container extension', () => {
    expect(fileNameToSearchQuery('Some Movie 2019.mkv')).toBe('Some Movie 2019');
  });

  it('converts dots and underscores in release names to spaces', () => {
    expect(fileNameToSearchQuery('Some.Movie.2019.1080p.BluRay.mkv')).toBe(
      'Some Movie 2019 1080p BluRay'
    );
    expect(fileNameToSearchQuery('Some_Movie_2019.mp4')).toBe('Some Movie 2019');
  });

  it('collapses repeated separators and trims surrounding whitespace', () => {
    expect(fileNameToSearchQuery('  Some...Movie   2019.avi ')).toBe('Some Movie 2019');
  });

  it('leaves a name with no extension intact', () => {
    expect(fileNameToSearchQuery('Some Movie')).toBe('Some Movie');
  });

  it('does not mistake a trailing year for a file extension', () => {
    expect(fileNameToSearchQuery('Blade.Runner.2049')).toBe('Blade Runner 2049');
    expect(fileNameToSearchQuery('Blade.Runner.2049.mkv')).toBe('Blade Runner 2049');
  });
});
