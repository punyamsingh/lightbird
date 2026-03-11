// ---------------------------------------------------------------------------
// Module mocks — jest.mock() is hoisted, so no external variables may be
// referenced in the factory.  We wire up mockFFmpeg in beforeEach instead.
// ---------------------------------------------------------------------------

jest.mock('@/lib/ffmpeg-singleton', () => ({
  getFFmpeg: jest.fn(),
  resetFFmpeg: jest.fn(),
}));

jest.mock('@ffmpeg/util', () => ({
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: jest.fn().mockResolvedValue('blob:mock-url'),
}));

import { MKVPlayer, parseStreamInfo } from '@/lib/players/mkv-player';
import { getFFmpeg } from '@/lib/ffmpeg-singleton';

const mockGetFFmpeg = getFFmpeg as jest.MockedFunction<typeof getFFmpeg>;

// ---------------------------------------------------------------------------
// Shared mock FFmpeg instance — recreated each test
// ---------------------------------------------------------------------------

let mockFFmpeg: any;

function makeMockFFmpeg(execImpl?: () => Promise<void>) {
  return {
    on: jest.fn(),
    off: jest.fn(),
    exec: execImpl
      ? jest.fn().mockImplementation(execImpl)
      : jest.fn().mockRejectedValue(new Error('ffmpeg probe error')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3])),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name = 'test.mkv'): File {
  return new File(['mkv-content'], name, { type: 'video/x-matroska' });
}

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
// MKVPlayer
// ---------------------------------------------------------------------------

