// Mock the create-worker module to avoid import.meta.url parse error
// The worker mock rejects immediately so MKVPlayer falls back to native playback
jest.mock('../src/workers/create-worker', () => ({
  createFFmpegWorker: jest.fn(() => {
    const worker = {
      postMessage: jest.fn(),
      onmessage: null as ((e: MessageEvent) => void) | null,
      onerror: null as ((e: ErrorEvent) => void) | null,
      terminate: jest.fn(),
    };
    // Simulate immediate worker error so initialize() falls through to fallback
    setTimeout(() => {
      if (worker.onerror) {
        worker.onerror(new ErrorEvent('error', { message: 'mock worker error' }));
      }
    }, 0);
    return worker;
  }),
}));

// Prevent ESM parse error — @ffmpeg/* is transitively imported by mkv-player
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    exec: jest.fn().mockRejectedValue(new Error('ffmpeg not available in test')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(new Uint8Array()),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@ffmpeg/util', () => ({
  toBlobURL: jest.fn().mockResolvedValue('blob:mock-url'),
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array()),
}));

import { createVideoPlayer } from '../src/video-processor';

function makeFile(name: string, type = 'video/mp4'): File {
  return new File(['video-content'], name, { type });
}

describe('createVideoPlayer', () => {
  it('returns a player for mp4 files', () => {
    const player = createVideoPlayer(makeFile('video.mp4'));
    expect(player).toBeDefined();
  });

  it('returns a player for mkv files', () => {
    const player = createVideoPlayer(makeFile('video.mkv', 'video/x-matroska'));
    expect(player).toBeDefined();
  });

  it('falls back to a player for files with unknown extensions', () => {
    const player = createVideoPlayer(makeFile('video.unknown'));
    expect(player).toBeDefined();
  });

  it('exposes the VideoPlayer interface for mp4', () => {
    const player = createVideoPlayer(makeFile('video.mp4'));
    expect(typeof player.initialize).toBe('function');
    expect(typeof player.getAudioTracks).toBe('function');
    expect(typeof player.getSubtitles).toBe('function');
    expect(typeof player.switchAudioTrack).toBe('function');
    expect(typeof player.switchSubtitle).toBe('function');
    expect(typeof player.destroy).toBe('function');
  });

  it('exposes the VideoPlayer interface for mkv', () => {
    const player = createVideoPlayer(makeFile('video.mkv'));
    expect(typeof player.initialize).toBe('function');
    expect(typeof player.getAudioTracks).toBe('function');
    expect(typeof player.getSubtitles).toBe('function');
    expect(typeof player.switchAudioTrack).toBe('function');
    expect(typeof player.switchSubtitle).toBe('function');
    expect(typeof player.destroy).toBe('function');
  });

  it('mp4 player returns empty audio tracks (browser handles natively)', () => {
    const player = createVideoPlayer(makeFile('video.mp4'));
    expect(player.getAudioTracks()).toEqual([]);
  });

  it('mp4 player returns an array of subtitles', () => {
    const player = createVideoPlayer(makeFile('video.mp4'));
    expect(Array.isArray(player.getSubtitles())).toBe(true);
  });

  it('mkv player routes to MKVPlayer (audio track available after initialize)', async () => {
    const player = createVideoPlayer(makeFile('video.mkv'));
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);
    expect(player.getAudioTracks()).toHaveLength(1);
    expect(player.getAudioTracks()[0].id).toBe('0');
  });

  it('unknown extension falls back to SimplePlayer (empty audio tracks)', () => {
    const player = createVideoPlayer(makeFile('video.xyz'));
    expect(player.getAudioTracks()).toEqual([]);
  });
});

describe('tracksReady adapter surface', () => {
  it('SimplePlayerAdapter (MP4) does not expose tracksReady — tracks are ready synchronously after initialize()', () => {
    const player = createVideoPlayer(makeFile('video.mp4'));
    // SimplePlayerAdapter has no tracksReady property.
    // Callers guard with optional chaining (player.tracksReady?.then(...)) safely.
    expect(player.tracksReady).toBeUndefined();
  });

  it('MKVPlayerAdapter (MKV) exposes tracksReady as a Promise even before initialize()', () => {
    const player = createVideoPlayer(makeFile('video.mkv', 'video/x-matroska'));
    // MKVPlayer initialises tracksReady to Promise.resolve() in the class field
    expect(player.tracksReady).toBeInstanceOf(Promise);
  });

  it('MKVPlayerAdapter tracksReady resolves after initialize()', async () => {
    const player = createVideoPlayer(makeFile('video.mkv', 'video/x-matroska'));
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);
    // In the test environment the worker is unavailable so the REMUX path hits
    // the catch block; tracksReady stays as the initial Promise.resolve().
    await expect(player.tracksReady).resolves.toBeUndefined();
  });

  it('player.tracksReady?.then() is safe on MP4 (undefined) and resolves for MKV', async () => {
    const mp4Player = createVideoPlayer(makeFile('video.mp4'));
    const mkvPlayer = createVideoPlayer(makeFile('video.mkv', 'video/x-matroska'));
    const videoEl = document.createElement('video');
    await mkvPlayer.initialize(videoEl);

    // MP4: optional chain short-circuits on undefined — no throw, returns undefined
    const mp4Result = await mp4Player.tracksReady?.then(() => 'resolved');
    expect(mp4Result).toBeUndefined();

    // MKV: optional chain runs .then() — resolves to the mapped value
    const mkvResult = await mkvPlayer.tracksReady?.then(() => 'resolved');
    expect(mkvResult).toBe('resolved');
  });
});
