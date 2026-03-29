const TORAH_BOOKS: Record<string, string> = {
  // Full English names
  genesis: 'Genesis',
  exodus: 'Exodus',
  leviticus: 'Leviticus',
  numbers: 'Numbers',
  deuteronomy: 'Deuteronomy',

  // Abbreviations
  gen: 'Genesis',
  exod: 'Exodus',
  exo: 'Exodus',
  ex: 'Exodus',
  lev: 'Leviticus',
  num: 'Numbers',
  deut: 'Deuteronomy',
  deu: 'Deuteronomy',
  dt: 'Deuteronomy',

  // Hebrew names
  bereishit: 'Genesis',
  bereshit: 'Genesis',
  shemot: 'Exodus',
  vayikra: 'Leviticus',
  bamidbar: 'Numbers',
  devarim: 'Deuteronomy',
};

/**
 * Extracts just the book name portion from a reference like "Genesis 1:1"
 */
function extractBookName(ref: string): string {
  return ref.trim().split(/\s+\d/)[0].trim();
}

/**
 * Case-insensitive check if a reference refers to a Torah book.
 */
export function isTorahBook(ref: string): boolean {
  const bookPart = extractBookName(ref).toLowerCase();
  return bookPart in TORAH_BOOKS;
}

/**
 * Normalize a reference: lowercase, trimmed, spaces → underscores.
 */
export function normalizeRef(ref: string): string {
  return ref.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Convert any known form of a Torah book name + reference to canonical form.
 * e.g. "Gen 1:1" → "Genesis 1:1"
 *      "Bereishit 1:1" → "Genesis 1:1"
 *      "gen1:1" → "Genesis 1:1"  (no space before chapter)
 */
export function canonicalizeRef(ref: string): string {
  const trimmed = ref.trim();

  // Try to match: (book name)(optional space)(chapter:verse)
  const match = trimmed.match(/^([A-Za-z\u0080-\uFFFF]+(?:\s+[A-Za-z\u0080-\uFFFF]+)*)\s*(\d+:\d+)$/);
  if (!match) return trimmed;

  const bookRaw = match[1].trim();
  const chapterVerse = match[2];

  const canonical = TORAH_BOOKS[bookRaw.toLowerCase()];
  if (!canonical) return trimmed;

  return `${canonical} ${chapterVerse}`;
}

/**
 * Parse a canonical reference like "Genesis 1:1" into parts.
 */
export function parseRef(ref: string): { book: string; chapter: number; verse: number } {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) throw new Error(`Cannot parse reference: ${ref}`);
  return {
    book: match[1],
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10),
  };
}

/**
 * Verse counts per chapter for each Torah book (Masoretic).
 * Index 0 = chapter 1, index 1 = chapter 2, etc.
 */
const TORAH_VERSE_COUNTS: Record<string, number[]> = {
  Genesis: [
    31,25,24,26,32,22,24,22,29,32,
    32,20,18,24,21,16,27,33,38,18,
    34,24,20,67,34,35,46,22,35,43,
    55,32,20,31,29,43,36,30,23,23,
    57,38,34,34,28,34,31,22,33,26,
  ],
  Exodus: [
    22,25,22,31,23,30,25,32,35,29,
    10,51,22,31,27,36,16,27,25,26,
    36,31,33,18,40,37,21,43,46,38,
    18,35,23,35,35,38,29,31,43,38,
  ],
  Leviticus: [
    17,16,17,35,26,23,38,36,24,20,
    47,8,59,57,33,34,16,30,37,27,
    24,33,44,23,55,46,34,
  ],
  Numbers: [
    54,34,51,49,31,27,89,26,23,36,
    35,16,33,45,41,50,28,32,22,29,
    35,41,30,25,18,65,23,31,40,17,
    54,42,56,29,34,13,
  ],
  Deuteronomy: [
    46,37,29,49,33,25,26,20,29,22,
    32,32,18,29,23,22,20,22,21,20,
    23,30,25,22,19,19,26,69,28,20,
    30,52,29,12,
  ],
};

const TORAH_BOOK_ORDER = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];

/**
 * Returns the adjacent verse reference, or null if at the boundary of the Torah.
 */
export function getAdjacentRef(ref: string, direction: 'prev' | 'next'): string | null {
  const { book, chapter, verse } = parseRef(ref);
  const counts = TORAH_VERSE_COUNTS[book];
  if (!counts) return null;

  if (direction === 'next') {
    const versesInChapter = counts[chapter - 1];
    if (verse < versesInChapter) return `${book} ${chapter}:${verse + 1}`;
    // Next chapter
    if (chapter < counts.length) return `${book} ${chapter + 1}:1`;
    // Next book
    const bookIdx = TORAH_BOOK_ORDER.indexOf(book);
    if (bookIdx < TORAH_BOOK_ORDER.length - 1) return `${TORAH_BOOK_ORDER[bookIdx + 1]} 1:1`;
    return null; // End of Torah
  } else {
    if (verse > 1) return `${book} ${chapter}:${verse - 1}`;
    // Previous chapter
    if (chapter > 1) {
      const prevChapterVerses = counts[chapter - 2];
      return `${book} ${chapter - 1}:${prevChapterVerses}`;
    }
    // Previous book
    const bookIdx = TORAH_BOOK_ORDER.indexOf(book);
    if (bookIdx > 0) {
      const prevBook = TORAH_BOOK_ORDER[bookIdx - 1];
      const prevCounts = TORAH_VERSE_COUNTS[prevBook];
      return `${prevBook} ${prevCounts.length}:${prevCounts[prevCounts.length - 1]}`;
    }
    return null; // Start of Torah
  }
}
