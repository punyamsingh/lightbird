import {
  searchSubtitles,
  downloadSubtitle,
  normalizeSearchResults,
  buildSearchParams,
  SubtitleSearchError,
  DEFAULT_SEARCH_ENDPOINT,
} from '../src/subtitles/subtitle-search';

/** Builds a fetch stub that resolves with the given JSON body and status. */
function jsonFetch(body: unknown, status = 200): jest.Mock {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.Mock;
}

/** Minimal provider search item. */
function providerItem(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    attributes: {
      language: 'en',
      release: 'Some.Movie.2019.1080p.BluRay',
      download_count: 100,
      ratings: 8.5,
      hearing_impaired: false,
      moviehash_match: false,
      files: [{ file_id: 12345, file_name: 'Some.Movie.2019.en.srt' }],
      ...overrides,
    },
  };
}

describe('normalizeSearchResults', () => {
  it('maps provider fields onto the result shape', () => {
    const [result] = normalizeSearchResults({ data: [providerItem()] });

    expect(result).toEqual({
      fileId: '12345',
      fileName: 'Some.Movie.2019.en.srt',
      language: 'en',
      release: 'Some.Movie.2019.1080p.BluRay',
      downloadCount: 100,
      rating: 8.5,
      hearingImpaired: false,
      hashMatch: false,
      uploadDate: undefined,
    });
  });

  it('drops entries with no downloadable file', () => {
    const results = normalizeSearchResults({
      data: [providerItem({ files: [] }), providerItem({ files: [{ file_name: 'x.srt' }] })],
    });
    expect(results).toHaveLength(0);
  });

  it('sorts hash matches ahead of filename matches', () => {
    const results = normalizeSearchResults({
      data: [
        providerItem({ download_count: 9999, files: [{ file_id: 1, file_name: 'a.srt' }] }),
        providerItem({
          moviehash_match: true,
          download_count: 1,
          files: [{ file_id: 2, file_name: 'b.srt' }],
        }),
      ],
    });

    expect(results.map((r) => r.fileId)).toEqual(['2', '1']);
  });

  it('sorts by download count within the same match type', () => {
    const results = normalizeSearchResults({
      data: [
        providerItem({ download_count: 10, files: [{ file_id: 1, file_name: 'a.srt' }] }),
        providerItem({ download_count: 500, files: [{ file_id: 2, file_name: 'b.srt' }] }),
      ],
    });

    expect(results.map((r) => r.fileId)).toEqual(['2', '1']);
  });

  it('lowercases the language code', () => {
    const [result] = normalizeSearchResults({ data: [providerItem({ language: 'PT-BR' })] });
    expect(result.language).toBe('pt-br');
  });

  it('falls back to defaults for missing optional fields', () => {
    const [result] = normalizeSearchResults({
      data: [{ attributes: { files: [{ file_id: 7 }] } }],
    });

    expect(result.fileName).toBe('subtitle.srt');
    expect(result.language).toBe('unknown');
    expect(result.downloadCount).toBe(0);
    expect(result.hashMatch).toBe(false);
  });

  it('returns an empty array for a malformed payload', () => {
    expect(normalizeSearchResults(null)).toEqual([]);
    expect(normalizeSearchResults({})).toEqual([]);
    expect(normalizeSearchResults({ data: 'nope' })).toEqual([]);
  });
});

describe('buildSearchParams', () => {
  it('includes only the criteria that are present', () => {
    const params = buildSearchParams({ hash: 'abc123', fileSize: 1024 });
    expect(params.get('moviehash')).toBe('abc123');
    expect(params.get('moviebytesize')).toBe('1024');
    expect(params.get('query')).toBeNull();
  });

  it('joins languages with commas', () => {
    const params = buildSearchParams({ text: 'movie', languages: ['en', 'fr'] });
    expect(params.get('languages')).toBe('en,fr');
  });

  it('omits an empty language list', () => {
    expect(buildSearchParams({ text: 'movie', languages: [] }).get('languages')).toBeNull();
  });
});

