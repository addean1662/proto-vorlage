import fs from 'node:fs';
import path from 'node:path';
import { parseRef } from './torah';

export interface SamaritanWord { orig: string; eng: string; }
export interface SamaritanVerse { words: SamaritanWord[]; note?: string; }

const BOOKS: Record<string, string> = {
  Genesis: 'Gen', Exodus: 'Exod', Leviticus: 'Lev', Numbers: 'Num', Deuteronomy: 'Deut',
};
const books: Record<string, Record<string, SamaritanWord[]>> = {};

/** Source order and source glosses, independently of the MT token list. */
export function getSamaritanVerse(ref: string): SamaritanVerse {
  const { book, chapter, verse } = parseRef(ref);
  const basename = BOOKS[book];
  if (!basename) throw new Error(`Unknown Torah book: ${book}`);
  books[book] ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'samaritan', `${basename}.json`), 'utf8'));
  const words = books[book][`${chapter}:${verse}`];
  if (words) return { words };
  // These are absent reference keys in the source, not missing manuscripts or blank Hebrew.
  if (book === 'Exodus' && chapter === 30 && verse >= 1 && verse <= 10) {
    return { words: [], note: 'This passage occurs in the Samaritan source at Exodus 26:35. No separate Samaritan entry is numbered Exodus 30:1–10.' };
  }
  if (book === 'Deuteronomy' && chapter === 34 && (verse === 2 || verse === 3)) {
    return { words: [], note: 'The Samaritan description of the land is included at Deuteronomy 34:1. This source has no separately numbered 34:2–3.' };
  }
  throw new Error(`No Samaritan source entry for ${ref}`);
}
