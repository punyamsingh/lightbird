// ---------------------------------------------------------------------------
// Worker mock — must be set up before importing MKVPlayer
// ---------------------------------------------------------------------------

import type { WorkerOutbound } from '@/lib/workers/ffmpeg-worker';

let mockWorkerInstance: {
  postMessage: jest.Mock;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate: jest.Mock;
};

// The constructor mock is defined at module level so it can be set on global
const MockWorkerConstructor = jest.fn(() => mockWorkerInstance);

let originalWorker: typeof Worker | undefined;

beforeAll(() => {
  originalWorker = (global as unknown as { Worker?: typeof Worker }).Worker;
  (global as unknown as { Worker: jest.Mock }).Worker = MockWorkerConstructor;
});

afterAll(() => {
  (global as unknown as { Worker: typeof Worker | undefined }).Worker = originalWorker;
});

import { MKVPlayer, CancellationError, parseStreamInfo, canPlayNatively } from '@/lib/players/mkv-player';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name = 'test.mkv'): File {
  return new File(['mkv-content'], name, { type: 'video/x-matroska' });
}

/** Simulate a message arriving from the worker */
function simulateWorkerMessage(msg: WorkerOutbound) {
  mockWorkerInstance.onmessage?.({ data: msg } as MessageEvent);
}

/** Default logs for a successful probe */
const DEFAULT_LOGS = [
  '  Stream #0:0: Video: h264 (High), yuv420p, 1920x1080',
  '  Stream #0:1(eng): Audio: aac, 48000 Hz, stereo',
  '  Stream #0:2(jpn): Audio: ac3, 48000 Hz, 5.1',
  '  Stream #0:3(eng): Subtitle: subrip',
].join('\n');

/**
 * Start initialize, then resolve it immediately with a successful REMUX_DONE.
 * Returns the resolved player file.
 *
 * NOTE: We need to flush the canPlayNatively microtask (one await) before
 * postMessage is called, because initialize() awaits the native check first.
 */
