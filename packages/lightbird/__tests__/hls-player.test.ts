// hls.js is mocked so initialize() never loads the real streaming engine and
// the dynamic `import('hls.js')` inside HLSPlayer resolves to this stub.
jest.mock('hls.js', () => {
  const instances: MockHlsInstance[] = [];

  interface MockHlsInstance {
    loadSource: jest.Mock;
    attachMedia: jest.Mock;
    destroy: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
    emit: (event: string) => void;
    audioTracks: Array<{ id: number; name: string; lang?: string; audioCodec?: string }>;
    levels: Array<{ height: number; bitrate: number; name: string; videoCodec?: string }>;
    audioTrack: number;
    currentLevel: number;
  }

  const Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
  };

  class MockHls {
    static isSupported = jest.fn(() => true);
    static instances = instances;
    static Events = Events;
    static reset() {
      instances.length = 0;
      MockHls.isSupported.mockReset();
      MockHls.isSupported.mockReturnValue(true);
    }

    loadSource = jest.fn();
    attachMedia = jest.fn();
    destroy = jest.fn();
    audioTracks: MockHlsInstance['audioTracks'] = [];
    levels: MockHlsInstance['levels'] = [];
    audioTrack = -1;
    currentLevel = -1;

    private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    on = jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(cb);
    });
    off = jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      this.listeners.get(event)?.delete(cb);
    });
    emit(event: string) {
      this.listeners.get(event)?.forEach((cb) => cb());
    }

    constructor() {
      instances.push(this);
    }
  }

  return { __esModule: true, default: MockHls };
});

import HlsImport from 'hls.js';
import { HLSPlayer, isHlsUrl, parseHlsCodec } from '../src/players/hls-player';

// The mock exposes a test-only static surface that hls.js's real types lack.
const MockHls = HlsImport as unknown as {
  isSupported: jest.Mock;
  reset: () => void;
  Events: { MANIFEST_PARSED: string; LEVEL_SWITCHED: string; AUDIO_TRACKS_UPDATED: string };
  instances: Array<{
    loadSource: jest.Mock;
    attachMedia: jest.Mock;
    destroy: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
    emit: (event: string) => void;
    audioTracks: Array<{ id: number; name: string; lang?: string; audioCodec?: string }>;
    levels: Array<{ height: number; bitrate: number; name: string; videoCodec?: string }>;
    audioTrack: number;
    currentLevel: number;
  }>;
};

const HLS_URL = 'https://example.com/stream.m3u8';

beforeEach(() => {
  MockHls.reset();
});

describe('isHlsUrl', () => {
  it('identifies plain .m3u8 URLs', () => {
    expect(isHlsUrl('https://example.com/stream.m3u8')).toBe(true);
  });

  it('identifies .m3u8 URLs with a query string', () => {
    expect(isHlsUrl('https://cdn.example.com/master.m3u8?token=abc123')).toBe(true);
  });

  it('identifies .m3u8 URLs with a hash fragment', () => {
    expect(isHlsUrl('https://example.com/playlist.m3u8#t=10')).toBe(true);
  });

  it('is case-insensitive about the extension', () => {
    expect(isHlsUrl('https://example.com/STREAM.M3U8')).toBe(true);
  });

  it('identifies URLs carrying an HLS MIME hint', () => {
    expect(isHlsUrl('https://example.com/play?type=application/x-mpegurl')).toBe(true);
    expect(isHlsUrl('https://example.com/play?type=application/vnd.apple.mpegurl')).toBe(true);
  });

  it('rejects non-HLS video URLs', () => {
    expect(isHlsUrl('https://example.com/video.mp4')).toBe(false);
    expect(isHlsUrl('https://example.com/movie.mkv')).toBe(false);
  });

  it('rejects empty or non-string input', () => {
    expect(isHlsUrl('')).toBe(false);
    expect(isHlsUrl(undefined as unknown as string)).toBe(false);
  });
});

