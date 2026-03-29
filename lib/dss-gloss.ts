/**
 * Match DSS (unpointed) Hebrew words against the OSHB lexical index.
 * DSS text lacks nikud (vowel points), so we strip nikud from OSHB words
 * to build an unpointed index and fuzzy-match incoming DSS words.
 */

import fs from 'fs';
import path from 'path';

const BOOK_BASENAME: Record<string, string> = {
  Genesis: 'Gen', Exodus: 'Exod', Leviticus: 'Lev', Numbers: 'Num', Deuteronomy: 'Deut',
};

/** Strip Hebrew vowel points and cantillation marks (U+0591–U+05C7) */
export function stripNikud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

type UnpointedIndex = Map<string, { eng: string; lemma: string | null }>;
const indexCache: Record<string, UnpointedIndex> = {};

function buildIndex(book: string): UnpointedIndex {
  if (indexCache[book]) return indexCache[book];
  const basename = BOOK_BASENAME[book];
  if (!basename) return new Map();
  const filePath = path.join(process.cwd(), 'data', 'oshb', `${basename}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const index: UnpointedIndex = new Map();
  for (const words of Object.values(data) as Array<Array<{ orig: string; eng: string; lemma: string | null }>>) {
    for (const w of words) {
      const bare = stripNikud(w.orig);
      if (!index.has(bare)) index.set(bare, { eng: w.eng, lemma: w.lemma });
    }
  }
  indexCache[book] = index;
  return index;
}

/**
 * Given an unpointed DSS word and book name, return the matching OSHB gloss.
 * Returns null if no match found.
 */
export function matchDSSWord(orig: string, book: string): { eng: string; lemma: string | null } | null {
  if (!orig || orig === '—' || orig === '-') return null;
  const index = buildIndex(book);
  const bare = stripNikud(orig);
  return index.get(bare) ?? null;
}
