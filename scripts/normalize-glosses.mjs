/**
 * normalize-glosses.mjs
 * Rewrites eng fields in data/oshb, data/lxx, and data/vulgate JSON files
 * using the same rules as lib/normalize-gloss.ts.
 * Run: node scripts/normalize-glosses.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Same logic as lib/normalize-gloss.ts ─────────────────────────────────────

const PARTICLES = {
  'את': 'ʾet',  'אֶת': 'ʾet',  'אֵת': 'ʾet',
  'ו': 'and',   'וְ': 'and',   'וּ': 'and',
  'עַל': 'upon','עָל': 'upon', 'עַל־': 'upon',
  'כִּי': 'for',
  'ὁ': 'the',   'ἡ': 'the',   'τό': 'the',   'τὸ': 'the',
  'τόν': 'the', 'τὸν': 'the', 'τήν': 'the',  'τὴν': 'the',
  'τοῦ': 'of the', 'τῆς': 'of the', 'τοῖς': 'the', 'τῇ': 'the', 'τῶν': 'of the',
  'καί': 'and', 'καὶ': 'and',
  'δέ': 'but',  'δὲ': 'but',
  'ἐν': 'in',   'ἐπ': 'upon', 'ἐπί': 'upon', 'ἐπάνω': 'above',
  'et': 'and',  'autem': 'but', 'in': 'in', 'super': 'over', 'de': 'of', 'ad': 'to',
};

const LEMMA_OVERRIDES = {
  'H430': 'God',        'H853': 'ʾet',        'H776': 'the earth',
  'H7225': 'beginning', 'H8064': 'the heavens','H8415': 'the deep',
  'H1254': 'created',   'H7307': 'spirit',     'H6440': 'face',
  'H4325': 'waters',    'H1961': 'was',        'H2822': 'darkness',
  'H8414': 'formless',  'H922': 'empty',       'H7363': 'hovering',
  'H5921': 'upon',
  'G3588': 'the',       'G2316': 'God',        'G1093': 'earth',
  'G3772': 'heaven',    'G4655': 'darkness',   'G0012': 'abyss',
  'G4151': 'spirit',    'G5204': 'water',      'G4160': 'made',
  'G1510': 'was',       'G0746': 'beginning',
};

function normalizeGloss(gloss, orig, lemma) {
  if (!gloss || gloss === '[no gloss]') return gloss;
  if (lemma && LEMMA_OVERRIDES[lemma]) return LEMMA_OVERRIDES[lemma];
  if (orig) {
    const o = orig.trim();
    if (PARTICLES[o]) return PARTICLES[o];
    const bare = o.replace(/[\u0591-\u05C7]/g, '');
    if (PARTICLES[bare]) return PARTICLES[bare];
  }
  let g = gloss.trim();
  g = g.replace(/^(properly|literally|viz\.?|i\.e\.?),?\s+/i, '');
  const colonIdx = g.indexOf(':');
  if (colonIdx > 0) g = g.slice(0, colonIdx).trim();
  const slashIdx = g.indexOf('/');
  if (slashIdx > 0) g = g.slice(0, slashIdx).trim();
  g = g.replace(/\s*\([^)]*\)\.?/g, '').trim();
  g = g.replace(/\bin the ordinary sense\b/gi, '').trim();
  g = g.replace(/\bin [a-z]+ sense\b/gi, '').trim();
  g = g.split(/;\s*/)[0].trim();
  g = g.split(/,\s+(?=[a-z])/)[0].trim();
  g = g.split(/\s+or\s+/i)[0].trim();
  g = g.replace(/[.…]{2,}$/, '').trim();
  g = g.replace(/[.;:,]+$/, '').trim();
  g = g.replace(/,?\s+[a-z]\.?$/i, '').trim();
  const words = g.split(/\s+/).filter(Boolean);
  if (words.length > 3) g = words.slice(0, 3).join(' ');
  return g || gloss;
}

// ── Process a directory of verse-map JSON files ───────────────────────────────

function processDir(dir, keyField) {
  const BOOKS = ['Gen.json','Exod.json','Lev.json','Num.json','Deut.json'];
  const files = fs.readdirSync(dir).filter(f => BOOKS.includes(f));
  let total = 0, changed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileChanged = false;

    for (const verse of Object.values(data)) {
      for (const word of verse) {
        if (!word.eng || word.eng === '[no gloss]') continue;
        total++;
        const normalized = normalizeGloss(word.eng, word.orig, word[keyField]);
        if (normalized !== word.eng) {
          word.eng = normalized;
          changed++;
          fileChanged = true;
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, JSON.stringify(data));
      console.log(`  updated ${file}`);
    }
  }

  return { total, changed };
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('Normalizing OSHB (MT)…');
const mt = processDir(path.join(ROOT, 'data/oshb'), 'lemma');
console.log(`  ${mt.changed}/${mt.total} glosses changed\n`);

console.log('Normalizing LXX…');
const lxx = processDir(path.join(ROOT, 'data/lxx'), 'strongs');
console.log(`  ${lxx.changed}/${lxx.total} glosses changed\n`);

console.log('Normalizing Vulgate…');
const vul = processDir(path.join(ROOT, 'data/vulgate'), 'lemma');
console.log(`  ${vul.changed}/${vul.total} glosses changed\n`);

console.log('Done.');