describe('HLSPlayer.initialize', () => {
  it('loads the source via hls.js when Hls.isSupported() is true', async () => {
    MockHls.isSupported.mockReturnValue(true);
    const player = new HLSPlayer(HLS_URL);
    const video = document.createElement('video');

    await player.initialize(video);

    expect(MockHls.instances).toHaveLength(1);
    const hls = MockHls.instances[0];
    expect(hls.loadSource).toHaveBeenCalledWith(HLS_URL);
    expect(hls.attachMedia).toHaveBeenCalledWith(video);
    // hls.js drives playback — the element's src is left untouched.
    expect(video.getAttribute('src')).toBeNull();
  });

  it('sets videoEl.src directly when Hls.isSupported() is false (native HLS)', async () => {
    MockHls.isSupported.mockReturnValue(false);
    const player = new HLSPlayer(HLS_URL);
    const video = document.createElement('video');

    await player.initialize(video);

    expect(video.src).toBe(HLS_URL);
    // hls.js is never instantiated on the native path.
    expect(MockHls.instances).toHaveLength(0);
  });

  it('resolves to an HLSPlayerFile with the url and an empty quality list', async () => {
    const player = new HLSPlayer(HLS_URL);
    const file = await player.initialize(document.createElement('video'));
    expect(file).toEqual({ url: HLS_URL, qualityLevels: [] });
  });
});

describe('HLSPlayer.destroy', () => {
  it('calls hls.destroy()', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    const hls = MockHls.instances[0];

    player.destroy();

    expect(hls.destroy).toHaveBeenCalledTimes(1);
  });

  it('is safe to call on the native HLS path (no hls.js instance)', async () => {
    MockHls.isSupported.mockReturnValue(false);
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    expect(() => player.destroy()).not.toThrow();
  });

  it('is safe to call before initialize()', () => {
    expect(() => new HLSPlayer(HLS_URL).destroy()).not.toThrow();
  });
});

describe('HLSPlayer.getAudioTracks', () => {
  it('maps hls.audioTracks to AudioTrack[]', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    MockHls.instances[0].audioTracks = [
      { id: 0, name: 'English', lang: 'en' },
      { id: 1, name: 'Spanish', lang: 'es' },
    ];

    expect(player.getAudioTracks()).toEqual([
      { id: '0', name: 'English', lang: 'en' },
      { id: '1', name: 'Spanish', lang: 'es' },
    ]);
  });

  it('falls back to "unknown" when a track has no language', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    MockHls.instances[0].audioTracks = [{ id: 0, name: 'Commentary' }];

    expect(player.getAudioTracks()[0].lang).toBe('unknown');
  });

  it('returns an empty array before initialize / on the native path', () => {
    expect(new HLSPlayer(HLS_URL).getAudioTracks()).toEqual([]);
  });
});

describe('HLSPlayer.getQualityLevels', () => {
  it('maps hls.levels to QualityLevel[]', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    MockHls.instances[0].levels = [
      { height: 1080, bitrate: 5_000_000, name: '1080p' },
      { height: 720, bitrate: 2_500_000, name: '' },
    ];

    expect(player.getQualityLevels()).toEqual([
      { index: 0, height: 1080, bitrate: 5_000_000, name: '1080p' },
      // Empty name → derived from height.
      { index: 1, height: 720, bitrate: 2_500_000, name: '720p' },
    ]);
  });

  it('returns an empty array before initialize', () => {
    expect(new HLSPlayer(HLS_URL).getQualityLevels()).toEqual([]);
  });
});

describe('HLSPlayer track switching', () => {
  it('switchAudioTrack sets hls.audioTrack', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));

    await player.switchAudioTrack('2');

    expect(MockHls.instances[0].audioTrack).toBe(2);
  });

  it('switchAudioTrack ignores a non-numeric track id', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));

    await player.switchAudioTrack('not-a-number');

    expect(MockHls.instances[0].audioTrack).toBe(-1);
  });

  it('setQualityLevel sets hls.currentLevel', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));

    player.setQualityLevel(1);

    expect(MockHls.instances[0].currentLevel).toBe(1);
  });

  it('setQualityLevel(-1) restores automatic ABR selection', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    MockHls.instances[0].currentLevel = 3;

    player.setQualityLevel(-1);

    expect(MockHls.instances[0].currentLevel).toBe(-1);
  });
});

