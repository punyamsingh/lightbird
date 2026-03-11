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

import { createVideoPlayer } from '@/lib/video-processor';

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
