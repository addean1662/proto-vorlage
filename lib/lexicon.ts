/**
 * Lexical lookups for Torah source texts.
 *
 * MT (Masoretic Text):
 *   Data: Open Scriptures Hebrew Bible (morphhb) + Strong's Hebrew Dictionary
 *   Files: data/oshb/{Gen,Exod,Lev,Num,Deut}.json
 *   Format: "chapter:verse" → [{orig, lemma, eng}]
 *
 * LXX (Septuagint, Rahlfs 1935):
 *   Data: eliranwong/LXX-Rahlfs-1935 + STEPBible TBESG
 *   Files: data/lxx/{Gen,Exod,Lev,Num,Deut}.json
 *   Format: "chapter:verse" → [{orig, strongs, eng}]
 *
 * Vulgate (Clementine):
 *   Data: vulgate.net interlinear (Gen-Num) + Morpheus/L&S (Deut)
 *   Files: data/vulgate/{Gen,Exod,Lev,Num,Deut}.json
 *   Format: "chapter:verse" → [{orig, lemma, eng}]
 */

import fs from 'fs';
import path from 'path';

// ── Shared types ─────────────────────────────────────────────────────────────

export interface OSHBWord {
  orig: string;          // pointed Hebrew
  lemma: string | null;  // Strong's number e.g. "H7225"
  eng: string;           // English gloss or "[no gloss]"
  xlit?: string;         // transliteration
  def?: string;          // full definition
}

export interface LXXWord {
  orig: string;            // accented Unicode Greek
  strongs: string | null;  // Extended Strong's number e.g. "G0746"
  eng: string;             // English gloss or "[no gloss]"
  xlit?: string;           // transliteration
  def?: string;            // full definition
}

export interface VulgateWord {
  orig: string;          // Latin word as it appears in the Vulgate
  lemma: string | null;  // dictionary headword
  eng: string;           // English gloss or "[no gloss]"
  xlit?: string;         // transliteration
  def?: string;          // full definition
}

type VerseMap<T> = Record<string, T[]>;

// ── Shared helpers ────────────────────────────────────────────────────────────

const BOOK_BASENAME: Record<string, string> = {
  Genesis: 'Gen',
  Exodus: 'Exod',
  Leviticus: 'Lev',
  Numbers: 'Num',
  Deuteronomy: 'Deut',
};

/**
 * Parse a canonical ref like "Genesis 1:1" → { book, key }
 * where key is "chapter:verse" (e.g. "1:1")
 */
function parseRef(ref: string): { book: string; key: string } {
  const m = ref.match(/^(\w+(?:\s+\w+)?)\s+(\d+:\d+)$/);
  if (!m) throw new Error(`Cannot parse ref: ${ref}`);
  return { book: m[1], key: m[2] };
}

function loadJSON<T>(dataDir: string, basename: string): VerseMap<T> {
  const filePath = path.join(process.cwd(), dataDir, `${basename}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as VerseMap<T>;
}

// ── MT (OSHB) ─────────────────────────────────────────────────────────────────

const mtCache: Record<string, VerseMap<OSHBWord>> = {};

function loadMTBook(book: string): VerseMap<OSHBWord> {
  if (mtCache[book]) return mtCache[book];
  const basename = BOOK_BASENAME[book];
  if (!basename) throw new Error(`Unknown Torah book: ${book}`);
  mtCache[book] = loadJSON<OSHBWord>('data/oshb', basename);
  return mtCache[book];
}

/** Get OSHB words for a verse. Returns null if not found. */
export function getMTWords(ref: string): OSHBWord[] | null {
  try {
    const { book, key } = parseRef(ref);
    return loadMTBook(book)[key] ?? null;
  } catch {
    return null;
  }
}

/** Get MT Hebrew text as a space-joined string. Returns null if not found. */
export function getMTText(ref: string): string | null {
  const words = getMTWords(ref);
  return words ? words.map(w => w.orig).join(' ') : null;
}

// ── LXX (eliranwong / STEPBible TBESG) ───────────────────────────────────────

const lxxCache: Record<string, VerseMap<LXXWord>> = {};

function loadLXXBook(book: string): VerseMap<LXXWord> {
  if (lxxCache[book]) return lxxCache[book];
  const basename = BOOK_BASENAME[book];
  if (!basename) throw new Error(`Unknown Torah book: ${book}`);
  lxxCache[book] = loadJSON<LXXWord>('data/lxx', basename);
  return lxxCache[book];
}

/** Get LXX words for a verse. Returns null if not found. */
export function getLXXWords(ref: string): LXXWord[] | null {
  try {
    const { book, key } = parseRef(ref);
    return loadLXXBook(book)[key] ?? null;
  } catch {
    return null;
  }
}

/** Get LXX Greek text as a space-joined string. Returns null if not found. */
export function getLXXText(ref: string): string | null {
  const words = getLXXWords(ref);
  return words ? words.map(w => w.orig).join(' ') : null;
}

// ── Vulgate (vulgate.net / Morpheus + L&S) ────────────────────────────────────

const vulCache: Record<string, VerseMap<VulgateWord>> = {};

function loadVulBook(book: string): VerseMap<VulgateWord> {
  if (vulCache[book]) return vulCache[book];
  const basename = BOOK_BASENAME[book];
  if (!basename) throw new Error(`Unknown Torah book: ${book}`);
  vulCache[book] = loadJSON<VulgateWord>('data/vulgate', basename);
  return vulCache[book];
}

/** Get Vulgate words for a verse. Returns null if not found. */
export function getVulgateWords(ref: string): VulgateWord[] | null {
  try {
    const { book, key } = parseRef(ref);
    return loadVulBook(book)[key] ?? null;
  } catch {
    return null;
  }
}

/** Get Vulgate Latin text as a space-joined string. Returns null if not found. */
export function getVulgateText(ref: string): string | null {
  const words = getVulgateWords(ref);
  return words ? words.map(w => w.orig).join(' ') : null;
}

// ── DSS (pre-built from coverage + OSHB) ──────────────────────────────────────

export interface DSSWord {
  orig: string;
  eng: string;
  manuscripts?: string[];
  frag?: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo?: boolean;
}

const dssCache: Record<string, VerseMap<DSSWord>> = {};

function loadDSSBook(book: string): VerseMap<DSSWord> | null {
  if (dssCache[book]) return dssCache[book];
  const basename = BOOK_BASENAME[book];
  if (!basename) return null;
  const filePath = path.join(process.cwd(), 'data', 'dss', `${basename}.json`);
  if (!fs.existsSync(filePath)) return null;
  dssCache[book] = loadJSON<DSSWord>('data/dss', basename);
  return dssCache[book];
}

export function getDSSWords(ref: string): DSSWord[] | null {
  try {
    const { book, key } = parseRef(ref);
    return loadDSSBook(book)?.[key] ?? null;
  } catch {
    return null;
  }
}
