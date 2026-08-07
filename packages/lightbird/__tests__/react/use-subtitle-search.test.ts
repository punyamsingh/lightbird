import { renderHook, act, waitFor } from '@testing-library/react';
import { useSubtitleSearch } from '../../src/react/use-subtitle-search';
import * as searchModule from '../../src/subtitles/subtitle-search';
import * as hashModule from '../../src/subtitles/opensubtitles-hash';
import { SubtitleSearchError } from '../../src/subtitles/subtitle-search';
import type { SubtitleSearchResult } from '../../src/types';

jest.mock('../../src/subtitles/subtitle-search', () => ({
  ...jest.requireActual('../../src/subtitles/subtitle-search'),
  searchSubtitles: jest.fn(),
  downloadSubtitle: jest.fn(),
}));

const searchSubtitles = searchModule.searchSubtitles as jest.MockedFunction<
  typeof searchModule.searchSubtitles
>;
const downloadSubtitle = searchModule.downloadSubtitle as jest.MockedFunction<
  typeof searchModule.downloadSubtitle
>;

function makeResult(overrides: Partial<SubtitleSearchResult> = {}): SubtitleSearchResult {
  return {
    fileId: '1',
    fileName: 'movie.en.srt',
    language: 'en',
    release: 'Movie.2019',
    downloadCount: 10,
    rating: 8,
    hearingImpaired: false,
    hashMatch: false,
    ...overrides,
  };
}

