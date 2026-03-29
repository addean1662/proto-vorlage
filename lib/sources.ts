import { parseRef } from './torah';
import { getMTText, getLXXText, getVulgateText } from './lexicon';

/**
 * Fetch the Masoretic Text for a canonical reference like "Genesis 1:1".
 * Uses pre-built OSHB data (Westminster Leningrad Codex) — no network call needed.
 * Falls back to Sefaria API if OSHB data is unavailable.
 */
export async function fetchMasoretText(ref: string): Promise<string> {
  // Try OSHB local data first
  const oshbText = getMTText(ref);
  if (oshbText) return oshbText;

  // Fallback: Sefaria API
  const { book, chapter, verse } = parseRef(ref);
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book)}.${chapter}.${verse}?version=hebrew|Miqra+according+to+the+Masorah`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sefaria API error ${res.status} for ${ref}`);
  }
  const data = await res.json();

  const versions = data?.versions;
  if (!versions || versions.length === 0) {
    throw new Error(`No Masoretic Text found for ${ref}`);
  }

  const text = versions[0]?.text;
  if (typeof text === 'string') return text;

  if (Array.isArray(text)) {
    const flat = text.flat(Infinity).find((t: unknown) => typeof t === 'string' && (t as string).length > 0);
    if (flat) return flat as string;
  }

  throw new Error(`Unexpected Sefaria text format for ${ref}`);
}

/**
 * Fetch a verse from GetBible API.
 * translation: e.g. 'lxx' or 'vulgate'
 */
async function fetchGetBible(translation: string, book: string, chapter: number, verse: number): Promise<string> {
  const verseRef = `${book} ${chapter}:${verse}`;
  const url = `https://query.getbible.net/v2/${translation}/${encodeURIComponent(verseRef)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GetBible API error ${res.status} for ${translation} ${verseRef}`);
  }
  const data = await res.json();

  // Top-level key is lowercased book name; value has .verses array
  const bookData = Object.values(data)[0] as { verses: Array<{ text: string }> } | undefined;
  if (!bookData || !Array.isArray(bookData.verses) || bookData.verses.length === 0) {
    throw new Error(`No verses in GetBible response for ${translation} ${verseRef}`);
  }

  return bookData.verses[0].text;
}

/**
 * Fetch the Septuagint (LXX) for a canonical reference.
 * Uses pre-built eliranwong/Rahlfs-1935 data — no network call needed.
 * Falls back to GetBible API if local data is unavailable.
 */
export async function fetchSeptuagint(ref: string): Promise<string> {
  const lxxText = getLXXText(ref);
  if (lxxText) return lxxText;

  // Fallback: GetBible API
  const { book, chapter, verse } = parseRef(ref);
  return fetchGetBible('lxx', book, chapter, verse);
}

/**
 * Fetch the Vulgate for a canonical reference.
 * Uses pre-built vulgate.net / L&S data — no network call needed.
 * Falls back to GetBible API if local data is unavailable.
 */
export async function fetchVulgate(ref: string): Promise<string> {
  const vulText = getVulgateText(ref);
  if (vulText) return vulText;

  // Fallback: GetBible API
  const { book, chapter, verse } = parseRef(ref);
  return fetchGetBible('vulgate', book, chapter, verse);
}
