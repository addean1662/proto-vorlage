/**
 * Generates DSS variants from consonantal MT for all attested verses.
 * Strips nikud and morphological separators from OSHB words.
 * Merges with existing manually-audited variants (does not overwrite them).
 *
 * Run: node scripts/generate-dss-variants.js
 */

const fs = require('fs');
const path = require('path');

const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];

function stripNikud(s) {
  // Remove vowel points and cantillation marks (U+0591–U+05C7)
  // Remove morphological separators used in OSHB ('/')
  // Remove maqaf (U+05BE) — Masoretic word-joiner, not present in DSS
  return s
    .replace(/[֑-ׇ]/g, '')  // nikud + cantillation
    .replace(/\//g, '')               // OSHB morpheme boundary markers
    .replace(/־/g, '');          // maqaf
}

let totalVerses = 0;
let totalWords = 0;

for (const book of BOOKS) {
  const dssPath = path.join(__dirname, '..', 'data', 'dss', `${book}.json`);
  const oshbPath = path.join(__dirname, '..', 'data', 'oshb', `${book}.json`);
  const variantsPath = path.join(__dirname, '..', 'data', 'dss', 'variants', `${book}.json`);

  if (!fs.existsSync(dssPath) || !fs.existsSync(oshbPath)) {
    console.log(`Skipping ${book} — missing data files`);
    continue;
  }

  const dssData = JSON.parse(fs.readFileSync(dssPath, 'utf8'));
  const oshbData = JSON.parse(fs.readFileSync(oshbPath, 'utf8'));
  const existing = JSON.parse(fs.readFileSync(variantsPath, 'utf8'));

  const output = { ...existing };
  let versesAdded = 0;
  let wordsAdded = 0;

  for (const [verseKey, dssWords] of Object.entries(dssData)) {
    if (!Array.isArray(dssWords)) continue;
    const mtWords = oshbData[verseKey];
    if (!mtWords) continue;

    const verseVariants = output[verseKey] ? { ...output[verseKey] } : {};
    let addedToVerse = false;

    for (let i = 0; i < dssWords.length; i++) {
      const dssWord = dssWords[i];
      // Only fill attested/partial — extant has real data, lost shows red dot
      if (dssWord.status !== 'attested' && dssWord.status !== 'partial') continue;
      // Don't overwrite existing manually-audited entries
      if (verseVariants[i] !== undefined) continue;

      const mt = mtWords[i];
      if (!mt || !mt.orig) continue;

      const consonantal = stripNikud(mt.orig);
      if (!consonantal || consonantal === '—') continue;

      verseVariants[i] = {
        orig: consonantal,
        eng: mt.eng || '',
      };
      wordsAdded++;
      addedToVerse = true;
    }

    if (addedToVerse) {
      output[verseKey] = verseVariants;
      versesAdded++;
    }
  }

  // Sort keys numerically by chapter:verse for readability
  const sorted = {};
  for (const k of Object.keys(output).sort((a, b) => {
    const [ac, av] = a.split(':').map(Number);
    const [bc, bv] = b.split(':').map(Number);
    return ac !== bc ? ac - bc : av - bv;
  })) {
    sorted[k] = output[k];
  }

  fs.writeFileSync(variantsPath, JSON.stringify(sorted, null, 2), 'utf8');
  console.log(`${book}: ${versesAdded} verses, ${wordsAdded} words written`);
  totalVerses += versesAdded;
  totalWords += wordsAdded;
}

console.log(`\nTotal: ${totalVerses} verses, ${totalWords} words across all Torah books`);
