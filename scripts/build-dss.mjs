/**
 * build-dss.mjs
 * Pre-builds DSS data for all Torah books using coverage JSON files.
 *
 * For verses with manuscripts: strip nikud from MT words to get unpointed DSS text.
 * For verses with no manuscripts: mark all words as "lost".
 *
 * Output: data/dss/{Gen,Exod,Lev,Num,Deut}.json
 * Format: { "1:1": [{orig, eng, manuscripts, frag, status, paleo}], ... }
 *
 * Usage: node scripts/build-dss.mjs [Gen|Exod|Lev|Num|Deut]
 *   (omit argument to build all books)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BOOKS = [
  { abbr: 'Gen',  name: 'genesis' },
  { abbr: 'Exod', name: 'exodus' },
  { abbr: 'Lev',  name: 'leviticus' },
  { abbr: 'Num',  name: 'numbers' },
  { abbr: 'Deut', name: 'deuteronomy' },
];

function stripNikud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

function buildBook({ abbr, name }) {
  const mtData = JSON.parse(fs.readFileSync(path.join(ROOT, `data/oshb/${abbr}.json`), 'utf8'));
  const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, `lib/${name}_dss_coverage.json`), 'utf8'));

  const bookName = name.charAt(0).toUpperCase() + name.slice(1);
  const dssData = {};

  for (const [key, mtWords] of Object.entries(mtData)) {
    const fullRef = `${bookName} ${key}`;
    const coverageEntry = coverage[fullRef];

    if (!coverageEntry) {
      dssData[key] = mtWords.map(() => ({
        orig: '—', eng: '—', manuscripts: [], status: 'lost',
      }));
      continue;
    }

    const manuscripts = coverageEntry.manuscripts ?? [];

    if (manuscripts.length === 0) {
      dssData[key] = mtWords.map(() => ({
        orig: '—', eng: '—', manuscripts: [], status: 'lost',
      }));
    } else {
      const primaryMs = manuscripts[0];
      dssData[key] = mtWords.map(w => ({
        orig: stripNikud(w.orig),
        eng: w.eng,
        manuscripts,
        frag: primaryMs,
        status: 'extant',
        paleo: false,
      }));
    }
  }

  const outDir = path.join(ROOT, 'data/dss');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${abbr}.json`), JSON.stringify(dssData));
  console.log(`Written data/dss/${abbr}.json — ${Object.keys(dssData).length} verses`);
}

const arg = process.argv[2];
const targets = arg ? BOOKS.filter(b => b.abbr === arg) : BOOKS;

if (targets.length === 0) {
  console.error(`Unknown book: ${arg}. Valid: ${BOOKS.map(b => b.abbr).join(', ')}`);
  process.exit(1);
}

for (const book of targets) {
  buildBook(book);
}
console.log('Done.');
