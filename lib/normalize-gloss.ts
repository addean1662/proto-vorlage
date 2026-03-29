/**
 * normalizeGloss — strip dictionary noise and enforce a 3-word max.
 *
 * Args:
 *   gloss  — raw English gloss from lexicon
 *   orig   — original-language word form (for particle lookup)
 *   lemma  — Strong's number e.g. "H430" / "G2316" (for lemma overrides)
 */

// Function-word overrides keyed by exact orig form (Hebrew/Greek/Latin).
// These short-circuit all other processing.
const PARTICLES: Record<string, string> = {
  // Hebrew
  'את':   'ʾet',  'אֶת':  'ʾet',  'אֵת':  'ʾet',
  'ו':    'and',  'וְ':   'and',  'וּ':   'and',
  'עַל':  'upon', 'עָל':  'upon', 'עַל־': 'upon',
  'כִּי': 'for',
  // Greek articles / particles
  'ὁ':   'the',     'ἡ':   'the',     'τό':   'the',  'τὸ':  'the',
  'τόν': 'the',     'τὸν': 'the',     'τήν':  'the',  'τὴν': 'the',
  'τοῦ': 'of the',  'τῆς': 'of the',  'τοῖς':'the',   'τῇ':  'the',
  'τῶν': 'of the',
  'καί': 'and',     'καὶ': 'and',
  'δέ':  'but',     'δὲ':  'but',
  'ἐν':  'in',      'ἐπ':  'upon',    'ἐπί': 'upon',  'ἐπάνω': 'above',
  // Latin
  'et':    'and',
  'autem': 'but',
  'in':    'in',
  'super': 'over',
  'de':    'of',
  'ad':    'to',
};

// Canonical glosses keyed by Strong's lemma number.
// Used when particle map misses; overrides mechanical stripping.
const LEMMA_OVERRIDES: Record<string, string> = {
  // Hebrew (OSHB)
  'H430':  'God',         // אלהים — Elohim
  'H853':  'ʾet',         // את    — direct object marker
  'H776':  'the earth',   // ארץ   — eretz
  'H7225': 'beginning',   // ראשית — reshit
  'H8064': 'the heavens', // שמים  — shamayim
  'H8415': 'the deep',    // תהום  — tehom
  'H1254': 'created',     // ברא   — bara
  'H7307': 'spirit',      // רוח   — ruach
  'H6440': 'face',        // פנים  — panim / paneh
  'H4325': 'waters',      // מים   — mayim
  'H1961': 'was',         // היה   — hayah (to be/exist)
  'H2822': 'darkness',    // חשך   — choshek
  'H8414': 'formless',    // תהו   — tohu
  'H922':  'empty',       // בהו   — bohu
  'H7363': 'hovering',    // רחף   — rachaph
  'H5921': 'upon',        // על    — al
  'H8432': 'midst',       // תוך   — tavek (middle/midst)
  // Greek (LXX STEPBible)
  'G3588': 'the',         // ὁ/ἡ/τό — definite article
  'G2316': 'God',         // θεός
  'G1093': 'earth',       // γῆ
  'G3772': 'heaven',      // οὐρανός
  'G4655': 'darkness',    // σκότος
  'G0012': 'abyss',       // ἄβυσσος
  'G4151': 'spirit',      // πνεῦμα
  'G5204': 'water',       // ὕδωρ
  'G4160': 'made',        // ποιέω — "to do/make" → "made"
  'G1510': 'was',         // εἰμί
  'G0746': 'beginning',   // ἀρχή
};

export function normalizeGloss(gloss: string, orig?: string, lemma?: string): string {
  if (!gloss || gloss === '[no gloss]') return gloss;

  // 1. Lemma override — most authoritative
  if (lemma && LEMMA_OVERRIDES[lemma]) return LEMMA_OVERRIDES[lemma];

  // 2. Particle map — exact orig match, then strip-points match for Hebrew
  if (orig) {
    const o = orig.trim();
    if (PARTICLES[o]) return PARTICLES[o];
    // Strip Hebrew vowel points and cantillation marks
    const bare = o.replace(/[\u0591-\u05C7]/g, '');
    if (PARTICLES[bare]) return PARTICLES[bare];
  }

  let g = gloss.trim();

  // 3. Strip "properly," / "literally," / "viz." prefixes
  g = g.replace(/^(properly|literally|viz\.?|i\.e\.?),?\s+/i, '');

  // 4. STEPBible LXX format: "the/this/who", "spirit/breath: spirit", "earth: planet"
  //    Take before ":" first (contextual qualifier), then before "/"
  const colonIdx = g.indexOf(':');
  if (colonIdx > 0) g = g.slice(0, colonIdx).trim();
  const slashIdx = g.indexOf('/');
  if (slashIdx > 0) g = g.slice(0, slashIdx).trim();

  // 5. Remove parenthetical notes  "(as aloft", "(at large, or partitively a land)", etc.
  g = g.replace(/\s*\([^)]*\)\.?/g, '').trim();
  // Also strip unclosed parens
  g = g.replace(/\s*\([^)]*$/, '').trim();

  // 6. Remove scholarly qualifiers
  g = g.replace(/\bin the ordinary sense\b/gi, '').trim();
  g = g.replace(/\bin [a-z]+ sense\b/gi, '').trim();

  // 7. Take first of semantic-range alternatives ("above, over, upon…" / "above; over; upon")
  g = g.split(/;\s*/)[0].trim();
  g = g.split(/,\s+(?=[a-z])/)[0].trim();   // comma only before lowercase (not "the earth, etc.")
  g = g.split(/\s+or\s+/i)[0].trim();

  // 8. Remove trailing ellipsis and stray punctuation
  g = g.replace(/[.…]{2,}$/, '').trim();
  g = g.replace(/[.;:,]+$/, '').trim();

  // 9. Remove trailing single-letter abbreviation  ("to exist, i" → "to exist")
  g = g.replace(/,?\s+[a-z]\.?$/i, '').trim();

  // If still over 20 chars, take first 1-3 words
  if (g.length > 20) {
    const ws = g.split(/\s+/).filter(Boolean);
    g = ws.slice(0, Math.min(3, ws.length)).join(' ');
  }

  // 10. Max 3 words
  const words = g.split(/\s+/).filter(Boolean);
  if (words.length > 3) g = words.slice(0, 3).join(' ');

  return g || gloss; // fallback to original if empty
}
