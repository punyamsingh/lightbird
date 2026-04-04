import { UniversalSubtitleManager } from '../src/subtitles/subtitle-manager';

// Mock SubtitleConverter so tests don't depend on its implementation
jest.mock('../src/subtitles/subtitle-converter', () => ({
  SubtitleConverter: {
    convertSrtToVtt: jest.fn(async (text: string) => text),
    convertFileToVtt: jest.fn(async (file: File) => file),
  },
}));

function makeSubtitleFile(name: string): File {
  return new File(['WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n'], name, {
    type: 'text/vtt',
  });
}

describe('UniversalSubtitleManager', () => {
  let videoElement: HTMLVideoElement;
  let manager: UniversalSubtitleManager;

  beforeEach(() => {
    jest.useFakeTimers();
    videoElement = document.createElement('video');
    document.body.appendChild(videoElement);
    manager = new UniversalSubtitleManager(videoElement);
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(videoElement);
    jest.useRealTimers();
  });

  describe('addSubtitleFiles', () => {
    it('creates a track element in the DOM for each added file', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);
      expect(videoElement.querySelectorAll('track')).toHaveLength(1);
    });

    it('returns the newly added subtitles', async () => {
      const result = await manager.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('external');
    });

    it('adds multiple subtitle files', async () => {
      await manager.addSubtitleFiles([
        makeSubtitleFile('sub1.vtt'),
        makeSubtitleFile('sub2.vtt'),
      ]);
      expect(manager.getSubtitles()).toHaveLength(2);
      expect(videoElement.querySelectorAll('track')).toHaveLength(2);
    });

    it('detects language from filename pattern (e.g., movie.en.vtt)', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('movie.en.vtt')]);
      const subtitles = manager.getSubtitles();
      expect(subtitles[0].lang).toBe('en');
    });

    it('falls back to "unknown" when language cannot be detected', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('subtitle.vtt')]);
      const subtitles = manager.getSubtitles();
      expect(subtitles[0].lang).toBe('unknown');
    });
  });

  describe('removeSubtitle', () => {
    it('removes a subtitle and its track element', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);
      const [subtitle] = manager.getSubtitles();

      const removed = manager.removeSubtitle(subtitle.id);

      expect(removed).toBe(true);
      expect(manager.getSubtitles()).toHaveLength(0);
      expect(videoElement.querySelectorAll('track')).toHaveLength(0);
    });

    it('returns false when removing a non-existent subtitle id', () => {
      expect(manager.removeSubtitle('non-existent-id')).toBe(false);
    });

    it('revokes the blob URL when removing a subtitle', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);
      const [subtitle] = manager.getSubtitles();

      // Force a blob-like URL so we can verify revocation
      (subtitle as any).url = 'blob:mock-url-to-revoke';
      manager.removeSubtitle(subtitle.id);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-to-revoke');
    });
  });

  describe('clearSubtitles', () => {
    it('removes all subtitles and track elements', async () => {
      await manager.addSubtitleFiles([
        makeSubtitleFile('sub1.vtt'),
        makeSubtitleFile('sub2.vtt'),
      ]);

      manager.clearSubtitles();

      expect(manager.getSubtitles()).toHaveLength(0);
      expect(videoElement.querySelectorAll('track')).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('clears all subtitles and revokes blob URLs', async () => {
      await manager.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);

      manager.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(manager.getSubtitles()).toHaveLength(0);
    });
  });

  describe('works without a video element', () => {
    it('adds subtitles to internal list even without a video element', async () => {
      const managerNoEl = new UniversalSubtitleManager();
      await managerNoEl.addSubtitleFiles([makeSubtitleFile('sub.vtt')]);
      expect(managerNoEl.getSubtitles()).toHaveLength(1);
    });
  });
});
