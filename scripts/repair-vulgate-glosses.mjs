/**
 * repair-vulgate-glosses.mjs
 *
 * Fixes 497 bad L&S-abbreviation glosses in data/vulgate/*.json.
 *
 * L&S entries for common Latin verbs open with grammatical notes
 * ("Tempp. perff.", "Pass.: fīo", "In gen.", "With acc.", etc.)
 * before the English meaning. The original BAD_LS filter was too
 * narrow and let many of these through.
 *
 * Strategy:
 *   1. LEMMA_OVERRIDES — hand-verified glosses for the ~15 lemmas
 *      whose L&S entries are hardest to parse automatically.
 *   2. Improved extractLS with comprehensive BAD_LS — handles the
 *      remaining ~50 lemmas via better pattern matching.
 *   3. Lemma cache — no Perseids API calls needed; cached lemmas
 *      from the original fill-scholarly-glosses.mjs run are reused.
 *
 * Also patches data/vulgate/Gen.json 1:3 whose content was scraped
 * incorrectly from vulgate.net (it contained verse 1:30 text instead
 * of the correct "dixitque Deus fiat lux et facta est lux").
 *
 * Run: node scripts/repair-vulgate-glosses.mjs
 * Safe to re-run.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'vulgate');
const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];

// ── Manual overrides: lemma → gloss ──────────────────────────────────────────
// These lemmas' L&S entries open with usage-note sections, not English
// definitions, making automatic extraction unreliable.
const LEMMA_OVERRIDES = {
  'fero':     'carry',
  'facio':    'make',
  'dico':     'say',
  'dico2':    'say',
  'habeo':    'have',
  'coepio':   'begin',
  'habito':   'dwell',
  'accedo':   'approach',
  'deleo':    'destroy',
  'lavo':     'wash',
  'pono':     'place',
  'sequor':   'follow',
  'pergo':    'proceed',
  'ipse':     'self',
  'surgo':    'rise',
  'quisquam': 'any',
  'fio':      'be made',
};

// ── Improved L&S extractor ────────────────────────────────────────────────────

function flattenSenses(senses) {
  const out = [];
  function walk(node) {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) { for (const c of node) walk(c); }
  }
  walk(senses);
  return out;
}

const BAD_LS = [
  // Original filters
  /^(Gen|Dat|Acc|Nom|Voc|Abl|Loc)\b/,
  /C\.\s*I\.\s*L\./,
  /\bInscr\b/,
  /^[A-Z][a-z]{1,5}\.\s+[A-Z]/,
  /^(v\.|cf\.|i\.e\.|i\.q\.|syn\.|see |vid\.|= )/,
  /^[A-Z]{2,}\./,
  /inflection of/i,
  /form of/i,
  // Tense / mood / voice markers
  /^(Tempp?|Pass|Act|Mid|Depon|Impers|Pluperf|Perf|Pres|Impf|Subj|Part|Fut|Freq|Intens|Inch)\b/i,
  // Section headers
  /^In gen\b/i,
  /^In partic\b/i,
  /^In pass\b/i,
  /^In act\b/i,
  /^(Lit|Trop|Transf|Esp|Absol|Poet|Hence)\b/i,
  // Usage notes
  /ante-class/i,
  /post-class/i,
  /\bsyncop\b/i,
  /\bDicitur\b/,
  // Part-of-speech / construction labels
  /^(Neutr?|Neut|Adj|Subst|Adv|Interj)\b/i,
  /^With\s+/i,
  /^Of\s+(personal|inanim|abstr|special|things|obj|subj)/i,
  /^In\s+\w+\s+(lang|sense|t\.\s*t\.)/i,
  /^\(See\b/i,
  /^Of\s+\w+[.,\s]*$/i,
];

function extractLS(entry) {
  if (!entry) return null;
  for (const s of flattenSenses(entry.senses ?? [])) {
    if (BAD_LS.some(p => p.test(s))) continue;
    if (!/[a-z]{3}/.test(s)) continue;
    let g = s.split(/[;,:]/)[0].replace(/\s*\([^)]+\)/g, '').trim();
    g = g.replace(/^(To |A kind of |An? |The )/i, '').trim();
    if (g.length >= 2 && g.length <= 60) return g;
  }
  return null;
}

// ── Load L&S index ────────────────────────────────────────────────────────────
console.log('Loading L&S index…');
const lsIndex = {};
for (const f of fs.readdirSync(DATA).filter(f => /^ls_[A-Z]\.json$/.test(f))) {
  try {
    const entries = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    for (const e of entries) {
      if (e.key) lsIndex[e.key.toLowerCase()] = e;
    }
  } catch {}
}
console.log(`  ${Object.keys(lsIndex).length} L&S entries`);

function lookupLS(lemma) {
  if (!lemma) return null;
  const key = lemma.toLowerCase();
  const entry = lsIndex[key] ?? lsIndex[key + '1'] ?? lsIndex[key + '2'];
  return extractLS(entry) ?? null;
}

// ── Load lemma cache ──────────────────────────────────────────────────────────
const CACHE_FILE = path.join(ROOT, 'data', 'lemma-cache.json');
const lemmaCache = fs.existsSync(CACHE_FILE)
  ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  : {};
console.log(`  ${Object.keys(lemmaCache).length} cached lemmas`);

// ── Detect bad glosses ────────────────────────────────────────────────────────
function isBadGloss(eng) {
  if (!eng || eng === '[no gloss]') return false;
  return /^(Tempp\.|Pass\.\s*:|In gen\b|Impers\.|Pluperf\.|Perf\. subj|Perf\.,|feed with any thing:|ante-class)/i.test(eng)
      || /subj\.\s*syncop\b/i.test(eng)
      || /^Perf\.\s+subj\b/i.test(eng);
}

// ── Patch Gen 1:3 (scraped wrongly from vulgate.net) ─────────────────────────
// The URL gn1-3 returned verse 1:30 content. Correct Vulgate text:
// "dixitque Deus fiat lux et facta est lux"
const GEN_1_3_CORRECT = [
  { orig: 'dixitque', lemma: null, eng: 'say'     },
  { orig: 'Deus',     lemma: null, eng: 'God'     },
  { orig: 'fiat',     lemma: null, eng: 'be made' },
  { orig: 'lux',      lemma: null, eng: 'light'   },
  { orig: 'et',       lemma: null, eng: 'and'     },
  { orig: 'facta',    lemma: null, eng: 'made'    },
  { orig: 'est',      lemma: null, eng: 'is'      },
  { orig: 'lux',      lemma: null, eng: 'light'   },
];

// ── Repair loop ───────────────────────────────────────────────────────────────

let totalPatched = 0;
let overrideHits = 0;
let lsHits = 0;
let stillBad = 0;

for (const book of BOOKS) {
  const filePath = path.join(DATA, `${book}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let bookPatched = 0;

  // Special case: fix Gen 1:3 verse content
  if (book === 'Gen') {
    const current13 = data['1:3']?.map(w => w.orig).join(' ') ?? '';
    if (current13.startsWith('et cunctis animantibus')) {
      data['1:3'] = GEN_1_3_CORRECT;
      console.log(`  Gen 1:3: replaced bad verse content with correct "dixitque Deus fiat lux…"`);
    }
  }

  for (const [verse, words] of Object.entries(data)) {
    for (const w of words) {
      if (!isBadGloss(w.eng)) continue;

      const cacheKey = 'lat:' + w.orig;
      const lemma = lemmaCache[cacheKey] ?? null;

      // Try override first
      if (lemma && LEMMA_OVERRIDES[lemma]) {
        w.eng = LEMMA_OVERRIDES[lemma];
        overrideHits++;
        bookPatched++;
        continue;
      }

      // Also try direct word as lemma override (some entries ARE the lemma form)
      const wordLower = w.orig.toLowerCase();
      if (LEMMA_OVERRIDES[wordLower]) {
        w.eng = LEMMA_OVERRIDES[wordLower];
        overrideHits++;
        bookPatched++;
        continue;
      }

      // Try improved L&S lookup via cached lemma
      const lsGloss = lookupLS(lemma) ?? lookupLS(wordLower);
      if (lsGloss) {
        w.eng = lsGloss;
        lsHits++;
        bookPatched++;
        continue;
      }

      stillBad++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data));
  totalPatched += bookPatched;
  console.log(`  ${book}: ${bookPatched} repaired`);
}

console.log(`
Done.
  Override table:  ${overrideHits}
  L&S extraction:  ${lsHits}
  Still bad:       ${stillBad}
  Total patched:   ${totalPatched}
`);
