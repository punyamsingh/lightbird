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

  it('keeps an activated subtitle enabled once the registration timer fires', async () => {
    // Regression: registration disables the track 100ms later so it does not
    // show by default. addSubtitleFromText activates immediately, and an
    // unconditional timer would switch off the subtitle the user just applied.
    const subtitle = await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');
    manager.switchSubtitle(subtitle.id);

    jest.advanceTimersByTime(200);

    const track = videoElement.querySelector('track') as HTMLTrackElement;
    expect(track.track.mode).not.toBe('disabled');
  });

  it('still disables a subtitle that was never activated', async () => {
    await manager.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');

    jest.advanceTimersByTime(200);

    const track = videoElement.querySelector('track') as HTMLTrackElement;
    expect(track.track.mode).toBe('disabled');
  });

  it('disables a subtitle again once a different one is selected', async () => {
    const first = await manager.addSubtitleFromText(SAMPLE_SRT, 'A.srt', 'en', 'srt');
    manager.switchSubtitle(first.id);
    const second = await manager.addSubtitleFromText(SAMPLE_SRT, 'B.srt', 'fr', 'srt');
    manager.switchSubtitle(second.id);

    jest.advanceTimersByTime(200);

    const tracks = videoElement.querySelectorAll('track');
    expect((tracks[0] as HTMLTrackElement).track.mode).toBe('disabled');
    expect((tracks[1] as HTMLTrackElement).track.mode).not.toBe('disabled');
  });

  it('works without a video element attached', async () => {
    const detached = new UniversalSubtitleManager();
    const subtitle = await detached.addSubtitleFromText(SAMPLE_SRT, 'Movie.srt', 'en', 'srt');

    expect(detached.getSubtitles()).toHaveLength(1);
    expect(subtitle.url).toBeDefined();
  });
});

/**
 * The delayed disable in registerSubtitle() skips the track matching activeId.
 * That is only correct while activeId still refers to a live selection, so the
 * paths that drop every record have to clear it.
 */
describe('UniversalSubtitleManager activeId invalidation', () => {
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

  it('clears the selection when the active subtitle is removed', async () => {
    const active = await manager.addSubtitleFromText(SAMPLE_SRT, 'A.srt', 'en', 'srt');
    manager.switchSubtitle(active.id);
    manager.removeSubtitle(active.id);

    // The freed id is not reused by nextId, but the guard must not match it
    // either way — a cleared selection means every new track gets disabled.
    const replacement = await manager.addSubtitleFromText(SAMPLE_SRT, 'B.srt', 'fr', 'srt');
    jest.advanceTimersByTime(200);

    const track = videoElement.querySelector(
      `track[data-id="${replacement.id}"]`
    ) as HTMLTrackElement;
    expect(track.track.mode).toBe('disabled');
  });

  it('clears the selection when subtitles are imported over the top', async () => {
    const active = await manager.addSubtitleFromText(SAMPLE_SRT, 'A.srt', 'en', 'srt');
    manager.switchSubtitle(active.id);

    // Importing replaces every record and rebases nextId, so a stale activeId
    // can collide with an id handed out afterwards.
    manager.importSubtitles([
      { id: '0', name: 'Imported', lang: 'en', type: 'external', format: 'vtt' },
    ]);

    const registered = await manager.addSubtitleFromText(SAMPLE_VTT, 'C.vtt', 'en', 'vtt');
    jest.advanceTimersByTime(200);

    const track = videoElement.querySelector(
      `track[data-id="${registered.id}"]`
    ) as HTMLTrackElement;
    expect(track.track.mode).toBe('disabled');
  });
});

describe('UniversalSubtitleManager.addSubtitleFiles format detection', () => {
  let manager: UniversalSubtitleManager;

  beforeEach(() => {
    manager = new UniversalSubtitleManager(document.createElement('video'));
  });

  /** Builds a File the manager can read, matching the drop path. */
  function subtitleFile(name: string, content = SAMPLE_SRT): File {
    return new File([content], name, { type: 'text/plain' });
  }

  it.each(['srt', 'vtt', 'ass', 'ssa'])('keeps the recognised .%s extension', async (ext) => {
    const [subtitle] = await manager.addSubtitleFiles([subtitleFile(`Movie.${ext}`)]);
    expect(subtitle.format).toBe(ext);
  });

  it('falls back to vtt for an unrecognised extension', async () => {
    // Previously the extension was cast rather than checked, so "txt" was
    // stored as the format — outside the Subtitle union, and treated as timed
    // text, so the raw file was attached as VTT with no conversion.
    const [subtitle] = await manager.addSubtitleFiles([subtitleFile('Movie.txt', SAMPLE_VTT)]);
    expect(subtitle.format).toBe('vtt');
  });

  it('falls back to vtt for a file with no extension at all', async () => {
    const [subtitle] = await manager.addSubtitleFiles([subtitleFile('subtitles', SAMPLE_VTT)]);
    expect(subtitle.format).toBe('vtt');
  });

  it('is case-insensitive about the extension', async () => {
    const [subtitle] = await manager.addSubtitleFiles([subtitleFile('Movie.SRT')]);
    expect(subtitle.format).toBe('srt');
  });
});
