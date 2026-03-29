/**
 * Build OSHB lexical lookup JSON files for each Torah book.
 *
 * Reads:
 *   scripts/strongs-hebrew-dictionary.js  (JS variable format)
 *   data/oshb/{Gen,Exod,Lev,Num,Deut}.xml
 *
 * Writes:
 *   data/oshb/{Gen,Exod,Lev,Num,Deut}.json
 *   data/oshb/index.json  (maps "Genesis 1:1" → {book, chapter, verse})
 *
 * Output format per book JSON:
 *   { "1:1": [ {orig, lemma, eng}, ... ], "1:2": [...], ... }
 *
 * Where:
 *   orig  = pointed Hebrew text (from XML content)
 *   lemma = normalized Strong's number e.g. "H7225"
 *   eng   = English gloss from Strong's (strongs_def, first phrase), or "[no gloss]"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

// ── 1. Load Strong's dictionary ───────────────────────────────────────────────

console.log('Loading Strong\'s dictionary…');
const strongsDict = require('./strongs-hebrew-dictionary.js');
console.log(`  Loaded ${Object.keys(strongsDict).length} Strong's entries`);

/**
 * Normalize an OSHB augmented lemma like "b/7225", "1254 a", "d/8064", "c/853"
 * to a canonical Strong's key like "H7225", "H1254", "H8064", "H853".
 * Returns null for non-numeric lemmas (prefixes like "b", "d", "c" alone).
 */
function normalizeLemma(raw) {
  if (!raw) return null;
  // Strip everything up to and including the last "/"
  let s = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw;
  // Strip trailing variant letter(s) like " a", " b"
  s = s.replace(/\s+[a-z]$/, '').trim();
  // Must be numeric
  if (!/^\d+$/.test(s)) return null;
  return `H${s}`;
}

/**
 * Get the best English gloss for a Strong's number.
 * Uses strongs_def, taking just the first semicolon-delimited phrase.
 */
function getGloss(strongsNum) {
  if (!strongsNum) return '[no gloss]';
  const entry = strongsDict[strongsNum];
  if (!entry) return '[no gloss]';
  // Try strongs_def first, then kjv_def
  const raw = (entry.strongs_def || entry.kjv_def || '').trim();
  if (!raw) return '[no gloss]';
  // Take first phrase (before first semicolon or period)
  let gloss = raw.split(/[;.]/)[0].replace(/\s+/g, ' ').trim();
  // Trim trailing "or" / "and" fragments
  gloss = gloss.replace(/\s+(or|and)$/i, '').trim();
  // Cap at 40 chars with ellipsis if still long
  if (gloss.length > 45) gloss = gloss.slice(0, 42).replace(/\s+\S*$/, '') + '…';
  return gloss || '[no gloss]';
}

// ── 2. XML parser (no external deps) ─────────────────────────────────────────

/**
 * Very lightweight XML parser: extracts all <verse> elements with their
 * osisID attribute, and within each verse all <w> elements with lemma attr
 * and text content.
 *
 * Returns array of { osisID, words: [{orig, lemma}] }
 */
function parseOshbXml(xml) {
  const verses = [];

  // Match verse blocks
  const verseRe = /<verse\s[^>]*osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let vm;
  while ((vm = verseRe.exec(xml)) !== null) {
    const osisID = vm[1]; // e.g. "Gen.1.1"
    const body = vm[2];

    const words = [];
    // Match <w> elements with optional lemma attr
    const wordRe = /<w\s([^>]*)>([\s\S]*?)<\/w>/g;
    let wm;
    while ((wm = wordRe.exec(body)) !== null) {
      const attrs = wm[1];
      const rawText = wm[2];

      // Extract lemma attribute value
      const lemmaMatch = attrs.match(/lemma="([^"]+)"/);
      const lemmaRaw = lemmaMatch ? lemmaMatch[1] : null;

      // Strip cantillation marks and dagesh from Hebrew text to get clean display form
      // (Actually keep them — these are the pointed Hebrew we want to display)
      // Strip any embedded XML tags (like <seg>) from text
      const orig = rawText.replace(/<[^>]+>/g, '').trim();

      if (orig) {
        words.push({ orig, lemma: lemmaRaw });
      }
    }

    verses.push({ osisID, words });
  }

  return verses;
}

// ── 3. Convert osisID to verse key ───────────────────────────────────────────

// osisID format: "Gen.1.1" → chapter:verse "1:1"
function osisToKey(osisID) {
  const parts = osisID.split('.');
  return `${parts[1]}:${parts[2]}`;
}

// ── 4. Process each book ──────────────────────────────────────────────────────

const BOOKS = [
  { file: 'Gen.xml', out: 'Gen.json' },
  { file: 'Exod.xml', out: 'Exod.json' },
  { file: 'Lev.xml', out: 'Lev.json' },
  { file: 'Num.xml', out: 'Num.json' },
  { file: 'Deut.xml', out: 'Deut.json' },
];

let totalVerses = 0;
let totalWords = 0;
let noGlossCount = 0;

for (const { file, out } of BOOKS) {
  const bookName = file.replace('.xml', '');
  console.log(`\nProcessing ${bookName}…`);

  const xml = fs.readFileSync(path.join(ROOT, 'data/oshb', file), 'utf8');
  const verses = parseOshbXml(xml);
  console.log(`  Parsed ${verses.length} verses`);

  const lookup = {};

  for (const { osisID, words } of verses) {
    const key = osisToKey(osisID);
    const enriched = words.map(({ orig, lemma: lemmaRaw }) => {
      const lemma = normalizeLemma(lemmaRaw);
      const eng = getGloss(lemma);
      if (eng === '[no gloss]') noGlossCount++;
      totalWords++;
      return { orig, lemma: lemma ?? lemmaRaw ?? null, eng };
    });
    lookup[key] = enriched;
    totalVerses++;
  }

  const outPath = path.join(ROOT, 'data/oshb', out);
  fs.writeFileSync(outPath, JSON.stringify(lookup));
  const size = fs.statSync(outPath).size;
  console.log(`  Written ${out} (${(size / 1024).toFixed(0)} KB, ${Object.keys(lookup).length} verses)`);
}

console.log(`\nDone. ${totalVerses} verses, ${totalWords} words, ${noGlossCount} [no gloss] (${((noGlossCount/totalWords)*100).toFixed(1)}%)`);