/** A stand-in for a video File, large enough to be hashable. */
function hashableFile(size = hashModule.MIN_HASHABLE_SIZE): Blob {
  return { size, slice: () => ({ arrayBuffer: async () => new ArrayBuffer(65536) }) } as unknown as Blob;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSubtitleSearch', () => {
  it('starts idle with no results', () => {
    const { result } = renderHook(() => useSubtitleSearch());

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.mode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('hashes the file and searches by hash first', async () => {
    searchSubtitles.mockResolvedValue([makeResult({ hashMatch: true })]);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ file: hashableFile(), fileName: 'Movie.2019.mkv' });
    });

    expect(searchSubtitles).toHaveBeenCalledTimes(1);
    expect(searchSubtitles.mock.calls[0][0]).toMatchObject({
      hash: expect.stringMatching(/^[0-9a-f]{16}$/),
      fileSize: hashModule.MIN_HASHABLE_SIZE,
    });
    expect(result.current.mode).toBe('hash');
    expect(result.current.status).toBe('ready');
  });

  it('falls back to a filename search when the hash returns nothing', async () => {
    searchSubtitles.mockResolvedValueOnce([]).mockResolvedValueOnce([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ file: hashableFile(), fileName: 'Some.Movie.2019.mkv' });
    });

    expect(searchSubtitles).toHaveBeenCalledTimes(2);
    expect(searchSubtitles.mock.calls[1][0]).toEqual({
      text: 'Some Movie 2019',
      languages: undefined,
    });
    expect(result.current.mode).toBe('text');
    expect(result.current.results).toHaveLength(1);
  });

  it('searches by filename only when there is no file to hash', async () => {
    searchSubtitles.mockResolvedValue([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Some.Movie.2019.mkv' });
    });

    expect(searchSubtitles).toHaveBeenCalledTimes(1);
    expect(searchSubtitles.mock.calls[0][0]).not.toHaveProperty('hash');
    expect(result.current.mode).toBe('text');
  });

  it('skips hashing a file that is too small', async () => {
    searchSubtitles.mockResolvedValue([]);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ file: hashableFile(100), fileName: 'tiny.mkv' });
    });

    expect(searchSubtitles.mock.calls[0][0]).not.toHaveProperty('hash');
  });

  it('reports no results without setting an error', async () => {
    searchSubtitles.mockResolvedValue([]);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Unknown.mkv' });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.results).toEqual([]);
    expect(result.current.mode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('passes the configured languages through to the search', async () => {
    searchSubtitles.mockResolvedValue([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch({ languages: ['en', 'fr'] }));
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(searchSubtitles.mock.calls[0][0]).toMatchObject({ languages: ['en', 'fr'] });
  });

  it('surfaces the error kind so the caller can hide an unconfigured feature', async () => {
    searchSubtitles.mockRejectedValue(
      new SubtitleSearchError('unavailable', 'Subtitle search is not available on this deployment')
    );

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorKind).toBe('unavailable');
    expect(result.current.error).toMatch(/not available/i);
  });

  it('does not toast when the deployment simply has no search backend', async () => {
    // The user cannot act on a missing backend and the panel hides itself on
    // this kind, so a toast would be pure noise.
    const onError = jest.fn();
    searchSubtitles.mockRejectedValue(
      new SubtitleSearchError('unavailable', 'Subtitle search is not available on this deployment')
    );

    const { result } = renderHook(() => useSubtitleSearch({ onError }));
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.errorKind).toBe('unavailable');
  });

  it('keeps the unavailable verdict across a reset', async () => {
    // Otherwise the search UI reappears on every video change and the user
    // rediscovers the same missing backend each time.
    searchSubtitles.mockRejectedValue(new SubtitleSearchError('unavailable', 'nope'));

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });
    act(() => result.current.reset());

    expect(result.current.errorKind).toBe('unavailable');
  });

  it('clears a recoverable error kind on reset', async () => {
    searchSubtitles.mockRejectedValue(new SubtitleSearchError('rate-limited', 'slow down'));

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });
    act(() => result.current.reset());

    expect(result.current.errorKind).toBeNull();
  });

  it('reports errors through the onError callback', async () => {
    const onError = jest.fn();
    searchSubtitles.mockRejectedValue(new SubtitleSearchError('rate-limited', 'Slow down'));

    const { result } = renderHook(() => useSubtitleSearch({ onError }));
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(onError).toHaveBeenCalledWith('Slow down');
  });

  it('distinguishes hash and filename matches in the success message', async () => {
    const onSuccess = jest.fn();
    searchSubtitles.mockResolvedValue([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch({ onSuccess }));
    await act(async () => {
      await result.current.search({ file: hashableFile(), fileName: 'Movie.mkv' });
    });

    expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/exact release/i));
  });

  it('warns about sync when results came from a filename match', async () => {
    const onSuccess = jest.fn();
    searchSubtitles.mockResolvedValue([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch({ onSuccess }));
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/check sync/i));
  });

  it('ignores an aborted search instead of reporting it as an error', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    searchSubtitles.mockRejectedValue(abortError);

    const { result } = renderHook(() => useSubtitleSearch());
    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });

    expect(result.current.status).not.toBe('error');
    expect(result.current.error).toBeNull();
  });

  it('stays silent when a superseded search fails with a non-abort error', async () => {
    // A newer search aborts the older controller, but the older request can
    // still reject on its own afterwards. That stale failure must not overwrite
    // the newer search's state or fire a toast.
    const onError = jest.fn();
    let failFirst: ((e: Error) => void) | undefined;
    searchSubtitles
      .mockImplementationOnce(() => new Promise((_, reject) => { failFirst = reject; }))
      .mockResolvedValue([makeResult()]);

    const { result } = renderHook(() => useSubtitleSearch({ onError }));

    act(() => {
      void result.current.search({ fileName: 'First.mkv' });
    });
    // Second search supersedes the first, aborting its controller.
    await act(async () => {
      await result.current.search({ fileName: 'Second.mkv' });
    });
    await act(async () => {
      failFirst?.(new Error('stale network failure'));
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('clears prior results when a new search starts', async () => {
    searchSubtitles.mockResolvedValue([makeResult()]);
    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });
    expect(result.current.results).toHaveLength(1);

    searchSubtitles.mockResolvedValue([]);
    await act(async () => {
      await result.current.search({ fileName: 'Other.mkv' });
    });
    expect(result.current.results).toEqual([]);
  });

  it('reset returns the hook to its initial state', async () => {
    searchSubtitles.mockResolvedValue([makeResult()]);
    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ fileName: 'Movie.mkv' });
    });
    act(() => result.current.reset());

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.mode).toBeNull();
  });

  describe('download', () => {
    it('returns the downloaded subtitle and clears the pending id', async () => {
      downloadSubtitle.mockResolvedValue({
        content: 'WEBVTT\n',
        fileName: 'movie.vtt',
        format: 'vtt',
      });

      const { result } = renderHook(() => useSubtitleSearch());
      let downloaded;
      await act(async () => {
        downloaded = await result.current.download(makeResult());
      });

      expect(downloaded).toMatchObject({ content: 'WEBVTT\n', format: 'vtt' });
      await waitFor(() => expect(result.current.downloadingId).toBeNull());
    });

    it('reports a failed download and rethrows for the caller', async () => {
      const onError = jest.fn();
      downloadSubtitle.mockRejectedValue(new SubtitleSearchError('failed', 'Download failed'));

      const { result } = renderHook(() => useSubtitleSearch({ onError }));
      await act(async () => {
        await expect(result.current.download(makeResult())).rejects.toThrow('Download failed');
      });

      expect(onError).toHaveBeenCalledWith('Download failed');
      expect(result.current.downloadingId).toBeNull();
    });

    it('passes an abort signal so a stale download can be cancelled', async () => {
      downloadSubtitle.mockResolvedValue({ content: 'x', fileName: 'a.srt', format: 'srt' });

      const { result } = renderHook(() => useSubtitleSearch());
      await act(async () => {
        await result.current.download(makeResult());
      });

      expect(downloadSubtitle.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    });

    it('aborts an in-flight download on reset', async () => {
      let capturedSignal: AbortSignal | undefined;
      downloadSubtitle.mockImplementation(async (_r, opts) => {
        capturedSignal = opts?.signal;
        return new Promise(() => {}) as Promise<never>; // never settles
      });

      const { result } = renderHook(() => useSubtitleSearch());
      act(() => {
        void result.current.download(makeResult()).catch(() => {});
      });
      act(() => result.current.reset());

      expect(capturedSignal?.aborted).toBe(true);
    });

    it('rethrows a cancellation as an AbortError rather than an error toast', async () => {
      const onError = jest.fn();
      const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
      downloadSubtitle.mockRejectedValue(abortError);

      const { result } = renderHook(() => useSubtitleSearch({ onError }));
      await act(async () => {
        await expect(result.current.download(makeResult())).rejects.toBe(abortError);
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('passes a custom endpoint through to the download call', async () => {
      downloadSubtitle.mockResolvedValue({ content: 'x', fileName: 'a.srt', format: 'srt' });

      const { result } = renderHook(() => useSubtitleSearch({ endpoint: '/custom' }));
      await act(async () => {
        await result.current.download(makeResult());
      });

      expect(downloadSubtitle.mock.calls[0][1]).toMatchObject({ endpoint: '/custom' });
    });
  });
});