describe('HLSPlayer misc', () => {
  it('getSubtitles returns an empty array (HLS subtitles are a stretch goal)', () => {
    expect(new HLSPlayer(HLS_URL).getSubtitles()).toEqual([]);
  });

  it('isCompatible matches .m3u8 URLs only', () => {
    expect(HLSPlayer.isCompatible('https://example.com/a.m3u8')).toBe(true);
    expect(HLSPlayer.isCompatible('https://example.com/a.mp4')).toBe(false);
  });
});

describe('parseHlsCodec', () => {
  it('maps known MIME codec families to human labels', () => {
    expect(parseHlsCodec('avc1.640028')).toBe('H.264 (AVC)');
    expect(parseHlsCodec('hvc1.1.6.L93.B0')).toBe('H.265 (HEVC)');
    expect(parseHlsCodec('hev1.1.6.L93.B0')).toBe('H.265 (HEVC)');
    expect(parseHlsCodec('vp09.00.10.08')).toBe('VP9');
    expect(parseHlsCodec('av01.0.04M.08')).toBe('AV1');
  });

  it('is case-insensitive about the codec family', () => {
    expect(parseHlsCodec('AVC1.640028')).toBe('H.264 (AVC)');
  });

  it('falls back to the raw string for unknown families', () => {
    expect(parseHlsCodec('mp4a.40.2')).toBe('mp4a.40.2');
  });

  it('returns null for empty / nullish input', () => {
    expect(parseHlsCodec('')).toBeNull();
    expect(parseHlsCodec(null)).toBeNull();
    expect(parseHlsCodec(undefined)).toBeNull();
  });
});

describe('HLSPlayer.getMetadata', () => {
  it('derives container, codec, bitrate, renditions and audio tracks from the active level', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    const hls = MockHls.instances[0];
    hls.levels = [
      { height: 1080, bitrate: 5_000_000, name: '1080p', videoCodec: 'avc1.640028' },
      { height: 720, bitrate: 2_500_000, name: '720p', videoCodec: 'avc1.64001f' },
    ];
    hls.audioTracks = [{ id: 0, name: 'English', lang: 'en', audioCodec: 'mp4a.40.2' }];
    hls.currentLevel = 1;

    expect(player.getMetadata()).toEqual({
      container: 'HLS',
      videoCodec: 'H.264 (AVC)',
      videoBitrate: 2_500_000,
      streamRenditions: 2,
      audioTracks: [
        { index: 0, codec: 'mp4a.40.2', channels: null, sampleRate: null, language: 'en', bitrate: null },
      ],
    });
  });

  it('falls back to the first level when currentLevel is -1 (ABR not yet settled)', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    const hls = MockHls.instances[0];
    hls.levels = [
      { height: 1080, bitrate: 5_000_000, name: '1080p', videoCodec: 'hvc1.1.6.L93.B0' },
      { height: 720, bitrate: 2_500_000, name: '720p', videoCodec: 'avc1.64001f' },
    ];
    hls.currentLevel = -1;

    const meta = player.getMetadata();
    expect(meta.videoCodec).toBe('H.265 (HEVC)');
    expect(meta.videoBitrate).toBe(5_000_000);
    expect(meta.streamRenditions).toBe(2);
  });

  it('returns an empty object before initialize / on the native path', () => {
    expect(new HLSPlayer(HLS_URL).getMetadata()).toEqual({});
  });
});

describe('HLSPlayer.onMetadataChange', () => {
  it('invokes the callback when a metadata event fires and stops after unsubscribe', async () => {
    const player = new HLSPlayer(HLS_URL);
    await player.initialize(document.createElement('video'));
    const hls = MockHls.instances[0];
    const cb = jest.fn();

    const unsubscribe = player.onMetadataChange(cb);
    hls.emit(MockHls.Events.MANIFEST_PARSED);
    hls.emit(MockHls.Events.LEVEL_SWITCHED);
    hls.emit(MockHls.Events.AUDIO_TRACKS_UPDATED);
    expect(cb).toHaveBeenCalledTimes(3);

    unsubscribe();
    hls.emit(MockHls.Events.LEVEL_SWITCHED);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('returns a no-op unsubscribe before initialize / on the native path', () => {
    const unsubscribe = new HLSPlayer(HLS_URL).onMetadataChange(jest.fn());
    expect(() => unsubscribe()).not.toThrow();
  });
});