async function initializeSuccess(
  player: MKVPlayer,
  videoEl: HTMLVideoElement,
  logs = DEFAULT_LOGS,
) {
  const initPromise = player.initialize(videoEl);
  // Flush the _canPlayNatively microtask so the FFmpeg path continues
  await Promise.resolve();
  const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
  simulateWorkerMessage({
    id: msg.id,
    type: 'REMUX_DONE',
    data: new Uint8Array([0, 1, 2, 3]),
    logs,
  });
  return initPromise;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkerInstance = {
    postMessage: jest.fn(),
    onmessage: null,
    onerror: null,
    terminate: jest.fn(),
  };
  MockWorkerConstructor.mockReturnValue(mockWorkerInstance);
  // Default: native check always returns false so existing tests use the FFmpeg path
  jest.spyOn(MKVPlayer, '_canPlayNatively').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseStreamInfo
// ---------------------------------------------------------------------------

describe('parseStreamInfo', () => {
  it('returns empty arrays for empty log', () => {
    const result = parseStreamInfo('');
    expect(result.videoTracks).toEqual([]);
    expect(result.audioTracks).toEqual([]);
    expect(result.subtitleTracks).toEqual([]);
  });

  it('parses video, audio and subtitle streams', () => {
    const logs = [
      '  Stream #0:0: Video: h264 (High), yuv420p, 1920x1080',
      '  Stream #0:1(eng): Audio: aac, 48000 Hz, stereo',
      '  Stream #0:2(jpn): Audio: ac3, 48000 Hz, 5.1',
      '  Stream #0:3(eng): Subtitle: subrip',
    ].join('\n');

    const result = parseStreamInfo(logs);
    expect(result.videoTracks).toHaveLength(1);
    expect(result.audioTracks).toHaveLength(2);
    expect(result.subtitleTracks).toHaveLength(1);
  });

  it('assigns sequential indices to audio tracks', () => {
    const logs = [
      '  Stream #0:1(eng): Audio: aac, 48000 Hz, stereo',
      '  Stream #0:2(jpn): Audio: ac3, 48000 Hz, 5.1',
    ].join('\n');

    const { audioTracks } = parseStreamInfo(logs);
    expect(audioTracks[0].index).toBe(0);
    expect(audioTracks[1].index).toBe(1);
  });

  it('captures language codes', () => {
    const logs = '  Stream #0:1(fre): Audio: aac, stereo';
    const { audioTracks } = parseStreamInfo(logs);
    expect(audioTracks[0].lang).toBe('fre');
  });

  it('handles missing language gracefully', () => {
    const logs = '  Stream #0:1: Audio: aac, stereo';
    const { audioTracks } = parseStreamInfo(logs);
    expect(audioTracks[0].lang).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — static helpers
// ---------------------------------------------------------------------------

describe('MKVPlayer.isCompatible', () => {
  it('returns true for .mkv files', () => {
    expect(MKVPlayer.isCompatible(makeFile('movie.mkv'))).toBe(true);
  });

  it('returns false for non-mkv files', () => {
    expect(MKVPlayer.isCompatible(makeFile('movie.mp4'))).toBe(false);
    expect(MKVPlayer.isCompatible(makeFile('movie.avi'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canPlayNatively()
// ---------------------------------------------------------------------------

describe('canPlayNatively()', () => {
  // canPlayNatively receives a pre-created URL string — it does NOT call
  // URL.createObjectURL or URL.revokeObjectURL.

  it('resolves true when video fires canplay', async () => {
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);
    const revoke = jest.spyOn(URL, 'revokeObjectURL');

    const promise = canPlayNatively('blob:test-url', 1000);
    mockVideo.oncanplay?.();

    await expect(promise).resolves.toBe(true);
    // Must NOT revoke the URL (caller owns it)
    expect(revoke).not.toHaveBeenCalled();
  });

  it('resolves false when video fires error', async () => {
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:test-url', 1000);
    mockVideo.onerror?.();

    await expect(promise).resolves.toBe(false);
  });

  it('resolves false after timeout', async () => {
    jest.useFakeTimers();
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:test-url', 500);
    jest.advanceTimersByTime(600);

    await expect(promise).resolves.toBe(false);
    jest.useRealTimers();
  });

  it('sets preload to metadata and assigns src before load()', async () => {
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:check-url', 1000);
    expect(mockVideo.preload).toBe('metadata');
    expect(mockVideo.src).toBe('blob:check-url');
    expect(mockVideo.load).toHaveBeenCalled();

    mockVideo.onerror?.();
    await promise;
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — worker integration
// ---------------------------------------------------------------------------

describe('MKVPlayer worker integration', () => {
  it('posts a REMUX message to the worker on initialize', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    // Flush the _canPlayNatively microtask before checking postMessage
    await Promise.resolve();

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REMUX' }),
    );

    // Resolve initialize
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({
      id: msg.id,
      type: 'REMUX_DONE',
      data: new Uint8Array([0, 1, 2]),
      logs: '  Stream #0:0: Video: h264\n  Stream #0:1(eng): Audio: aac, stereo',
    });

    await initPromise;
    expect(player.getAudioTracks()).toHaveLength(1);
  });

  it('forwards PROGRESS messages to the onProgress callback', () => {
    const onProgress = jest.fn();
    const player = new MKVPlayer(makeFile(), onProgress);

    // Trigger worker creation
    player['getWorker']();

    simulateWorkerMessage({ id: 'any', type: 'PROGRESS', progress: 0.5 });

    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it('calls worker.terminate() on destroy()', () => {
    const player = new MKVPlayer(makeFile());
    // Trigger lazy worker creation
    player['getWorker']();
    player.destroy();

    expect(mockWorkerInstance.terminate).toHaveBeenCalledTimes(1);
  });

  it('calls onProgress(1) after successful initialize', async () => {
    const onProgress = jest.fn();
    const player = new MKVPlayer(makeFile(), onProgress);
    const videoEl = document.createElement('video');

    await initializeSuccess(player, videoEl);

    expect(onProgress).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — fallback path
// ---------------------------------------------------------------------------

describe('MKVPlayer fallback (worker ERROR)', () => {
  it('falls back to native playback when the worker sends ERROR', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush _canPlayNatively microtask
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'FFmpeg failed' });

    await initPromise;

    expect(player.getAudioTracks()).toHaveLength(1);
    expect(player.getAudioTracks()[0].id).toBe('0');
    expect(player.getAudioTracks()[0].name).toBe('Default Audio');
  });

  it('getSubtitles returns empty array on fallback', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush _canPlayNatively microtask
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'fail' });

    await initPromise;
    expect(player.getSubtitles()).toEqual([]);
  });

  it('falls back to native playback when worker.onerror fires', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush _canPlayNatively microtask — worker is now created

    // Simulate a fatal worker-level error (e.g. the Worker script failed to load)
    mockWorkerInstance.onerror?.(new ErrorEvent('error', { message: 'worker crashed' }));

    await initPromise; // should resolve via the catch/fallback path in initialize()

    expect(player.getAudioTracks()).toHaveLength(1);
    expect(player.getAudioTracks()[0].name).toBe('Default Audio');
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — successful probe and remux
// ---------------------------------------------------------------------------

describe('MKVPlayer with successful REMUX_DONE', () => {
  it('populates audio tracks from logs', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);

    const tracks = player.getAudioTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(1);
  });

  it('exposes embedded subtitle track metadata', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);

    const subs = player.getSubtitles();
    expect(subs).toHaveLength(1);
    expect(subs[0].type).toBe('embedded');
    expect(subs[0].lang).toBe('eng');
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — native path (canPlayNatively returns true)
// ---------------------------------------------------------------------------

describe('MKVPlayer.initialize() native path', () => {
  it('keeps probeUrl on this.objectUrl when canPlayNatively returns true', async () => {
    jest.spyOn(MKVPlayer, '_canPlayNatively').mockResolvedValue(true);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:probe-url');
    const revoke = jest.spyOn(URL, 'revokeObjectURL');

    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    const result = await player.initialize(videoEl);

    expect(videoEl.src).toContain('blob:probe-url');
    // URL must NOT be revoked — it's now the active playback URL
    expect(revoke).not.toHaveBeenCalledWith('blob:probe-url');
    // Worker must NOT have been invoked
    expect(mockWorkerInstance.postMessage).not.toHaveBeenCalled();
    expect(result.audioTracks).toHaveLength(1);
  });

  it('calls onProgress(1) immediately on native path', async () => {
    jest.spyOn(MKVPlayer, '_canPlayNatively').mockResolvedValue(true);
    const onProgress = jest.fn();
    const player = new MKVPlayer(makeFile(), onProgress);
    const videoEl = document.createElement('video');

    await player.initialize(videoEl);

    expect(onProgress).toHaveBeenCalledWith(1);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('revokes probeUrl and proceeds to FFmpeg when canPlayNatively returns false', async () => {
    // _canPlayNatively is already mocked to false in beforeEach
    const probeUrl = 'blob:probe-url';
    jest.spyOn(URL, 'createObjectURL').mockReturnValue(probeUrl);
    const revoke = jest.spyOn(URL, 'revokeObjectURL');

    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    // Start but don't await — check state after native check resolves
    player.initialize(videoEl).catch(() => {});
    await Promise.resolve(); // flush microtask

    expect(revoke).toHaveBeenCalledWith(probeUrl);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — lifecycle edge cases
// ---------------------------------------------------------------------------

describe('MKVPlayer lifecycle', () => {
  it('destroy does not throw when called before initialize', () => {
    const player = new MKVPlayer(makeFile());
    expect(() => player.destroy()).not.toThrow();
  });

  it('destroy does not throw when called multiple times', () => {
    const player = new MKVPlayer(makeFile());
    player['getWorker']();
    expect(() => {
      player.destroy();
      player.destroy();
    }).not.toThrow();
  });

  it('switchAudioTrack is a no-op if videoElement is not set', async () => {
    const player = new MKVPlayer(makeFile());
    await expect(player.switchAudioTrack('1')).resolves.toBeUndefined();
  });

  it('switchSubtitle with "-1" does nothing', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);
    await expect(player.switchSubtitle('-1')).resolves.toBeUndefined();
  });

  it('switchSubtitle with unknown id (not in track map) does nothing', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    // Fallback path — subtitleTrackMap stays empty
    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush _canPlayNatively microtask
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'fail' });
    await initPromise;

    await expect(player.switchSubtitle('99')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — cancellation
// ---------------------------------------------------------------------------

describe('MKVPlayer cancellation', () => {
  it('rejects with CancellationError when cancel() is called during native check phase', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    // Start initialize (don't await — cancel before native check resolves)
    const initPromise = player.initialize(videoEl);

    player.cancel();

    await expect(initPromise).rejects.toBeInstanceOf(CancellationError);
    // Worker was never created because cancel was called before the FFmpeg phase
    expect(mockWorkerInstance.terminate).not.toHaveBeenCalled();
  });

  it('terminates worker and rejects with CancellationError on cancel() during FFmpeg phase', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush native check microtask → FFmpeg phase begins

    // Worker should now exist
    expect(mockWorkerInstance.postMessage).toHaveBeenCalled();

    player.cancel();

    await expect(initPromise).rejects.toBeInstanceOf(CancellationError);
    expect(mockWorkerInstance.terminate).toHaveBeenCalledTimes(1);
  });

  it('clears pendingOperations after cancel() during FFmpeg phase', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    player.initialize(videoEl).catch(() => {});
    await Promise.resolve(); // flush native check → pendingOperations now populated

    expect(player['pendingOperations'].size).toBe(1);

    player.cancel();

    expect(player['pendingOperations'].size).toBe(0);
  });

  it('is a no-op when called before worker is created', () => {
    const player = new MKVPlayer(makeFile());
    expect(() => player.cancel()).not.toThrow();
  });

  it('does not reject with CancellationError when worker sends ERROR (fallback path)', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);
    await Promise.resolve(); // flush _canPlayNatively microtask
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'FFmpeg failed' });

    // Should resolve (fallback), not reject
    await expect(initPromise).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — remux cache
// ---------------------------------------------------------------------------

describe('MKVPlayer remux cache', () => {
  it('does not call FFmpeg again when switching back to a cached track', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);

    // inject a pre-cached URL for track 1
    player['remuxCache'].set(1, 'blob:cached-track-1');
    mockWorkerInstance.postMessage.mockClear();

    // switchAudioTrack should return the cached URL without hitting the worker
    await player.switchAudioTrack('1');

    expect(mockWorkerInstance.postMessage).not.toHaveBeenCalled();
    expect(videoEl.src).toBe('blob:cached-track-1');
  });

  it('stores result in remuxCache after a fresh FFmpeg remux', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);

    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fresh-track-2');
    const cacheSpy = jest.spyOn(player['remuxCache'], 'set');

    const remuxPromise = player['_remux'](2);

    const msg = mockWorkerInstance.postMessage.mock.calls[mockWorkerInstance.postMessage.mock.calls.length - 1][0];
    simulateWorkerMessage({
      id: msg.id,
      type: 'REMUX_DONE',
      data: new Uint8Array([0]),
      logs: '',
    });

    await remuxPromise;

    expect(cacheSpy).toHaveBeenCalledWith(2, 'blob:fresh-track-2');
    cacheSpy.mockRestore();
  });

  it('does not call FFmpeg for track 0 when switching back after initialize', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await initializeSuccess(player, videoEl);

    // initialize() should have stored track 0 in the cache
    expect(player['remuxCache'].has(0)).toBe(true);

    mockWorkerInstance.postMessage.mockClear();
    await player.switchAudioTrack('0');

    // No new worker message — served from cache
    expect(mockWorkerInstance.postMessage).not.toHaveBeenCalled();
  });

  it('revokes all cached URLs on destroy()', () => {
    const revoke = jest.spyOn(URL, 'revokeObjectURL');
    const player = new MKVPlayer(makeFile());
    player['remuxCache'].set(0, 'blob:track-0');
    player['remuxCache'].set(1, 'blob:track-1');

    player.destroy();

    expect(revoke).toHaveBeenCalledWith('blob:track-0');
    expect(revoke).toHaveBeenCalledWith('blob:track-1');
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — subtitle blob URL cleanup
// ---------------------------------------------------------------------------

describe('subtitle blob URL cleanup', () => {
  const revokeObjectURL = jest.fn();
  let originalRevoke: typeof URL.revokeObjectURL;

  beforeAll(() => {
    originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });
  });

  afterAll(() => {
    Object.defineProperty(URL, 'revokeObjectURL', { value: originalRevoke, writable: true });
  });

  beforeEach(() => {
    revokeObjectURL.mockClear();
  });

  it('tracks and revokes subtitle blob URLs on destroy', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    // Initialize with a subtitle track in the logs
    const logsWithSub = [
      '  Stream #0:0: Video: h264, 1920x1080',
      '  Stream #0:1(eng): Audio: aac, stereo',
      '  Stream #0:2(eng): Subtitle: subrip',
    ].join('\n');
    await initializeSuccess(player, videoEl, logsWithSub);

    // Mock createObjectURL for the subtitle blob
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:subtitle-url');

    // Patch _extractSubtitle to avoid a second worker round-trip
    (player as unknown as { _extractSubtitle: jest.Mock })._extractSubtitle =
      jest.fn().mockResolvedValue('1\n00:00:00,000 --> 00:00:01,000\nHello\n');

    await player.switchSubtitle('0');
    player.destroy();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:subtitle-url');
  });
});
