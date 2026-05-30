/**
 * ISO 639 language-code → human-readable name resolution.
 *
 * Matroska/FFmpeg tag streams with ISO 639 codes (usually the 3-letter
 * ISO 639-2 form, e.g. `eng`, `jpn`, `fre`). VLC resolves these to full
 * language names ("English", "Japanese", "French") in its track menus rather
 * than showing the raw code. This utility mirrors that behaviour.
 *
 * The map covers ISO 639-1 (2-letter) and both the bibliographic (639-2/B,
 * e.g. `fre`, `ger`) and terminological (639-2/T, e.g. `fra`, `deu`) 3-letter
 * forms for the common languages found in media files. Unknown-but-present
 * codes fall back to the raw code, exactly like VLC.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  // English
  en: 'English', eng: 'English',
  // Japanese
  ja: 'Japanese', jpn: 'Japanese',
  // Chinese
  zh: 'Chinese', chi: 'Chinese', zho: 'Chinese',
  // Korean
  ko: 'Korean', kor: 'Korean',
  // French
  fr: 'French', fre: 'French', fra: 'French',
  // German
  de: 'German', ger: 'German', deu: 'German',
  // Spanish
  es: 'Spanish', spa: 'Spanish',
  // Italian
  it: 'Italian', ita: 'Italian',
  // Portuguese
  pt: 'Portuguese', por: 'Portuguese',
  // Russian
  ru: 'Russian', rus: 'Russian',
  // Dutch
  nl: 'Dutch', dut: 'Dutch', nld: 'Dutch',
  // Polish
  pl: 'Polish', pol: 'Polish',
  // Arabic
  ar: 'Arabic', ara: 'Arabic',
  // Hindi
  hi: 'Hindi', hin: 'Hindi',
  // Bengali
  bn: 'Bengali', ben: 'Bengali',
  // Turkish
  tr: 'Turkish', tur: 'Turkish',
  // Swedish
  sv: 'Swedish', swe: 'Swedish',
  // Norwegian
  no: 'Norwegian', nor: 'Norwegian',
  // Danish
  da: 'Danish', dan: 'Danish',
  // Finnish
  fi: 'Finnish', fin: 'Finnish',
  // Greek
  el: 'Greek', gre: 'Greek', ell: 'Greek',
  // Hebrew
  he: 'Hebrew', heb: 'Hebrew',
  // Thai
  th: 'Thai', tha: 'Thai',
  // Vietnamese
  vi: 'Vietnamese', vie: 'Vietnamese',
  // Indonesian
  id: 'Indonesian', ind: 'Indonesian',
  // Malay
  ms: 'Malay', may: 'Malay', msa: 'Malay',
  // Czech
  cs: 'Czech', cze: 'Czech', ces: 'Czech',
  // Hungarian
  hu: 'Hungarian', hun: 'Hungarian',
  // Romanian
  ro: 'Romanian', rum: 'Romanian', ron: 'Romanian',
  // Ukrainian
  uk: 'Ukrainian', ukr: 'Ukrainian',
  // Tamil
  ta: 'Tamil', tam: 'Tamil',
  // Telugu
  te: 'Telugu', tel: 'Telugu',
};

/** Codes FFmpeg/Matroska use to mean "no specific language". */
const UNDETERMINED = new Set(['', 'und', 'unknown', 'mis', 'zxx', 'mul']);

/**
 * Resolve an ISO 639 language code to its English language name, mirroring how
 * VLC labels tracks.
 *
 * @returns The full language name, or the original code if it's unrecognised
 *          (VLC behaviour), or `undefined` if the code is absent/undetermined.
 */
export function getLanguageName(code?: string | null): string | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toLowerCase();
  if (UNDETERMINED.has(normalized)) return undefined;
  return LANGUAGE_NAMES[normalized] ?? code.trim();
}
