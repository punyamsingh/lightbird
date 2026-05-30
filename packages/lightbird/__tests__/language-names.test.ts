import { getLanguageName } from '../src/utils/language-names';

describe('getLanguageName', () => {
  it('maps ISO 639-2 (3-letter) codes to full names', () => {
    expect(getLanguageName('eng')).toBe('English');
    expect(getLanguageName('jpn')).toBe('Japanese');
    expect(getLanguageName('spa')).toBe('Spanish');
  });

  it('maps ISO 639-1 (2-letter) codes to full names', () => {
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('ja')).toBe('Japanese');
  });

  it('resolves both bibliographic and terminological 639-2 variants', () => {
    // French: fre (B) / fra (T)
    expect(getLanguageName('fre')).toBe('French');
    expect(getLanguageName('fra')).toBe('French');
    // German: ger (B) / deu (T)
    expect(getLanguageName('ger')).toBe('German');
    expect(getLanguageName('deu')).toBe('German');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getLanguageName('ENG')).toBe('English');
    expect(getLanguageName('  jpn  ')).toBe('Japanese');
  });

  it('returns undefined for absent or undetermined codes', () => {
    expect(getLanguageName(undefined)).toBeUndefined();
    expect(getLanguageName(null)).toBeUndefined();
    expect(getLanguageName('')).toBeUndefined();
    expect(getLanguageName('und')).toBeUndefined();
    expect(getLanguageName('unknown')).toBeUndefined();
  });

  it('falls back to the raw code for unrecognised languages (VLC behaviour)', () => {
    expect(getLanguageName('xyz')).toBe('xyz');
    expect(getLanguageName('  qqq ')).toBe('qqq');
  });
});
