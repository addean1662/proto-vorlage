/**
 * Aggregate Dead Sea Scrolls fragment coverage across all five Torah books.
 * Reads the pre-built data/dss/*.json files server-side.
 */

import fs from 'fs';
import path from 'path';
import { DSS_FRAG_DATES } from './dss-dates';

const BOOKS = [
  { key: 'Gen',  label: 'Genesis',      basename: 'Gen'  },
  { key: 'Exod', label: 'Exodus',       basename: 'Exod' },
  { key: 'Lev',  label: 'Leviticus',    basename: 'Lev'  },
  { key: 'Num',  label: 'Numbers',      basename: 'Num'  },
  { key: 'Deut', label: 'Deuteronomy',  basename: 'Deut' },
] as const;

type BookKey = typeof BOOKS[number]['key'];

export interface FragmentInfo {
  siglum: string;
  date: string;
  source: string;
  paleo: boolean;
  coverage: Record<BookKey, number>;
  total: number;
}

type DSSWord = {
  manuscripts?: string[];
  frag?: string | null;
  status: string;
  paleo?: boolean;
};

type VerseMap = Record<string, DSSWord[]>;

function loadBook(basename: string): VerseMap | null {
  const filePath = path.join(process.cwd(), 'data', 'dss', `${basename}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as VerseMap;
}

/** Parse the earliest year from a date string like "c. 250–200 BCE" or "c. 50 BCE–1 CE" */
function parseEarliestYear(date: string): number {
  // Normalise: remove "c. " prefix
  const s = date.replace('c. ', '').trim();
  // Take the first number
  const m = s.match(/(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return s.includes('BCE') ? -n : n;
}

export function buildFragmentIndex(): FragmentInfo[] {
  // fragment siglum → { bookKey → Set of verse keys attested }
  const coverageMap: Record<string, Partial<Record<BookKey, Set<string>>>> = {};
  const paleoMap: Record<string, boolean> = {};

  for (const book of BOOKS) {
    const data = loadBook(book.basename);
    if (!data) continue;

    for (const [verseKey, words] of Object.entries(data)) {
      // Collect unique sigla that cover this verse (status !== 'lost')
      const siglaForVerse = new Set<string>();
      for (const word of words) {
        if (word.status === 'lost') continue;
        // Primary fragment
        if (word.frag) siglaForVerse.add(word.frag);
        // All manuscripts listed
        if (word.manuscripts) {
          for (const ms of word.manuscripts) siglaForVerse.add(ms);
        }
        if (word.paleo && word.frag) paleoMap[word.frag] = true;
      }

      for (const siglum of siglaForVerse) {
        if (!coverageMap[siglum]) coverageMap[siglum] = {};
        if (!coverageMap[siglum][book.key]) coverageMap[siglum][book.key] = new Set();
        coverageMap[siglum][book.key]!.add(verseKey);
      }
    }
  }

  const fragments: FragmentInfo[] = [];

  for (const [siglum, bookCoverage] of Object.entries(coverageMap)) {
    const info = DSS_FRAG_DATES[siglum];
    const coverage = {} as Record<BookKey, number>;
    let total = 0;
    for (const book of BOOKS) {
      const count = bookCoverage[book.key]?.size ?? 0;
      coverage[book.key] = count;
      total += count;
    }
    fragments.push({
      siglum,
      date: info?.date ?? 'date unknown',
      source: info?.source ?? '',
      paleo: paleoMap[siglum] ?? false,
      coverage,
      total,
    });
  }

  // Sort chronologically by earliest year
  fragments.sort((a, b) => parseEarliestYear(a.date) - parseEarliestYear(b.date));

  return fragments;
}
