import { UniversalSubtitleManager, parseVttCues } from '@/lib/subtitle-manager';

// Mock SubtitleConverter
jest.mock('@/lib/subtitle-converter', () => ({
  SubtitleConverter: {
    convertSrtToVtt: jest.fn(async (text: string) => {
      return 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n' + text.split('\n').slice(2).join('\n');
    }),
  },
}));

// Mock chardet so tests don't need native Buffer
jest.mock('chardet', () => ({
  detect: jest.fn(() => 'UTF-8'),
}));

// Mock subtitle-offset so we control the output
jest.mock('@/lib/subtitle-offset', () => ({
  applyOffsetToVtt: jest.fn((text: string, offset: number) => {
    if (offset === 0) return text;
    return text.replace('00:00:01.000 --> 00:00:02.000', '00:00:02.000 --> 00:00:03.000');
  }),
  createOffsetVttUrl: jest.fn(),
}));

const VTT_CONTENT = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello World\n';

function makeFile(name: string, content = VTT_CONTENT, type = 'text/vtt'): File {
  return new File([content], name, { type });
}

describe('parseVttCues', () => {
  it('parses cues from a VTT string', () => {
    const cues = parseVttCues(VTT_CONTENT);
    expect(cues).toHaveLength(1);
    expect(cues[0].startTime).toBeCloseTo(1);
    expect(cues[0].endTime).toBeCloseTo(2);
    expect(cues[0].text).toBe('Hello World');
  });

  it('returns an empty array for a VTT with only a header', () => {
    expect(parseVttCues('WEBVTT\n\n')).toHaveLength(0);
  });

  it('strips inline VTT tags from cue text', () => {
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<b>Bold</b> text\n';
    const cues = parseVttCues(vtt);
    expect(cues[0].text).toBe('Bold text');
  });

  it('parses multiple cues', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:01.000 --> 00:00:02.000',
      'First',
      '',
      '00:00:03.000 --> 00:00:04.000',
      'Second',
      '',
    ].join('\n');
    expect(parseVttCues(vtt)).toHaveLength(2);
  });
});

describe('UniversalSubtitleManager — encoding & cues', () => {
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

  it('parses VTT cues when adding a VTT file', async () => {
    await manager.addSubtitleFiles([makeFile('sub.vtt')]);
    const [sub] = manager.getSubtitles();
    const cues = manager.getCues(sub.id);
    expect(cues.length).toBeGreaterThan(0);
    expect(cues[0].text).toBe('Hello World');
  });

  it('sets format field to "vtt" for .vtt files', async () => {
    await manager.addSubtitleFiles([makeFile('sub.vtt')]);
    expect(manager.getSubtitles()[0].format).toBe('vtt');
  });

  it('sets format field to "srt" for .srt files', async () => {
    const srtFile = makeFile('sub.srt', '1\n00:00:01,000 --> 00:00:02,000\nHello\n', 'text/plain');
    await manager.addSubtitleFiles([srtFile]);
    expect(manager.getSubtitles()[0].format).toBe('srt');
  });

  it('sets format field to "ass" for .ass files and stores a blob URL', async () => {
    const assContent = '[Script Info]\nScriptType: v4.00+\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello ASS\n';
    const assFile = makeFile('sub.ass', assContent, 'text/plain');
    await manager.addSubtitleFiles([assFile]);
    const [sub] = manager.getSubtitles();
    expect(sub.format).toBe('ass');
    // ASS subtitles get a blob URL for raw text, but no track element
    expect(videoElement.querySelectorAll('track')).toHaveLength(0);
  });

  it('returns empty cue list for ASS subtitles', async () => {
    const assContent = '[Script Info]\n\n[Events]\nDialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello\n';
    const assFile = makeFile('sub.ass', assContent, 'text/plain');
    await manager.addSubtitleFiles([assFile]);
    const [sub] = manager.getSubtitles();
    expect(manager.getCues(sub.id)).toHaveLength(0);
  });
});

describe('UniversalSubtitleManager — setOffset', () => {
  let manager: UniversalSubtitleManager;
  let videoElement: HTMLVideoElement;

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

  it('updates the blob URL after applying an offset', async () => {
    await manager.addSubtitleFiles([makeFile('sub.vtt')]);
    const [sub] = manager.getSubtitles();
    const originalUrl = sub.url;

    await manager.setOffset(sub.id, 1);

    const updated = manager.getSubtitles()[0];
    expect(updated.url).not.toBe(originalUrl);
    expect(updated.url).toMatch(/^blob:/);
  });

  it('does nothing when setOffset is called for a non-existent id', async () => {
    await expect(manager.setOffset('non-existent', 2)).resolves.toBeUndefined();
  });

  it('does nothing when setOffset is called for an ASS subtitle', async () => {
    const assFile = makeFile('sub.ass', '[Script Info]\n\n[Events]\n', 'text/plain');
    await manager.addSubtitleFiles([assFile]);
    const [sub] = manager.getSubtitles();
    const originalUrl = sub.url;

    await manager.setOffset(sub.id, 5);

    // URL unchanged because ASS has no rawVtt
    expect(manager.getSubtitles()[0].url).toBe(originalUrl);
  });

  it('is a no-op when new offset equals current offset', async () => {
    await manager.addSubtitleFiles([makeFile('sub.vtt')]);
    const [sub] = manager.getSubtitles();

    await manager.setOffset(sub.id, 1);
    const urlAfterFirst = manager.getSubtitles()[0].url;

    await manager.setOffset(sub.id, 1); // same offset
    expect(manager.getSubtitles()[0].url).toBe(urlAfterFirst);
  });
});
