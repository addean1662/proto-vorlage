/**
 * patch-lxx-glosses.mjs
 *
 * Re-resolves English glosses for all LXX words that have a Strong's number,
 * using TBESG only for the Greek lemma (col 3) and LSJ as the primary gloss
 * source. TBESG's own gloss (col 6) is kept only as a fallback when LSJ has
 * no entry for that lemma.
 *
 * Words without a Strong's number (strongs: null) are left untouched — those
 * are already handled by fill-scholarly-glosses.mjs via Perseids + LSJ.
 *
 * Run: node scripts/patch-lxx-glosses.mjs
 * Safe to re-run. Preserves xlit, def, strongs, and orig fields.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'lxx');
const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];

// ── 1. Parse TBESG: Strong's → Greek lemma (col 3) + fallback gloss (col 6) ──

console.log('Parsing TBESG…');
const tbesgLemma = new Map(); // G0746 → "ἀρχή"
const tbesgGloss = new Map(); // G0746 → "beginning"  (fallback only)

for (const line of fs.readFileSync(path.join(DATA, 'tbesg.txt'), 'utf8').split('\n')) {
  if (!/^G\d/.test(line)) continue;
  const cols = line.split('\t');
  if (cols.length < 7) continue;
  const key = cols[0].replace(/[A-Z]+$/, ''); // strip suffix, e.g. G0001G → G0001
  if (tbesgLemma.has(key)) continue;          // first entry wins
  const lemma = cols[3]?.trim();
  const gloss = cols[6]?.trim();
  if (lemma) tbesgLemma.set(key, lemma);
  if (gloss) tbesgGloss.set(key, gloss);
}
console.log(`  ${tbesgLemma.size} lemmas, ${tbesgGloss.size} fallback glosses`);

// ── 2. Load LSJ index ─────────────────────────────────────────────────────────

console.log('Loading LSJ index…');
const lsjIndex = JSON.parse(fs.readFileSync(path.join(DATA, 'lsj-index.json'), 'utf8'));
console.log(`  ${Object.keys(lsjIndex).length} LSJ entries`);

function normalizeGreek(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function lookupLSJ(lemma) {
  if (!lemma) return null;
  return lsjIndex[normalizeGreek(lemma)] ?? null;
}

// ── 3. Patch each book ────────────────────────────────────────────────────────

let totalWords = 0, lsjHits = 0, tbesgFallback = 0, noGloss = 0, unchanged = 0;

for (const book of BOOKS) {
  const filePath = path.join(DATA, `${book}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let bookLsj = 0, bookFallback = 0, bookNoGloss = 0;

  for (const words of Object.values(data)) {
    for (const w of words) {
      totalWords++;
      if (!w.strongs) { unchanged++; continue; } // no strongs → skip (handled elsewhere)

      const lemma = tbesgLemma.get(w.strongs);
      const lsjGloss = lookupLSJ(lemma);

      if (lsjGloss) {
        w.eng = lsjGloss;
        lsjHits++; bookLsj++;
      } else {
        const fallback = tbesgGloss.get(w.strongs);
        if (fallback) {
          w.eng = fallback;
          tbesgFallback++; bookFallback++;
        } else {
          w.eng = '[no gloss]';
          noGloss++; bookNoGloss++;
        }
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`  ${book}: ${bookLsj} LSJ, ${bookFallback} TBESG fallback, ${bookNoGloss} [no gloss]`);
}

console.log(`
Done.
  Total words with strongs:  ${lsjHits + tbesgFallback + noGloss}
  Resolved via LSJ:          ${lsjHits} (${((lsjHits/(lsjHits+tbesgFallback+noGloss))*100).toFixed(1)}%)
  TBESG fallback:            ${tbesgFallback} (${((tbesgFallback/(lsjHits+tbesgFallback+noGloss))*100).toFixed(1)}%)
  No gloss (strongs-keyed):  ${noGloss}
  No strongs (skipped):      ${unchanged}
`);
