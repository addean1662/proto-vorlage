/**
 * Build LXX lexical lookup JSON files for each Torah book.
 *
 * Reads:
 *   data/lxx/versification.csv   (verse ref → start word index, from eliranwong/LXX-Rahlfs-1935)
 *   data/lxx/words.csv           (word index → Unicode Greek form)
 *   data/lxx/strongs.csv         (word index → Extended Strong's number)
 *   data/lxx/tbesg.txt           (Extended Strong's → English gloss, STEPBible CC BY)
 *
 * Writes:
 *   data/lxx/{Gen,Exod,Lev,Num,Deut}.json
 *
 * Output format per book JSON:
 *   { "1:1": [ {orig, strongs, eng}, ... ], "1:2": [...], ... }
 *
 * Where:
 *   orig    = accented Unicode Greek word form
 *   strongs = Extended Strong's number e.g. "G1722"
 *   eng     = one-word English gloss from TBESG, or "[no gloss]"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'lxx');

// Torah books: versification prefix → output filename + canonical name
const TORAH_BOOKS = [
  { prefix: 'Gen',  file: 'Gen.json',  name: 'Genesis' },
  { prefix: 'Exod', file: 'Exod.json', name: 'Exodus' },
  { prefix: 'Lev',  file: 'Lev.json',  name: 'Leviticus' },
  { prefix: 'Num',  file: 'Num.json',  name: 'Numbers' },
  { prefix: 'Deut', file: 'Deut.json', name: 'Deuteronomy' },
];
const TORAH_PREFIXES = new Set(TORAH_BOOKS.map(b => b.prefix));

// ── 1. Parse TBESG: Strong's number → one-word English gloss ─────────────────
console.log('Parsing TBESG lexicon…');
const tbesgGloss = new Map(); // G1722 → "in/by"

for (const line of fs.readFileSync(path.join(DATA, 'tbesg.txt'), 'utf8').split('\n')) {
  // Data lines start with G followed by digits
  if (!/^G\d/.test(line)) continue;
  const cols = line.split('\t');
  if (cols.length < 7) continue;

  // Col 0: Extended Strong's (may have letter suffix: G0001G, G0001H)
  // Strip trailing letter suffix to get base number
  const baseKey = cols[0].replace(/[A-Z]+$/, '');

  // Col 6: one-word gloss
  const gloss = cols[6]?.trim();
  if (!gloss || gloss === '') continue;

  // First entry for this base key wins
  if (!tbesgGloss.has(baseKey)) {
    tbesgGloss.set(baseKey, gloss);
  }
}
console.log(`  Loaded ${tbesgGloss.size} Strong's glosses`);

// ── 2. Parse versification: verse ref → start word index (1-based) ───────────
console.log('Parsing versification…');
// Only load Torah verses. Map: "Gen.1.1" → startIdx (1-based)
const verseStart = new Map(); // "Gen.1.1" → 1

const versLines = fs.readFileSync(path.join(DATA, 'versification.csv'), 'utf8').split('\n');
for (const line of versLines) {
  const tab = line.indexOf('\t');
  if (tab === -1) continue;
  const ref = line.slice(0, tab).trim();     // e.g. "Gen.1.1"
  const idx = parseInt(line.slice(tab + 1)); // e.g. 1
  if (!isNaN(idx)) {
    const book = ref.split('.')[0];
    if (TORAH_PREFIXES.has(book)) {
      verseStart.set(ref, idx);
    } else {
      // First non-Torah entry after Torah — record as sentinel for last Torah verse end
      verseStart.set(ref, idx);
    }
  }
}

// Build sorted verse list with end indices
// For each verse: end = next verse's start - 1
const allVersesSorted = versLines
  .filter(l => l.includes('\t'))
  .map(l => {
    const [ref, idxStr] = l.split('\t');
    return { ref: ref.trim(), start: parseInt(idxStr) };
  })
  .filter(v => !isNaN(v.start));

// Build a map: ref → {start, end}
const verseRange = new Map();
for (let i = 0; i < allVersesSorted.length; i++) {
  const { ref, start } = allVersesSorted[i];
  const nextStart = i + 1 < allVersesSorted.length ? allVersesSorted[i + 1].start : start + 999;
  const end = nextStart - 1;
  verseRange.set(ref, { start, end });
}
console.log(`  Loaded ${verseRange.size} verse ranges`);

// ── 3. Parse word list (lazy — load only needed range) ───────────────────────
// Determine min and max word indices needed for Torah
let minIdx = Infinity, maxIdx = 0;
for (const [ref, range] of verseRange) {
  const book = ref.split('.')[0];
  if (!TORAH_PREFIXES.has(book)) continue;
  if (range.start < minIdx) minIdx = range.start;
  if (range.end > maxIdx) maxIdx = range.end;
}
console.log(`Loading word data for indices ${minIdx}–${maxIdx}…`);

// words.csv: "1\t1\tἐν" — col index 2 is the Greek form
// strongs.csv: "1\tG1722" — col index 1 is Strong's
// Both are 1-indexed by line number.
// We only need lines minIdx through maxIdx.

const words = new Array(maxIdx + 1); // 1-indexed
const strongs = new Array(maxIdx + 1);

let lineNum = 0;
let wordsLoaded = 0;
for (const line of fs.readFileSync(path.join(DATA, 'words.csv'), 'utf8').split('\n')) {
  lineNum++;
  if (lineNum < minIdx) continue;
  if (lineNum > maxIdx) break;
  const cols = line.split('\t');
  // col 2 = unicode form (3-column format: idx, idx, form)
  if (cols.length >= 3) {
    words[lineNum] = cols[2]?.trim() ?? '';
    wordsLoaded++;
  } else if (cols.length === 2) {
    // fallback: 2-column format: idx, form
    words[lineNum] = cols[1]?.trim() ?? '';
    wordsLoaded++;
  }
}
console.log(`  Loaded ${wordsLoaded} word forms`);

lineNum = 0;
let strongsLoaded = 0;
for (const line of fs.readFileSync(path.join(DATA, 'strongs.csv'), 'utf8').split('\n')) {
  lineNum++;
  if (lineNum < minIdx) continue;
  if (lineNum > maxIdx) break;
  const cols = line.split('\t');
  if (cols.length >= 2) {
    strongs[lineNum] = cols[1]?.trim() ?? '';
    strongsLoaded++;
  }
}
console.log(`  Loaded ${strongsLoaded} Strong's entries`);

// ── 3b. Strong's number normalizer ───────────────────────────────────────────
// eliranwong uses short form ("G746"), TBESG uses 4-digit zero-padded ("G0746").
// Pad the numeric part to 4 digits so both systems match.
function normalizeStrongs(s) {
  if (!s || !s.startsWith('G')) return s;
  const num = s.slice(1);
  return 'G' + num.padStart(4, '0');
}

// ── 4. Build per-book output ──────────────────────────────────────────────────
let totalVerses = 0, totalWords = 0, noGloss = 0;

for (const { prefix, file, name } of TORAH_BOOKS) {
  console.log(`\nBuilding ${name}…`);
  const lookup = {}; // "1:1" → [{orig, strongs, eng}]

  for (const [ref, { start, end }] of verseRange) {
    const book = ref.split('.')[0];
    if (book !== prefix) continue;

    const parts = ref.split('.');
    const chVerse = `${parts[1]}:${parts[2]}`; // "1:1"

    const rowWords = [];
    for (let i = start; i <= end; i++) {
      const orig = words[i] ?? '';
      const strongsRaw = strongs[i] ?? '';
      const strongsNum = normalizeStrongs(strongsRaw);
      const eng = strongsNum ? (tbesgGloss.get(strongsNum) ?? '[no gloss]') : '[no gloss]';
      if (eng === '[no gloss]') noGloss++;
      totalWords++;
      rowWords.push({ orig, strongs: strongsNum || strongsRaw || null, eng });
    }

    if (rowWords.length > 0) {
      lookup[chVerse] = rowWords;
      totalVerses++;
    }
  }

  const outPath = path.join(DATA, file);
  fs.writeFileSync(outPath, JSON.stringify(lookup));
  const size = fs.statSync(outPath).size;
  console.log(`  Written ${file} (${(size / 1024).toFixed(0)} KB, ${Object.keys(lookup).length} verses)`);
}

console.log(`\nDone. ${totalVerses} verses, ${totalWords} words, ${noGloss} [no gloss] (${((noGloss/totalWords)*100).toFixed(1)}%)`);
