/**
 * Fills [no gloss] entries in LXX and Vulgate using scholarly dictionaries:
 *   LXX Greek  → LSJ (Liddell-Scott-Jones, via data/lxx/lsj-index.json)
 *   Vulgate Latin → Lewis & Short (via data/vulgate/ls_*.json)
 *
 * Both pipelines use Perseids/Alpheios Morpheus for lemmatization of
 * inflected forms before dictionary lookup.
 *
 * Run: node scripts/fill-scholarly-glosses.mjs
 * Safe to re-run — only patches [no gloss] entries.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];
const DELAY_MS = 220;
const UA = 'proto-vorlage-scholarly-glosses/1.0 (lexical data enrichment)';
const LEMMA_CACHE_FILE = path.join(ROOT, 'data', 'lemma-cache.json');

// ── HTTP ──────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function get(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': UA } },
        res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } }); }
      ).on('error', () => resolve(null));
    } catch { resolve(null); }
  });
}

// ── Perseids lemmatizer ───────────────────────────────────────────────────────

async function getLemma(word, lang) {
  const engine = lang === 'lat' ? 'morpheuslat' : 'morpheusgrc';
  const r = await get(
    `https://services.perseids.org/bsp/morphologyservice/analysis/word?lang=${lang}&engine=${engine}&word=${encodeURIComponent(word)}&xml=true`
  );
  const body = r?.RDF?.Annotation?.Body?.rest;
  if (!body) return null;
  const entries = Array.isArray(body.entry) ? body.entry : [body.entry];
  for (const e of entries) {
    const hdwd = e?.dict?.hdwd?.['$'];
    if (hdwd) return hdwd;
  }
  return null;
}

// ── Greek: LSJ lookup ─────────────────────────────────────────────────────────

function normalizeGreek(s) {
  return s.normalize('NFD').replace(/[̀-ͯ҅҆҃҉]/g, '').toLowerCase().trim();
}

let lsjIndex = null;
function loadLSJ() {
  if (lsjIndex) return lsjIndex;
  const p = path.join(ROOT, 'data', 'lxx', 'lsj-index.json');
  if (!fs.existsSync(p)) throw new Error('LSJ index not found — run build-lsj-index.mjs first');
  lsjIndex = JSON.parse(fs.readFileSync(p, 'utf8'));
  return lsjIndex;
}

function lookupLSJ(word) {
  const idx = loadLSJ();
  const key = normalizeGreek(word);
  return idx[key] ?? null;
}

// ── Latin: L&S lookup ─────────────────────────────────────────────────────────

let lsIndex = null;
function loadLS() {
  if (lsIndex) return lsIndex;
  lsIndex = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'data', 'vulgate')).filter(f => /^ls_[A-Z]\.json$/.test(f))) {
    let entries;
    try { entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vulgate', f), 'utf8')); }
    catch { continue; }
    for (const e of entries) {
      if (e.key) lsIndex[e.key.toLowerCase()] = e;
    }
  }
  return lsIndex;
}

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
  /^(Gen|Dat|Acc|Nom|Voc|Abl|Loc)\b/, /C\.\s*I\.\s*L\./, /\bInscr\b/,
  /^[A-Z][a-z]{1,5}\.\s+[A-Z]/, /^(v\.|cf\.|i\.e\.|i\.q\.|syn\.|see |vid\.|= )/,
  /^[A-Z]{2,}\./, /inflection of/i, /form of/i,
  // Tense/mood/voice markers and section headers (L&S entries open with these
  // before the English definition — must be skipped to reach usable glosses)
  /^(Tempp?|Pass|Act|Mid|Depon|Impers|Pluperf|Perf|Pres|Impf|Subj|Part|Fut|Freq|Intens|Inch)\b/i,
  /^In gen\b/i, /^In partic\b/i, /^In pass\b/i, /^In act\b/i,
  /^(Lit|Trop|Transf|Esp|Absol|Poet|Hence|Neutr?|Neut)\b/i,
  /ante-class/i, /post-class/i, /\bsyncop\b/i, /\bDicitur\b/,
  /^(Adj|Subst|Adv|Interj)\b/i,
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
    // Split on semicolons, commas, AND colons to avoid "In gen.: citation" leaking
    let g = s.split(/[;,:]/)[0].replace(/\s*\([^)]+\)/g, '').trim();
    g = g.replace(/^(To |A kind of |An? |The )/i, '').trim();
    if (g.length >= 2 && g.length <= 60) return g;
  }
  return null;
}

function lookupLS(lemma) {
  const idx = loadLS();
  return extractLS(idx[lemma.toLowerCase()]) ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Load or init lemma cache (inflected form+lang → lemma string)
const lemmaCache = fs.existsSync(LEMMA_CACHE_FILE)
  ? JSON.parse(fs.readFileSync(LEMMA_CACHE_FILE, 'utf8'))
  : {};

async function resolveGloss(word, lang) {
  // 1. Try direct lookup first (many LXX words are already in lemma form)
  if (lang === 'grc') {
    const direct = lookupLSJ(word);
    if (direct) return direct;
  } else {
    const direct = lookupLS(word);
    if (direct) return direct;
  }

  // 2. Lemmatize via Perseids
  const cacheKey = `${lang}:${word}`;
  let lemma = lemmaCache[cacheKey];
  if (lemma === undefined) {
    lemma = await getLemma(word, lang);
    lemmaCache[cacheKey] = lemma ?? null;
    await sleep(DELAY_MS);
  }
  if (!lemma) return null;

  // 3. Dictionary lookup with lemma
  if (lang === 'grc') return lookupLSJ(lemma);
  return lookupLS(lemma);
}

// Pre-load dictionaries
console.log('Loading L&S index…');
loadLS();
console.log(`  ${Object.keys(lsIndex).length} L&S entries`);
console.log('Loading LSJ index…');
loadLSJ();
console.log(`  ${Object.keys(lsjIndex).length} LSJ entries`);

let done = 0, patched = 0, perseidsHits = 0, directHits = 0, unresolved = 0;

for (const [src, lang] of [['lxx', 'grc'], ['vulgate', 'lat']]) {
  console.log(`\nProcessing ${src.toUpperCase()} (${lang === 'grc' ? 'LSJ' : 'L&S'})…`);
  let srcPatched = 0;

  for (const book of BOOKS) {
    const filePath = path.join(ROOT, 'data', src, `${book}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    // Collect unique missing words for this book first
    const missing = new Map(); // word → gloss (filled after lookup)
    for (const words of Object.values(data)) {
      for (const w of words) {
        if ((!w.eng || w.eng === '[no gloss]') && w.orig && !missing.has(w.orig)) {
          missing.set(w.orig, null);
        }
      }
    }

    // Resolve each unique word
    for (const [word] of missing) {
      const gloss = await resolveGloss(word, lang);
      missing.set(word, gloss);
      done++;
      if (done % 100 === 0) {
        fs.writeFileSync(LEMMA_CACHE_FILE, JSON.stringify(lemmaCache, null, 2));
        process.stdout.write(`\r  ${done} lookups — ${srcPatched + patched} patched so far`);
      }
    }

    // Patch the file
    for (const words of Object.values(data)) {
      for (const w of words) {
        if ((!w.eng || w.eng === '[no gloss]') && w.orig) {
          const gloss = missing.get(w.orig);
          if (gloss) { w.eng = gloss; srcPatched++; changed = true; }
          else unresolved++;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data));
      console.log(`\n  ${book}: patched ${srcPatched} words`);
      patched += srcPatched;
      srcPatched = 0;
    }
  }
}

fs.writeFileSync(LEMMA_CACHE_FILE, JSON.stringify(lemmaCache, null, 2));
console.log(`\nDone. ${patched} words patched. ${unresolved} still unresolved (proper nouns / hapax legomena).`);
console.log(`Lemma cache saved: ${Object.keys(lemmaCache).length} entries for future runs.`);
