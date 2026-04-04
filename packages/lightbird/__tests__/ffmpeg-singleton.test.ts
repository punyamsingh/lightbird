// Use a factory that creates a NEW mock instance each time new FFmpeg() is called,
// so that the singleton-reset test can detect a fresh instance.
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

jest.mock('@ffmpeg/util', () => ({
  toBlobURL: jest.fn().mockResolvedValue('blob:mock-url'),
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array()),
}));

import { getFFmpeg, resetFFmpeg } from '../src/utils/ffmpeg-singleton';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const MockFFmpeg = FFmpeg as jest.MockedClass<typeof FFmpeg>;

describe('ffmpeg-singleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFFmpeg();
  });

  it('returns an FFmpeg instance after loading', async () => {
    const ffmpeg = await getFFmpeg();
    expect(ffmpeg).toBeDefined();
    expect(ffmpeg.load).toHaveBeenCalledTimes(1);
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    const first = await getFFmpeg();
    const second = await getFFmpeg();
    expect(first).toBe(second);
    // load() should only be called once
    expect(first.load).toHaveBeenCalledTimes(1);
  });

  it('creates a new FFmpeg instance after resetFFmpeg()', async () => {
    await getFFmpeg();
    expect(MockFFmpeg).toHaveBeenCalledTimes(1);
    resetFFmpeg();
    await getFFmpeg();
    // Constructor should have been invoked a second time
    expect(MockFFmpeg).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls resolve to the same instance', async () => {
    const [a, b] = await Promise.all([getFFmpeg(), getFFmpeg()]);
    expect(a).toBe(b);
    expect(MockFFmpeg).toHaveBeenCalledTimes(1);
  });
});