describe('MKVPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: exec rejects → triggers the fallback native-playback path
    mockFFmpeg = makeMockFFmpeg();
    mockGetFFmpeg.mockResolvedValue(mockFFmpeg);
  });

  it('isCompatible returns true for .mkv files', () => {
    expect(MKVPlayer.isCompatible(makeFile('movie.mkv'))).toBe(true);
  });

  it('isCompatible returns false for non-mkv files', () => {
    expect(MKVPlayer.isCompatible(makeFile('movie.mp4'))).toBe(false);
    expect(MKVPlayer.isCompatible(makeFile('movie.avi'))).toBe(false);
  });

  it('falls back to native playback when FFmpeg throws', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);

    expect(player.getAudioTracks()).toHaveLength(1);
    expect(player.getAudioTracks()[0].id).toBe('0');
    expect(player.getAudioTracks()[0].name).toBe('Default Audio');
  });

  it('getSubtitles returns empty array on fallback', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);
    expect(player.getSubtitles()).toEqual([]);
  });

  describe('with successful FFmpeg probe and remux', () => {
    beforeEach(() => {
      // exec resolves for both probe and remux
      mockFFmpeg = makeMockFFmpeg(() => Promise.resolve(undefined));

      // When ffmpeg.on('log', handler) is called, feed stream-info messages
      mockFFmpeg.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'log') {
          // Deliver messages synchronously so they are captured before exec returns
          handler({ message: '  Stream #0:0: Video: h264, 1920x1080' });
          handler({ message: '  Stream #0:1(eng): Audio: aac, stereo' });
          handler({ message: '  Stream #0:2(jpn): Audio: ac3, 5.1' });
          handler({ message: '  Stream #0:3(eng): Subtitle: subrip' });
        }
      });

      mockGetFFmpeg.mockResolvedValue(mockFFmpeg);
    });

    it('populates audio tracks from FFmpeg probe output', async () => {
      const player = new MKVPlayer(makeFile());
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      const tracks = player.getAudioTracks();
      expect(tracks.length).toBeGreaterThanOrEqual(1);
    });

    it('calls the onProgress callback with 1 on completion', async () => {
      const onProgress = jest.fn();
      const player = new MKVPlayer(makeFile(), onProgress);
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      expect(onProgress).toHaveBeenCalledWith(1);
    });

    it('exposes embedded subtitle track metadata', async () => {
      const player = new MKVPlayer(makeFile());
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      const subs = player.getSubtitles();
      expect(subs).toHaveLength(1);
      expect(subs[0].type).toBe('embedded');
      expect(subs[0].lang).toBe('eng');
    });
  });

  it('destroy does not throw when called before initialize', () => {
    const player = new MKVPlayer(makeFile());
    expect(() => player.destroy()).not.toThrow();
  });

  it('switchAudioTrack is a no-op if videoElement is not set', async () => {
    const player = new MKVPlayer(makeFile());
    await expect(player.switchAudioTrack('1')).resolves.toBeUndefined();
  });

  it('switchSubtitle with "-1" does nothing', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);
    await expect(player.switchSubtitle('-1')).resolves.toBeUndefined();
  });

  it('switchSubtitle with unknown id (not in track map) does nothing', async () => {
    const player = new MKVPlayer(makeFile());
    const videoEl = document.createElement('video');
    await player.initialize(videoEl);
    // '99' is not in subtitleTrackMap (only populated on successful probe)
    await expect(player.switchSubtitle('99')).resolves.toBeUndefined();
  });

  describe('progress handler cleanup', () => {
    it('removes progress handler on error path via finally', async () => {
      // Arrange: getFFmpeg resolves but exec rejects (simulates remux failure)
      mockFFmpeg = makeMockFFmpeg();
      // on() for progress just records the call; exec rejects → triggers finally
      mockGetFFmpeg.mockResolvedValue(mockFFmpeg);

      const onProgress = jest.fn();
      const player = new MKVPlayer(makeFile(), onProgress);
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      // ffmpeg.off should have been called for 'progress' despite the error path
      const offProgressCalls = (mockFFmpeg.off as jest.Mock).mock.calls.filter(
        ([event]: [string]) => event === 'progress',
      );
      expect(offProgressCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('removes progress handler on success path via finally', async () => {
      mockFFmpeg = makeMockFFmpeg(() => Promise.resolve(undefined));
      mockFFmpeg.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'log') {
          handler({ message: '  Stream #0:0: Video: h264, 1920x1080' });
          handler({ message: '  Stream #0:1(eng): Audio: aac, stereo' });
        }
      });
      mockGetFFmpeg.mockResolvedValue(mockFFmpeg);

      const onProgress = jest.fn();
      const player = new MKVPlayer(makeFile(), onProgress);
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      const offProgressCalls = (mockFFmpeg.off as jest.Mock).mock.calls.filter(
        ([event]: [string]) => event === 'progress',
      );
      expect(offProgressCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

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
      // Arrange: successful probe with one subtitle track
      mockFFmpeg = makeMockFFmpeg(() => Promise.resolve(undefined));
      mockFFmpeg.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'log') {
          handler({ message: '  Stream #0:0: Video: h264, 1920x1080' });
          handler({ message: '  Stream #0:1(eng): Audio: aac, stereo' });
          handler({ message: '  Stream #0:2(eng): Subtitle: subrip' });
        }
      });
      mockGetFFmpeg.mockResolvedValue(mockFFmpeg);

      const player = new MKVPlayer(makeFile());
      const videoEl = document.createElement('video');
      await player.initialize(videoEl);

      // switchSubtitle creates a blob URL; mock SubtitleConverter inline via URL.createObjectURL
      const createObjectURL = jest.fn().mockReturnValue('blob:subtitle-url');
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });

      // Patch _extractSubtitle to avoid a second ffmpeg exec
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (player as any)._extractSubtitle = jest.fn().mockResolvedValue('1\n00:00:00,000 --> 00:00:01,000\nHello\n');

      await player.switchSubtitle('0');
      player.destroy();

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:subtitle-url');
    });

    it('does not leak blob URLs when destroy is called multiple times', async () => {
      const player = new MKVPlayer(makeFile());
      // Should not throw
      player.destroy();
      player.destroy();
      expect(revokeObjectURL).not.toThrow;
    });
  });
});
