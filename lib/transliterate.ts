/**
 * Hebrew and Greek transliteration utilities.
 * Hebrew: SBL academic transliteration (consonants + common vowel patterns)
 * Greek: standard Latin-alphabet romanization
 */

// ── Hebrew SBL transliteration ────────────────────────────────────────────────

const HEB_CONSONANTS: Record<string, string> = {
  'א': 'ʾ', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'w', 'ז': 'z',
  'ח': 'ḥ', 'ט': 'ṭ', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
  'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'ʿ', 'פ': 'p', 'ף': 'p',
  'צ': 'ṣ', 'ץ': 'ṣ', 'ק': 'q', 'ר': 'r', 'שׁ': 'š', 'שׂ': 'ś', 'ש': 'š',
  'ת': 't',
};

const HEB_VOWELS: Record<string, string> = {
  '\u05B0': 'ə',  // sheva
  '\u05B1': 'ĕ',  // hataf segol
  '\u05B2': 'ă',  // hataf patah
  '\u05B3': 'ŏ',  // hataf qamets
  '\u05B4': 'i',  // hiriq
  '\u05B5': 'ē',  // tsere
  '\u05B6': 'e',  // segol
  '\u05B7': 'a',  // patah
  '\u05B8': 'ā',  // qamets
  '\u05B9': 'ō',  // holam
  '\u05BA': 'ō',  // holam waw
  '\u05BB': 'û',  // qibbuts
  '\u05BC': '',   // dagesh (skip)
  '\u05BD': '',   // meteg (skip)
  '\u05BF': '',   // rafe (skip)
};

export function transliterateHebrew(word: string): string {
  let result = '';
  const chars = [...word]; // handles multi-code-point chars
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    // Skip cantillation / non-content marks
    if (ch >= '\u0591' && ch <= '\u05AF') { i++; continue; }
    if (ch >= '\u05C0' && ch <= '\u05C7') { i++; continue; }
    // Shin dot: שׁ → š, שׂ → ś
    if (ch === '\u05E9') { // shin
      const next = chars[i + 1];
      if (next === '\u05C1') { result += 'š'; i += 2; continue; }
      if (next === '\u05C2') { result += 'ś'; i += 2; continue; }
      result += 'š'; i++; continue;
    }
    // Vowels
    if (HEB_VOWELS[ch] !== undefined) { result += HEB_VOWELS[ch]; i++; continue; }
    // Consonants
    if (HEB_CONSONANTS[ch]) { result += HEB_CONSONANTS[ch]; i++; continue; }
    // Maqaf / other punctuation — skip
    if (ch === '\u05BE' || ch === '/' || ch === '\u05C3') { i++; continue; }
    // Unknown — pass through
    result += ch; i++;
  }
  return result || word;
}

// ── Greek romanization ────────────────────────────────────────────────────────

const GRK_MAP: Record<string, string> = {
  'α': 'a',  'β': 'b',  'γ': 'g',  'δ': 'd',  'ε': 'e',  'ζ': 'z',
  'η': 'ē',  'θ': 'th', 'ι': 'i',  'κ': 'k',  'λ': 'l',  'μ': 'm',
  'ν': 'n',  'ξ': 'x',  'ο': 'o',  'π': 'p',  'ρ': 'r',  'σ': 's',
  'ς': 's',  'τ': 't',  'υ': 'y',  'φ': 'ph', 'χ': 'ch', 'ψ': 'ps',
  'ω': 'ō',
};

export function transliterateGreek(word: string): string {
  // Normalize: NFD to separate base letter from diacritics, then lowercase
  const nfd = word.normalize('NFD').toLowerCase();
  let result = '';
  let i = 0;
  while (i < nfd.length) {
    const cp = nfd.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    // Skip diacritics (combining marks: U+0300–U+036F)
    if (cp >= 0x0300 && cp <= 0x036F) { i += ch.length; continue; }
    // Breathing marks (U+1F00 range handled by NFD decomposition)
    if (cp >= 0x0300 && cp <= 0x0345) { i += ch.length; continue; }
    const mapped = GRK_MAP[ch];
    if (mapped) { result += mapped; }
    else { result += ch; }
    i += ch.length;
  }
  return result || word;
}
