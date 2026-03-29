/**
 * build-genesis-dss.mjs
 * Pre-builds DSS data for all Genesis verses using lib/genesis_dss_coverage.json.
 *
 * For verses with manuscripts: strip nikud from MT words to get unpointed DSS text.
 * For verses with no manuscripts: mark all words as "lost".
 *
 * Output: data/dss/Gen.json
 * Format: { "1:1": [{orig, eng, manuscripts, status}], ... }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load MT data for Genesis
const mtData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/oshb/Gen.json'), 'utf8'));

// Load coverage
const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/genesis_dss_coverage.json'), 'utf8'));

// Strip nikud from Hebrew word
function stripNikud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

const dssData = {};

// Process each verse that exists in OSHB Gen
for (const [key, mtWords] of Object.entries(mtData)) {
  const fullRef = `Genesis ${key}`;
  const coverageEntry = coverage[fullRef];

  if (!coverageEntry) {
    // No coverage data at all — mark all lost
    dssData[key] = mtWords.map(w => ({
      orig: '—',
      eng: '—',
      manuscripts: [],
      status: 'lost',
    }));
    continue;
  }

  const manuscripts = coverageEntry.manuscripts ?? [];

  if (manuscripts.length === 0) {
    // No manuscripts cover this verse — all lost
    dssData[key] = mtWords.map(w => ({
      orig: '—',
      eng: '—',
      manuscripts: [],
      status: 'lost',
    }));
  } else {
    // Manuscripts cover this verse — derive DSS from MT by stripping nikud
    const primaryMs = manuscripts[0]; // first siglum is primary
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

// Ensure output directory exists
const outDir = path.join(ROOT, 'data/dss');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'Gen.json'), JSON.stringify(dssData));
console.log(`Written data/dss/Gen.json with ${Object.keys(dssData).length} verses`);
console.log('Done.');
