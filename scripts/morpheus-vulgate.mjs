/**
 * morpheus-vulgate.mjs
 * For Vulgate Gen, Exod, Lev words with no lemma: query Morpheus API to get lemma.
 * Then add Lewis & Short definition if available.
 * Run: node scripts/morpheus-vulgate.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BOOKS = [
  { file: 'Gen.json', name: 'Genesis' },
  { file: 'Exod.json', name: 'Exodus' },
  { file: 'Lev.json', name: 'Leviticus' },
];

// Collect all unique forms that lack a lemma
const uniqueForms = new Set();
for (const { file } of BOOKS) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vulgate', file), 'utf8'));
  for (const words of Object.values(data)) {
    for (const word of words) {
      if (!word.lemma && word.orig && word.orig !== '—') {
        uniqueForms.add(word.orig.toLowerCase());
      }
    }
  }
}

console.log(`Found ${uniqueForms.size} unique Latin forms needing lemma lookup`);

// Query Morpheus for each form
const lemmaMap = new Map(); // form → lemma string

async function queryMorpheus(form) {
  const url = `http://morph.perseids.org/analysis/word?lang=lat&word=${encodeURIComponent(form)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    // Morpheus returns: { RDF: { Annotation: { Body: { rest: { entry: { dict: { hdwd: { $: 'lemma' } } } } } } } }
    const hdwd = json?.RDF?.Annotation?.Body?.rest?.entry?.dict?.hdwd?.['$'];
    return hdwd ?? null;
  } catch {
    return null;
  }
}

let i = 0;
for (const form of uniqueForms) {
  i++;
  if (i % 50 === 0) console.log(`  ${i}/${uniqueForms.size}...`);
  const lemma = await queryMorpheus(form);
  if (lemma) lemmaMap.set(form, lemma);
  // Small delay to avoid hammering the API
  await new Promise(r => setTimeout(r, 50));
}

console.log(`Got ${lemmaMap.size} lemmas from Morpheus`);

// Write lemmas back to vulgate JSON files
for (const { file } of BOOKS) {
  const filePath = path.join(ROOT, 'data/vulgate', file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  for (const words of Object.values(data)) {
    for (const word of words) {
      if (!word.lemma && word.orig) {
        const lemma = lemmaMap.get(word.orig.toLowerCase());
        if (lemma) { word.lemma = lemma; changed = true; }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`  updated ${file}`);
  }
}

console.log('Done.');
