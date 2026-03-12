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

beforeAll(() => {
  (global as unknown as { Worker: jest.Mock }).Worker = MockWorkerConstructor;
});

import { MKVPlayer, parseStreamInfo } from '@/lib/players/mkv-player';

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
 */
async function initializeSuccess(
  player: MKVPlayer,
  videoEl: HTMLVideoElement,
  logs = DEFAULT_LOGS,
) {
  const initPromise = player.initialize(videoEl);
  // postMessage was called synchronously in sendToWorker's Promise executor
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
// MKVPlayer — worker integration
// ---------------------------------------------------------------------------

describe('MKVPlayer worker integration', () => {
  it('posts a REMUX message to the worker on initialize', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');

    const initPromise = player.initialize(videoEl);

    // postMessage was called synchronously before the first await resolved
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
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'fail' });

    await initPromise;
    expect(player.getSubtitles()).toEqual([]);
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
    const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
    simulateWorkerMessage({ id: msg.id, type: 'ERROR', error: 'fail' });
    await initPromise;

    await expect(player.switchSubtitle('99')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// MKVPlayer — subtitle blob URL cleanup
// ---------------------------------------------------------------------------

describe('subtitle blob URL cleanup', () => {
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      writable: true,
    });
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
    const createObjectURL = jest.fn().mockReturnValue('blob:subtitle-url');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });

    // Patch _extractSubtitle to avoid a second worker round-trip
    (player as unknown as { _extractSubtitle: jest.Mock })._extractSubtitle =
      jest.fn().mockResolvedValue('1\n00:00:00,000 --> 00:00:01,000\nHello\n');

    await player.switchSubtitle('0');
    player.destroy();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:subtitle-url');
  });
});
