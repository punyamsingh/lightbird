import { SubtitleConverter } from '../src/subtitles/subtitle-converter';

describe('SubtitleConverter', () => {
  describe('convertSrtToVtt', () => {
    it('produces VTT output starting with WEBVTT header', async () => {
      const srt = '1\n00:00:01,000 --> 00:00:02,000\nHello World\n\n';
      const vtt = await SubtitleConverter.convertSrtToVtt(srt);
      expect(vtt).toMatch(/^WEBVTT/);
    });

    it('converts SRT comma timestamps to VTT dot timestamps', async () => {
      const srt = '1\n00:00:20,000 --> 00:00:24,400\nTest subtitle\n\n';
      const vtt = await SubtitleConverter.convertSrtToVtt(srt);
      expect(vtt).toContain('00:00:20.000 --> 00:00:24.400');
      expect(vtt).not.toContain('00:00:20,000');
    });

    it('preserves multi-line subtitle text', async () => {
      const srt = '1\n00:00:01,000 --> 00:00:02,000\nLine one\nLine two\n\n';
      const vtt = await SubtitleConverter.convertSrtToVtt(srt);
      expect(vtt).toContain('Line one');
      expect(vtt).toContain('Line two');
    });

    it('returns just the WEBVTT header for empty string input', async () => {
      const vtt = await SubtitleConverter.convertSrtToVtt('');
      expect(vtt.trim()).toBe('WEBVTT');
    });

    it('does not throw for malformed SRT missing timestamps', async () => {
      const malformed = 'This is not\na valid SRT file\n\nwith blocks';
      await expect(SubtitleConverter.convertSrtToVtt(malformed)).resolves.toBeDefined();
    });

    it('handles multiple subtitle blocks', async () => {
      const srt = [
        '1\n00:00:01,000 --> 00:00:02,000\nFirst',
        '2\n00:00:03,000 --> 00:00:04,000\nSecond',
        '3\n00:00:05,000 --> 00:00:06,000\nThird',
      ].join('\n\n');
      const vtt = await SubtitleConverter.convertSrtToVtt(srt);
      expect(vtt).toContain('First');
      expect(vtt).toContain('Second');
      expect(vtt).toContain('Third');
    });
  });

  describe('convertFileToVtt', () => {
    it('returns a VTT file unchanged when input is already VTT', async () => {
      const file = new File(['WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello'], 'sub.vtt', {
        type: 'text/vtt',
      });
      const result = await SubtitleConverter.convertFileToVtt(file);
      expect(result).toBe(file);
    });

    it('converts an SRT file and returns a VTT file', async () => {
      const srtContent = '1\n00:00:01,000 --> 00:00:02,000\nHello\n\n';
      const file = new File([srtContent], 'subtitle.srt', { type: 'text/plain' });
      const result = await SubtitleConverter.convertFileToVtt(file);
      expect(result.name).toBe('subtitle.vtt');
      expect(result.type).toBe('text/vtt');
    });
  });
});
