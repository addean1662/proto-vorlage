/**
 * add-definitions.mjs
 * Adds xlit (transliteration) and def (full definition) fields to OSHB and LXX JSON files.
 * Run: node scripts/add-definitions.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const BOOKS = ['Gen.json','Exod.json','Lev.json','Num.json','Deut.json'];

// ── OSHB: add xlit + def from Strong's dictionary ─────────────────────────────

console.log('Adding definitions to OSHB files…');
const strongsDict = require('./strongs-hebrew-dictionary.js');
let oshbChanged = 0;

for (const file of BOOKS) {
  const filePath = path.join(ROOT, 'data/oshb', file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  for (const words of Object.values(data)) {
    for (const word of words) {
      if (!word.lemma) continue;
      const entry = strongsDict[word.lemma];
      if (!entry) continue;
      const newXlit = entry.xlit ?? null;
      const newDef = entry.strongs_def ?? entry.kjv_def ?? null;
      if (newXlit !== word.xlit || newDef !== word.def) {
        word.xlit = newXlit;
        word.def = newDef;
        changed = true;
        oshbChanged++;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`  updated ${file}`);
  }
}
console.log(`  ${oshbChanged} OSHB words enriched\n`);

// ── LXX: add xlit + def from TBESG ────────────────────────────────────────────

console.log('Adding definitions to LXX files…');

// Parse TBESG: cols: [0]=strongs, [3]=Greek, [4]=xlit, [6]=short gloss, [7]=full def HTML
const tbesgXlit = new Map();   // G2316 → 'theos'
const tbesgDef  = new Map();   // G2316 → full HTML stripped definition

for (const line of fs.readFileSync(path.join(ROOT, 'data/lxx/tbesg.txt'), 'utf8').split('\n')) {
  if (!/^G\d/.test(line)) continue;
  const cols = line.split('\t');
  if (cols.length < 7) continue;
  const key = cols[0].replace(/[A-Z]+$/, ''); // strip suffix
  if (!tbesgXlit.has(key)) {
    tbesgXlit.set(key, cols[4]?.trim() ?? null);
    // Strip HTML tags and ref elements from col 7
    const rawDef = cols[7]?.trim() ?? '';
    const stripped = rawDef
      .replace(/<ref=[^>]*>[^<]*<\/ref>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    tbesgDef.set(key, stripped || null);
  }
}

let lxxChanged = 0;
for (const file of BOOKS) {
  const filePath = path.join(ROOT, 'data/lxx', file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  for (const words of Object.values(data)) {
    for (const word of words) {
      if (!word.strongs) continue;
      const xlit = tbesgXlit.get(word.strongs) ?? null;
      const def  = tbesgDef.get(word.strongs)  ?? null;
      if (xlit !== word.xlit || def !== word.def) {
        word.xlit = xlit;
        word.def  = def;
        changed = true;
        lxxChanged++;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`  updated ${file}`);
  }
}
console.log(`  ${lxxChanged} LXX words enriched\n`);

console.log('Done.');
