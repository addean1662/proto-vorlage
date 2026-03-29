#!/usr/bin/env node
/**
 * scripts/build-vulgate.mjs
 *
 * Builds data/vulgate/{Gen,Exod,Lev,Num,Deut}.json
 *
 * Gen/Exod/Lev/Num  — scraped from vulgate.net (interlinear HTML tables)
 * Deuteronomy       — GetBible API text + Morpheus lemmatization + L&S glosses
 *                     (common words reused from Gen-Num form→gloss map)
 *
 * Output format: {"chapter:verse": [{orig, lemma, eng}], ...}
 *   orig  = Latin word as it appears in the Vulgate
 *   lemma = dictionary headword (null if not found)
 *   eng   = English gloss (from vulgate.net or L&S, or "[no gloss]")
 *
 * Run once: node scripts/build-vulgate.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'vulgate');

// ── Verse counts (mirrors lib/torah.ts TORAH_VERSE_COUNTS) ───────────────────

const VERSE_COUNTS = {
  Genesis:     [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  Exodus:      [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  Leviticus:   [17,16,17,35,26,23,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  Numbers:     [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,28,32,22,29,35,41,30,25,18,65,23,31,40,17,54,42,56,29,34,13],
  Deuteronomy: [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,69,28,20,30,52,29,12],
};

// Books to scrape from vulgate.net (code = URL prefix)
const SCRAPE_BOOKS = [
  { book: 'Genesis',   code: 'gn',  basename: 'Gen'  },
  { book: 'Exodus',    code: 'ex',  basename: 'Exod' },
  { book: 'Leviticus', code: 'lv',  basename: 'Lev'  },
  { book: 'Numbers',   code: 'nm',  basename: 'Num'  },
];

// ── Lewis & Short index ───────────────────────────────────────────────────────

/**
 * Recursively find the first string in a (possibly nested) senses array.
 */