describe('searchSubtitles', () => {
  it('requests the proxy search route with the query params', async () => {
    const fetchImpl = jsonFetch({ data: [providerItem()] });

    await searchSubtitles({ hash: 'abc', fileSize: 500 }, { fetchImpl });

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain(`${DEFAULT_SEARCH_ENDPOINT}/search?`);
    expect(url).toContain('moviehash=abc');
    expect(url).toContain('moviebytesize=500');
  });

  it('honours a custom endpoint', async () => {
    const fetchImpl = jsonFetch({ data: [] });
    await searchSubtitles({ text: 'movie' }, { fetchImpl, endpoint: '/custom/subs' });
    expect(fetchImpl.mock.calls[0][0]).toContain('/custom/subs/search?');
  });

  it('returns normalized results', async () => {
    const fetchImpl = jsonFetch({ data: [providerItem()] });
    const results = await searchSubtitles({ hash: 'abc' }, { fetchImpl });
    expect(results).toHaveLength(1);
    expect(results[0].fileId).toBe('12345');
  });

  it('rejects a query with neither a hash nor text', async () => {
    await expect(searchSubtitles({}, { fetchImpl: jsonFetch({}) })).rejects.toThrow(
      /hash or a search term/i
    );
  });

  it('classifies a 404 as unavailable, not an error to show', async () => {
    const fetchImpl = jsonFetch({ error: 'nope' }, 404);
    await expect(searchSubtitles({ hash: 'abc' }, { fetchImpl })).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [429, 'rate-limited'],
    [500, 'failed'],
    [502, 'failed'],
  ])('classifies HTTP %i as %s', async (status, kind) => {
    const fetchImpl = jsonFetch({}, status as number);
    await expect(searchSubtitles({ hash: 'abc' }, { fetchImpl })).rejects.toMatchObject({ kind });
  });

  it('wraps a network failure as a SubtitleSearchError', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as jest.Mock;

    const error = await searchSubtitles({ hash: 'abc' }, { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(SubtitleSearchError);
    expect(error.kind).toBe('failed');
  });

  it('rethrows an abort so callers can tell cancellation from failure', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = jest.fn(async () => {
      throw abortError;
    }) as unknown as jest.Mock;

    await expect(searchSubtitles({ hash: 'abc' }, { fetchImpl })).rejects.toBe(abortError);
  });

  it('aborts a stalled request and reports it as a failure, not a cancellation', async () => {
    jest.useFakeTimers();
    try {
      // Resolves only if the composed signal aborts — i.e. the timeout fired.
      const fetchImpl = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
            );
          })
      ) as unknown as jest.Mock;

      const promise = searchSubtitles({ hash: 'abc' }, { fetchImpl, timeoutMs: 1000 });
      const assertion = expect(promise).rejects.toMatchObject({ kind: 'failed' });
      jest.advanceTimersByTime(1500);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('still surfaces a caller abort as an AbortError when a timeout is armed', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    ) as unknown as jest.Mock;

    const promise = searchSubtitles({ hash: 'abc' }, { fetchImpl, signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not arm a timeout when timeoutMs is 0', async () => {
    const fetchImpl = jsonFetch({ data: [] });
    await searchSubtitles({ hash: 'abc' }, { fetchImpl, timeoutMs: 0 });

    // The caller signal passes through untouched — here, none was given.
    expect(fetchImpl.mock.calls[0][1].signal).toBeUndefined();
  });

  it('treats a malformed JSON body as a failure', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    })) as unknown as jest.Mock;

    await expect(searchSubtitles({ hash: 'abc' }, { fetchImpl })).rejects.toMatchObject({
      kind: 'failed',
    });
  });
});

describe('downloadSubtitle', () => {
  const result = { fileId: '12345', fileName: 'Some.Movie.en.srt' };

  it('POSTs the file id to the proxy download route', async () => {
    const fetchImpl = jsonFetch({ content: '1\n00:00:01,000 --> 00:00:02,000\nHi\n' });

    await downloadSubtitle(result, { fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${DEFAULT_SEARCH_ENDPOINT}/download`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ fileId: '12345' });
  });

  it('returns the subtitle content and infers the format', async () => {
    const fetchImpl = jsonFetch({ content: 'WEBVTT\n', fileName: 'movie.vtt' });
    const downloaded = await downloadSubtitle(result, { fetchImpl });

    expect(downloaded.content).toBe('WEBVTT\n');
    expect(downloaded.fileName).toBe('movie.vtt');
    expect(downloaded.format).toBe('vtt');
  });

  it.each([
    ['movie.srt', 'srt'],
    ['movie.ass', 'ass'],
    ['movie.ssa', 'ssa'],
    ['movie.vtt', 'vtt'],
    ['movie-with-no-extension', 'srt'],
  ])('infers %s as %s', async (fileName, format) => {
    const fetchImpl = jsonFetch({ content: 'text', fileName });
    const downloaded = await downloadSubtitle(result, { fetchImpl });
    expect(downloaded.format).toBe(format);
  });

  it('falls back to the result filename when the proxy omits one', async () => {
    const fetchImpl = jsonFetch({ content: 'text' });
    const downloaded = await downloadSubtitle(result, { fetchImpl });
    expect(downloaded.fileName).toBe('Some.Movie.en.srt');
  });

  it('rejects an empty response body', async () => {
    const fetchImpl = jsonFetch({ content: '' });
    await expect(downloadSubtitle(result, { fetchImpl })).rejects.toThrow(/no content/i);
  });

  it('rejects a response with no content field', async () => {
    const fetchImpl = jsonFetch({ fileName: 'movie.srt' });
    await expect(downloadSubtitle(result, { fetchImpl })).rejects.toThrow(/no content/i);
  });

  it('maps a quota response to rate-limited', async () => {
    const fetchImpl = jsonFetch({}, 429);
    await expect(downloadSubtitle(result, { fetchImpl })).rejects.toMatchObject({
      kind: 'rate-limited',
    });
  });
});
