import { shiftTimestamp, applyOffsetToVtt } from '../src/subtitles/subtitle-offset';

describe('shiftTimestamp', () => {
  it('shifts a timestamp forward by a positive delta', () => {
    expect(shiftTimestamp('00:00:10.000', 5)).toBe('00:00:15.000');
  });

  it('shifts a timestamp backward by a negative delta', () => {
    expect(shiftTimestamp('00:01:00.000', -10)).toBe('00:00:50.000');
  });

  it('clamps the result to 00:00:00.000 when delta would make it negative', () => {
    expect(shiftTimestamp('00:00:05.000', -20)).toBe('00:00:00.000');
  });

  it('handles milliseconds correctly', () => {
    expect(shiftTimestamp('00:00:10.500', 2.5)).toBe('00:00:13.000');
  });

  it('handles crossing the hour boundary', () => {
    expect(shiftTimestamp('00:59:55.000', 10)).toBe('01:00:05.000');
  });

  it('returns a string with two-digit hours, minutes, and 6-char seconds', () => {
    const result = shiftTimestamp('01:02:03.456', 0);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});

describe('applyOffsetToVtt', () => {
  const sampleVtt = [
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:03.000',
    'Hello',
    '',
    '00:00:05.000 --> 00:00:08.000',
    'World',
    '',
  ].join('\n');

  it('returns the original text unchanged when offset is 0', () => {
    expect(applyOffsetToVtt(sampleVtt, 0)).toBe(sampleVtt);
  });

  it('shifts all cue timestamps by the given offset', () => {
    const result = applyOffsetToVtt(sampleVtt, 2);
    expect(result).toContain('00:00:03.000 --> 00:00:05.000');
    expect(result).toContain('00:00:07.000 --> 00:00:10.000');
  });

  it('shifts timestamps backward with a negative offset', () => {
    const result = applyOffsetToVtt(sampleVtt, -1);
    expect(result).toContain('00:00:00.000 --> 00:00:02.000');
    expect(result).toContain('00:00:04.000 --> 00:00:07.000');
  });

  it('preserves the WEBVTT header and cue text', () => {
    const result = applyOffsetToVtt(sampleVtt, 1);
    expect(result).toMatch(/^WEBVTT/);
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });
});