function firstSenseString(senses) {
  if (!Array.isArray(senses)) return null;
  for (const s of senses) {
    if (typeof s === 'string' && s.trim()) return s.trim();
    if (Array.isArray(s)) {
      const found = firstSenseString(s);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Extract a clean one-phrase English gloss from an L&S entry.
 * Returns null if no clean gloss can be extracted.
 */
function extractLSGloss(entry) {
  let raw = firstSenseString(entry.senses);

  // Fallback: some entries only have main_notes with "= synonym" or "i.q. ..."
  if (!raw && entry.main_notes) {
    const m = entry.main_notes.match(/^(?:=|i\.q\.)\s*([^,;.(]+)/);
    if (m) raw = m[1].trim();
  }

  if (!raw) return null;

  // Take text before the first comma or semicolon
  raw = raw.split(/[,;]/)[0].trim();

  // Strip leading "To " (infinitive verbs), "A ", "An ", "The ", "A kind of "
  raw = raw.replace(/^(To |A kind of |An? |The )/i, '');

  // Strip trailing or embedded parenthetical notes like "(post-class.)"
  raw = raw.replace(/\s*\([^)]+\)/g, '').trim();

  // Skip if it looks like a citation (e.g. "Cic.", "Hor. Od.")
  if (/^[A-Z][a-z]{0,5}\.\s/.test(raw)) return null;
  // Skip cross-references
  if (/^(v\.|cf\.|=|i\.q\.|syn\.|see )/.test(raw)) return null;
  // Skip if empty, numeric, or all-caps abbreviation
  if (!raw || /^\d/.test(raw) || /^[A-Z]{2,}\.?$/.test(raw)) return null;

  // Cap at 40 chars, breaking at a word boundary
  if (raw.length > 40) {
    raw = raw.slice(0, 40).replace(/\s+\S+$/, '').trim();
  }

  return raw || null;
}

function buildLSIndex() {
  console.log('Building Lewis & Short lemma index...');
  const index = new Map(); // lowercase key → gloss string

  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const file = path.join(DATA_DIR, `ls_${letter}.json`);
    if (!fs.existsSync(file)) { console.warn(`  Missing: ls_${letter}.json`); continue; }

    let entries;
    try {
      entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.warn(`  Parse error ls_${letter}.json: ${e.message}`);
      continue;
    }

    for (const entry of entries) {
      if (!entry.key) continue;
      const gloss = extractLSGloss(entry);
      if (gloss) index.set(entry.key.toLowerCase(), gloss);
    }
  }

  console.log(`  L&S index: ${index.size} entries with glosses`);
  return index;
}

/**
 * Look up a Latin lemma in the L&S index.
 * Tries: exact key, key+"1", key+"2" (L&S disambiguation suffixes).
 */
function lookupLS(lsIndex, lemma) {
  if (!lemma) return null;
  const key = lemma.toLowerCase();
  return lsIndex.get(key) ?? lsIndex.get(key + '1') ?? lsIndex.get(key + '2') ?? null;
}

// ── Morpheus Perseus API ──────────────────────────────────────────────────────

const morpheusCache = new Map(); // lowercase form → lemma string | null

async function morpheusLemma(form) {
  const key = form.toLowerCase();
  if (morpheusCache.has(key)) return morpheusCache.get(key);

  const url =
    `https://services.perseids.org/bsp/morphologyservice/analysis/word` +
    `?lang=lat&engine=morpheuslat&word=${encodeURIComponent(form)}&xml=yes`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) { morpheusCache.set(key, null); return null; }
    const data = await res.json();

    // Body can be an object or array of analysis entries
    const rawBody = data?.RDF?.Annotation?.Body;
    const bodies = Array.isArray(rawBody) ? rawBody : rawBody ? [rawBody] : [];

    for (const b of bodies) {
      const hdwd = b?.rest?.entry?.dict?.hdwd;
      if (!hdwd) continue;
      // hdwd may be a plain string or {$: "lemma"} from xml→json conversion
      const lemma = typeof hdwd === 'string' ? hdwd
                  : hdwd?.['$'] ?? hdwd?.['_'] ?? null;
      if (lemma && typeof lemma === 'string' && lemma.trim()) {
        const result = lemma.trim();
        morpheusCache.set(key, result);
        return result;
      }
    }

    morpheusCache.set(key, null);
    return null;
  } catch {
    morpheusCache.set(key, null);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Tokenize a Latin verse string into word tokens.
 * Strips punctuation, numbers, and empty tokens.
 */
function tokenizeLatin(text) {
  return text
    .split(/[\s\u00A0\-–—]+/)
    .map(t => t.replace(/[.,;:!?()\[\]{}"'«»\d]/g, '').trim())
    .filter(t => t.length > 0);
}

// ── vulgate.net scraper ───────────────────────────────────────────────────────

/**
 * Parse vulgate.net interlinear HTML.
 * Extracts <td><b>Latin</b></td><td>English gloss</td> pairs.
 */
function parseVulgateNetHTML(html) {
  const words = [];
  // The interlinear table: each word row has <td><b>orig</b></td><td>gloss</td>
  // Allow optional attributes on <td> and <b> tags
  const rowRe = /<td[^>]*>\s*<b[^>]*>([^<]+)<\/b>\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const orig = m[1].trim();
    const eng  = m[2].trim();

    // Skip empty, verse-number-only, or excessively long entries
    if (!orig || /^\d+$/.test(orig) || orig.length > 60) continue;
    // Skip all-caps abbreviations (grammar labels like "V.", "N.", "ADJ.")
    if (/^[A-Z]{1,4}\.?$/.test(orig)) continue;

    words.push({
      orig,
      lemma: null,
      eng: eng || '[no gloss]',
    });
  }
  return words;
}

async function fetchVulgateDotNet(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'proto-vorlage-build/1.0 (biblical research, one-time build)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.text();
}

async function scrapeBook(bookName, code, verseCounts) {
  const bookData = {};
  let totalWords = 0;
  let failedVerses = 0;

  for (let ch = 1; ch <= verseCounts.length; ch++) {
    const chapterVerses = verseCounts[ch - 1];
    for (let v = 1; v <= chapterVerses; v++) {
      const key = `${ch}:${v}`;
      const url = `https://vulgate.net/${code}${ch}-${v}`;

      let words = null;
      let retries = 3;

      while (retries > 0) {
        try {
          const html = await fetchVulgateDotNet(url);
          words = parseVulgateNetHTML(html);
          break;
        } catch (err) {
          if (err.status === 404) {
            // vulgate.net may not have this verse (e.g. Numbers 36:13 missing)
            console.warn(`    404: ${url}`);
            words = [];
            break;
          }
          retries--;
          if (retries > 0) {
            console.warn(`    Retry (${retries} left) ${url}: ${err.message}`);
            await delay(3000);
          } else {
            console.error(`    Failed ${url}: ${err.message}`);
            words = [];
            failedVerses++;
          }
        }
      }

      if (words && words.length > 0) {
        bookData[key] = words;
        totalWords += words.length;
      }

      await delay(200); // polite rate limit
    }

    // Progress report per chapter
    process.stdout.write(
      `\r  ${bookName} ${ch}/${verseCounts.length} chapters  ` +
      `(${Object.keys(bookData).length} verses, ${totalWords} words)    `
    );
  }

  process.stdout.write('\n');
  if (failedVerses > 0) console.warn(`  ${failedVerses} verse(s) failed after retries`);
  return bookData;
}

// ── Form→gloss map (built from Gen-Num scraped data) ─────────────────────────

/**
 * Build a lowercase-form → {lemma, eng} map from already-scraped books.
 * Used to avoid Morpheus API calls for Deuteronomy words already seen in Gen-Num.
 */
function buildFormGlossMap(scrapedBooks) {
  const map = new Map();
  for (const { bookData } of scrapedBooks) {
    for (const words of Object.values(bookData)) {
      for (const w of words) {
        const k = w.orig.toLowerCase();
        if (!map.has(k) && w.eng !== '[no gloss]') {
          map.set(k, { lemma: w.lemma, eng: w.eng });
        }
      }
    }
  }
  return map;
}

// ── GetBible + Morpheus + L&S fallback pipeline ───────────────────────────────

/**
 * Build or fill-in verse entries for `bookName` using GetBible + Morpheus + L&S.
 * If `existingData` is provided, only missing keys (verses not in existingData) are fetched.
 * Returns the merged result (existing + newly fetched).
 */
async function buildViaFallback(bookName, lsIndex, formGlossMap, existingData = {}) {
  const verseCounts = VERSE_COUNTS[bookName];
  const bookData = { ...existingData };

  // Count how many verses need filling
  let needed = 0;
  for (let ch = 1; ch <= verseCounts.length; ch++) {
    for (let v = 1; v <= verseCounts[ch - 1]; v++) {
      if (!bookData[`${ch}:${v}`]) needed++;
    }
  }
  if (needed === 0) {
    console.log(`  ${bookName}: all verses already present — no fallback needed`);
    return bookData;
  }
  console.log(`  ${bookName}: filling ${needed} missing verses via GetBible + Morpheus + L&S`);

  let formMapHits = 0;
  let morpheusHits = 0;
  let noGlossCount = 0;
  let totalWords = Object.values(existingData).reduce((n, ws) => n + ws.length, 0);

  for (let ch = 1; ch <= verseCounts.length; ch++) {
    const chapterVerses = verseCounts[ch - 1];
    for (let v = 1; v <= chapterVerses; v++) {
      const key = `${ch}:${v}`;
      if (bookData[key]) continue; // already have this verse

      const verseRef = `${bookName} ${ch}:${v}`;

      let text = '';
      try {
        const url = `https://query.getbible.net/v2/vulgate/${encodeURIComponent(verseRef)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const bk = Object.values(data)[0];
        text = bk?.verses?.[0]?.text ?? '';
      } catch (err) {
        console.warn(`  GetBible error ${verseRef}: ${err.message}`);
      }

      const tokens = tokenizeLatin(text);
      const wordEntries = [];

      for (const token of tokens) {
        const lk = token.toLowerCase();

        if (formGlossMap.has(lk)) {
          const cached = formGlossMap.get(lk);
          wordEntries.push({ orig: token, lemma: cached.lemma, eng: cached.eng });
          formMapHits++;
          totalWords++;
          continue;
        }

        const lemma = await morpheusLemma(token);
        await delay(250);

        const eng = lookupLS(lsIndex, lemma) ?? '[no gloss]';
        if (eng === '[no gloss]') noGlossCount++;
        else morpheusHits++;

        const entry = { orig: token, lemma: lemma ?? null, eng };
        wordEntries.push(entry);
        totalWords++;

        if (lemma && eng !== '[no gloss]') {
          formGlossMap.set(lk, { lemma, eng });
        }
      }

      if (wordEntries.length > 0) bookData[key] = wordEntries;
    }

    process.stdout.write(
      `\r  ${bookName} ${ch}/${verseCounts.length} chapters  ` +
      `(${Object.keys(bookData).length} verses, ${totalWords} words, ` +
      `formMap: ${formMapHits}, morpheus: ${morpheusHits}, no-gloss: ${noGlossCount})    `
    );
  }

  process.stdout.write('\n');
  return bookData;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== build-vulgate.mjs ===\n');

  // 1. Build Lewis & Short index
  const lsIndex = buildLSIndex();

  // 2. Scrape Gen/Exod/Lev/Num from vulgate.net
  const scrapedBooks = [];

  for (const { book, code, basename } of SCRAPE_BOOKS) {
    const outFile = path.join(DATA_DIR, `${basename}.json`);

    if (fs.existsSync(outFile)) {
      console.log(`\n${book}: already built — loading for form map`);
      const existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      const wordCount = Object.values(existing).reduce((n, ws) => n + ws.length, 0);
      console.log(`  Loaded ${Object.keys(existing).length} verses, ${wordCount} words`);
      scrapedBooks.push({ book, bookData: existing });
      continue;
    }

    console.log(`\nScraping ${book} (vulgate.net code: ${code})...`);
    const bookData = await scrapeBook(book, code, VERSE_COUNTS[book]);

    // Save (minified — these are build artifacts)
    fs.writeFileSync(outFile, JSON.stringify(bookData));
    const wordCount = Object.values(bookData).reduce((n, ws) => n + ws.length, 0);
    console.log(`  Saved: ${Object.keys(bookData).length} verses, ${wordCount} words → ${outFile}`);
    scrapedBooks.push({ book, bookData });
  }

  // 3. Build form→gloss map from Gen-Num (reduces Morpheus API calls)
  console.log('\nBuilding form→gloss map from Gen-Num...');
  const formGlossMap = buildFormGlossMap(scrapedBooks);
  console.log(`  ${formGlossMap.size} unique Latin forms with glosses`);

  // 4. Fill in any books with incomplete vulgate.net coverage (e.g. Numbers ch8+)
  for (const { book, basename } of SCRAPE_BOOKS) {
    const outFile = path.join(DATA_DIR, `${basename}.json`);
    const existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const expectedVerses = VERSE_COUNTS[book].reduce((a, b) => a + b, 0);
    const actualVerses = Object.keys(existing).length;

    if (actualVerses < expectedVerses) {
      console.log(`\n${book}: ${actualVerses}/${expectedVerses} verses — filling gaps via GetBible + Morpheus + L&S...`);
      const filled = await buildViaFallback(book, lsIndex, formGlossMap, existing);
      fs.writeFileSync(outFile, JSON.stringify(filled));
      const wordCount = Object.values(filled).reduce((n, ws) => n + ws.length, 0);
      console.log(`  Updated: ${Object.keys(filled).length} verses, ${wordCount} words → ${outFile}`);
      // Refresh scraped book entry in form map
      const idx = scrapedBooks.findIndex(b => b.book === book);
      if (idx >= 0) scrapedBooks[idx].bookData = filled;
    }
  }

  // Rebuild form map now that Numbers may be complete
  const formGlossMapFull = buildFormGlossMap(scrapedBooks);

  // 5. Build Deuteronomy
  const deutFile = path.join(DATA_DIR, 'Deut.json');
  if (fs.existsSync(deutFile)) {
    const deutExisting = JSON.parse(fs.readFileSync(deutFile, 'utf8'));
    const expectedDeut = VERSE_COUNTS.Deuteronomy.reduce((a, b) => a + b, 0);
    if (Object.keys(deutExisting).length >= expectedDeut) {
      console.log('\nDeuteronomy: already built — skipping');
    } else {
      console.log('\nDeuteronomy: incomplete — filling gaps...');
      const filled = await buildViaFallback('Deuteronomy', lsIndex, formGlossMapFull, deutExisting);
      fs.writeFileSync(deutFile, JSON.stringify(filled));
      const wordCount = Object.values(filled).reduce((n, ws) => n + ws.length, 0);
      console.log(`  Updated: ${Object.keys(filled).length} verses, ${wordCount} words → ${deutFile}`);
    }
  } else {
    const deutData = await buildViaFallback('Deuteronomy', lsIndex, formGlossMapFull);
    fs.writeFileSync(deutFile, JSON.stringify(deutData));
    const wordCount = Object.values(deutData).reduce((n, ws) => n + ws.length, 0);
    console.log(`  Saved: ${Object.keys(deutData).length} verses, ${wordCount} words → ${deutFile}`);
  }

  // 5. Summary
  console.log('\n=== Summary ===');
  for (const { basename } of [...SCRAPE_BOOKS.map(b => ({ basename: b.basename })), { basename: 'Deut' }]) {
    const f = path.join(DATA_DIR, `${basename}.json`);
    if (!fs.existsSync(f)) { console.log(`  ${basename}.json — MISSING`); continue; }
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const verses = Object.keys(data).length;
    const words = Object.values(data).reduce((n, ws) => n + ws.length, 0);
    const noGloss = Object.values(data).flat().filter(w => w.eng === '[no gloss]').length;
    const pct = ((1 - noGloss / words) * 100).toFixed(1);
    console.log(`  ${basename}.json: ${verses} verses, ${words} words, ${pct}% gloss coverage`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
