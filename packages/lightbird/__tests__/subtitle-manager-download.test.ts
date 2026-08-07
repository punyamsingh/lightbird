import { UniversalSubtitleManager } from '../src/subtitles/subtitle-manager';

const SAMPLE_SRT = ['1', '00:00:01,000 --> 00:00:02,000', 'Hello', ''].join('\n');
const SAMPLE_VTT = ['WEBVTT', '', '00:00:01.000 --> 00:00:02.000', 'Hello', ''].join('\n');

describe('UniversalSubtitleManager.addSubtitleFromText', () => {
  let videoElement: HTMLVideoElement;
  let manager: UniversalSubtitleManager;

  beforeEach(() => {
    jest.useFakeTimers();
    videoElement = document.createElement('video');
    document.body.appendChild(videoElement);
    manager = new UniversalSubtitleManager(videoElement);
  });

  afterEach(() => {
    document.body.removeChild(videoElement);
    jest.useRealTimers();
  });

  it('adds a downloaded SRT and attaches a track element', async () => {
    const subtitle = await manager.addSubtitleFromText(
      SAMPLE_SRT,
      'Movie.2019.en.srt',
      'en',
      'srt'
    );

    expect(subtitle.type).toBe('external');
    expect(subtitle.format).toBe('srt');
    expect(subtitle.lang).toBe('en');
    expect(videoElement.querySelectorAll('track')).toHaveLength(1);
  });

  it('labels the subtitle with its language and filename', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.en.srt', 'en', 'srt');
    expect(subtitle.name).toBe('EN (Movie.en.srt)');
  });

  it('falls back to a generic label when the language is unknown', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'unknown', 'srt');
    expect(subtitle.name).toBe('SUB (Movie.srt)');
    expect(subtitle.lang).toBe('unknown');
  });

  it('converts SRT to VTT so cues are parseable', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');
    const cues = manager.getCues(subtitle.id);

    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ startTime: 1, endTime: 2, text: 'Hello' });
  });

  it('accepts VTT content without re-converting it', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_VTT, 'Movie.vtt', 'en', 'vtt');
    expect(manager.getCues(subtitle.id)).toHaveLength(1);
  });

  it('does not attach a track element for ASS, which the canvas renderer handles', async () => {
    await manager.addSubtitleFromText('[Script Info]\n', 'Movie.ass', 'en', 'ass');
    expect(videoElement.querySelectorAll('track')).toHaveLength(0);
  });

  it('assigns ids that do not collide with file-added subtitles', async () => {
    const file = new File([SAMPLE_VTT], 'local.vtt', { type: 'text/vtt' });
    const [fromFile] = await manager.addSubtitleFiles([file]);
    const fromText = await manager.addSubtitleFromText(SAMPLE_SRT, 'downloaded.srt', 'fr', 'srt');

    expect(fromText.id).not.toBe(fromFile.id);
    expect(manager.getSubtitles()).toHaveLength(2);
  });

  it('supports a sync offset on a downloaded subtitle', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');
    const originalUrl = subtitle.url;

    await manager.setOffset(subtitle.id, 5);

    // A new blob URL means the shifted VTT was regenerated and re-attached.
    expect(manager.getSubtitles()[0].url).not.toBe(originalUrl);
  });

  it('can be removed like any other external subtitle', async () => {
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');

    expect(manager.removeSubtitle(subtitle.id)).toBe(true);
    expect(manager.getSubtitles()).toHaveLength(0);
    expect(videoElement.querySelectorAll('track')).toHaveLength(0);
  });

  it('works without a video element attached', async () => {
    const detached = new UniversalSubtitleManager();
    const subtitle = await detached.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');

    expect(detached.getSubtitles()).toHaveLength(1);
    expect(subtitle.url).toBeDefined();
  });
});
